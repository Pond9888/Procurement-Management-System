/**
 * DEV ONLY — a minimal in-memory stand-in for the Supabase JS client.
 *
 * Enabled by DEV_MOCK_DATA=true so the UI can be demoed end-to-end without a
 * real Supabase project. Supports the subset of PostgREST this app actually
 * uses: select (incl. embedded resources), eq/neq/in/is/gt/gte/lt/lte/like,
 * order, limit, range, single/maybeSingle, exact counts, insert/update/delete,
 * plus a no-op storage API.
 *
 * Writes mutate the in-memory dataset, so sign/approve flows really do move
 * rows through the state machine until the dev server restarts.
 */

import { buildSeed } from './mock-data'

type Row = Record<string, any>
type DB = Record<string, Row[]>

// ── Persist across Turbopack HMR so edits don't wipe demo state ────
const GLOBAL_KEY = '__VERTEX_MOCK_DB__'

function db(): DB {
  const g = globalThis as any
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = buildSeed()
  return g[GLOBAL_KEY]
}

/** Reset the dataset back to its seeded state. */
export function resetMockDb() {
  ;(globalThis as any)[GLOBAL_KEY] = buildSeed()
}

// ── Relationship maps ──────────────────────────────────────────────
// to-one: parent table → { target table: 'local_column' | 'local_column@target_key' }
const FK: Record<string, Record<string, string>> = {
  purchase_requests: { employees: 'submitted_by', companies: 'cf_company@code' },
  purchase_orders: {
    vendors: 'vendor_id',
    customers: 'customer_id',
    purchase_requests: 'pr_id',
    employees: 'issued_by',
  },
  goods_receipts: {
    vendors: 'vendor_id',
    customers: 'customer_id',
    purchase_orders: 'po_id',
    purchase_requests: 'pr_id',
    employees: 'receiver_id',
  },
  payments: { goods_receipts: 'grd_id', purchase_orders: 'po_id', vendors: 'vendor_id' },
  grd_approvals: { employees: 'approver_id', goods_receipts: 'grd_id' },
  pr_approvals: { employees: 'approver_id', purchase_requests: 'pr_id' },
  employees: { companies: 'company_id' },
  activity_logs: { employees: 'actor_id' },
}

// to-many: parent table → { child table: 'child_column_pointing_at_parent_id' }
const REV: Record<string, Record<string, string>> = {
  goods_receipts: { payments: 'grd_id', grd_approvals: 'grd_id' },
  purchase_requests: {
    pr_approvals: 'pr_id',
    purchase_orders: 'pr_id',
    goods_receipts: 'pr_id',
  },
  purchase_orders: { goods_receipts: 'po_id', payments: 'po_id' },
  employees: { grd_approvals: 'approver_id', pr_approvals: 'approver_id' },
}

// ── select() parsing ───────────────────────────────────────────────
interface Embed {
  alias: string
  table: string
  fk?: string
  sub: string
}
interface Spec {
  all: boolean
  columns: string[]
  embeds: Embed[]
}

/** Split on commas that sit at paren depth 0. */
function splitTop(input: string): string[] {
  const out: string[] = []
  let depth = 0
  let buf = ''
  for (const ch of input) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      out.push(buf)
      buf = ''
    } else buf += ch
  }
  if (buf.trim()) out.push(buf)
  return out.map((s) => s.trim()).filter(Boolean)
}

const EMBED_RE = /^(?:([A-Za-z0-9_]+)\s*:\s*)?([A-Za-z0-9_]+)(?:!([A-Za-z0-9_]+))?\(([\s\S]*)\)$/

function parseSelect(sel: string): Spec {
  const spec: Spec = { all: false, columns: [], embeds: [] }
  for (const raw of splitTop(sel.replace(/\s+/g, ' '))) {
    const part = raw.trim()
    if (!part) continue
    if (part === '*') {
      spec.all = true
      continue
    }
    const m = EMBED_RE.exec(part)
    if (m) {
      spec.embeds.push({ alias: m[1] || m[2], table: m[2], fk: m[3], sub: m[4] })
    } else {
      spec.columns.push(part.includes(':') ? part.split(':').pop()!.trim() : part)
    }
  }
  return spec
}

// ── Projection ─────────────────────────────────────────────────────
function project(table: string, row: Row, sel: string): Row {
  const spec = parseSelect(sel)
  const out: Row = {}

  if (spec.all || (spec.columns.length === 0 && spec.embeds.length === 0)) {
    Object.assign(out, row)
  } else {
    for (const c of spec.columns) out[c] = row[c] ?? null
  }

  for (const emb of spec.embeds) {
    out[emb.alias] = resolveEmbed(table, row, emb)
  }
  return out
}

