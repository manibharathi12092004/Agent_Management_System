import json
import logging
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Domain
from app.repositories.domain import DomainRepository
from app.schemas.domain import (
    DomainCreate,
    DomainUpdate,
    SuggestDomainRequest,
    SuggestDomainResponse
)
from app.core.exceptions import AppError
from app.repositories.llm_config import LLMConfigRepository
from app.models.llm_config import LLMConfig
from app.core.security import decrypt_api_key
from google import genai

logger = logging.getLogger(__name__)


class DomainService:
    """Service for domain management and LLM-based domain suggestion"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DomainRepository(db)

    async def get_all_domains(self) -> list[Domain]:
        """Get all domains with accurate agent counts"""
        return await self.repo.get_all_with_counts()

    async def get_domain(self, domain_id: UUID) -> Domain:
        """Get single domain by ID"""
        domain = await self.repo.get(domain_id)
        if not domain:
            raise AppError(status_code=404, message="Domain not found")
        
        # Update agent count
        await self.repo.update_agent_count(domain_id)
        await self.db.refresh(domain)
        
        return domain

    async def get_domain_agents(self, domain_id: UUID):
        """Get all agents in a domain"""
        domain = await self.get_domain(domain_id)
        return await self.repo.get_domain_agents(domain_id)

    async def create_domain(self, data: DomainCreate) -> Domain:
        """Create a new domain"""
        # Check if domain with same name exists
        existing = await self.repo.get_by_name(data.name)
        if existing:
            raise AppError(status_code=400, message=f"Domain '{data.name}' already exists")
        
        domain = Domain(
            name=data.name,
            description=data.description,
            agent_count=0
        )
        
        self.db.add(domain)
        await self.db.commit()
        await self.db.refresh(domain)
        
        return domain

    async def update_domain(self, domain_id: UUID, data: DomainUpdate) -> Domain:
        """Update a domain"""
        domain = await self.get_domain(domain_id)
        
        if data.name is not None:
            # Check if new name conflicts with existing domain
            existing = await self.repo.get_by_name(data.name)
            if existing and existing.id != domain_id:
                raise AppError(status_code=400, message=f"Domain '{data.name}' already exists")
            domain.name = data.name
        
        if data.description is not None:
            domain.description = data.description
        
        await self.db.commit()
        await self.db.refresh(domain)
        
        return domain

    async def delete_domain(self, domain_id: UUID) -> None:
        """Delete a domain (sets agents' domain_id to NULL)"""
        domain = await self.get_domain(domain_id)
        await self.db.delete(domain)
        await self.db.commit()

    async def suggest_domain(self, request: SuggestDomainRequest) -> SuggestDomainResponse:
        """
        Use LLM to suggest which domain an agent should belong to.
        Creates new domain if needed.
        """
        try:
            # Get all existing domains
            existing_domains = await self.get_all_domains()
            
            # Build LLM prompt
            prompt = self._build_domain_suggestion_prompt(
                request.agent_name,
                request.skill_description,
                request.system_prompt,
                existing_domains
            )
            
            # Call LLM
            llm_response = await self._call_llm_for_suggestion(prompt)
            
            # Parse LLM response
            suggestion = self._parse_llm_response(llm_response)

            # Re-check existence in DB (LLM flag may be wrong)
            existing_match = await self.repo.get_by_name(suggestion["domain_name"])
            if existing_match:
                suggestion["is_new_domain"] = False
            else:
                suggestion["is_new_domain"] = True
            
            # Handle the suggestion
            if suggestion["is_new_domain"]:
                description = suggestion.get("domain_description") or f"Handles {suggestion['domain_name'].lower()} workflows and automation."
                new_domain = await self.create_domain(
                    DomainCreate(name=suggestion["domain_name"], description=description)
                )
                return SuggestDomainResponse(
                    domain_id=new_domain.id,
                    domain_name=new_domain.name,
                    is_new_domain=True,
                    reasoning=suggestion.get("reasoning")
                )
            else:
                domain = await self.repo.get_by_name(suggestion["domain_name"])
                if domain:
                    return SuggestDomainResponse(
                        domain_id=domain.id,
                        domain_name=domain.name,
                        is_new_domain=False,
                        reasoning=suggestion.get("reasoning")
                    )
                else:
                    # Fallback: domain name was valid but not in DB yet
                    description = suggestion.get("domain_description") or f"Handles {suggestion['domain_name'].lower()} workflows and automation."
                    new_domain = await self.create_domain(
                        DomainCreate(name=suggestion["domain_name"], description=description)
                    )
                    return SuggestDomainResponse(
                        domain_id=new_domain.id,
                        domain_name=new_domain.name,
                        is_new_domain=True,
                        reasoning=suggestion.get("reasoning")
                    )
        
        except Exception as e:
            logger.error(f"Domain suggestion failed: {e}")
            # Fallback: return None (agent will be created without domain)
            return SuggestDomainResponse(
                domain_id=None,
                domain_name="Uncategorized",
                is_new_domain=False,
                reasoning="Failed to suggest domain, agent will be uncategorized"
            )


    def _build_domain_suggestion_prompt(
        self,
        agent_name: str,
        skill_description: str | None,
        system_prompt: str | None,
        existing_domains: list[Domain]
    ) -> str:

        existing_list = "\n".join(
            f"  - {d.name}: {d.description or 'No description'}"
            for d in existing_domains
        ) if existing_domains else "  (none yet)"

        return f"""You are an IT domain classifier for an enterprise AI agent management platform.

Agent details:
- Name: {agent_name}
- Description: {skill_description or 'Not provided'}
- System Prompt excerpt: {(system_prompt or '')[:300] or 'Not provided'}

Existing domains already in the system:
{existing_list}

Your task:
1. Reason about what IT function this agent primarily serves.
2. If an existing domain above is a strong match, reuse it (set is_new_domain to false).
3. If no existing domain fits well, create a new concise IT-focused domain name (set is_new_domain to true).

RULES:
- Domain names must be IT/enterprise technology focused (e.g. "Data Engineering", "DevOps", "Cybersecurity", "API Integration").
- Never use generic names like "General", "Miscellaneous", "Other", "Automation".
- Domain names: 1-3 words, title case, professional.
- Prefer reusing an existing domain over creating a new one if the fit is reasonable.
- domain_description: one clear sentence describing what this domain covers in an IT enterprise context.

Respond ONLY with valid JSON (no markdown):
{{
  "domain_name": "<domain name>",
  "domain_description": "<one sentence describing this IT domain>",
  "is_new_domain": <true|false>,
  "reasoning": "<one sentence explaining your choice>"
}}"""

    async def _call_llm_for_suggestion(self, prompt: str) -> str:
        """Call LLM for domain suggestion — supports Gemini and OpenAI-compatible providers"""
        try:
            llm_repo = LLMConfigRepository(self.db)
            
            # Prefer Gemini if available, otherwise use default
            from sqlalchemy import select
            from app.models.llm_config import LLMConfig as LLMConfigModel
            gemini_result = await self.db.execute(
                select(LLMConfigModel).where(LLMConfigModel.provider == "gemini")
            )
            gemini_config = gemini_result.scalars().first()
            
            default_config = gemini_config or await llm_repo.get_default()

            if not default_config:
                raise AppError(status_code=500, message="No LLM configuration found")

            api_key = decrypt_api_key(default_config.api_key_encrypted)
            provider = default_config.provider
            model_name = default_config.model_name or "gemini-2.0-flash"

            if provider == "gemini":
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                return response.text

            elif provider in ("openai", "ollama", "anthropic"):
                # Use OpenAI-compatible client
                import openai
                base_url = default_config.base_url or None
                if provider == "ollama":
                    raw = (base_url or "http://localhost:11434").rstrip("/")
                    base_url = raw if raw.endswith("/v1") else f"{raw}/v1"
                    api_key = api_key or "ollama"

                oai_client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
                resp = await oai_client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.2,
                )
                return resp.choices[0].message.content

            else:
                raise AppError(status_code=500, message=f"Unsupported provider: {provider}")

        except AppError:
            raise
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise AppError(status_code=500, message=f"LLM suggestion failed: {str(e)}")

    def _parse_llm_response(self, response_text: str) -> dict:
        """Parse LLM JSON response"""
        try:
            # Extract JSON from response (handle markdown code blocks)
            text = response_text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            # Parse JSON
            data = json.loads(text)
            
            # Validate required fields
            if "domain_name" not in data or "is_new_domain" not in data:
                raise ValueError("Missing required fields in LLM response")
            
            return data
        
        except Exception as e:
            logger.error(f"Failed to parse LLM response: {e}")
            logger.error(f"Response text: {response_text}")
            raise AppError(
                status_code=500,
                message="Failed to parse LLM response"
            )
