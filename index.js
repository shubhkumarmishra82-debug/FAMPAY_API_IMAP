const tls = require('tls');

// Admin Platform Commission Configuration
const ADMIN_FAMPAY_UPI = 'shubh412@fam';
const PLATFORM_COMMISSION_PERCENT = 5.0; // 5% Commission

/**
 * Generate Multi-Merchant UPI Payment QR with 5% Platform Commission Split
 * @param {Object} params
 * @param {Object} params.merchant - Merchant API Key credentials object
 * @param {string} params.merchant.vpa - Merchant's FamPay UPI VPA (e.g. 'merchant@fam')
 * @param {string} params.merchant.storeName - Merchant's Store/Business Name
 * @param {number} params.amount - Total payment amount in INR
 * @param {string} params.orderId - Unique Order ID (e.g. 'ORDER_DEMON_102030')
 * @returns {Object} QR details, 5% commission split, and UPI URIs
 */
function createMerchantPaymentQr({ merchant, amount, orderId }) {
  if (!merchant || !merchant.vpa || !amount || !orderId) {
    throw new Error('Missing required params: merchant credentials, amount, and orderId required.');
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  // 5% Commission Calculation
  const commissionAmount = Math.round((numAmount * PLATFORM_COMMISSION_PERCENT / 100) * 100) / 100;
  const merchantNetAmount = Math.round((numAmount - commissionAmount) * 100) / 100;

  // Merchant Primary Payment UPI URI
  const merchantUpiUri = `upi://pay?pa=${encodeURIComponent(merchant.vpa)}&pn=${encodeURIComponent(merchant.storeName || 'Merchant Store')}&am=${numAmount}&tn=${encodeURIComponent(orderId)}&cu=INR`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(merchantUpiUri)}`;

  // Platform 5% Commission UPI URI
  const commissionUpiUri = `upi://pay?pa=${encodeURIComponent(ADMIN_FAMPAY_UPI)}&pn=${encodeURIComponent('DemonAPI Platform Commission')}&am=${commissionAmount}&tn=${encodeURIComponent(`COMMISSION_${orderId}`)}&cu=INR`;

  return {
    orderId,
    totalAmount: numAmount,
    merchantNetAmount,
    commissionAmount,
    commissionPercent: `${PLATFORM_COMMISSION_PERCENT}%`,
    merchantVpa: merchant.vpa,
    adminCommissionVpa: ADMIN_FAMPAY_UPI,
    upiUri: merchantUpiUri,
    qrImageUrl,
    commissionUpiUri,
    createdAt: new Date().toISOString()
  };
}

/**
 * Strict Gmail IMAP Inbox Scanner using Merchant Credentials
 * @param {Object} params
 * @param {string} params.gmailUser - Merchant's Gmail receiving payment alert emails
 * @param {string} params.appPassword - Merchant's 16-character Google App Password
 * @param {string} params.orderId - Order ID string to search for in Gmail inbox
 * @param {number} [params.timeoutMs] - Socket timeout in milliseconds
 * @returns {Promise<boolean>} Resolves true if matching email is found in inbox
 */
async function verifyMerchantImapPayment({ gmailUser, appPassword, orderId, timeoutMs = 6000 }) {
  if (!gmailUser || !appPassword || !orderId) {
    throw new Error('Missing required params: gmailUser, appPassword, and orderId required.');
  }

  const cleanAppPassword = appPassword.replace(/\s+/g, '');

  return new Promise((resolve) => {
    let socket;
    try {
      socket = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false }, () => {
        let step = 0;
        let emailFound = false;

        socket.on('data', (data) => {
          const str = data.toString();

          if (step === 0 && str.includes('* OK')) {
            step = 1;
            socket.write(`A1 LOGIN "${gmailUser}" "${cleanAppPassword}"\r\n`);
          } else if (step === 1 && str.includes('A1 OK')) {
            step = 2;
            socket.write(`A2 SELECT INBOX\r\n`);
          } else if (step === 2 && str.includes('A2 OK')) {
            step = 3;
            socket.write(`A3 SEARCH TEXT "${orderId}"\r\n`);
          } else if (step === 3) {
            const lines = str.split('\r\n');
            for (const line of lines) {
              if (line.startsWith('* SEARCH')) {
                const searchResultIds = line.substring(8).trim();
                if (searchResultIds.length > 0 && /\d+/.test(searchResultIds)) {
                  emailFound = true;
                }
              }
            }
            socket.write(`A4 LOGOUT\r\n`);
            socket.end();
            resolve(emailFound);
          }
        });
      });

      socket.on('error', (err) => {
        console.error('Merchant IMAP Socket Error:', err.message);
        resolve(false);
      });

      setTimeout(() => {
        if (socket) socket.destroy();
        resolve(false);
      }, timeoutMs);
    } catch (err) {
      console.error('Merchant IMAP Exception:', err.message);
      resolve(false);
    }
  });
}

module.exports = {
  ADMIN_FAMPAY_UPI,
  PLATFORM_COMMISSION_PERCENT,
  createMerchantPaymentQr,
  verifyMerchantImapPayment
};
