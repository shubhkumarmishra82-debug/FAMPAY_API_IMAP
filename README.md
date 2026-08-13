<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,10,20,30&height=240&section=header&text=💳%20FAMPAY%20IMAP%20PAYMENT%20ENGINE&fontSize=46&fontColor=ffffff&animation=twinkling&desc=Dynamic%20FamPay%20UPI%20QR%20%2b%20Gmail%20IMAP%20Auto-Verification%20Backend&descSize=18&descAlignColor=06b6d4" width="100%" />

  <br />

  [![GitHub Stars](https://img.shields.io/github/stars/shubhkumarmishra82-debug/FAMPAY_API_IMAP?style=for-the-badge&color=8B5CF6&logo=github)](https://github.com/shubhkumarmishra82-debug/FAMPAY_API_IMAP)
  [![License](https://img.shields.io/badge/License-MIT-green.style=for-the-badge?style=for-the-badge&color=10B981&logo=open-source-initiative)](LICENSE)
  [![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](docker-compose.yml)
  [![Railway Ready](https://img.shields.io/badge/Railway-Deploys_Instantly-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](railway.json)

  <br />
  <br />

  <p align="center">
    <b>🔥 Standalone FamPay Dynamic UPI QR Generator & Gmail IMAP Auto-Payment Verification Microservice. Plug into ANY Website or Backend App!</b>
  </p>

</div>

---

## ⚡ Overview

`FAMPAY_API_IMAP` is a standalone, lightweight payment microservice and Node.js module that allows website developers to accept payments via **FamPay UPI** using dynamic QR codes and verify payments automatically using **Gmail IMAP** with Google App Passwords.

### Why Use This?
- ❌ **No Merchant Gateway Needed**: Skip expensive merchant onboarding fees and KYC procedures.
- ⚡ **Dynamic UPI QR Code**: Generates real-time UPI payment URIs (`upi://pay?pa=shubh412@fam&am=...&tn=ORDER_XXXXXX`).
- 🔒 **Strict IMAP Verification**: Connects to `imap.gmail.com:993` via TLS, searches incoming payment emails for the exact `ORDER_DEMON_...` ID, and confirms payment.

---

## 🔄 Architecture & Payment Flow

```mermaid
graph TD
    A["👤 User Clicks Pay on Website"] --> B["⚡ Send POST /api/v1/payments/create-qr"]
    B --> C["💳 Return Dynamic UPI QR Code (shubh412@fam)"]
    C --> D["📱 User Scans & Pays via FamPay / PhonePe / GPay / Paytm"]
    D --> E["📩 FamPay Sends Payment Alert Email to ragini.19854@gmail.com"]
    E --> F["🔍 Backend Calls POST /api/v1/payments/verify-imap"]
    F --> G["🔒 Connect to Gmail IMAP via TLS Port 993"]
    G --> H{"Exact Order ID Found in Inbox?"}
    H -->|YES| I["🎉 Return verified: true (Mark Order PAID)"]
    H -->|NO| J["❌ Return verified: false (Retry Pending)"]
```

---

## 🛠️ Quick Start & Integration

### Option 1: Use as a Standalone REST API Server

#### 1. Clone & Install
```bash
git clone https://github.com/shubhkumarmishra82-debug/FAMPAY_API_IMAP.git
cd FAMPAY_API_IMAP
npm install
```

#### 2. Configure Environment (`.env`)
```env
PORT=4000
NODE_ENV=production

# FamPay UPI VPA
FAMPAY_UPI_ID=shubh412@fam

# Gmail Account Receiving Payment Alerts
GMAIL_USER=ragini.19854@gmail.com

# 16-Character Google App Password
GMAIL_APP_PASSWORD=yhzlqqhtsxeaoztg
```

#### 3. Start Server
```bash
npm start
```
Your payment microservice is now live at `http://localhost:4000`!

---

## 🌐 REST API Endpoints

### 1. Generate Dynamic UPI QR Code
- **Endpoint**: `POST /api/v1/payments/create-qr`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "amount": 999,
  "userEmail": "user@example.com",
  "note": "Pro Subscription"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "FamPay Dynamic UPI QR Generated",
  "order": {
    "orderId": "ORDER_DEMON_542066",
    "vpa": "shubh412@fam",
    "amount": 999,
    "upiUri": "upi://pay?pa=shubh412%40fam&pn=DemonAPI&am=999&tn=ORDER_DEMON_542066&cu=INR",
    "qrImageUrl": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi...",
    "status": "PENDING"
  }
}
```

---

### 2. Verify IMAP Email Payment
- **Endpoint**: `POST /api/v1/payments/verify-imap`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "orderId": "ORDER_DEMON_542066"
}
```
- **Response (When Payment Email is Present)**:
```json
{
  "success": true,
  "verified": true,
  "message": "🎉 Payment verified via Gmail IMAP! Order ORDER_DEMON_542066 marked as PAID.",
  "order": {
    "orderId": "ORDER_DEMON_542066",
    "status": "PAID",
    "paidAt": "2026-08-13T22:15:00.000Z"
  }
}
```

---

## 📦 Option 2: Use as an In-Code Library (Node.js / Express)

You can import `index.js` directly into any Node.js codebase:

```javascript
const { createDynamicUpiQr, verifyFamPayImapPayment } = require('./index');

// 1. Generate QR Code
const qr = createDynamicUpiQr({
  vpa: 'shubh412@fam',
  amount: 999,
  orderId: 'ORDER_998877'
});
console.log('QR Image URL:', qr.qrImageUrl);

// 2. Strict IMAP Verification
const isPaid = await verifyFamPayImapPayment({
  gmailUser: 'ragini.19854@gmail.com',
  appPassword: 'yhzlqqhtsxeaoztg',
  orderId: 'ORDER_998877'
});

if (isPaid) {
  console.log('🎉 Payment Confirmed!');
} else {
  console.log('❌ Payment email not found yet.');
}
```

---

## 🚀 Deployment

### Deploy to Railway
1. Push this repo to GitHub.
2. Open [Railway.app](https://railway.app/) -> **Deploy from GitHub Repo**.
3. Railway automatically detects `railway.json` and launches your microservice!

### Deploy via Docker Compose
```bash
docker compose up -d --build
```

---

<div align="center">

  <sub>Built with ❤️ by Shubh Kumar Mishra. Licensed under MIT.</sub>

</div>
