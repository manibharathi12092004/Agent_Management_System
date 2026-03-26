# Quick Start Guide - AI Workflow Management System

## 🚀 Start the Application

### 1. Start Backend (Terminal 1)
```bash
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```
✅ Backend running on: **http://localhost:8000**
✅ API docs: **http://localhost:8000/docs**

### 2. Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
✅ Frontend running on: **http://localhost:3000**

---

## 🎯 What's Working Right Now

### ✅ LLM Settings (`/llm-settings`)
**You can:**
- View all LLM configurations
- Create new config (OpenAI, Anthropic, Gemini, Ollama)
- Edit existing config
- Set default config
- Delete config

**Try it:**
1. Click "Add Configuration"
2. Fill in provider, API key, model name
3. Click "Create"
4. Click edit icon to modify
5. Click "Set as Default" to make it default

---

### ✅ Tools Management (`/tools`)
**You can:**
- View all predefined tools
- Assign tools to agents

**Try it:**
1. See list of available tools
2. Click "Assign to Agents" on any tool
3. Select agents from checkbox list
4. Click "Assign Tool"

---

### ✅ Agent Management (`/agents`)
**You can:**
- View all agents
- Create new agent with skill file or system prompt
- Edit existing agent
- Dry run agent with custom prompt

**Try it:**
1. Click "Create Agent"
2. Enter name and description
3. Choose:
   - **System Prompt**: Enter prompt in textarea
   - **Skill File**: Upload .md file
4. Select LLM config (optional)
5. Check tools to assign
6. Click "Create Agent"
7. Click "Dry Run" to test with a prompt

---

### ✅ Dashboard (`/`)
**You can:**
- View stats (agent count, task count, schedule count)
- See recent runs
- Navigate to modules by clicking cards

---

## 📊 Current Database State

The backend already has:
- **3 LLM configs** (check `/llm-settings`)
- **2 tools** (check `/tools`)
- **1 agent** (check `/agents`)

You can view, edit, and create more!

---

## 🎨 UI Features

### Design
- Clean white theme (n8n-inspired)
- 64px icon-only sidebar
- Smooth transitions
- Professional typography

### Interactions
- Hover effects on cards
- Modal forms (not full-page)
- Loading states
- Error messages
- Success feedback

---

## 🔧 API Endpoints Available

### LLM Configs
- `GET /api/v1/llm-configs/` - List all
- `POST /api/v1/llm-configs/` - Create
- `GET /api/v1/llm-configs/{id}` - Get single
- `PUT /api/v1/llm-configs/{id}` - Update
- `DELETE /api/v1/llm-configs/{id}` - Delete
- `POST /api/v1/llm-configs/{id}/set-default` - Set default

### Tools
- `GET /api/v1/tools/` - List all
- `GET /api/v1/tools/{id}` - Get single
- `POST /api/v1/tools/{id}/assign-agents` - Assign to agents

### Agents
- `GET /api/v1/agents/` - List all
- `POST /api/v1/agents/` - Create (with optional skill file)
- `GET /api/v1/agents/{id}` - Get single
- `POST /api/v1/agents/{id}/upload-skill` - Upload skill
- `POST /api/v1/agents/{id}/dry-run` - Test agent

### Dashboard
- `GET /api/v1/dashboard/stats` - Get stats

---

## 🧪 Testing Flows

### Test 1: Create LLM Config
1. Go to `/llm-settings`
2. Click "Add Configuration"
3. Fill form:
   - Name: "My OpenAI Config"
   - Provider: OpenAI
   - API Key: sk-...
   - Model: gpt-4
4. Submit
5. See new config in grid

### Test 2: Create Agent
1. Go to `/agents`
2. Click "Create Agent"
3. Fill form:
   - Name: "Research Agent"
   - Description: "Searches and analyzes information"
   - Choose "System Prompt"
   - Prompt: "You are a research assistant..."
   - Select LLM config
   - Check tools to assign
4. Submit
5. See new agent in grid

### Test 3: Assign Tool to Agent
1. Go to `/tools`
2. Click "Assign to Agents" on any tool
3. Select agents from list
4. Submit
5. Tool now assigned to selected agents

### Test 4: Dry Run Agent
1. Go to `/agents`
2. Click "Dry Run" on any agent
3. Enter prompt: "What is AI?"
4. Click "Execute"
5. See result in console output

---

## 📁 Project Structure

```
AgentManagementSystem/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py            # Entry point
│   │   ├── routers/           # API endpoints
│   │   ├── services/          # Business logic
│   │   ├── models/            # Database models
│   │   └── schemas/           # Pydantic schemas
│   └── venv/                  # Python virtual env
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── App.jsx            # Routes
│   │   ├── components/        # Reusable components
│   │   ├── modules/           # Page modules
│   │   ├── services/          # API clients
│   │   └── store/             # State management
│   └── node_modules/
│
├── INTEGRATION_COMPLETE.md    # Detailed status
├── CONTEXT_SUMMARY.md         # Project overview
└── QUICK_START.md             # This file
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Make sure you're using the venv Python
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

### Frontend won't start
```bash
# Install dependencies first
cd frontend
npm install
npm run dev
```

### CORS errors
- Backend CORS is configured for `http://localhost:3000`
- Make sure frontend is running on port 3000

### Database errors
- Check PostgreSQL connection in `backend/.env`
- Run migrations: `alembic upgrade head`

---

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs (when backend running)
- **Integration Status**: See `INTEGRATION_COMPLETE.md`
- **Endpoint Mapping**: See `ENDPOINTS_USAGE.md`
- **Project Context**: See `CONTEXT_SUMMARY.md`

---

## ✨ What's Next?

### Backend (Not Yet Implemented)
- Module 4: Task Management (workflow builder)
- Module 5: Task Scheduler (cron scheduling)
- Module 6: Task Run History (execution logs)

### Frontend (Ready, Waiting for Backend)
- Task canvas page (already built, needs backend)
- Scheduler page (scaffolded)
- Run history page (scaffolded)

---

## 🎉 Success!

You now have a fully functional AI agent management system with:
- ✅ LLM configuration management
- ✅ Tool assignment system
- ✅ Agent creation and testing
- ✅ Clean, professional UI
- ✅ All CRUD operations working

**Enjoy building AI workflows!** 🚀
