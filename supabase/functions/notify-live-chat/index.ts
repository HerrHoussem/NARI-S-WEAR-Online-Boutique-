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
    schema: payload.schema,
    table: payload.table,
    sender: payload.record?.sender,
    conversationId: payload.record?.conversation_id,
  })

  /*
   * Accept only new rows inserted into public.support_messages.
   */
  if (
    payload.type &&
    payload.type.toUpperCase() !== 'INSERT'
  ) {
    return json({
      skipped: true,
      reason: 'Webhook event is not INSERT',
    })
  }

  if (
    payload.table &&
    payload.table !== 'support_messages'
  ) {
    return json({
      skipped: true,
      reason: 'Webhook is not from support_messages',
    })
  }

  if (
    payload.schema &&
    payload.schema !== 'public'
  ) {
    return json({
      skipped: true,
      reason: 'Webhook is not from public schema',
    })
  }

  const message = payload.record

  if (!message) {
    return json({
      skipped: true,
      reason: 'Message record is missing',
    })
  }

  if (message.sender !== 'customer') {
    return json({
      skipped: true,
      reason: 'Message was not sent by a customer',
    })
  }

  if (!message.conversation_id) {
    return json({
      skipped: true,
      reason: 'conversation_id is missing',
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        error: 'Supabase server credentials are unavailable',
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

  const { data: conversation, error: conversationError } =
    await supabase
      .from('support_conversations')
      .select('customer_name, customer_phone')
      .eq('id', message.conversation_id)
      .single()

  if (conversationError) {
    console.error(
      'Conversation lookup failed:',
      conversationError,
    )

    return json(
      {
        error: `Conversation lookup failed: ${conversationError.message}`,
      },
      500,
    )
  }

  const customerName =
    conversation?.customer_name?.trim() || 'Cliente'

  const customerPhone =
    conversation?.customer_phone?.trim() ||
    'Non renseigné'

  const customerMessage =
    String(message.message || '')
      .trim()
      .slice(0, 1200) || 'Message vide'

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
    `💬 Message :`,
    customerMessage,
  ].join('\n')

  const results: Record<string, unknown> = {}

  /*
   * Telegram notification
   */
  const telegramToken =
    Deno.env.get('TELEGRAM_BOT_TOKEN')

  const telegramChatId =
    Deno.env.get('TELEGRAM_CHAT_ID')

  if (telegramToken && telegramChatId) {
    try {
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

      if (telegramResponse.ok) {
        const telegramResult =
          await telegramResponse.json()

        results.telegram = {
          sent: true,
          message_id:
            telegramResult?.result?.message_id,
        }
      } else {
        const errorBody =
          await telegramResponse.text()

        console.error(
          'Telegram API error:',
          telegramResponse.status,
          errorBody,
        )

        results.telegram = {
          sent: false,
          status: telegramResponse.status,
          body: errorBody,
        }
      }
    } catch (error) {
      console.error(
        'Telegram request failed:',
        error,
      )

      results.telegram = {
        sent: false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      }
    }
  } else {
    results.telegram = {
      sent: false,
      reason:
        'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID',
    }
  }

  /*
   * Optional email fallback through Resend
   */
  const resendApiKey =
    Deno.env.get('RESEND_API_KEY')

  const notificationEmail =
    Deno.env.get('NOTIFICATION_EMAIL')

  const emailFrom =
    Deno.env.get('NOTIFICATION_EMAIL_FROM')

  if (
    resendApiKey &&
    notificationEmail &&
    emailFrom
  ) {
    try {
      const emailResponse = await fetch(
        'https://api.resend.com/emails',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: emailFrom,
            to: [notificationEmail],
            subject:
              `Nouveau Live Chat — ${customerName}`,
            html: `
              <h2>Nouveau message NARI’S WEAR</h2>

              <p>
                <strong>Cliente :</strong>
                ${escapeHtml(customerName)}
              </p>

              <p>
                <strong>Téléphone :</strong>
                ${escapeHtml(customerPhone)}
              </p>

              <p>
                <strong>Message :</strong><br>
                ${escapeHtml(customerMessage).replaceAll(
                  '\n',
                  '<br>',
                )}
              </p>

              ${
                adminUrl
                  ? `
                    <p>
                      <a href="${escapeHtml(adminUrl)}">
                        Ouvrir le Live Chat
                      </a>
                    </p>
                  `
                  : ''
              }
            `,
          }),
        },
      )

      results.email = emailResponse.ok
        ? { sent: true }
        : {
            sent: false,
            status: emailResponse.status,
            body: await emailResponse.text(),
          }
    } catch (error) {
      results.email = {
        sent: false,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      }
    }
  } else {
    results.email = {
      sent: false,
      reason: 'Email fallback is not configured',
    }
  }

  console.log('Notification result:', results)

  return json({
    ok: true,
    conversation_id: message.conversation_id,
    results,
  })
})

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character]!,
  )
}
