import { createClient } from 'npm:@supabase/supabase-js@2'

type WebhookPayload = {
  type?: string
  table?: string
  schema?: string
  record?: {
    id?: string
    conversation_id?: string
    sender?: string
    message?: string
    created_at?: string
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Accept calls from Supabase Database Webhooks securely.
  // The built-in "Supabase Edge Functions" webhook destination sends the
  // project's service-role key in the Authorization header. A custom
  // x-webhook-secret remains supported as an optional fallback for HTTP webhooks.
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const authorization = req.headers.get('authorization') || ''
  const expectedWebhookSecret = Deno.env.get('NOTIFICATION_WEBHOOK_SECRET') || ''
  const receivedWebhookSecret = req.headers.get('x-webhook-secret') || ''

  const authorizedByServiceRole = Boolean(
    serviceRoleKey && authorization === `Bearer ${serviceRoleKey}`
  )
  const authorizedByWebhookSecret = Boolean(
    expectedWebhookSecret && receivedWebhookSecret === expectedWebhookSecret
  )

  if (!authorizedByServiceRole && !authorizedByWebhookSecret) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let payload: WebhookPayload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400)
  }

  const message = payload.record
  if (!message || message.sender !== 'customer' || !message.conversation_id) {
    return json({ skipped: true, reason: 'Not a customer chat message' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Supabase server credentials are unavailable' }, 500)
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: conversation, error } = await supabase
    .from('support_conversations')
    .select('customer_name, customer_phone')
    .eq('id', message.conversation_id)
    .single()

  if (error) return json({ error: `Conversation lookup failed: ${error.message}` }, 500)

  const customerName = conversation?.customer_name || 'Cliente'
  const customerPhone = conversation?.customer_phone || 'Non renseigné'
  const customerMessage = String(message.message || '').slice(0, 1200)
  const adminUrl = Deno.env.get('ADMIN_LIVE_CHAT_URL') || ''
  const digitsOnlyPhone = String(customerPhone).replace(/\D/g, '')
  const whatsappUrl = digitsOnlyPhone ? `https://wa.me/${digitsOnlyPhone}` : ''

  const telegramText = [
    '💬 Nouveau message NARI’S WEAR',
    '',
    `Cliente : ${customerName}`,
    `Téléphone : ${customerPhone}`,
    `Message : ${customerMessage}`,
    adminUrl ? `\nOuvrir Live Chat : ${adminUrl}` : '',
  ].filter(Boolean).join('\n')

  const results: Record<string, unknown> = {}

  const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID')
  if (telegramToken && telegramChatId) {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: telegramText,
        disable_web_page_preview: true,
        ...((adminUrl || whatsappUrl) ? {
          reply_markup: {
            inline_keyboard: [
              ...(adminUrl ? [[{ text: '💬 Ouvrir Live Chat', url: adminUrl }]] : []),
              ...(whatsappUrl ? [[{ text: '📱 Répondre sur WhatsApp', url: whatsappUrl }]] : []),
            ],
          },
        } : {}),
      }),
    })
    results.telegram = telegramResponse.ok
      ? { sent: true }
      : { sent: false, status: telegramResponse.status, body: await telegramResponse.text() }
  } else {
    results.telegram = { sent: false, reason: 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID' }
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const notificationEmail = Deno.env.get('NOTIFICATION_EMAIL')
  const emailFrom = Deno.env.get('NOTIFICATION_EMAIL_FROM')
  if (resendApiKey && notificationEmail && emailFrom) {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [notificationEmail],
        subject: `Nouveau Live Chat — ${customerName}`,
        html: `
          <h2>Nouveau message NARI’S WEAR</h2>
          <p><strong>Cliente :</strong> ${escapeHtml(customerName)}</p>
          <p><strong>Téléphone :</strong> ${escapeHtml(customerPhone)}</p>
          <p><strong>Message :</strong><br>${escapeHtml(customerMessage).replaceAll('\n', '<br>')}</p>
          ${adminUrl ? `<p><a href="${escapeHtml(adminUrl)}">Ouvrir le Live Chat</a></p>` : ''}
        `,
      }),
    })
    results.email = emailResponse.ok
      ? { sent: true }
      : { sent: false, status: emailResponse.status, body: await emailResponse.text() }
  } else {
    results.email = { sent: false, reason: 'Email fallback is not configured' }
  }

  return json({ ok: true, results })
})

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]!)
}
