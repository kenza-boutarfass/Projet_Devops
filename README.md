# Projet_Devops

## From Messy Data to Executable Quality

## Project Concept

The platform is an AI-powered data quality platform that analyzes datasets and their documentation, proposes data quality rules using AI, lets humans review those rules, generates executable Data Contracts, validates datasets, and eventually integrates quality validation into CI/CD. AI will help discover and explain candidate rules; deterministic validation will remain responsible for executing approved rules and reporting results.

## Current Architecture

```text
React
	↓
REST API
	↓
Express
	↓
PostgreSQL (coming next)
	↓
AI Engine (coming later)
```

## Current Stack

- React
- Vite
- JavaScript
- Node.js
- Express.js
- REST API
- PostgreSQL (planned)
- AI (planned)
- Docker (planned)
- GitHub Actions (planned)
- Playwright (planned)
- Vitest (planned)
- Prometheus/Grafana (planned)

## Project Structure

```text
Projet_Devops/
├── backend/
├── frontend/
├── photos/
├── .gitignore
└── README.md
```

## Development

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend URL: `http://localhost:5000`

Health endpoint: `http://localhost:5000/api/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`