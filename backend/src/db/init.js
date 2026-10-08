require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const defaultDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/data_quality_devops';

// Extraire les infos pour la connexion admin initiale vers "postgres"
const url = new URL(defaultDbUrl);
const dbName = url.pathname.replace(/^\//, '') || 'data_quality_devops';

const adminUrl = new URL(defaultDbUrl);
adminUrl.pathname = '/postgres';

async function initDatabase() {
  console.log('🚀 Starting PostgreSQL initialization...');

  // 1. Connexion d'administration pour vérifier/créer la base de données
  const adminClient = new Client({ connectionString: adminUrl.toString() });
  try {
    await adminClient.connect();
    console.log(`🔌 Connected to PostgreSQL as admin (${adminUrl.hostname}:${adminUrl.port || 5432})`);

    const checkDbRes = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (checkDbRes.rows.length === 0) {
      console.log(`📦 Database "${dbName}" does not exist. Creating...`);
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully.`);
    } else {
      console.log(`ℹ️ Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('❌ Failed during database creation check:', err.message);
    throw err;
  } finally {
    await adminClient.end();
  }

  // 2. Connexion à la base de données cible "data_quality_devops"
  const appClient = new Client({ connectionString: defaultDbUrl });
  try {
    await appClient.connect();
    console.log(`🔌 Connected to database "${dbName}"`);

    // 3. Exécution du schéma SQL
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Applying schema.sql (Extensions, Roles ENUM, Users table)...');
    await appClient.query(schemaSql);
    console.log('✅ Schema applied successfully.');

    // 4. Insertion des utilisateurs de test (Seed) pour les 3 rôles
    const seedUsers = [
      {
        email: 'student@example.com',
        password: 'Password123!',
        fullName: 'Alexandre Étudiant',
        role: 'STUDENT',
      },
      {
        email: 'professor@example.com',
        password: 'Password123!',
        fullName: 'Prof. Laurent Martin',
        role: 'PROFESSOR',
      },
      {
        email: 'pro@example.com',
        password: 'Password123!',
        fullName: 'Sarah Ingénieure Data',
        role: 'PROFESSIONAL',
      },
    ];

    console.log('🌱 Seeding initial demo users for the 3 roles...');
    for (const user of seedUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      const insertQuery = `
        INSERT INTO users (email, password_hash, full_name, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE 
        SET full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            updated_at = NOW()
        RETURNING id, email, full_name, role, created_at;
      `;
      const res = await appClient.query(insertQuery, [
        user.email,
        passwordHash,
        user.fullName,
        user.role,
      ]);
      console.log(`   👤 User seeded: ${res.rows[0].email} [Role: ${res.rows[0].role}] (ID: ${res.rows[0].id})`);
    }

    // 5. Insertion des projets initiaux (seed)
    console.log('📂 Seeding initial projects for demo users...');
    const studentUser = (await appClient.query("SELECT id FROM users WHERE email = 'student@example.com'")).rows[0];
    const proUser = (await appClient.query("SELECT id FROM users WHERE email = 'pro@example.com'")).rows[0];

    if (studentUser) {
      const studentProjects = [
        {
          name: 'Customer Core',
          slug: 'customer-core',
          description: 'Customer identity and account reference data.',
          dataset: 'customers_2025.csv',
          score: 96,
          status: 'Healthy',
          environment: 'Development',
        },
        {
          name: 'Commerce Events',
          slug: 'commerce-events',
          description: 'Order lifecycle events from digital channels.',
          dataset: 'orders_stream.parquet',
          score: 84,
          status: 'Needs review',
          environment: 'Staging',
        },
      ];

      for (const p of studentProjects) {
        await appClient.query(
          `INSERT INTO projects (name, slug, description, dataset_name, quality_score, status, environment, owner_id)
           SELECT $1::varchar, $2::varchar, $3::text, $4::varchar, $5::int, $6::varchar, $7::varchar, $8::uuid
           WHERE NOT EXISTS (SELECT 1 FROM projects WHERE slug = $2::varchar AND owner_id = $8::uuid)`,
          [p.name, p.slug, p.description, p.dataset, p.score, p.status, p.environment, studentUser.id]
        );
        console.log(`   📁 Project seeded for Student: ${p.name}`);
      }
    }

    if (proUser) {
      await appClient.query(
        `INSERT INTO projects (name, slug, description, dataset_name, quality_score, status, environment, owner_id)
         SELECT $1::varchar, $2::varchar, $3::text, $4::varchar, $5::int, $6::varchar, $7::varchar, $8::uuid
         WHERE NOT EXISTS (SELECT 1 FROM projects WHERE slug = $2::varchar AND owner_id = $8::uuid)`,
        ['Finance Ledger', 'finance-ledger', 'Monthly ledger exports for reconciliation.', 'ledger_q4.xlsx', 68, 'Failed', 'Production', proUser.id]
      );
      console.log(`   📁 Project seeded for Professional: Finance Ledger`);
    }

    // 6. Afficher le récapitulatif
    const countRes = await appClient.query('SELECT role, COUNT(*) AS count FROM users GROUP BY role');
    console.log('\n📊 Summary of users by role in database:');
    countRes.rows.forEach((r) => {
      console.log(`   - ${r.role}: ${r.count} user(s)`);
    });

    const projectCountRes = await appClient.query('SELECT COUNT(*) AS count FROM projects');
    console.log(`   - TOTAL PROJECTS: ${projectCountRes.rows[0].count}`);

    console.log('\n✨ Database setup & initialization completed successfully!\n');
  } catch (err) {
    console.error('❌ Failed during schema application or seeding:', err.message);
    throw err;
  } finally {
    await appClient.end();
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { initDatabase };
