import { NextRequest, NextResponse } from 'next/server'
import { readMockFile } from '@/lib/supabase/mock-client'

/**
 * GET /api/dev/mock-file/<bucket>/<path...>
 * DEV ONLY — serves files "uploaded" to the in-memory mock storage so that
 * generated GRD PDFs are actually viewable. Disabled outside mock mode.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (process.env.NODE_ENV !== 'development' || process.env.DEV_MOCK_DATA !== 'true') {
    return new NextResponse('Not available', { status: 403 })
  }

  const { path } = await params
  const file = readMockFile(path.join('/'))

  if (!file) return new NextResponse('File not found in mock storage', { status: 404 })

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(path[path.length - 1])}"`,
      'Cache-Control': 'no-store',
    },
  })
}
