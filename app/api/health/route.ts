import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const VERSION = process.env.npm_package_version ?? '0.1.0'

export async function GET() {
  // Quick DB ping
  let dbOk = false
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('companies').select('id').limit(1)
    dbOk = !error
  } catch {
    dbOk = false
  }

  const status = dbOk ? 'ok' : 'degraded'
  const httpStatus = dbOk ? 200 : 503

  return NextResponse.json({ status, version: VERSION, db: dbOk ? 'ok' : 'error' }, { status: httpStatus })
}
