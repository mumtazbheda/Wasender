# COMPLETE MUMTAZ PROPERTIES WHATSAPP SYSTEM DOCUMENTATION

**Version:** 1.0  
**Date:** March 7, 2026  
**Owner:** Mumtaz Ahmed (mumtazbheda@gmail.com)  
**System Status:** ✅ PRODUCTION READY

---

## TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Google Sheet Configuration](#google-sheet-configuration)
3. [WAsenderAPI Integration](#wasenderapi-integration)
4. [Database Schema](#database-schema)
5. [Webhook Configuration](#webhook-configuration)
6. [API Endpoints & Credentials](#api-endpoints--credentials)
7. [Complete Integration Flow](#complete-integration-flow)
8. [Message Templates](#message-templates)
9. [Implementation Guide for Developers](#implementation-guide-for-developers)

---

## SYSTEM OVERVIEW

This is a **WhatsApp business automation system** that integrates Google Sheets with WAsenderAPI to enable:

- ✅ WhatsApp message outreach to property contacts
- ✅ Automatic message tracking and logging
- ✅ Two-way conversation management
- ✅ Contact segmentation by engagement level
- ✅ Real-time webhook handling for incoming messages
- ✅ Database persistence of all communications

**Architecture:**
```
Google Sheets (Contact Data)
        ↓
   Database (Local Cache)
        ↓
   WAsenderAPI (WhatsApp Sending)
        ↓
   Webhook (Incoming Messages)
        ↓
   Database (Message Logging)
```

---

## GOOGLE SHEET CONFIGURATION

### Primary Sheet Details

| Property | Value |
|----------|-------|
| **Sheet Name** | Mumtaz VAM |
| **Sheet ID** | 1Ynq37NjK1khZB-XRPW_mC66zZWGzk6dmVTKDdAtHOJ0 |
| **URL** | https://docs.google.com/spreadsheets/d/1Ynq37NjK1khZB-XRPW_mC66zZWGzk6dmVTKDdAtHOJ0/edit?usp=drivesdk |
| **Owner** | Mumtaz Ahmed |
| **Google Account** | mumtazbheda@gmail.com |
| **Last Modified** | 2026-03-06 21:17:51 UTC |
| **File Size** | 848 KB |
| **Access Level** | Shared |

### Target Sheet: "Time 1 New"

This is the working sheet containing **Building 1 contact data**.

**Key Columns:**

| Column | Column Letter | Content | Purpose |
|--------|----------------|---------|---------|
| Unit Number | A | Property unit identifiers (e.g., 402, 615, 820) | Contact segmentation |
| Owner Name | B | Property owner name | Contact identification |
| Phone Number | C | Contact phone number (UAE format: 971XXXXXXXXX) | WhatsApp messaging target |
| Ahmed Feedback 1 | AV | Initial contact feedback | Conversation history |
| Ahmed Feedback 2 | AW | Follow-up feedback | Conversation history |
| Ahmed Feedback 3 | AX | Additional feedback | Conversation history |
| Other Data | Various | Property details, dates, prices | Reference data |

### Data Structure Example

```
Unit 1322:
- Phone: 971503817770
- Status: Active Discussion
- Feedback: Viewing scheduled - 9pm and 9:30pm - Payment confirmation pending

Unit 820:
- Phone: 971505449921
- Status: Inquiry
- Feedback: Initial inquiry about selling - Follow up on pricing

Unit 1213:
- Phone: 971552239965
- Status: Price Negotiation
- Feedback: Price negotiation - 500k selling price - Tenant coordination
```

### How to Access

**Via Google Sheets API:**
```
Spreadsheet ID: 1Ynq37NjK1khZB-XRPW_mC66zZWGzk6dmVTKDdAtHOJ0
Range Query: 'Time 1 New'!A1:AX100
Authentication: OAuth 2.0 (Google Service Account or User Account)
```

**Direct Access:**
- Use any Google Sheets API client library
- Requires read/write permissions
- Rate limited by Google (depends on plan)

---

## WASENDERAPI INTEGRATION

### Service Information

| Property | Value |
|----------|-------|
| **Service Name** | WAsenderAPI |
| **Website** | https://wasenderapi.com |
| **Documentation** | https://wasenderapi.com/api-docs |
| **API Base URL** | https://wasenderapi.com/api |
| **Status** | ✅ ACTIVE |
| **Plan Type** | Paid (Unlimited) |
| **Cost** | $6/month for unlimited messages |
| **Rate Limit** | No limit (post-upgrade) |

### Authentication Credentials

```
API Key: d067d03d79db55c604091b9778f2b7a85ce95481e4e2eaca81d5f1fe231b979a
Session ID: Ahmed
Connected Phone: +971567953489
Webhook Secret: 9dd6222ed853f8e7d27d186942c17d1c
```

### API Endpoints

#### 1. **Send Message Endpoint**

**URL:** `https://wasenderapi.com/api/send-message`

**Method:** `POST`

**Headers:**
```
Authorization: Bearer d067d03d79db55c604091b9778f2b7a85ce95481e4e2eaca81d5f1fe231b979a
Content-Type: application/json
```

**Request Body:**
```json
{
  "to": "+971585796887",
  "text": "Your message text here"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "msgId": 32612769,
    "jid": "+971585796887",
    "status": "in_progress"
  }
}
```

**Response (Error - 404/400):**
```json
{
  "success": false,
  "error": "Invalid endpoint or authentication"
}
```

#### 2. **Webhook Endpoint (Incoming Messages)**

**URL Pattern:** `https://webhooks.tasklet.ai/v1/public/webhook?token=SECRET_TOKEN`

**Method:** `POST`

**Headers Expected:**
```
Content-Type: application/json
```

**Incoming Webhook Payload (Example):**
```json
{
  "event": "messages.update",
  "sessionId": "d067d03d79db55c604091b9778f2b7a85ce95481e4e2eaca81d5f1fe231b979a",
  "data": {
    "remoteJid": "971585796887@s.whatsapp.net",
    "id": "3EB03E2CAB0EE096E3ED21",
    "msgId": 32613009,
    "message": {
      "extendedTextMessage": {
        "text": "How are you doing?"
      }
    },
    "messageTimestamp": "1772848323",
    "status": 2
  }
}
```

**To Register Webhook in WAsenderAPI:**
1. Log in to WAsenderAPI dashboard
2. Go to Settings → Webhooks
3. Add webhook URL: The URL shown in your trigger setup
4. Set webhook secret: `9dd6222ed853f8e7d27d186942c17d1c`
5. Enable "messages.update" event
6. Test the webhook

#### 3. **Session Management**

**Get Sessions:**
```
GET https://wasenderapi.com/api/sessions
Authorization: Bearer {API_KEY}
```

**Current Active Session:**
```
Name: Ahmed
Phone: +971567953489
Status: Connected via QR Code
```

### Key Features

- ✅ Send text messages
- ✅ Send images/media
- ✅ Receive incoming messages
- ✅ Webhook support
- ✅ QR code authentication (no business verification needed)
- ✅ Two-way messaging
- ✅ Message tracking with IDs
- ✅ Low ban risk

### Rate Limits (Post-Upgrade)

- **Messages Per Minute:** Unlimited
- **Daily Limit:** Unlimited
- **Monthly Cost:** $6 USD
- **Free Trial Limit:** 1 message/minute (no longer applicable)

---

## DATABASE SCHEMA

### Table 1: `time_one_building`

Stores contact information and feedback for Time 1 building units.

```sql
CREATE TABLE time_one_building (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_number TEXT UNIQUE,
  phone TEXT,
  ahmed_feedback_1 TEXT,
  ahmed_feedback_2 TEXT,
  ahmed_feedback_3 TEXT,
  feedback_summary TEXT,
  contact_status TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

**Sample Data:**
| ID | Unit | Phone | Status | Feedback Summary |
|----|------|-------|--------|------------------|
| 1 | 1322 | 971503817770 | Active Discussion | Viewing scheduled - 9pm and 9:30pm |
| 2 | 820 | 971505449921 | Inquiry | Initial inquiry about selling |
| 3 | 1213 | 971552239965 | Price Negotiation | 500k selling price - Tenant coordination |

### Table 2: `wasenderapi_config`

Stores WAsenderAPI configuration and credentials.

```sql
CREATE TABLE wasenderapi_config (
  id INTEGER PRIMARY KEY,
  service_name TEXT,
  api_key TEXT,
  session_id TEXT,
  connected_phone TEXT,
  connection_id TEXT,
  base_url TEXT,
  status TEXT,
  plan_type TEXT,
  rate_limit_messages_per_minute INTEGER,
  test_status TEXT,
  created_date TEXT,
  notes TEXT
)
```

**Current Record:**
```
service_name: WAsenderAPI
api_key: d067d03d79db55c604091b9778f2b7a85ce95481e4e2eaca81d5f1fe231b979a
session_id: Ahmed
connected_phone: +971567953489
base_url: https://wasenderapi.com/api
status: ACTIVE
plan_type: Paid (Unlimited)
created_date: 2026-03-07
notes: Ready for bulk messaging - unlimited plan active
```

### Table 3: `incoming_messages`

Logs all incoming WhatsApp messages.

```sql
CREATE TABLE incoming_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT UNIQUE,
  sender_phone TEXT,
  message_text TEXT,
  received_timestamp TEXT,
  message_type TEXT,
  status TEXT,
  user_notified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Example Records:**
```
message_id: 3EB03E2CAB0EE096E3ED21
sender_phone: +971585796887
message_text: "How are you ?"
received_timestamp: 1772848323
status: received
created_at: 2026-03-07 12:00:00
```

### Table 4: `webhook_config`

Stores webhook trigger configuration.

```sql
CREATE TABLE webhook_config (
  id INTEGER PRIMARY KEY,
  service_name TEXT,
  trigger_id TEXT,
  endpoint_id TEXT,
  purpose TEXT,
  status TEXT,
  created_date TEXT
)
```

**Current Record:**
```
service_name: WAsenderAPI
trigger_id: wti_0kjxs7vt292e2apxh78n
purpose: Receive incoming WhatsApp messages
status: ACTIVE
created_date: 2026-03-07
```

### Table 5: `webhook_credentials`

Stores webhook authentication tokens.

```sql
CREATE TABLE webhook_credentials (
  id INTEGER PRIMARY KEY,
  service_name TEXT,
  token TEXT,
  purpose TEXT,
  saved_date TEXT,
  status TEXT
)
```

**Current Record:**
```
service_name: WAsenderAPI
token: 9dd6222ed853f8e7d27d186942c17d1c
purpose: Webhook authentication for incoming messages
status: ACTIVE
saved_date: 2026-03-07
```

---

## WEBHOOK CONFIGURATION

### Incoming Message Webhook

**Purpose:** Automatically receive and log WhatsApp replies

**Setup Steps:**

1. **Create Webhook Endpoint:**
   - Generate unique token (automatically provided by platform)
   - Create POST endpoint to receive messages
   - Secure with authentication headers

2. **Register in WAsenderAPI Dashboard:**
   ```
   Webhook URL: https://webhooks.tasklet.ai/v1/public/webhook?token=SECRET_TOKEN
   Events: messages.update
   Secret: 9dd6222ed853f8e7d27d186942c17d1c
   ```

3. **Listen for Events:**
   - Platform sends POST requests when messages arrive
   - Extract sender phone and message text
   - Log to database

4. **Current Status:**
   - ✅ Webhook registered
   - ✅ Receiving messages successfully
   - ✅ Auto-logging active
   - ✅ Trigger ID: `wti_0kjxs7vt292e2apxh78n`

### Webhook Event Flow

```
Message Sent (WAsenderAPI)
        ↓
Recipient Replies
        ↓
WAsenderAPI Webhook Triggered
        ↓
POST to Webhook URL
        ↓
Extract Message Data
        ↓
Log to incoming_messages Table
        ↓
System Can Trigger Automated Replies
```

---

## API ENDPOINTS & CREDENTIALS

### Complete Credentials Summary

```
================== GOOGLE SHEETS ====================
Spreadsheet ID: 1Ynq37NjK1khZB-XRPW_mC66zZWGzk6dmVTKDdAtHOJ0
Sheet Name: Time 1 New
Google Account: mumtazbheda@gmail.com
API Type: Google Sheets API v4
Authentication: OAuth 2.0

================== WASENDERAPI ====================
Base URL: https://wasenderapi.com/api
Endpoint: /send-message (POST)
API Key: d067d03d79db55c604091b9778f2b7a85ce95481e4e2eaca81d5f1fe231b979a
Session ID: Ahmed
Connected Phone: +971567953489
Plan: Unlimited ($6/month)
Webhook Secret: 9dd6222ed853f8e7d27d186942c17d1c

================== DATABASE ====================
Tables: 6
Primary Table: time_one_building (15 contacts)
Message Log: incoming_messages (auto-updated)
Connection: SQL (SQLite/PostgreSQL compatible)
```

### Required API Calls for Integration

**1. Fetch Contacts from Google Sheets:**
```
GET https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/'Time 1 New'!A1:AX100
Authorization: Bearer {GOOGLE_AUTH_TOKEN}
```

**2. Send WhatsApp Message:**
```
POST https://wasenderapi.com/api/send-message
Authorization: Bearer d067d03d79db55c604091b9778f2b7a85ce95481e4e2eaca81d5f1fe231b979a
Content-Type: application/json

{
  "to": "+971585796887",
  "text": "Message content here"
}
```

**3. Receive Webhook Message:**
```
POST {WEBHOOK_URL}
Content-Type: application/json

{webhook payload from WAsenderAPI}
```

**4. Log Message to Database:**
```
INSERT INTO incoming_messages 
(message_id, sender_phone, message_text, received_timestamp, message_type, status)
VALUES (...)
```

---

## COMPLETE INTEGRATION FLOW

### Scenario 1: Sending a Message

```
1. User Requests: "Send message to +971585796887"
   │
2. System Prepares Payload:
   {
     "to": "+971585796887",
     "text": "Hi there! Testing WhatsApp connection 🎉"
   }
   │
3. Call WAsenderAPI:
   POST https://wasenderapi.com/api/send-message
   Headers: Authorization: Bearer {API_KEY}
   │
4. WAsenderAPI Response:
   {
     "success": true,
     "data": {
       "msgId": 32612769,
       "status": "in_progress"
     }
   }
   │
5. Log to Database or Display to User
   │
6. ✅ Message Sent Successfully
```

### Scenario 2: Receiving a Message

```
1. Recipient Replies on WhatsApp
   │
2. WAsenderAPI Detects Reply
   │
3. Webhook Triggered:
   POST https://webhooks.tasklet.ai/v1/public/webhook?token={TOKEN}
   Payload: {event, sessionId, data, timestamp}
   │
4. System Extracts:
   - sender_phone: +971585796887
   - message_text: "How are you ?"
   - message_id: 3EB03E2CAB0EE096E3ED21
   - timestamp: 1772848323
   │
5. Insert into incoming_messages Table
   │
6. ✅ Message Logged and Ready for Reply
```

### Scenario 3: Bulk Message Campaign

```
1. Fetch All Contacts from Google Sheets
   ├─ Unit 1322 → 971503817770
   ├─ Unit 820 → 971505449921
   ├─ Unit 1213 → 971552239965
   └─ ... (15 total units)
   │
2. For Each Contact:
   ├─ Prepare message with personalization
   ├─ Call WAsenderAPI send endpoint
   ├─ Respect rate limits (1 sec between messages or as configured)
   ├─ Log message sent to database
   └─ Store message ID for tracking
   │
3. Track Responses via Webhook
   │
4. Generate Report
   ├─ Messages sent: 15
   ├─ Delivered: 15
   ├─ Replied: X
   └─ Engagement rate: Y%
```

---

## MESSAGE TEMPLATES

### Greeting/Initial Contact

```
Hi {name}! 👋

I'm Ahmed from Mumtaz Properties. 

I noticed your interest in Unit {unit_number}. 

I wanted to reach out and see if you'd like to discuss more about the property or explore other opportunities.

Let me know how I can help! 🏠
```

### Follow-up to Inquiry

```
Hi {name},

Thanks for your interest in the property! 

I have some great updates to share about Unit {unit_number}.

Are you available for a quick call this week? 📞

Looking forward to speaking with you!
```

### Price Negotiation

```
Hi {name},

I understand you're interested in pricing for Unit {unit_number}.

I have some flexibility on the asking price and would love to work with you on a deal.

Can we schedule a time to discuss the details? 💼
```

### Property Update

```
Hi {name},

Quick update on Unit {unit_number}:

✅ {update_detail_1}
✅ {update_detail_2}
✅ {update_detail_3}

Is this still of interest? Let me know! 🔥
```

### Viewing Confirmation

```
Hi {name},

Just confirming our viewing appointment for Unit {unit_number}:

📅 Date: {date}
🕐 Time: {time}
📍 Location: {address}

See you then! Looking forward to it! 👍
```

---

## IMPLEMENTATION GUIDE FOR DEVELOPERS

### Prerequisites

- Node.js 16+ or Python 3.8+
- SQLite or PostgreSQL
- Google Sheets API credentials
- WAsenderAPI account with API key
- Webhook handler capability (for incoming messages)

### Step 1: Set Up Database

```sql
-- Create all tables
CREATE TABLE time_one_building (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_number TEXT UNIQUE,
  phone TEXT,
  ahmed_feedback_1 TEXT,
  ahmed_feedback_2 TEXT,
  ahmed_feedback_3 TEXT,
  feedback_summary TEXT,
  contact_status TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wasenderapi_config (
  id INTEGER PRIMARY KEY,
  service_name TEXT,
  api_key TEXT,
  session_id TEXT,
  connected_phone TEXT,
  connection_id TEXT,
  base_url TEXT,
  status TEXT,
  plan_type TEXT,
  rate_limit_messages_per_minute INTEGER,
  test_status TEXT,
  created_date TEXT,
  notes TEXT
);

CREATE TABLE incoming_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT UNIQUE,
  sender_phone TEXT,
  message_text TEXT,
  received_timestamp TEXT,
  message_type TEXT,
  status TEXT,
  user_notified INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE webhook_config (
  id INTEGER PRIMARY KEY,
  service_name TEXT,
  trigger_id TEXT,
  endpoint_id TEXT,
  purpose TEXT,
  status TEXT,
  created_date TEXT
);

CREATE TABLE webhook_credentials (
  id INTEGER PRIMARY KEY,
  service_name TEXT,
  token TEXT,
  purpose TEXT,
  saved_date TEXT,
  status TEXT
);
```

### Step 2: Google Sheets Integration

```python
from google.auth.transport.requests import Request
from google.oauth2.service_account import Credentials
import gspread

# Initialize Google Sheets API
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
credentials = Credentials.from_service_account_file(
    'credentials.json', scopes=SCOPES
)

client = gspread.authorize(credentials)
spreadsheet = client.open_by_key("1Ynq37NjK1khZB-XRPW_mC66zZWGzk6dmVTKDdAtHOJ0")
worksheet = spreadsheet.worksheet("Time 1 New")

# Fetch all data
data = worksheet.get_all_records()

# Parse contacts
for row in data:
    unit = row.get('Unit Number')
    phone = row.get('Phone Number')
    if unit and phone:
        # Store in database
        db.insert_contact(unit, phone)
```

### Step 3: WAsenderAPI Integration

```python
import requests
import json

API_KEY = "d067d03d79db55c604091b9778f2b7a85ce95481e4e2eaca81d5f1fe231b979a"
BASE_URL = "https://wasenderapi.com/api"

def send_message(phone_number, message_text):
    """
    Send a WhatsApp message via WAsenderAPI
    """
    url = f"{BASE_URL}/send-message"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "to": phone_number,
        "text": message_text
    }
    
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            return {
                'success': True,
                'message_id': data['data']['msgId'],
                'status': data['data']['status']
            }
    
    return {'success': False, 'error': response.text}

# Usage
result = send_message("+971585796887", "Hi there! 👋")
```

### Step 4: Webhook Handler

```python
from flask import Flask, request
import hmac
import hashlib
import json

app = Flask(__name__)
WEBHOOK_SECRET = "9dd6222ed853f8e7d27d186942c17d1c"

@app.route('/webhook', methods=['POST'])
def handle_webhook():
    """
    Handle incoming WhatsApp messages from WAsenderAPI
    """
    payload = request.get_json()
    
    # Verify webhook signature (if implemented)
    # signature = request.headers.get('X-Signature')
    
    # Extract message data
    if payload.get('event') == 'messages.update':
        data = payload.get('data', {})
        
        message_id = data.get('id')
        sender_jid = data.get('remoteJid')
        sender_phone = sender_jid.split('@')[0] if '@' in sender_jid else sender_jid
        
        message_text = data.get('message', {}).get('extendedTextMessage', {}).get('text', '')
        timestamp = data.get('messageTimestamp')
        
        # Check if message is from us (fromMe) or incoming
        if not data.get('key', {}).get('fromMe'):
            # This is an incoming message
            db.insert_message(
                message_id=message_id,
                sender_phone=sender_phone,
                message_text=message_text,
                timestamp=timestamp
            )
            
            return {'success': True, 'message': 'Message logged'}
    
    return {'success': False}

if __name__ == '__main__':
    app.run(port=5000)
```

### Step 5: Bulk Messaging Function

```python
import time

def send_bulk_messages(contacts, message_template, rate_limit_seconds=1):
    """
    Send messages to multiple contacts
    
    Args:
        contacts: List of {'phone': '...', 'unit': '...', 'name': '...'}
        message_template: String with {placeholders}
        rate_limit_seconds: Delay between messages
    """
    results = {
        'sent': 0,
        'failed': 0,
        'errors': []
    }
    
    for contact in contacts:
        try:
            # Personalize message
            message = message_template.format(
                name=contact.get('name'),
                unit=contact.get('unit')
            )
            
            # Send message
            result = send_message(contact['phone'], message)
            
            if result['success']:
                results['sent'] += 1
                db.log_sent_message(
                    contact['phone'],
                    message,
                    result['message_id']
                )
            else:
                results['failed'] += 1
                results['errors'].append({
                    'phone': contact['phone'],
                    'error': result.get('error')
                })
            
            # Respect rate limits
            time.sleep(rate_limit_seconds)
            
        except Exception as e:
            results['failed'] += 1
            results['errors'].append({
                'phone': contact['phone'],
                'error': str(e)
            })
    
    return results

# Usage
contacts = db.get_all_contacts()
result = send_bulk_messages(
    contacts,
    "Hi {name}! I have an update on Unit {unit}.",
    rate_limit_seconds=1
)
print(f"Sent: {result['sent']}, Failed: {result['failed']}")
```

### Step 6: Message Tracking

```python
def get_conversation_history(phone_number):
    """
    Get all messages sent to and received from a contact
    """
    return db.query("""
        SELECT * FROM incoming_messages 
        WHERE sender_phone = %s 
        ORDER BY created_at DESC
    """, [phone_number])

def get_campaign_stats():
    """
    Get overall campaign statistics
    """
    return db.query("""
        SELECT 
            COUNT(*) as total_messages,
            COUNT(DISTINCT sender_phone) as unique_senders,
            SUM(CASE WHEN status='received' THEN 1 ELSE 0 END) as received,
            SUM(CASE WHEN status='read' THEN 1 ELSE 0 END) as read
        FROM incoming_messages
    """)
```

### Deployment Checklist

- [ ] Database created and tables initialized
- [ ] Google Sheets API credentials configured
- [ ] WAsenderAPI account created and API key stored securely
- [ ] Webhook endpoint deployed and secure
- [ ] Webhook registered in WAsenderAPI dashboard
- [ ] Environment variables set for all credentials
- [ ] Rate limiting configured
- [ ] Error handling and logging implemented
- [ ] Message templates defined
- [ ] Database backup strategy implemented
- [ ] Testing completed with test phone numbers
- [ ] Production deployment ready

---

## SECURITY NOTES

### Credential Management

```
CRITICAL: Never commit credentials to version control
- Store API keys in environment variables
- Use .env files (add .env to .gitignore)
- Consider using secret management tools (AWS Secrets Manager, etc.)
```

### API Key Rotation

```
Current API Key: d067d03d79db55c604091b9778f2b7a85ce95481e4e2eaca81d5f1fe231b979a

Rotate every 90 days or if compromised:
1. Generate new API key in WAsenderAPI dashboard
2. Update all services using the key
3. Verify new key works
4. Revoke old key
5. Monitor for any errors
```

### Webhook Security

```
Webhook Secret: 9dd6222ed853f8e7d27d186942c17d1c

Implement signature verification:
1. Calculate HMAC-SHA256(payload, secret)
2. Compare with X-Signature header
3. Reject if signatures don't match
```

---

## TESTING

### Test Contacts (Available for Free Testing)

```
+971585796887 (Zoha) - Active test contact
+971564619688 - Previously tested

Status: Both are real test numbers with active replies
```

### Test Scenarios

1. **Send Single Message**
   - Send message to +971585796887
   - Verify delivery status in WAsenderAPI dashboard
   - Check webhook receives reply

2. **Bulk Send**
   - Send to 3-5 test contacts
   - Verify all messages are queued
   - Check delivery reports

3. **Webhook Handling**
   - Send message and wait for reply
   - Verify webhook is triggered
   - Check database contains message

4. **Rate Limiting**
   - Send 10 messages rapidly
   - Verify no rate limit errors (post-upgrade)

---

## MONITORING & MAINTENANCE

### Key Metrics

```
✅ Messages Sent: Check wasenderapi_config table
✅ Messages Received: Count rows in incoming_messages
✅ Error Rate: Monitor failed API calls
✅ Response Rate: Calculate replied/sent ratio
✅ Webhook Health: Check webhook trigger logs
```

### Regular Tasks

- Check API key expiration quarterly
- Review and archive old messages monthly
- Monitor webhook failures in logs
- Backup database weekly
- Test webhook connectivity monthly

---

## SUPPORT & DOCUMENTATION

**WAsenderAPI Documentation:** https://wasenderapi.com/api-docs

**Google Sheets API Reference:** https://developers.google.com/sheets/api

**Need Help?**
- Check API documentation first
- Review test responses in database
- Enable debug logging
- Test with curl before implementing in code

---

**Document Version:** 1.0  
**Last Updated:** March 7, 2026  
**Status:** ✅ Production Ready
