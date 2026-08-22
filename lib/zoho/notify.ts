/**
 * Zoho Cliq + Zoho Mail notification helpers.
 * All functions are fire-and-forget — errors are logged, never re-thrown.
 *
 * Required env vars:
 *   ZOHO_CLIQ_CHANNEL   (default: "finance-notify")
 *   ZOHO_MAIL_ACCOUNT_ID
 *   ZOHO_MAIL_FROM
 *   APP_URL             (e.g. https://payment.example.com)
 */

// ---------------------------------------------------------------------------
// Low-level senders
// ---------------------------------------------------------------------------

/** Post a message to a Zoho Cliq channel by name (fire-and-forget) */
async function sendCliq(channelName: string, text: string, token: string): Promise<void> {
  try {
    const res = await fetch(
      `https://cliq.zoho.com/api/v2/channelsbyname/${encodeURIComponent(channelName)}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Zoho-oauthtoken ${token}`,
        },
        body: JSON.stringify({ text }),
      }
    )
    if (!res.ok) {
      console.error(`[notify:cliq] ${res.status} ${await res.text()}`)
    }
  } catch (err) {
    console.error('[notify:cliq] error:', err)
  }
}

interface MailPayload {
  toAddress: string
  subject: string
  content: string
}

/** Send an HTML email via Zoho Mail API (fire-and-forget) */
async function sendMail(payload: MailPayload, token: string): Promise<void> {
  const accountId = process.env.ZOHO_MAIL_ACCOUNT_ID
  const from = process.env.ZOHO_MAIL_FROM
  if (!accountId || !from) return // silently skip if not configured

  try {
    const res = await fetch(
      `https://mail.zoho.com/api/accounts/${accountId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Zoho-oauthtoken ${token}`,
        },
        body: JSON.stringify({
          fromAddress: from,
          toAddress: payload.toAddress,
          subject: payload.subject,
          content: payload.content,
          mailFormat: 'html',
        }),
      }
    )
    if (!res.ok) {
      console.error(`[notify:mail] ${res.status} ${await res.text()}`)
    }
  } catch (err) {
    console.error('[notify:mail] error:', err)
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function appUrl(path: string): string {
  const base = process.env.APP_URL ?? 'http://localhost:3000'
  return `${base}${path}`
}

function cliqChannel(): string {
  return process.env.ZOHO_CLIQ_CHANNEL ?? 'finance-notify'
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0070f3;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:600;">${label}</a>`
}

function mailBody(greeting: string, bodyHtml: string, ctaHref?: string, ctaLabel?: string): string {
  return `
<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
  <h2 style="margin-top:0;color:#111827;">🏢 Vertex Payment</h2>
  <p>${greeting}</p>
  ${bodyHtml}
  ${ctaHref ? `<p style="margin-top:24px;">${btn(ctaHref, ctaLabel ?? 'ดูรายละเอียด')}</p>` : ''}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="font-size:12px;color:#6b7280;">ระบบ Vertex Payment — ส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
</div>`
}

// ---------------------------------------------------------------------------
// Public notification events
// ---------------------------------------------------------------------------

export interface NotifyCtx {
  /** GRD or PR number e.g. GRD-26-05-001 */
  docNumber: string
  docType: 'GRD' | 'PR'
  docId: string
  actorName: string
  /** Zoho access token of the actor — used to call Cliq / Mail APIs */
  accessToken: string
}

/**
 * Notify next approver that a document is pending their action.
 */
export function notifyPending(
  ctx: NotifyCtx,
  approver: { name: string; email: string }
): void {
  const href = appUrl(`/${ctx.docType.toLowerCase()}/${ctx.docId}`)
  const cliqMsg = `🔔 *${ctx.docType} ${ctx.docNumber}* รอการอนุมัติจาก *${approver.name}* (ส่งโดย ${ctx.actorName})`
  void sendCliq(cliqChannel(), cliqMsg, ctx.accessToken)
  void sendMail(
    {
      toAddress: approver.email,
      subject: `[Vertex] ${ctx.docType} ${ctx.docNumber} รอการอนุมัติจากคุณ`,
      content: mailBody(
        `เรียน ${approver.name},`,
        `<p><strong>${ctx.docType} ${ctx.docNumber}</strong> ถูกส่งมาให้คุณ Approve โดย <strong>${ctx.actorName}</strong></p>`,
        href,
        'Approve / Reject'
      ),
    },
    ctx.accessToken
  )
}

/**
 * Notify document owner (receiver) that it has been approved.
 */
export function notifyApproved(
  ctx: NotifyCtx,
  approverRole: string,
  receiver?: { name: string; email: string }
): void {
  const href = appUrl(`/${ctx.docType.toLowerCase()}/${ctx.docId}`)
  const cliqMsg = `✅ *${ctx.docType} ${ctx.docNumber}* ได้รับการ Approve โดย ${ctx.actorName} (${approverRole})`
  void sendCliq(cliqChannel(), cliqMsg, ctx.accessToken)
  if (receiver) {
    void sendMail(
      {
        toAddress: receiver.email,
        subject: `[Vertex] ${ctx.docType} ${ctx.docNumber} ได้รับการอนุมัติ`,
        content: mailBody(
          `เรียน ${receiver.name},`,
          `<p><strong>${ctx.docType} ${ctx.docNumber}</strong> ได้รับการ Approve โดย <strong>${ctx.actorName}</strong> (${approverRole}) เรียบร้อยแล้ว</p>`,
          href,
          'ดูรายละเอียด'
        ),
      },
      ctx.accessToken
    )
  }
}

/**
 * Notify document owner that it was rejected, with optional reason.
 */
export function notifyRejected(
  ctx: NotifyCtx,
  reason: string | undefined,
  receiver?: { name: string; email: string }
): void {
  const href = appUrl(`/${ctx.docType.toLowerCase()}/${ctx.docId}`)
  const reasonText = reason ? ` — "${reason}"` : ''
  const cliqMsg = `❌ *${ctx.docType} ${ctx.docNumber}* ถูก Reject โดย ${ctx.actorName}${reasonText}`
  void sendCliq(cliqChannel(), cliqMsg, ctx.accessToken)
  if (receiver) {
    void sendMail(
      {
        toAddress: receiver.email,
        subject: `[Vertex] ${ctx.docType} ${ctx.docNumber} ถูกปฏิเสธ`,
        content: mailBody(
          `เรียน ${receiver.name},`,
          `<p><strong>${ctx.docType} ${ctx.docNumber}</strong> ถูก Reject โดย <strong>${ctx.actorName}</strong>${reason ? `</p><p>เหตุผล: ${reason}` : ''}</p>`,
          href,
          'ดูรายละเอียด'
        ),
      },
      ctx.accessToken
    )
  }
}

/**
 * Notify finance channel that a GRD is fully approved (ready for payment processing).
 */
export function notifyFullyApproved(ctx: NotifyCtx): void {
  const href = appUrl(`/${ctx.docType.toLowerCase()}/${ctx.docId}`)
  const cliqMsg = `💰 *${ctx.docType} ${ctx.docNumber}* ได้รับการ Approve ครบถ้วน — พร้อมดำเนินการชำระเงิน ${href}`
  void sendCliq(cliqChannel(), cliqMsg, ctx.accessToken)
}
