import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verify PEAK webhook HMAC-SHA256 signature
 * PEAK sends: X-Peak-Signature: sha256=<hex>
 */
export function verifyPeakSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.PEAK_WEBHOOK_SECRET
  if (!secret) return false
  if (!signatureHeader?.startsWith('sha256=')) return false

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const received = signatureHeader.slice(7) // strip "sha256="

  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// PEAK PO payload → Supabase row mappers
// ---------------------------------------------------------------------------

export interface PeakPOPayload {
  event: 'purchase_order.created' | 'purchase_order.updated'
  data: {
    document_number: string        // PO202507007
    reference: string | null       // PR number or custom ref
    issue_date: string             // YYYY-MM-DD
    vendor: {
      code: string
      name: string
      tax_id: string | null
    }
    items: Array<{
      description: string
      quantity: number
      unit_price: number
      amount: number
      vat_rate: number
    }>
    total: number
    payment_terms: string | null
    peak_id?: string
  }
}

export function mapPeakPOToRow(payload: PeakPOPayload['data'], vendorId: string) {
  const firstItem = payload.items[0]
  const amountExclVat = payload.items.reduce((s, i) => s + i.amount, 0)
  const vatRate = firstItem?.vat_rate ?? 7

  return {
    po_number: payload.document_number,
    vendor_id: vendorId,
    issued_date: payload.issue_date,
    description: firstItem?.description ?? payload.document_number,
    quantity: firstItem?.quantity ?? 1,
    unit_price: firstItem?.unit_price ?? null,
    amount_excl_vat: amountExclVat,
    vat_rate: vatRate,
    payment_terms: payload.payment_terms ?? null,
    peak_po_id: payload.peak_id ?? payload.document_number,
    raw_payload: payload as unknown as Record<string, unknown>,
  }
}
