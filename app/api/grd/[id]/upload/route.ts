import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiResponse, SupportingDoc } from '@/types'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

/**
 * POST /api/grd/[id]/upload
 * Upload a supporting document (multipart/form-data, field: "file")
 * → stores in Supabase Storage bucket "grd-docs"
 * → appends to goods_receipts.supporting_docs[]
 * Only allowed when status is pending_input or draft.
 */
export async function POST(
  req: NextRequest,
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

  // Fetch GRD to validate state
  const { data: grd, error: fetchErr } = await supabase
    .from('goods_receipts')
    .select('id, status, receiver_id, supporting_docs')
    .eq('id', id)
    .single()

  if (fetchErr || !grd) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'GRD not found' } },
      { status: 404 }
    )
  }

  if (!['pending_input', 'draft'].includes(grd.status)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'INVALID_STATE', message: 'สามารถแนบไฟล์ได้เฉพาะ GRD ที่ยังไม่ถูกเซ็นเท่านั้น' } },
      { status: 422 }
    )
  }

  if (grd.receiver_id !== session.id && session.role !== 'admin') {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'เฉพาะผู้รับผิดชอบงานเท่านั้นที่แนบไฟล์ได้' } },
      { status: 403 }
    )
  }

  // Parse multipart form
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid multipart form data' } },
      { status: 400 }
    )
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION', message: 'กรุณาเลือกไฟล์' } },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: 'ไฟล์ต้องมีขนาดไม่เกิน 10 MB' } },
      { status: 413 }
    )
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'UNSUPPORTED_TYPE', message: 'รองรับเฉพาะ PDF, JPG, PNG, DOCX, XLSX' } },
      { status: 415 }
    )
  }

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() ?? 'bin'
  const storagePath = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadErr } = await supabase.storage
    .from('grd-docs')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadErr) {
    console.error('[upload] storage error:', uploadErr)
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'STORAGE_ERROR', message: uploadErr.message } },
      { status: 500 }
    )
  }

  const { data: urlData } = supabase.storage.from('grd-docs').getPublicUrl(storagePath)

  const newDoc: SupportingDoc = {
    name: file.name,
    url: urlData.publicUrl,
    type: ext.toUpperCase(),
    size: file.size,
    uploaded_at: new Date().toISOString(),
  }

  // Append to supporting_docs array
  const existing: SupportingDoc[] = (grd.supporting_docs as SupportingDoc[]) ?? []
  const updatedDocs = [...existing, newDoc]

  const { error: updateErr } = await supabase
    .from('goods_receipts')
    .update({ supporting_docs: updatedDocs, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'DB_ERROR', message: updateErr.message } },
      { status: 500 }
    )
  }

  await supabase.from('activity_logs').insert({
    table_name: 'goods_receipts',
    record_id: id,
    action: 'doc_uploaded',
    actor_id: session.id,
    new_data: { file: file.name, size: file.size },
  })

  return NextResponse.json<ApiResponse<{ doc: SupportingDoc; total: number }>>({
    success: true,
    data: { doc: newDoc, total: updatedDocs.length },
  })
}

/**
 * DELETE /api/grd/[id]/upload?name=filename
 * Remove a supporting doc by name from the array + delete from storage.
 */
export async function DELETE(
  req: NextRequest,
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
  const fileName = req.nextUrl.searchParams.get('name')
  if (!fileName) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'VALIDATION', message: 'Missing ?name param' } },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  const { data: grd } = await supabase
    .from('goods_receipts')
    .select('status, receiver_id, supporting_docs')
    .eq('id', id)
    .single()

  if (!grd) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'GRD not found' } },
      { status: 404 }
    )
  }

  if (!['pending_input', 'draft'].includes(grd.status)) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'INVALID_STATE', message: 'ไม่สามารถลบไฟล์ได้ในสถานะนี้' } },
      { status: 422 }
    )
  }

  if (grd.receiver_id !== session.id && session.role !== 'admin') {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ลบไฟล์' } },
      { status: 403 }
    )
  }

  const existing: SupportingDoc[] = (grd.supporting_docs as SupportingDoc[]) ?? []
  const target = existing.find((d) => d.name === fileName)
  if (!target) {
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'NOT_FOUND', message: 'ไม่พบไฟล์' } },
      { status: 404 }
    )
  }

  // Extract storage path from public URL
  const urlParts = target.url.split('/grd-docs/')
  if (urlParts.length === 2) {
    await supabase.storage.from('grd-docs').remove([urlParts[1]])
  }

  const updatedDocs = existing.filter((d) => d.name !== fileName)
  await supabase
    .from('goods_receipts')
    .update({ supporting_docs: updatedDocs, updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json<ApiResponse<{ total: number }>>({
    success: true,
    data: { total: updatedDocs.length },
  })
}
