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
  old_record?: Record<string, unknown> | null
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed' },
      405,
    )
  }

  /*
   * The Database Webhook calls this function directly.
   * Verify JWT must be OFF in the Edge Function settings.
   */
  let payload: WebhookPayload

  try {
    payload = await req.json()
  } catch {
    return jsonResponse(
      { error: 'Invalid JSON payload' },
      400,
    )
  }

  console.log('Live Chat webhook received', {
    type: payload.type,
    schema: payload.schema,
    table: payload.table,
    sender: payload.record?.sender,
    conversationId: payload.record?.conversation_id,
  })

  /*
   * Only accept INSERT events from public.chat_messages.
   */
  if (
    payload.type &&
    payload.type.toUpperCase() !== 'INSERT'
  ) {
    return jsonResponse({
      skipped: true,
      reason: 'Webhook event is not INSERT',
    })
  }

  if (
    payload.table &&
    payload.table !== 'chat_messages'
  ) {
    return jsonResponse({
      skipped: true,
      reason: 'Wrong database table',
      received_table: payload.table,
    })
  }

  if (
    payload.schema &&
    payload.schema !== 'public'
  ) {
    return jsonResponse({
      skipped: true,
      reason: 'Wrong database schema',
      received_schema: payload.schema,
    })
  }

  const message = payload.record

  if (!message) {
    return jsonResponse({
      skipped: true,
      reason: 'Message record is missing',
    })
  }

  /*
   * Do not notify for messages sent by the admin.
   */
  if (message.sender !== 'customer') {
    return jsonResponse({
      skipped: true,
      reason: 'Message was not sent by a customer',
    })
  }

  if (!message.conversation_id) {
    return jsonResponse({
      skipped: true,
      reason: 'conversation_id is missing',
    })
  }

  const customerMessage = String(
    message.message || '',
  )
    .trim()
    .slice(0, 1200)

  if (!customerMessage) {
    return jsonResponse({
      skipped: true,
      reason: 'Customer message is empty',
    })
  }

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL')

  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        error:
          'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is unavailable',
      },
      500,
    )
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )

  /*
   * Load the customer details using conversation_id.
   */
  const {
    data: conversation,
    error: conversationError,
  } = await supabase
    .from('support_conversations')
    .select('customer_name, customer_phone')
    .eq('id', message.conversation_id)
    .single()

  if (conversationError) {
    console.error(
      'Conversation lookup failed:',
      conversationError,
    )

    return jsonResponse(
      {
        error:
          `Conversation lookup failed: ${conversationError.message}`,
        conversation_id:
          message.conversation_id,
      },
      500,
    )
  }

  const customerName =
    String(
      conversation?.customer_name || 'Cliente',
    ).trim()

  const customerPhone =
    String(
      conversation?.customer_phone ||
      'Non renseigné',
    ).trim()

  const adminUrl =
    Deno.env.get('ADMIN_LIVE_CHAT_URL') || ''

  const digitsOnlyPhone =
    customerPhone.replace(/\D/g, '')

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
  ].join('\n')

  const telegramToken =
    Deno.env.get('TELEGRAM_BOT_TOKEN')

  const telegramChatId =
    Deno.env.get('TELEGRAM_CHAT_ID')

  if (!telegramToken || !telegramChatId) {
    return jsonResponse(
      {
        error:
          'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID',
      },
      500,
    )
  }

  const inlineKeyboard: Array<
    Array<{
      text: string
      url: string
    }>
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
          ...(inlineKeyboard.length > 0
            ? {
                reply_markup: {
                  inline_keyboard: inlineKeyboard,
                },
              }
            : {}),
        }),
      },
    )

    const telegramResult =
      await telegramResponse.json()

    if (!telegramResponse.ok) {
      console.error(
        'Telegram API error:',
        telegramResult,
      )

      return jsonResponse(
        {
          error: 'Telegram notification failed',
          telegram_status:
            telegramResponse.status,
          telegram_response:
            telegramResult,
        },
        502,
      )
    }

    console.log('Telegram notification sent', {
      messageId:
        telegramResult?.result?.message_id,
      conversationId:
        message.conversation_id,
      customerName,
    })

    return jsonResponse({
      ok: true,
      telegram: {
        sent: true,
        message_id:
          telegramResult?.result?.message_id,
      },
      chat_message_id: message.id,
      conversation_id:
        message.conversation_id,
    })
  } catch (error) {
    console.error(
      'Telegram request failed:',
      error,
    )

    return jsonResponse(
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
