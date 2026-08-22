import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { GRDDocument, type GRDPDFData } from '@/lib/pdf/grd-template'
import type { ApiResponse } from '@/types'

/**
 * POST /api/grd/[id]/pdf
 * Generate GRD PDF → upload to Supabase Storage → update signed_pdf_url.
 * Only allowed when status = 'approved' (or admin).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'UNAUTHENTICATED', message: 'Not logged in' } },
      { status: 401 }
    )
  }

  const { id } = await params
  const supabase = createServiceClient()

  // 1. Fetch GRD with all related data
  const { data: grd, error: fetchErr } = await supabase
    .from('goods_receipts')
    .select(
      `*, vendor:vendors(name, tax_id),
       customer:customers(code),
       purchase_order:purchase_orders(po_number),
       purchase_request:purchase_requests(pr_number),
       receiver:employees!receiver_id(name),
       team_lead:employees!team_lead_id(name),
       manager:employees!manager_id(name),
       company:purchase_orders(pr_id, issued_by)`
    )
    .eq('id', id)
    .single()

  if (fetchErr || !grd) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'GRD not found' } },
      { status: 404 }
    )
  }

  if (grd.status !== 'approved' && session.role !== 'admin') {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'INVALID_STATE', message: 'GRD ต้อง approved ก่อน generate PDF' } },
      { status: 422 }
    )
  }

  // 2. Fetch company info (from PR → submitted_by → company)
  // Default to known values; admin can pass override
  const companyInfo = {
    name: 'บริษัท เวอร์เท็กซ์ คอร์ปอเรชัน จำกัด',
    address: '99/1 ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
  }

  // 3. Build PDF data object
  const pdfData: GRDPDFData = {
    grd_number: grd.grd_number,
    form_code: grd.form_code ?? 'FM-PU-07 01-01/67',
    date_of_completion: grd.date_of_completion,
    description: grd.description,
    product_category: grd.product_category,
    remark: grd.remark,
    amount: grd.amount,
    vat_rate: grd.vat_rate,
    vat_amount: grd.vat_amount,
    total_amount: grd.total_amount,
    amount_in_words: grd.amount_in_words,
    vendor_name: (grd as any).vendor?.name ?? '—',
    vendor_tax_id: (grd as any).vendor?.tax_id ?? null,
    customer_code: (grd as any).customer?.code ?? null,
    po_number: (grd as any).purchase_order?.po_number ?? '—',
    pr_number: (grd as any).purchase_request?.pr_number ?? null,
    company_name: companyInfo.name,
    company_address: companyInfo.address,
    receiver_name: (grd as any).receiver?.name ?? null,
    team_lead_name: (grd as any).team_lead?.name ?? null,
    manager_name: (grd as any).manager?.name ?? null,
    signed_at: grd.signed_at,
    tl_approved_at: grd.tl_approved_at,
    manager_approved_at: grd.manager_approved_at,
    supporting_docs: (grd.supporting_docs as any[]) ?? [],
  }

  // 4. Render PDF to buffer
  let pdfBuffer: Buffer
  try {
    // react-pdf's renderToBuffer expects DocumentProps element; cast via unknown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(GRDDocument, { data: pdfData }) as unknown as Parameters<typeof renderToBuffer>[0]
    pdfBuffer = await renderToBuffer(element)
  } catch (err) {
    console.error('[pdf] renderToBuffer error:', err)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'PDF_ERROR', message: 'PDF generation failed' } },
      { status: 500 }
    )
  }

  // 5. Upload to Supabase Storage (bucket: grd-pdfs)
  const filename = `${grd.grd_number}-${Date.now()}.pdf`
  const { error: uploadErr } = await supabase.storage
    .from('grd-pdfs')
    .upload(filename, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadErr) {
    console.error('[pdf] upload error:', uploadErr)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'STORAGE_ERROR', message: uploadErr.message } },
      { status: 500 }
    )
  }

  // 6. Get public URL
  const { data: urlData } = supabase.storage.from('grd-pdfs').getPublicUrl(filename)
  const pdfUrl = urlData.publicUrl

  // 7. Update GRD with signed_pdf_url
  await supabase
    .from('goods_receipts')
    .update({ signed_pdf_url: pdfUrl, updated_at: new Date().toISOString() })
    .eq('id', id)

  await supabase.from('activity_logs').insert({
    table_name: 'goods_receipts',
    record_id: id,
    action: 'pdf_generated',
    actor_id: session.id,
    new_data: { signed_pdf_url: pdfUrl },
  })

  return NextResponse.json<ApiResponse<{ pdf_url: string }>>({
    success: true,
    data: { pdf_url: pdfUrl },
  })
}

// GET /api/grd/[id]/pdf — stream PDF directly to browser
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return new NextResponse('Unauthorized', { status: 401 })

  const { id } = await params
  const supabase = createServiceClient()

  const { data: grd } = await supabase
    .from('goods_receipts')
    .select('signed_pdf_url, grd_number')
    .eq('id', id)
    .single()

  if (!grd?.signed_pdf_url) {
    return new NextResponse('PDF not yet generated', { status: 404 })
  }

  return NextResponse.redirect(grd.signed_pdf_url)
}
