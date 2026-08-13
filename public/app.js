// FamPay IMAP SaaS Gateway Client Logic

document.addEventListener('DOMContentLoaded', () => {
  loadMerchantKeys();
  loadAnalytics();
});

function switchSection(sectionId) {
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  
  const targetSec = document.getElementById(`sec-${sectionId}`);
  if (targetSec) targetSec.classList.add('active');

  const links = document.querySelectorAll('.nav-link');
  links.forEach(l => {
    if (l.innerText.toLowerCase().includes(sectionId)) l.classList.add('active');
  });

  if (sectionId === 'keys') loadMerchantKeys();
  if (sectionId === 'analytics') loadAnalytics();
}

async function createMerchantKeySubmit() {
  const storeName = document.getElementById('mch-name').value.trim();
  const vpa = document.getElementById('mch-vpa').value.trim();
  const gmailUser = document.getElementById('mch-gmail').value.trim();
  const appPassword = document.getElementById('mch-app-pass').value.trim();

  if (!storeName || !vpa || !gmailUser || !appPassword) {
    alert('⚠️ Please fill out all fields: Store Name, FamPay UPI VPA, Gmail address, and Google App Password!');
    return;
  }

  try {
    const res = await fetch('/api/v1/keys/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName, vpa, gmailUser, appPassword })
    });
    const data = await res.json();

    if (data.success) {
      alert(`🎉 Merchant API Key Generated!\n\nStore: ${storeName}\nAPI Key: ${data.apiKey}\n5% Platform Commission: shubh412@fam`);
      document.getElementById('pg-mch-key').value = data.apiKey;
      loadMerchantKeys();
      switchSection('playground');
    } else {
      alert(data.error);
    }
  } catch (e) {
    alert('Error generating merchant API key');
  }
}

async function loadMerchantKeys() {
  try {
    const res = await fetch('/api/v1/keys');
    const data = await res.json();
    const tbody = document.getElementById('mch-keys-table');
    if (!tbody || !data.merchants) return;

    tbody.innerHTML = data.merchants.map(m => `
      <tr>
        <td><b>${m.storeName}</b></td>
        <td><code>${m.vpa}</code></td>
        <td><code style="color:var(--cyan-primary);">${m.apiKeyMasked}</code></td>
        <td><span class="badge badge-green">${m.status}</span></td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('Error loading keys', e);
  }
}

async function executePgCreateQr() {
  const apiKey = document.getElementById('pg-mch-key').value.trim();
  const amount = document.getElementById('pg-amount').value;
  const outBox = document.getElementById('pg-qr-output');

  if (!apiKey) return alert('Enter your FamPay API Key');

  outBox.innerText = '// Generating dynamic UPI QR code...';

  try {
    const res = await fetch('/api/v1/payments/create-qr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ amount: Number(amount), userEmail: 'customer@demo.com' })
    });
    const json = await res.json();
    outBox.innerText = JSON.stringify(json, null, 2);
  } catch (e) {
    outBox.innerText = JSON.stringify({ error: e.message }, null, 2);
  }
}

async function loadAnalytics() {
  try {
    const res = await fetch('/api/v1/admin/analytics');
    const data = await res.json();
    if (data.success && data.analytics) {
      document.getElementById('adm-commission-val').innerText = `₹${data.analytics.totalCommissionEarnedINR.toFixed(2)}`;
      document.getElementById('adm-volume-val').innerText = `₹${data.analytics.totalVolumeINR.toFixed(2)}`;
    }
  } catch (e) {
    console.error('Error loading analytics', e);
  }
}
