const tls = require('tls');

/**
 * FamPay Dynamic UPI QR Generator
 * @param {Object} params
 * @param {string} params.vpa - FamPay UPI ID (e.g. 'shubh412@fam')
 * @param {number} params.amount - Amount in INR
 * @param {string} params.orderId - Unique Order ID (e.g. 'ORDER_12345')
 * @param {string} [params.name] - Business / Receiver Name
 * @returns {Object} { orderId, upiUri, qrImageUrl, vpa, amount }
 */
function createDynamicUpiQr({ vpa, amount, orderId, name = 'DemonAPI' }) {
  if (!vpa || !amount || !orderId) {
    throw new Error('Missing required parameters: vpa, amount, and orderId are required.');
  }

  const upiUri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${amount}&tn=${encodeURIComponent(orderId)}&cu=INR`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;

  return {
    orderId,
    vpa,
    amount,
    upiUri,
    qrImageUrl,
    createdAt: new Date().toISOString()
  };
}

/**
 * Strict Gmail IMAP Inbox Scanner
 * @param {Object} params
 * @param {string} params.gmailUser - Gmail address receiving payment emails
 * @param {string} params.appPassword - Google App Password (16 characters)
 * @param {string} params.orderId - Order ID string to search for in email body/subject
 * @param {number} [params.timeoutMs] - Socket timeout in milliseconds (default: 6000ms)
 * @returns {Promise<boolean>} Resolves true if matching email is found, false otherwise
 */
async function verifyFamPayImapPayment({ gmailUser, appPassword, orderId, timeoutMs = 6000 }) {
  if (!gmailUser || !appPassword || !orderId) {
    throw new Error('Missing required parameters: gmailUser, appPassword, and orderId are required.');
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
            // Parse line starting with '* SEARCH' followed by numeric sequence IDs
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
        console.error('FamPay IMAP Socket Error:', err.message);
        resolve(false);
      });

      setTimeout(() => {
        if (socket) socket.destroy();
        resolve(false);
      }, timeoutMs);
    } catch (err) {
      console.error('FamPay IMAP Exception:', err.message);
      resolve(false);
    }
  });
}

module.exports = {
  createDynamicUpiQr,
  verifyFamPayImapPayment
};
