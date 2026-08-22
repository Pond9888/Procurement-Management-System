import { NextRequest, NextResponse } from 'next/server'
import { verifyPeakSignature, mapPeakPOToRow, type PeakPOPayload } from '@/lib/peak/webhook'
import { createServiceClient } from '@/lib/supabase/server'
import { amountInThaiWords } from '@/lib/utils-server'

/**
 * POST /api/webhooks/peak
 * Receives PEAK purchase_order.created / purchase_order.updated events.
 * On created: upsert PO → auto-create GRD draft.
 * On updated: update PO only (GRD stays as-is unless Finance re-syncs).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-peak-signature')

  // 1. Verify webhook signature
  if (!verifyPeakSignature(rawBody, signature)) {
    console.error('[peak-webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: PeakPOPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { event, data } = payload

  // 2. Find or upsert vendor
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('vendor_code', data.vendor.code)
    .single()

  let vendorId: string
  if (vendor) {
    vendorId = vendor.id
  } else {
    // Auto-create vendor from PEAK data
    const { data: newVendor, error: vErr } = await supabase
      .from('vendors')
      .insert({
        vendor_code: data.vendor.code,
        name: data.vendor.name,
        tax_id: data.vendor.tax_id ?? null,
        is_individual: false,
      })
      .select('id')
      .single()
    if (vErr || !newVendor) {
      console.error('[peak-webhook] Failed to create vendor:', vErr)
      return NextResponse.json({ error: 'Vendor creation failed' }, { status: 500 })
    }
    vendorId = newVendor.id
  }

  // 3. Try to match PR via reference field (pr_number)
  let prId: string | null = null
  if (data.reference) {
    const { data: pr } = await supabase
      .from('purchase_requests')
      .select('id')
      .eq('pr_number', data.reference)
      .single()
    if (pr) {
      prId = pr.id
      // Mark PR as PO created
      await supabase
        .from('purchase_requests')
        .update({ status: 'po_created', updated_at: new Date().toISOString() })
        .eq('id', prId)
    }
  }

  // 4. Upsert PO
  const poRow = mapPeakPOToRow(data, vendorId)
  const { data: po, error: poErr } = await supabase
    .from('purchase_orders')
    .upsert({ ...poRow, pr_id: prId }, { onConflict: 'peak_po_id' })
    .select('id, amount_excl_vat, vat_rate, total_amount, description, product_category, vendor_id, customer_id')
    .single()

  if (poErr || !po) {
    console.error('[peak-webhook] Failed to upsert PO:', poErr)
    return NextResponse.json({ error: 'PO upsert failed' }, { status: 500 })
  }

  // 5. For created event: auto-create GRD draft (skip if already exists)
  if (event === 'purchase_order.created') {
    const { data: existingGrd } = await supabase
      .from('goods_receipts')
      .select('id')
      .eq('po_id', po.id)
      .single()

    if (!existingGrd) {
      const grdNumber = await generateGRDNumber(supabase)
      const totalAmount = po.total_amount as number
      const vatRate = po.vat_rate as number
      const amountExcl = po.amount_excl_vat as number
      const vatAmount = Math.round(amountExcl * vatRate / 100 * 100) / 100

      const { error: grdErr } = await supabase.from('goods_receipts').insert({
        grd_number: grdNumber,
        po_id: po.id,
        pr_id: prId,
        vendor_id: po.vendor_id,
        customer_id: po.customer_id ?? null,
        description: po.description,
        product_category: po.product_category ?? null,
        amount: amountExcl,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        amount_in_words: amountInThaiWords(totalAmount),
        status: 'pending_input',
      })

      if (grdErr) {
        console.error('[peak-webhook] Failed to create GRD:', grdErr)
        // Don't fail the webhook — PO was saved; Finance can manually trigger GRD
      } else {
        console.log(`[peak-webhook] Created GRD ${grdNumber} for PO ${data.document_number}`)
      }
    }
  }

  // 6. Log webhook receipt
  await supabase.from('activity_logs').insert({
    table_name: 'purchase_orders',
    record_id: po.id,
    action: event === 'purchase_order.created' ? 'created' : 'updated',
    actor_id: null,
    new_data: { source: 'peak_webhook', po_number: data.document_number },
  })

  return NextResponse.json({ ok: true })
}

async function generateGRDNumber(supabase: ReturnType<typeof createServiceClient>): Promise<string> {
  const now = new Date()
  const yy = ((now.getFullYear() + 543) % 100).toString()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `GRD-${yy}-${mm}-`

  const { count } = await supabase
    .from('goods_receipts')
    .select('*', { count: 'exact', head: true })
    .like('grd_number', `${prefix}%`)

  const seq = String((count ?? 0) + 1).padStart(2, '0')
  return `${prefix}${seq}`
}
