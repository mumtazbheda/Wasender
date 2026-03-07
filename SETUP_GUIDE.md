# Wasender - Complete Setup Guide

## Project Overview
WhatsApp business automation platform for Mumtaz Properties built with Next.js 16, Vercel Postgres, NextAuth (Google OAuth), WAsenderAPI, and Google Sheets integration.

## Deployment URL
- **Live Site:** https://wasender-pi.vercel.app

---

## Environment Variables (Set in Vercel Dashboard)

### NextAuth Configuration
| Variable | Value |
|---|---|
| `NEXTAUTH_URL` | `https://wasender-pi.vercel.app` |
| `NEXTAUTH_SECRET` | (generate with `openssl rand -base64 32`) |

### Google OAuth
| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth Client Secret |

### Vercel Postgres (auto-filled when you connect a Postgres database in Vercel Storage tab)
| Variable | Value |
|---|---|
| `POSTGRES_URL` | Auto-filled by Vercel |
| `POSTGRES_PRISMA_URL` | Auto-filled by Vercel |
| `POSTGRES_URL_NON_POOLING` | Auto-filled by Vercel |
| `POSTGRES_USER` | Auto-filled by Vercel |
| `POSTGRES_HOST` | Auto-filled by Vercel |
| `POSTGRES_PASSWORD` | Auto-filled by Vercel |
| `POSTGRES_DATABASE` | Auto-filled by Vercel |

### WAsenderAPI (WhatsApp Integration)
| Variable | Value |
|---|---|
| `WASENDER_API_KEY` | Your WAsenderAPI key |
| `WASENDER_WEBHOOK_SECRET` | Your webhook secret for signature verification |

### Google Sheets Integration
| Variable | Value |
|---|---|
| `GOOGLE_SHEET_ID` | Your Google Spreadsheet ID |

---

## Google Cloud Console Setup (CRITICAL)

### Step 1: Create OAuth Client
1. Go to https://console.cloud.google.com
2. Navigate to **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **OAuth 2.0 Client ID**
4. Application type: **Web application**

### Step 2: Configure Authorized URIs
In your OAuth 2.0 Client settings, add:

**Authorized JavaScript Origins:**
```
https://wasender-pi.vercel.app
```

**Authorized Redirect URIs:**
```
https://wasender-pi.vercel.app/api/auth/callback/google
```

### Step 3: Enable Required APIs
In Google Cloud Console → **APIs & Services** → **Library**, enable:
- Google Sheets API (for contact sync)

---

## Current Issue & Fix

### Error: `redirect_uri_mismatch` (Error 400)
**Cause:** Google OAuth redirect URI not configured correctly.

**Fix:**
1. Go to Google Cloud Console → APIs & Credentials → OAuth 2.0 Client IDs
2. Click on your OAuth client
3. Add `https://wasender-pi.vercel.app/api/auth/callback/google` to **Authorized redirect URIs**
4. Add `https://wasender-pi.vercel.app` to **Authorized JavaScript origins**
5. Click Save
6. Wait 2-3 minutes for Google to propagate changes
7. Try signing in again (no redeploy needed)

---

## Vercel Postgres Setup

1. Go to Vercel Dashboard → Your Project → **Storage** tab
2. Click **Create Database** → **Postgres**
3. Connect it to the `wasender` project
4. This auto-fills all `POSTGRES_*` environment variables
5. Redeploy after connecting

---

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # Google OAuth (NextAuth)
│   │   ├── contacts/            # Contact CRUD
│   │   ├── messages/            # Message logging
│   │   ├── send-message/        # Send single WhatsApp message
│   │   ├── send-bulk/           # Bulk campaigns
│   │   ├── webhook/             # Incoming WAsenderAPI messages
│   │   ├── setup-db/            # Database table initialization
│   │   ├── sync-sheets/         # Google Sheets contact sync
│   │   ├── sheet-data/          # Get sheet data
│   │   ├── sheet-tabs/          # List sheet tabs
│   │   └── sheet-update/        # Update sheets
│   ├── campaigns/               # Campaign management page
│   ├── contacts/                # Contacts page
│   ├── messages/                # Messages page
│   ├── send/                    # Send message page
│   ├── page.tsx                 # Dashboard (homepage)
│   ├── layout.tsx               # Root layout with Sidebar
│   └── globals.css              # Tailwind styles
├── components/
│   ├── Sidebar.tsx              # Navigation sidebar
│   ├── StatCard.tsx             # Stat display component
│   └── SessionProvider.tsx      # NextAuth session provider
└── lib/
    ├── db.ts                    # Database utilities (Vercel Postgres)
    ├── sheets.ts                # Google Sheets integration
    └── wasender.ts              # WAsenderAPI integration
```

---

## App Routes
| Route | Description |
|---|---|
| `/` | Dashboard with stats and system status |
| `/contacts` | Contact management (CRUD + Google Sheets sync) |
| `/messages` | Message history (incoming & outgoing) |
| `/send` | Send single WhatsApp message |
| `/campaigns` | Bulk message campaign management |

---

## Webhook Endpoint
- **URL:** `https://wasender-pi.vercel.app/api/webhook`
- Set this in your WAsenderAPI dashboard to receive incoming messages
- Uses `WASENDER_WEBHOOK_SECRET` for signature verification

---

## Troubleshooting

### App shows 500 error / blank page
- Check that all environment variables are set in Vercel
- Make sure Vercel Postgres is connected (Storage tab)
- Redeploy after adding environment variables

### Google OAuth "redirect_uri_mismatch"
- Add `https://wasender-pi.vercel.app/api/auth/callback/google` to authorized redirect URIs in Google Cloud Console
- Wait 2-3 minutes after saving

### Database tables not created
- Visit the dashboard (`/`) - it auto-initializes tables on first load
- Or call `/api/setup-db` directly

### Messages not sending
- Verify `WASENDER_API_KEY` is set correctly
- Check WAsenderAPI dashboard for API key status

### Contacts not syncing from Google Sheets
- Verify `GOOGLE_SHEET_ID` is set
- Make sure Google Sheets API is enabled in Google Cloud Console
- The sheet must be accessible by the service account or publicly readable