function resolveEmbed(parentTable: string, row: Row, emb: Embed): Row | Row[] | null {
  const target = db()[emb.table] ?? []

  // to-one — explicit !fk hint, or a declared foreign key
  const declared = emb.fk ?? FK[parentTable]?.[emb.table]
  if (declared) {
    const [localCol, targetKey = 'id'] = declared.split('@')
    const val = row[localCol]
    if (val === null || val === undefined) return null
    const hit = target.find((r) => r[targetKey] === val)
    return hit ? project(emb.table, hit, emb.sub) : null
  }

  // to-many — child rows pointing back at this row
  const revCol = REV[parentTable]?.[emb.table]
  if (revCol) {
    return target
      .filter((r) => r[revCol] === row.id)
      .map((r) => project(emb.table, r, emb.sub))
  }

  return null
}

// ── Filters ────────────────────────────────────────────────────────
type Filter = { op: string; col: string; val: any }

function passes(row: Row, f: Filter): boolean {
  const v = row[f.col]
  switch (f.op) {
    case 'eq':
      return v === f.val
    case 'neq':
      return v !== f.val
    case 'gt':
      return v > f.val
    case 'gte':
      return v >= f.val
    case 'lt':
      return v < f.val
    case 'lte':
      return v <= f.val
    case 'in':
      return Array.isArray(f.val) && f.val.includes(v)
    case 'is':
      return f.val === null ? v === null || v === undefined : v === f.val
    case 'like':
      return typeof v === 'string' && new RegExp(`^${escapeLike(f.val)}$`).test(v)
    case 'ilike':
      return typeof v === 'string' && new RegExp(`^${escapeLike(f.val)}$`, 'i').test(v)
    case 'not.is':
      return f.val === null ? v !== null && v !== undefined : v !== f.val
    default:
      return true
  }
}

function escapeLike(pattern: string): string {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')
}

// ── id generation ──────────────────────────────────────────────────
let seq = 0
function newId(): string {
  seq += 1
  return `f0000000-0000-4000-8000-${seq.toString(16).padStart(12, '0')}`
}

// ── Query builder ──────────────────────────────────────────────────
class MockQuery implements PromiseLike<any> {
  private filters: Filter[] = []
  private orders: { col: string; asc: boolean }[] = []
  private sel = '*'
  private wantCount: string | null = null
  private headOnly = false
  private limitN: number | null = null
  private rangeFrom: number | null = null
  private rangeTo: number | null = null
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private payload: any = null
  private returnSingle: 'single' | 'maybe' | null = null

  constructor(private table: string) {}

  select(sel = '*', opts?: { count?: string; head?: boolean }) {
    this.sel = sel || '*'
    if (opts?.count) this.wantCount = opts.count
    if (opts?.head) this.headOnly = true
    // .insert(...).select() keeps the write mode but returns rows
    return this
  }

  insert(payload: Row | Row[]) {
    this.mode = 'insert'
    this.payload = payload
    return this
  }

  upsert(payload: Row | Row[]) {
    this.mode = 'insert'
    this.payload = payload
    return this
  }

  update(payload: Row) {
    this.mode = 'update'
    this.payload = payload
    return this
  }

  delete() {
    this.mode = 'delete'
    return this
  }

  eq(col: string, val: any) { return this.push('eq', col, val) }
  neq(col: string, val: any) { return this.push('neq', col, val) }
  gt(col: string, val: any) { return this.push('gt', col, val) }
  gte(col: string, val: any) { return this.push('gte', col, val) }
  lt(col: string, val: any) { return this.push('lt', col, val) }
  lte(col: string, val: any) { return this.push('lte', col, val) }
  like(col: string, val: any) { return this.push('like', col, val) }
  ilike(col: string, val: any) { return this.push('ilike', col, val) }
  is(col: string, val: any) { return this.push('is', col, val) }
  in(col: string, val: any[]) { return this.push('in', col, val) }
  not(col: string, op: string, val: any) { return this.push(`not.${op}`, col, val) }

