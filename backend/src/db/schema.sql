-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enum pour les 3 rôles de la plateforme
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('STUDENT', 'PROFESSOR', 'PROFESSIONAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  role user_role NOT NULL DEFAULT 'STUDENT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide par email et filtrage par rôle
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Table des projets
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  environment VARCHAR(50) NOT NULL DEFAULT 'Development',
  dataset_name VARCHAR(255) DEFAULT 'Not connected',
  status VARCHAR(50) NOT NULL DEFAULT 'Healthy',
  quality_score INTEGER NOT NULL DEFAULT 90,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Table des datasets
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  file_format VARCHAR(50) NOT NULL DEFAULT 'csv',
  row_count INTEGER NOT NULL DEFAULT 0,
  column_count INTEGER NOT NULL DEFAULT 0,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  raw_preview JSONB,
  profile_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasets_project_id ON datasets(project_id);

-- Table des règles de qualité (Human-in-the-loop & AI Discovery)
CREATE TABLE IF NOT EXISTS quality_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  column_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(100) NOT NULL,
  params JSONB DEFAULT '{}',
  severity VARCHAR(50) NOT NULL DEFAULT 'ERROR',
  description TEXT NOT NULL,
  rationale TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_rules_project_id ON quality_rules(project_id);
CREATE INDEX IF NOT EXISTS idx_quality_rules_status ON quality_rules(status);

-- Table des contrats de données exécutables (Data Contracts)
CREATE TABLE IF NOT EXISTS data_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL DEFAULT 'v1.0.0',
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  contract_spec JSONB NOT NULL,
  yaml_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_contracts_project_id ON data_contracts(project_id);

-- Table des exécutions de validation de contrats (Validation Engine Runs)
CREATE TABLE IF NOT EXISTS validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES data_contracts(id) ON DELETE SET NULL,
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'PASSED',
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  slo_minimum NUMERIC(5,2) NOT NULL DEFAULT 90.00,
  slo_policy VARCHAR(50) NOT NULL DEFAULT 'BLOCK_PIPELINE',
  slo_met BOOLEAN NOT NULL DEFAULT TRUE,
  total_assertions INTEGER NOT NULL DEFAULT 0,
  passed_assertions INTEGER NOT NULL DEFAULT 0,
  failed_assertions INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER NOT NULL DEFAULT 0,
  total_rows_evaluated INTEGER NOT NULL DEFAULT 0,
  assertions_result JSONB NOT NULL DEFAULT '[]'::jsonb,
  triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_runs_project_id ON validation_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_validation_runs_created_at ON validation_runs(created_at DESC);

-- Table des rapports de qualité et évaluations DevSecOps (Quality Reports & Reviews)
CREATE TABLE IF NOT EXISTS quality_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  validation_run_id UUID REFERENCES validation_runs(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES data_contracts(id) ON DELETE SET NULL,
  gate_status VARCHAR(50) NOT NULL DEFAULT 'PASSED',
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  slo_minimum NUMERIC(5,2) NOT NULL DEFAULT 90.00,
  slo_met BOOLEAN NOT NULL DEFAULT TRUE,
  summary_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  markdown_report TEXT NOT NULL DEFAULT '',
  professor_feedback TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_reports_project_id ON quality_reports(project_id);

CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_request TEXT NOT NULL,
  intent VARCHAR(100) NOT NULL,
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'AWAITING_APPROVAL'
    CHECK (status IN ('PENDING', 'PLANNING', 'AWAITING_APPROVAL', 'RUNNING', 'VERIFYING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  tool_result JSONB,
  verification_result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_executions_user_created
  ON agent_executions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_execution_id UUID UNIQUE REFERENCES agent_executions(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  due_date DATE,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due
  ON tasks(user_id, status, due_date);

CREATE TABLE IF NOT EXISTS execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  tool_name VARCHAR(100) NOT NULL,
  summary VARCHAR(300) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'AWAITING_APPROVAL'
    CHECK (status IN ('PENDING', 'AWAITING_APPROVAL', 'RUNNING', 'VERIFYING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB,
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (execution_id, step_index)
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL UNIQUE REFERENCES agent_executions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_user_status
  ON approval_requests(user_id, status, requested_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
  event_type VARCHAR(60) NOT NULL,
  summary VARCHAR(300) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_user_created
  ON audit_events(user_id, created_at DESC);
