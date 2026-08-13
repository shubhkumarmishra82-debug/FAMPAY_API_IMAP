const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { createDynamicUpiQr, verifyFamPayImapPayment } = require('./index');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Configuration
const FAMPAY_UPI_ID = process.env.FAMPAY_UPI_ID || 'shubh412@fam';
const GMAIL_USER = process.env.GMAIL_USER || 'ragini.19854@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || 'yhzlqqhtsxeaoztg';

// In-Memory Order Tracking Store
const ordersStore = new Map();

// 1. Generate Dynamic UPI QR Code Endpoint
app.post('/api/v1/payments/create-qr', (req, res) => {
  const { amount, userEmail, note } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, error: 'Valid amount is required' });
  }

  const orderId = `ORDER_DEMON_${Math.floor(100000 + Math.random() * 900000)}`;
  const qrData = createDynamicUpiQr({
    vpa: FAMPAY_UPI_ID,
    amount,
    orderId,
    name: 'DemonAPI'
  });

  const orderObj = {
    ...qrData,
    userEmail: userEmail || 'guest@demonapi.com',
    note: note || 'Payment for API Subscription',
    status: 'PENDING'
  };

  ordersStore.set(orderId, orderObj);

  res.json({
    success: true,
    message: 'FamPay Dynamic UPI QR Generated',
    order: orderObj
  });
});

// 2. Strict IMAP Email Verification Endpoint
app.post('/api/v1/payments/verify-imap', async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Order ID is required' });
  }

  const orderObj = ordersStore.get(orderId);
  if (orderObj && orderObj.status === 'PAID') {
    return res.json({
      success: true,
      verified: true,
      message: 'Order has already been verified and paid!',
      order: orderObj
    });
  }

  // Execute Strict IMAP Search on Gmail Inbox
  const isPaid = await verifyFamPayImapPayment({
    gmailUser: GMAIL_USER,
    appPassword: GMAIL_APP_PASSWORD,
    orderId
  });

  if (isPaid) {
    if (orderObj) {
      orderObj.status = 'PAID';
      orderObj.paidAt = new Date().toISOString();
    }

    return res.json({
      success: true,
      verified: true,
      message: `🎉 Payment verified via Gmail IMAP! Order ${orderId} marked as PAID.`,
      order: orderObj || { orderId, status: 'PAID' }
    });
  }

  res.json({
    success: true,
    verified: false,
    message: '❌ Payment email not detected in Gmail inbox yet. Complete the UPI payment and try again.',
    order: orderObj || { orderId, status: 'PENDING' }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', vpa: FAMPAY_UPI_ID, imapUser: GMAIL_USER });
});

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🔥 FAMPAY IMAP BACKEND MICROSERVICE RUNNING`);
  console.log(`🚀 API Base URL: http://localhost:${PORT}`);
  console.log(`💳 FamPay UPI VPA: ${FAMPAY_UPI_ID}`);
  console.log(`📧 Gmail IMAP Poller: ${GMAIL_USER}`);
  console.log(`==================================================\n`);
});
