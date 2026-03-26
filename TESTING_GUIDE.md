# Testing Guide - Frontend ↔ Backend Integration

## ✅ Servers Running

### Backend (FastAPI)
- **URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Status**: ✅ Running

### Frontend (React + Vite)
- **URL**: http://localhost:3000
- **Status**: ✅ Running

## 🧪 Test Checklist

### 1. Dashboard Page (`/`)
**What to test:**
- [ ] Page loads without errors
- [ ] Stats cards show counts (Agents, Tasks, Schedules, Recent Runs)
- [ ] Cards are clickable and navigate to correct pages
- [ ] Recent runs table displays (empty state if no data)

**Expected API Call:**
```
GET http://localhost:8000/api/v1/dashboard/stats
```

**Expected Response:**
```json
{
  "agent_count": 0,
  "task_count": 0,
  "schedule_count": 0,
  "llm_config_count": 0,
  "tool_count": 2,
  "recent_runs": []
}
```

### 2. LLM Settings Page (`/llm-settings`)
**What to test:**
- [ ] Page loads without errors
- [ ] Shows empty state if no configs
- [ ] "Add Configuration" button visible
- [ ] If configs exist, shows cards with provider info
- [ ] Can set default config
- [ ] Can delete config (with confirmation)

**Expected API Calls:**
```
GET http://localhost:8000/api/v1/llm-configs/
POST http://localhost:8000/api/v1/llm-configs/{id}/set-default
DELETE http://localhost:8000/api/v1/llm-configs/{id}
```

### 3. Tools Page (`/tools`)
**What to test:**
- [ ] Page loads without errors
- [ ] Shows list of predefined tools
- [ ] Each tool card shows name, description, function_key
- [ ] Tools are read-only (no edit/delete buttons)

**Expected API Call:**
```
GET http://localhost:8000/api/v1/tools/?active_only=true
```

**Expected Response:**
```json
[
  {
    "id": "uuid",
    "name": "File System",
    "function_key": "file_system",
    "description": "Read, write, and search files",
    "is_active": true
  },
  {
    "id": "uuid",
    "name": "Web Search",
    "function_key": "web_search",
    "description": "Search the web",
    "is_active": true
  }
]
```

### 4. Agents Page (`/agents`)
**What to test:**
- [ ] Page loads without errors
- [ ] Shows empty state if no agents
- [ ] "Create Agent" button visible
- [ ] If agents exist, shows cards with agent info
- [ ] Each card shows skill file/system prompt indicators
- [ ] "Dry Run" and "Edit" buttons visible

**Expected API Call:**
```
GET http://localhost:8000/api/v1/agents/
```

### 5. Tasks Canvas Page (`/tasks`)
**What to test:**
- [ ] Page loads without errors
- [ ] Canvas renders with dot-grid background
- [ ] Sample workflow visible (Trigger → Agent → Output)
- [ ] Floating toolbar shows: Task Name, Auto-Suggest, Dry Run, Save
- [ ] Can pan and zoom canvas
- [ ] Nodes are draggable
- [ ] MiniMap shows in bottom-right
- [ ] Controls show in bottom-left

**No API calls yet** (Task module not implemented in backend)

## 🔍 How to Test

### Using Browser DevTools

1. **Open DevTools** (F12)
2. **Go to Console tab** - Check for errors
3. **Go to Network tab** - Monitor API calls
4. **Filter by XHR** - See only API requests

### Test Each Page

1. **Start at Dashboard** (`http://localhost:3000/`)
   - Check console for errors
   - Verify API call to `/dashboard/stats`
   - Click each stat card to navigate

2. **Test LLM Settings** (`http://localhost:3000/llm-settings`)
   - Should show empty state initially
   - Check API call to `/llm-configs/`

3. **Test Tools** (`http://localhost:3000/tools`)
   - Should show 2 tools (File System, Web Search)
   - Check API call to `/tools/`

4. **Test Agents** (`http://localhost:3000/agents`)
   - Should show empty state initially
   - Check API call to `/agents/`

5. **Test Tasks Canvas** (`http://localhost:3000/tasks`)
   - Should show canvas with sample workflow
   - No API calls yet

## 🐛 Common Issues & Solutions

### Issue: "Failed to load dashboard stats"
**Solution:** 
- Check if backend is running on port 8000
- Verify CORS is enabled in backend
- Check browser console for CORS errors

### Issue: Blank page
**Solution:**
- Open browser console (F12)
- Look for JavaScript errors
- Check if API base URL is correct in `.env.local`

### Issue: API calls failing
**Solution:**
- Verify backend is running: `http://localhost:8000/docs`
- Check network tab for failed requests
- Verify API endpoints match between frontend and backend

### Issue: CORS errors
**Solution:**
- Backend already has CORS enabled for all origins
- If still seeing errors, restart backend server

## 📊 Expected Data Flow

```
Frontend (React)
    ↓
API Service Layer (Axios)
    ↓
HTTP Request
    ↓
Backend (FastAPI)
    ↓
Service Layer
    ↓
Repository Layer
    ↓
Database (PostgreSQL)
```

## ✅ Success Criteria

- [ ] All pages load without console errors
- [ ] Dashboard shows correct counts
- [ ] LLM Settings page loads and displays configs
- [ ] Tools page shows predefined tools
- [ ] Agents page loads and displays agents
- [ ] Tasks canvas renders with sample workflow
- [ ] Navigation between pages works smoothly
- [ ] API calls visible in Network tab
- [ ] No CORS errors in console

## 🎯 Next Steps After Testing

1. **Create LLM Config** via API or Swagger UI
2. **Create Agent** with skill file
3. **Test Agent Dry Run** functionality
4. **Implement Task module** in backend
5. **Connect Task canvas** to backend API
6. **Implement Scheduler module**
7. **Implement Run History module**

## 📝 Notes

- Frontend uses `http://localhost:8000/api/v1` as base URL
- Backend serves API docs at `http://localhost:8000/docs`
- All API responses should be JSON
- Frontend handles errors gracefully with try/catch
- Empty states show when no data exists
