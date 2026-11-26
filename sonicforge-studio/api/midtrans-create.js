import crypto from 'node:crypto'

const PLANS_PRICE_IDR = {
  monthly: 39000,
  yearly: 390000,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metode tidak diizinkan.' })
  }

  const midtransKey = process.env.MIDTRANS_SERVER_KEY || ''
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true'

  if (!midtransKey || !supabaseUrl || !serviceRoleKey) {
    return res.status(503).json({
      error:
        'Gateway pembayaran otomatis belum dikonfigurasi. Gunakan aktivasi manual melalui admin TikTok @luvenindonesia.',
    })
  }

  const authHeader = String(req.headers.authorization || '')
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!jwt) {
    return res.status(401).json({ error: 'Autentikasi diperlukan.' })
  }

  // Verifikasi pengguna melalui Supabase Auth REST API
  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${jwt}`,
    },
  })
  if (!userResp.ok) {
    return res.status(401).json({ error: 'Sesi login tidak valid atau kedaluwarsa.' })
  }
  const user = await userResp.json()
  const billing = req.body?.billing === 'yearly' ? 'yearly' : 'monthly'
  const amount = PLANS_PRICE_IDR[billing]
  const orderId = `LUVEN-${billing === 'yearly' ? 'YR' : 'MO'}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`

  const snapBase = isProd
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

  const midAuth = Buffer.from(`${midtransKey}:`).toString('base64')
  const snapResp = await fetch(snapBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${midAuth}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        email: user.email,
      },
      item_details: [
        {
          id: `luven-pro-${billing}`,
          price: amount,
          quantity: 1,
          name: `Luven Pro (${billing === 'yearly' ? 'Tahunan' : 'Bulanan'})`,
        },
      ],
      custom_field1: user.id,
      custom_field2: billing,
    }),
  })

  const snapData = await snapResp.json().catch(() => ({}))
  if (!snapResp.ok || !snapData.token) {
    return res.status(502).json({ error: 'Gagal membuat transaksi Midtrans.' })
  }

  // Catat order pending ke public.subscriptions
  await fetch(`${supabaseUrl}/rest/v1/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      user_id: user.id,
      plan: 'pro',
      status: 'pending',
      amount,
      provider: 'midtrans',
      provider_ref: orderId,
    }),
  })

  return res.status(200).json({
    orderId,
    token: snapData.token,
    redirectUrl: snapData.redirect_url || null,
  })
}
