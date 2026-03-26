# AI Workflow Management System - Frontend

n8n-inspired canvas-first automation platform built with React + Vite.

## 🎨 Design Philosophy

This is **NOT** an IDE or traditional dashboard. It's a **canvas-first automation platform** modeled after n8n.io.

### Key Principles
- **White Theme Only** - Clean, professional light interface
- **64px Icon Sidebar** - Navigation with tooltips, no text labels
- **Canvas-First** - Full-screen React Flow for workflow building
- **Drawer Config** - All forms open in right `<Sheet>` drawer
- **Status Pulses** - Animated CSS indicators on nodes
- **No Modals** - Only for destructive confirmations

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

App runs on: **http://localhost:3000**

## 📁 Project Structure

```
src/
├── components/
│   ├── layout/          # AppShell, Sidebar, PageWrapper
│   ├── canvas/          # React Flow components
│   │   ├── nodes/       # AgentNode, TriggerNode, OutputNode
│   │   ├── edges/       # Custom edge components
│   │   └── inspector/   # Node configuration drawer
│   └── ui/              # Shadcn/Radix primitives
│
├── modules/             # 7 core pages
│   ├── dashboard/       # Stats + recent runs
│   ├── llm-settings/    # Provider configuration
│   ├── tools/           # Tool-to-agent mapping
│   ├── agents/          # Agent CRUD + dry run
│   ├── tasks/           # Canvas workflow builder
│   ├── scheduler/       # Cron + triggers
│   └── run-history/     # Execution logs
│
├── services/            # API layer (Axios)
├── store/               # Zustand state management
├── hooks/               # Custom React hooks
└── utils/               # Helpers & formatters
```

## 🎯 Core Features

### 1. Dashboard (`/`)
- 4 stat cards: Agents, Tasks, Schedules, Recent Runs
- Recent runs table with status badges
- Click-through navigation

### 2. Tasks Canvas (`/tasks`)
- **Full-screen React Flow canvas**
- Dot-grid background (#e5e7eb)
- 3 node types:
  - **Trigger** - Coral card, "▶ Start"
  - **Agent** - White card with status pulse
  - **Output** - Gray card, "⏹ End"
- Floating toolbar: Task Name · Auto-Suggest · Dry Run · Save
- Smooth step animated edges

### 3. Other Modules
- LLM Settings - Provider cards with Sheet config
- Tools - Two-panel tool assignment
- Agents - Tree view with Sheet editor
- Scheduler - Cron builder + triggers
- Run History - Table with log viewer

## 🎨 Design Tokens

```css
/* Colors */
--indigo: #6366f1;        /* Primary CTA */
--n8n-coral: #ff6d5a;     /* Accent */
--gray-50 to 900          /* Neutrals */

/* Typography */
font-family: Inter, 'Geist Sans', system-ui;

/* Spacing */
Sidebar: 64px fixed width
Canvas: Full screen (100vh - 0px)
```

## 🔧 Tech Stack

| Category | Library |
|----------|---------|
| Framework | React 18 + Vite |
| Language | JavaScript (JSX) |
| Styling | Tailwind CSS v3 |
| Components | Shadcn/UI + Radix UI |
| Canvas | React Flow (XYFlow) v12 |
| Icons | Lucide React |
| State | Zustand |
| HTTP | Axios |
| Routing | React Router v6 |

## 📡 API Integration

Backend expected at: `http://localhost:8000/api/v1`

Configure in `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
```

### API Services
- `agentService` - CRUD, dry run, Milvus status
- `taskService` - CRUD, auto-suggest, canvas save
- `llmService` - CRUD, test connection
- `toolService` - List tools
- `schedulerService` - CRUD, trigger
- `runHistoryService` - Logs, history

## 🎭 Canvas State Schema

Saved to PostgreSQL as JSONB:

```javascript
{
  nodes: [
    {
      id: "node-1",
      type: "trigger" | "agent" | "output",
      position: { x: 100, y: 200 },
      data: {
        label: "Start",
        agentId: "abc-123",
        agentName: "Sales Agent",
        llmOverride: null,
        status: "idle" | "running" | "success" | "failed"
      }
    }
  ],
  edges: [
    {
      id: "edge-1-2",
      source: "node-1",
      target: "node-2",
      animated: true,
      type: "smoothstep"
    }
  ]
}
```

## 🚫 Non-Negotiable Rules

1. **No full-page forms** - Always use Sheet drawer
2. **Sidebar is icon-only** - Tooltips on hover
3. **Tasks canvas is full-screen** - No headers/footers
4. **Status = badge + pulse** - Never plain text
5. **No dark mode** - White/light only
6. **No Bootstrap/Material/Ant** - Shadcn/Radix only

## 📝 Development Notes

- All components use JSX (no TypeScript)
- Design strictly follows n8n.io aesthetic
- Forms open in right Sheet drawer
- Status indicators use CSS pulse animations
- Canvas saves to backend as JSONB

## 🐛 Troubleshooting

**Blank page?**
- Check browser console (F12)
- Verify backend is running on port 8000
- Check `.env.local` configuration

**Canvas not rendering?**
- Ensure `@xyflow/react` is installed
- Check React Flow CSS import in WorkflowCanvas.jsx

**API errors?**
- Verify backend URL in `.env.local`
- Check CORS settings on FastAPI backend
- Open Network tab in DevTools

## 📚 Resources

- [React Flow Docs](https://reactflow.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn/UI](https://ui.shadcn.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [n8n.io](https://n8n.io/) - Design inspiration
