import { sql } from "@vercel/postgres";

export async function initializeDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS contacts (
      id SERIAL PRIMARY KEY,
      unit_number TEXT UNIQUE,
      owner_name TEXT,
      phone TEXT NOT NULL,
      mobile2 TEXT,
      mobile3 TEXT,
      ahmed_feedback_1 TEXT,
      ahmed_feedback_2 TEXT,
      ahmed_feedback_3 TEXT,
      feedback_summary TEXT,
      contact_status TEXT DEFAULT 'New',
      last_updated TIMESTAMP DEFAULT NOW()
    )
  `;

  // Idempotent upgrades for existing tables
  await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile2 TEXT`;
  await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mobile3 TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      message_id TEXT UNIQUE,
      direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
      phone TEXT NOT NULL,
      message_text TEXT,
      wasender_msg_id TEXT,
      status TEXT DEFAULT 'sent',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      template TEXT NOT NULL,
      total_contacts INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export { sql };