  private push(op: string, col: string, val: any) {
    this.filters.push({ op, col, val })
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false })
    return this
  }

  limit(n: number) {
    this.limitN = n
    return this
  }

  range(from: number, to: number) {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  single() {
    this.returnSingle = 'single'
    return this
  }

  maybeSingle() {
    this.returnSingle = 'maybe'
    return this
  }

  // ── execution ────────────────────────────────────────────────────
  private run() {
    const store = db()
    if (!store[this.table]) store[this.table] = []
    const table = store[this.table]

    let affected: Row[] = []

    if (this.mode === 'insert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload]
      affected = rows.map((r) => {
        const row: Row = { id: r.id ?? newId(), created_at: new Date().toISOString(), ...r }
        table.push(row)
        return row
      })
    } else {
      const matched = table.filter((r) => this.filters.every((f) => passes(r, f)))

      if (this.mode === 'update') {
        matched.forEach((r) => Object.assign(r, this.payload))
        affected = matched
      } else if (this.mode === 'delete') {
        matched.forEach((r) => {
          const i = table.indexOf(r)
          if (i >= 0) table.splice(i, 1)
        })
        affected = matched
      } else {
        affected = matched
      }
    }

    const total = affected.length

    // order
    for (const o of [...this.orders].reverse()) {
      affected = [...affected].sort((a, b) => {
        const av = a[o.col]
        const bv = b[o.col]
        if (av === bv) return 0
        if (av === null || av === undefined) return 1
        if (bv === null || bv === undefined) return -1
        return (av < bv ? -1 : 1) * (o.asc ? 1 : -1)
      })
    }

    // pagination
    if (this.rangeFrom !== null) affected = affected.slice(this.rangeFrom, (this.rangeTo ?? total) + 1)
    if (this.limitN !== null) affected = affected.slice(0, this.limitN)

    const count = this.wantCount ? total : null

    if (this.headOnly) return { data: null, error: null, count, status: 200 }

    const data = affected.map((r) => project(this.table, r, this.sel))

    if (this.returnSingle) {
      if (data.length === 0) {
        return this.returnSingle === 'maybe'
          ? { data: null, error: null, count, status: 200 }
          : {
              data: null,
              count,
              status: 406,
              error: {
                code: 'PGRST116',
                message: 'JSON object requested, multiple (or no) rows returned',
                details: 'Results contain 0 rows',
                hint: null,
              },
            }
      }
      return { data: data[0], error: null, count, status: 200 }
    }

    return { data, error: null, count, status: 200 }
  }

  then<TR = any, TE = never>(
    onfulfilled?: ((value: any) => TR | PromiseLike<TR>) | null,
    onrejected?: ((reason: any) => TE | PromiseLike<TE>) | null
  ): PromiseLike<TR | TE> {
    let result: any
    try {
      result = this.run()
    } catch (err: any) {
      result = { data: null, error: { code: 'MOCK_ERROR', message: String(err?.message ?? err) }, count: null }
    }
    return Promise.resolve(result).then(onfulfilled, onrejected)
  }
}

// ── Storage — keeps uploaded bytes in memory so files stay viewable ─
const FILES_KEY = '__VERTEX_MOCK_FILES__'

export interface MockFile {
  body: Buffer
  contentType: string
}

function files(): Map<string, MockFile> {
  const g = globalThis as any
  if (!g[FILES_KEY]) g[FILES_KEY] = new Map<string, MockFile>()
  return g[FILES_KEY]
}

export function readMockFile(key: string): MockFile | undefined {
  return files().get(key)
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'
}

function publicUrl(bucket: string, path: string): string {
  return `${appUrl()}/api/dev/mock-file/${bucket}/${path}`
}

async function toBuffer(file: any): Promise<Buffer> {
  if (Buffer.isBuffer(file)) return file
  if (file instanceof Uint8Array) return Buffer.from(file)
  if (file instanceof ArrayBuffer) return Buffer.from(new Uint8Array(file))
  if (typeof file?.arrayBuffer === 'function') return Buffer.from(await file.arrayBuffer())
  if (typeof file === 'string') return Buffer.from(file)
  return Buffer.alloc(0)
}

function mockStorage() {
  return {
    from(bucket: string) {
      return {
        async upload(path: string, file: any, opts?: { contentType?: string }) {
          files().set(`${bucket}/${path}`, {
            body: await toBuffer(file),
            contentType: opts?.contentType || file?.type || 'application/octet-stream',
          })
          return { data: { path, id: newId(), fullPath: `${bucket}/${path}` }, error: null }
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: publicUrl(bucket, path) } }
        },
        async remove(paths: string[]) {
          paths.forEach((p) => files().delete(`${bucket}/${p}`))
          return { data: paths.map((p) => ({ name: p })), error: null }
        },
        async download(path: string) {
          const hit = files().get(`${bucket}/${path}`)
          return hit
            ? { data: new Blob([new Uint8Array(hit.body)], { type: hit.contentType }), error: null }
            : { data: null, error: { message: 'not found' } }
        },
        async createSignedUrl(path: string) {
          return { data: { signedUrl: publicUrl(bucket, path) }, error: null }
        },
      }
    },
    listBuckets: async () => ({ data: [{ name: 'grd-pdfs' }, { name: 'grd-docs' }], error: null }),
  }
}

// ── Client factory ─────────────────────────────────────────────────
export function createMockClient(): any {
  return {
    from: (table: string) => new MockQuery(table),
    storage: mockStorage(),
    rpc: async () => ({ data: null, error: null }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
  }
}
