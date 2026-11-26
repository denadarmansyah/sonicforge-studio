import crypto from 'node:crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  }

  const midtransKey = process.env.MIDTRANS_SERVER_KEY || ''
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!midtransKey || !supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({ error: 'Konfigurasi webhook belum lengkap.' })
  }

  const {
    order_id = '',
    status_code = '',
    gross_amount = '',
    signature_key = '',
    transaction_status = '',
    fraud_status = '',
    custom_field1: userId = '',
    custom_field2: billing = 'monthly',
  } = req.body || {}

  // Verifikasi tanda tangan SHA-512 Midtrans
  const expectedSig = crypto
    .createHash('sha512')
    .update(`${order_id}${status_code}${gross_amount}${midtransKey}`)
    .digest('hex')

  if (!signature_key || expectedSig !== String(signature_key).toLowerCase()) {
    return res.status(403).json({ error: 'Tanda tangan webhook tidak valid.' })
  }

  const isPaid =
    transaction_status === 'settlement' ||
    (transaction_status === 'capture' && fraud_status !== 'challenge')

  const isFailed = ['deny', 'cancel', 'expire'].includes(transaction_status)

  if (isPaid && userId) {
    const days = billing === 'yearly' ? 365 : 30
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        plan: 'pro',
        plan_expires_at: expiresAt,
      }),
    })

    await fetch(`${supabaseUrl}/rest/v1/subscriptions?provider_ref=eq.${encodeURIComponent(order_id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      }),
    })
  } else if (isFailed && order_id) {
    await fetch(`${supabaseUrl}/rest/v1/subscriptions?provider_ref=eq.${encodeURIComponent(order_id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        status: transaction_status === 'expire' ? 'expired' : 'cancelled',
      }),
    })
  }

  return res.status(200).json({ ok: true })
}
