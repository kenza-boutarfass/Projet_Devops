# Take Over My Work

## Your AI Agent. Your Work. Under Control.

Take Over My Work is a personal workspace for students, professors, and professionals. It is designed to help people organize tasks and, over time, work with their academic and professional documents and workflows.

The current agent capability is deliberately limited: it can plan the creation of a personal task, request the user's approval, create the task after approval, and verify that it was saved. It does not currently read documents, summarize courses, connect to email, or send messages.

## Available now

- Account registration and sign-in with Student, Professor, and Professional profiles.
- Personal tasks: view, start, and complete tasks.
- Agent-assisted task creation with explicit human approval.
- Activity history for agent plans, approvals, and task actions.
- Authenticated API access with user-scoped task data.

## Planned

- Private document upload and document assistance.
- Study guides, teaching materials, and professional content preparation.
- Email provider connection, message reading, and draft assistance.
- Further agent tools and workflows.

Planned capabilities are shown as such in the application and are not simulated.

## Stack

- Frontend: React, React Router, Vite, JavaScript.
- Backend: Node.js, Express, PostgreSQL, JWT authentication.

## Development

### Backend

```bash
cd backend
npm install
npm run db:init
npm run dev
```

Backend URL: `http://localhost:5000`

Health endpoint: `http://localhost:5000/api/health`

Backend tests:

```bash
npm test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`
