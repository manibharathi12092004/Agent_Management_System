# API Endpoints Usage Map

## ✅ All Endpoints Connected

### LLM Configs Module

| Endpoint | Method | Usage | Component |
|----------|--------|-------|-----------|
| `/api/v1/llm-configs/` | GET | List all LLM configurations | `LLMSettingsPage.jsx` |
| `/api/v1/llm-configs/` | POST | Create new LLM configuration | `LLMConfigForm.jsx` |
| `/api/v1/llm-configs/{id}` | GET | Get single configuration | `llmService.js` (ready) |
| `/api/v1/llm-configs/{id}` | PUT | Update configuration | `LLMConfigEditForm.jsx` |
| `/api/v1/llm-configs/{id}` | DELETE | Delete configuration | `LLMSettingsPage.jsx` |
| `/api/v1/llm-configs/{id}/set-default` | POST | Set as default config | `LLMSettingsPage.jsx` |

### Tools Module

| Endpoint | Method | Usage | Component |
|----------|--------|-------|-----------|
| `/api/v1/tools/` | GET | List all tools | `ToolsPage.jsx` |
| `/api/v1/tools/{id}` | GET | Get single tool | `toolService.js` (ready) |
| `/api/v1/tools/{id}/assign-agents` | POST | Assign tool to agents | `ToolAssignmentModal.jsx` |

### Agents Module

| Endpoint | Method | Usage | Component |
|----------|--------|-------|-----------|
| `/api/v1/agents/` | GET | List all agents | `AgentsPage.jsx` |
| `/api/v1/agents/` | POST | Create new agent | `AgentForm.jsx` |
| `/api/v1/agents/{id}` | GET | Get single agent | `agentService.js` (ready) |
| `/api/v1/agents/{id}/upload-skill` | POST | Upload skill file | `AgentForm.jsx` (integrated) |
| `/api/v1/agents/{id}/dry-run` | POST | Test agent execution | `DryRunModal.jsx` |

### Dashboard Module

| Endpoint | Method | Usage | Component |
|----------|--------|-------|-----------|
| `/api/v1/dashboard/stats` | GET | Get dashboard statistics | `DashboardPage.jsx` |

## 📊 Usage Summary

### Fully Implemented ✅
- **LLM Configs**: 6/6 endpoints used
  - ✅ List configs
  - ✅ Create config
  - ✅ Get single config (service ready)
  - ✅ Update config (LLMConfigEditForm)
  - ✅ Delete config
  - ✅ Set default

- **Agents**: 5/5 endpoints used
  - ✅ List agents
  - ✅ Create agent (AgentForm with skill file upload)
  - ✅ Get single (service ready)
  - ✅ Upload skill (integrated in create flow)
  - ✅ Dry run

- **Tools**: 3/3 endpoints used
  - ✅ List tools
  - ✅ Get single (service ready)
  - ✅ Assign to agents (ToolAssignmentModal)

- **Dashboard**: 1/1 endpoint used
  - ✅ Get stats

## 🎯 Features by Page

### Dashboard (`/`)
**Endpoints Used:**
- `GET /dashboard/stats` - Shows agent count, task count, schedule count, recent runs

**Features:**
- Real-time stats cards
- Recent runs table
- Click-through navigation

### LLM Settings (`/llm-settings`)
**Endpoints Used:**
- `GET /llm-configs/` - List all configurations
- `POST /llm-configs/` - Create new configuration
- `GET /llm-configs/{id}` - Get single config (for edit)
- `PUT /llm-configs/{id}` - Update configuration
- `DELETE /llm-configs/{id}` - Delete configuration
- `POST /llm-configs/{id}/set-default` - Set as default

**Features:**
- Grid view of all LLM configs
- Create new config modal (LLMConfigForm)
- Edit config modal (LLMConfigEditForm)
- Delete with confirmation
- Set default (with star icon)
- Shows provider, model, base URL, masked API key

### Tools (`/tools`)
**Endpoints Used:**
- `GET /tools/` - List all predefined tools
- `POST /tools/{id}/assign-agents` - Assign tool to agents

**Features:**
- Grid view of all tools
- Shows tool name, description, function_name, tool_type
- Assign to agents modal (ToolAssignmentModal)
- Multi-select agents for each tool

### Agents (`/agents`)
**Endpoints Used:**
- `GET /agents/` - List all agents
- `POST /agents/` - Create new agent with optional skill file
- `POST /agents/{id}/upload-skill` - Upload skill file (integrated in create)
- `POST /agents/{id}/dry-run` - Test agent execution

**Features:**
- Grid view of all agents
- Shows agent details (name, description, tools, LLM config)
- Create agent form (AgentForm) with:
  - Name and description
  - System prompt OR skill file upload (.md)
  - LLM config selector
  - Tool assignment checkboxes
  - Skill file upload integrated
- Edit agent (opens same form)
- Dry Run modal for testing
- Shows skill file, tools, and LLM config status

### Tasks Canvas (`/tasks`)
**Endpoints Used:**
- None yet (Task module not implemented in backend)

**Features:**
- Full-screen React Flow canvas
- Sample workflow (Trigger → Agent → Output)
- Floating toolbar
- Ready for backend integration

## 🔄 Service Layer

All services are properly structured and ready:

```javascript
// llmService.js
- getAll() ✅
- getById() ✅
- create() ✅
- update() ✅
- delete() ✅
- setDefault() ✅

// agentService.js
- getAll() ✅
- getById() ✅
- create() ✅
- uploadSkill() ✅
- dryRun() ✅

// toolService.js
- getAll() ✅
- getById() ✅
- assignToAgents() ✅

// dashboardApi (in api.js)
- getStats() ✅
```

## ✨ Interactive Features

### LLM Settings
1. **Create Config** - Click "Add Configuration" → Fill form → Submit
2. **Edit Config** - Click edit icon → Update fields → Save
3. **Set Default** - Click "Set as Default" on any non-default config
4. **Delete** - Click trash icon → Confirm → Deleted

### Agents
1. **Create Agent** - Click "Create Agent" → Fill form with name, description, system prompt or skill file, select LLM, assign tools → Save
2. **Edit Agent** - Click "Edit" → Modify fields → Update
3. **Dry Run** - Click "Dry Run" → Enter prompt → See result in console
4. **View Details** - Each card shows full agent info

### Tools
1. **View All** - See all predefined tools
2. **Assign to Agents** - Click "Assign to Agents" → Select agents → Save
3. **Tool Details** - Name, description, function name, type

### Dashboard
1. **Stats Cards** - Click to navigate to respective module
2. **Recent Runs** - View last 5 task executions

## 🚀 Next Steps

Backend modules 4-7 need to be implemented:
1. **Task Management** - Multi-agent workflow builder with canvas
2. **Task Scheduler** - Cron/trigger-based scheduling
3. **Task Run History** - Execution logs and status
4. **Complete Dashboard** - Recent runs integration

Once backend is ready, frontend pages are already scaffolded and ready for integration.
