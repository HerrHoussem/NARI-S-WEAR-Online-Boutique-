type WebhookPayload = {
  type?: string
  table?: string
  schema?: string
  record?: {
    id?: string
    customer_name?: string
    customer_phone?: string
    message?: string
    status?: string
    created_at?: string
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let payload: WebhookPayload

  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400)
  }

  console.log('Live Chat webhook received', {
    type: payload.type,
    table: payload.table,
    schema: payload.schema,
    record: payload.record,
  })

  /*
   * Only process new rows from public.support_messages.
   */
  if (payload.type && payload.type.toUpperCase() !== 'INSERT') {
    return json({
      skipped: true,
      reason: 'Event is not INSERT',
    })
  }

  if (payload.table && payload.table !== 'support_messages') {
    return json({
      skipped: true,
      reason: 'Wrong database table',
    })
  }

  if (payload.schema && payload.schema !== 'public') {
    return json({
      skipped: true,
      reason: 'Wrong database schema',
    })
  }

  const supportMessage = payload.record

  if (!supportMessage) {
    return json({
      skipped: true,
      reason: 'Message record is missing',
    })
  }

  const customerName =
    String(supportMessage.customer_name || '').trim() || 'Cliente'

  const customerPhone =
    String(supportMessage.customer_phone || '').trim() ||
    'Non renseigné'

  const customerMessage =
    String(supportMessage.message || '').trim().slice(0, 1200)

  if (!customerMessage) {
    return json({
      skipped: true,
      reason: 'Message is empty',
    })
  }

  const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const telegramChatId = Deno.env.get('TELEGRAM_CHAT_ID')
  const adminUrl = Deno.env.get('ADMIN_LIVE_CHAT_URL') || ''

  if (!telegramToken || !telegramChatId) {
    return json(
      {
        error:
          'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID',
      },
      500,
    )
  }

  const digitsOnlyPhone = customerPhone.replace(/\D/g, '')

  const whatsappUrl = digitsOnlyPhone
    ? `https://wa.me/${digitsOnlyPhone}`
    : ''

  const telegramText = [
    '💬 Nouveau message NARI’S WEAR',
    '',
    `👤 Cliente : ${customerName}`,
    `📞 Téléphone : ${customerPhone}`,
    '',
    '💬 Message :',
    customerMessage,
    '',
    supportMessage.created_at
      ? `🕒 Date : ${supportMessage.created_at}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const inlineKeyboard: Array<
    Array<{ text: string; url: string }>
  > = []

  if (adminUrl) {
    inlineKeyboard.push([
      {
        text: '💬 Ouvrir Live Chat',
        url: adminUrl,
      },
    ])
  }

  if (whatsappUrl) {
    inlineKeyboard.push([
      {
        text: '📱 Répondre sur WhatsApp',
        url: whatsappUrl,
      },
    ])
  }

  try {
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${telegramToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: telegramText,
          disable_web_page_preview: true,
          ...(inlineKeyboard.length
            ? {
                reply_markup: {
                  inline_keyboard: inlineKeyboard,
                },
              }
            : {}),
        }),
      },
    )

    const telegramBody = await telegramResponse.json()

    if (!telegramResponse.ok) {
      console.error('Telegram API error', telegramBody)

      return json(
        {
          error: 'Telegram notification failed',
          telegram: telegramBody,
        },
        502,
      )
    }

    console.log('Telegram notification sent', {
      messageId: telegramBody?.result?.message_id,
      customerName,
    })

    return json({
      ok: true,
      telegram: {
        sent: true,
        message_id: telegramBody?.result?.message_id,
      },
      support_message_id: supportMessage.id,
    })
  } catch (error) {
    console.error('Telegram request failed', error)

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Telegram request failed',
      },
      500,
    )
  }
})
