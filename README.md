# Wasender - WhatsApp Business Automation

WhatsApp business automation system for Mumtaz Properties. Built with Next.js, deployed on Vercel.

## Features

- **Send WhatsApp Messages** via WAsenderAPI
- **Receive & Log** incoming messages via webhook
- **Contact Management** synced from Google Sheets
- **Bulk Campaigns** with personalized templates
- **Dashboard** with real-time stats

## Setup

### 1. Deploy to Vercel

Click "Import Project" on Vercel and connect this repository.

### 2. Add Vercel Postgres

In your Vercel project dashboard, go to **Storage** → **Create Database** → **Postgres**. This auto-sets the `POSTGRES_*` environment variables.

### 3. Configure Environment Variables

In Vercel project settings → **Environment Variables**, add:

| Variable | Description |
|----------|-------------|
| `WASENDER_API_KEY` | Your WAsenderAPI API key |
| `WASENDER_WEBHOOK_SECRET` | Webhook secret for signature verification |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account email for Sheets API |
| `GOOGLE_PRIVATE_KEY` | Google service account private key |
| `GOOGLE_SHEET_ID` | Google Spreadsheet ID |
| `GOOGLE_SHEET_TAB` | Sheet tab name (default: "Time 1 New") |

### 4. Register Webhook

In WAsenderAPI dashboard, set your webhook URL to:

```
https://your-vercel-domain.vercel.app/api/webhook
```

### 5. Initialize Database

Visit the dashboard — it auto-creates tables on first load. Or call `POST /api/setup-db`.

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/send-message` | Send a single WhatsApp message |
| `POST` | `/api/send-bulk` | Send bulk campaign messages |
| `POST` | `/api/webhook` | Receive incoming WhatsApp messages |
| `GET` | `/api/contacts` | List all contacts |
| `POST` | `/api/contacts` | Add/update a contact |
| `GET` | `/api/messages` | List messages (filter by phone/direction) |
| `POST` | `/api/sync-sheets` | Sync contacts from Google Sheets |
| `POST` | `/api/setup-db` | Initialize database tables |

## Local Development

```bash
npm install
cp .env.example .env.local  # Fill in your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
