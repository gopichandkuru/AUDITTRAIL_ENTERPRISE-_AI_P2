# 🛡 AuditTrail Enterprise AI

> AI-powered audit trail, compliance monitoring, and anomaly detection platform.

![Stack](https://img.shields.io/badge/React-18-blue) ![Stack](https://img.shields.io/badge/Node.js-Express-green) ![Stack](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen) ![Stack](https://img.shields.io/badge/AI-Gemini-purple)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Server Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and Gemini API key
npm run seed    # Seed demo data (500 logs + users)
npm run dev     # Start server on :5000
```

### 2. Client Setup

```bash
cd client
npm install
npm run dev     # Start on :5173
```

### 3. Login

| Role    | Email                    | Password     |
|---------|--------------------------|--------------|
| Admin   | admin@audittrail.io      | admin123     |
| Auditor | sarah@audittrail.io      | auditor123   |
| Viewer  | marcus@audittrail.io     | viewer123    |

---

## 🤖 AI Features (Gemini)

Add your key to `server/.env`:
```
GEMINI_API_KEY=your_key_here
```
Get a key at https://aistudio.google.com/

Without a key, statistical analysis still works fully.

---

## 📡 Ingest API

Send audit events from any service:

```bash
curl -X POST http://localhost:5000/api/ingest \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[{"userId":"u1","userName":"John","action":"LOGIN","resource":"Session","severity":"INFO","status":"SUCCESS"}]'
```

---

## 🏗 Architecture

```
client/          React + Vite frontend (port 5173)
server/          Node.js + Express backend (port 5000)
  ├── models/    MongoDB schemas
  ├── routes/    API endpoints
  ├── controllers/
  ├── services/  AI + alert engine
  └── socket/    Socket.IO real-time events
```

---

## ✨ Features

- **Real-time log streaming** via Socket.IO
- **AI anomaly detection** — off-hours access, bulk deletes, privilege escalation
- **Natural language queries** — "Show failed logins from yesterday"
- **Executive summaries** — AI-generated compliance reports
- **User risk scoring** — behavioral risk calculation
- **Alert rules** — configurable threshold-based alerts
- **Activity heatmap** — hour × day-of-week visualization
- **SOC 2, GDPR, ISO 27001** report templates
- **Role-based access** — Admin, Auditor, Viewer
- **Event ingestion API** with API key auth
