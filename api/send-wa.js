export default async function handler(req, res) {
  /* 🌐 سماح CORS لكل المصادر (محلي + دومينات) */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (req.headers['x-admin-key'] !== process.env.WA_ADMIN_KEY) return res.status(403).json({ ok: false });

  const { to, body } = req.body || {};
  try {
    const r = await fetch(`https://graph.facebook.com/v17.0/${process.env.WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: String(to).replace(/\D/g, ''),
        type: 'text',
        text: { body: body || '' }
      })
    });
    const j = await r.json().catch(() => ({}));
    res.status(r.status).json(j);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}