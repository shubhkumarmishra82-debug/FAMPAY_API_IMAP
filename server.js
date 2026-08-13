const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { ADMIN_FAMPAY_UPI, PLATFORM_COMMISSION_PERCENT, createMerchantPaymentQr, verifyMerchantImapPayment } = require('./index');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Store for Merchants, Keys, Orders & 5% Commission
const db = {
  merchants: [
    {
      id: 'mch_demo_1',
      apiKey: 'fp_live_demo1234567890abcdef',
      storeName: 'Demon Tech Store',
      vpa: 'shubh412@fam',
      gmailUser: 'ragini.19854@gmail.com',
      appPassword: 'yhzlqqhtsxeaoztg',
      totalVolume: 999.00,
      totalCommissionPaid: 49.95, // 5% of 999
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ],
  orders: new Map(),
  analytics: {
    totalVolumeINR: 999.00,
    totalCommissionEarnedINR: 49.95, // 5% to shubh412@fam
    totalOrdersCount: 1,
    successfulPaymentsCount: 1
  }
};

// Middleware: Authenticate Merchant API Key
function authenticateMerchantKey(req, res, next) {
  const authHeader = req.headers['authorization'];
  let keyString = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.query.api_key || req.body.api_key;

  if (!keyString) {
    // Default fallback to demo key for testing
    keyString = 'fp_live_demo1234567890abcdef';
  }

  const merchant = db.merchants.find(m => m.apiKey === keyString && m.status === 'active');
  if (!merchant) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid or inactive FamPay API Key. Create your key at /'
    });
  }

  req.merchant = merchant;
  next();
}

// ==================== MERCHANT API KEY MANAGEMENT ==================== //

// Register New Merchant & Generate FamPay IMAP API Key
app.post('/api/v1/keys/create', (req, res) => {
  const { storeName, vpa, gmailUser, appPassword } = req.body;

  if (!storeName || !vpa || !gmailUser || !appPassword) {
    return res.status(400).json({
      success: false,
      error: 'Missing required merchant details: storeName, vpa (FamPay UPI ID), gmailUser, and appPassword are required.'
    });
  }

  const cleanVpa = vpa.trim().toLowerCase();
  const cleanGmail = gmailUser.trim().toLowerCase();
  const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const newApiKey = `fp_live_${randomHex}`;

  const newMerchant = {
    id: `mch_${Date.now().toString(36)}`,
    apiKey: newApiKey,
    storeName: storeName.trim(),
    vpa: cleanVpa,
    gmailUser: cleanGmail,
    appPassword: appPassword.trim().replace(/\s+/g, ''),
    totalVolume: 0.00,
    totalCommissionPaid: 0.00,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  db.merchants.unshift(newMerchant);

  res.json({
    success: true,
    message: 'FamPay IMAP Payment API Key Generated Successfully',
    apiKey: newApiKey,
    merchant: {
      storeName: newMerchant.storeName,
      vpa: newMerchant.vpa,
      gmailUser: newMerchant.gmailUser,
      platformCommission: '5% to shubh412@fam'
    }
  });
});

app.get('/api/v1/keys', (req, res) => {
  res.json({
    success: true,
    merchantsCount: db.merchants.length,
    merchants: db.merchants.map(m => ({
      id: m.id,
      storeName: m.storeName,
      vpa: m.vpa,
      gmailUser: m.gmailUser,
      apiKeyMasked: m.apiKey.slice(0, 12) + '...',
      totalVolume: m.totalVolume,
      totalCommissionPaid: m.totalCommissionPaid,
      status: m.status
    }))
  });
});

// ==================== GATEWAY PAYMENTS & 5% COMMISSION ==================== //

// 1. Generate Dynamic UPI QR Code (Splits 5% Commission to shubh412@fam)
app.post('/api/v1/payments/create-qr', authenticateMerchantKey, (req, res) => {
  const { amount, userEmail, note } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, error: 'Valid amount in INR is required' });
  }

  const orderId = `ORDER_DEMON_${Math.floor(100000 + Math.random() * 900000)}`;
  const qrData = createMerchantPaymentQr({
    merchant: req.merchant,
    amount,
    orderId
  });

  const orderObj = {
    ...qrData,
    merchantId: req.merchant.id,
    merchantApiKey: req.merchant.apiKey,
    userEmail: userEmail || 'customer@merchantstore.com',
    note: note || `Order payment to ${req.merchant.storeName}`,
    status: 'PENDING'
  };

  db.orders.set(orderId, orderObj);
  db.analytics.totalOrdersCount++;

  res.json({
    success: true,
    message: `FamPay Dynamic UPI QR Generated (5% Commission Allocated to ${ADMIN_FAMPAY_UPI})`,
    order: orderObj
  });
});

// 2. Strict IMAP Email Verification via Merchant's Registered Gmail
app.post('/api/v1/payments/verify-imap', authenticateMerchantKey, async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Order ID is required' });
  }

  const orderObj = db.orders.get(orderId);
  if (orderObj && orderObj.status === 'PAID') {
    return res.json({
      success: true,
      verified: true,
      message: 'Order has already been verified and paid!',
      order: orderObj
    });
  }

  // Execute Strict IMAP Search on Merchant's Registered Gmail
  const isPaid = await verifyMerchantImapPayment({
    gmailUser: req.merchant.gmailUser,
    appPassword: req.merchant.appPassword,
    orderId
  });

  if (isPaid) {
    if (orderObj) {
      orderObj.status = 'PAID';
      orderObj.paidAt = new Date().toISOString();
    }

    // Record Volume & 5% Commission for shubh412@fam
    const totalAmt = orderObj ? orderObj.totalAmount : 0;
    const commissionAmt = orderObj ? orderObj.commissionAmount : 0;

    req.merchant.totalVolume += totalAmt;
    req.merchant.totalCommissionPaid += commissionAmt;

    db.analytics.totalVolumeINR += totalAmt;
    db.analytics.totalCommissionEarnedINR += commissionAmt;
    db.analytics.successfulPaymentsCount++;

    return res.json({
      success: true,
      verified: true,
      message: `🎉 Payment verified via Gmail IMAP! 5% Platform Commission (₹${commissionAmt}) routed to ${ADMIN_FAMPAY_UPI}`,
      order: orderObj || { orderId, status: 'PAID' }
    });
  }

  res.json({
    success: true,
    verified: false,
    message: `❌ Payment email for ${orderId} not detected in ${req.merchant.gmailUser} inbox yet. Complete the UPI payment and try again.`,
    order: orderObj || { orderId, status: 'PENDING' }
  });
});

// ==================== ADMIN & COMMISSION TELEMETRY ==================== //

app.get('/api/v1/admin/analytics', (req, res) => {
  res.json({
    success: true,
    adminFamPayUpi: ADMIN_FAMPAY_UPI,
    commissionRate: `${PLATFORM_COMMISSION_PERCENT}%`,
    analytics: db.analytics,
    merchantsCount: db.merchants.length,
    activeOrdersCount: db.orders.size,
    merchants: db.merchants
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    adminUpi: ADMIN_FAMPAY_UPI,
    commission: '5%',
    totalMerchants: db.merchants.length
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🔥 FAMPAY IMAP PAYMENT SAAS GATEWAY RUNNING`);
  console.log(`🚀 Gateway Base URL: http://localhost:${PORT}`);
  console.log(`💰 Platform 5% Commission VPA: ${ADMIN_FAMPAY_UPI}`);
  console.log(`==================================================\n`);
});
