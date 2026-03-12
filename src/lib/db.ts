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
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // WhatsApp Accounts
  await sql`
    CREATE TABLE IF NOT EXISTS wa_accounts (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      api_key TEXT NOT NULL,
      account_type TEXT DEFAULT 'wasender',
      business_account_id TEXT DEFAULT '',
      phone_number_id TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      connected_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Campaign Runs
  await sql`
    CREATE TABLE IF NOT EXISTS campaign_runs (
      id SERIAL PRIMARY KEY,
      name TEXT DEFAULT '',
      account_id INTEGER,
      template_name TEXT NOT NULL,
      template_body TEXT NOT NULL,
      total_contacts INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      filters_used TEXT DEFAULT '',
      delay_before INTEGER DEFAULT 0,
      delay_between INTEGER DEFAULT 5,
      delay_unit TEXT DEFAULT 'seconds',
      randomize_delay BOOLEAN DEFAULT false,
      scheduled_at TIMESTAMP,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Campaign Messages Log
  await sql`
    CREATE TABLE IF NOT EXISTS campaign_messages (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL,
      phone TEXT NOT NULL,
      unit_name TEXT DEFAULT '',
      owner_name TEXT DEFAULT '',
      message_text TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      error_message TEXT DEFAULT '',
      sent_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export { sql };
