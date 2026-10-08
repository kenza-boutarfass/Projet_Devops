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




