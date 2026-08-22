import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { EmployeeRole } from '@/types'
import {
  BookOpen,
  LayoutDashboard,
  Workflow,
  FileText,
  ShoppingCart,
  ClipboardCheck,
  BarChart3,
  CreditCard,
  Users,
  CircleCheck,
  CircleAlert,
  ArrowRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<EmployeeRole, string> = {
  staff: 'Staff',
  team_lead: 'Team Lead',
  manager: 'Manager',
  excom: 'ExCom',
  finance: 'Finance',
  admin: 'ผู้ดูแลระบบ',
}

/** Which of the six stages each role actually touches */
const ROLE_STEPS: Record<EmployeeRole, number[]> = {
  staff: [1, 2, 4],
  team_lead: [2, 5],
  manager: [2, 5],
  excom: [2],
  finance: [6],
  admin: [1, 2, 3, 4, 5, 6],
}

interface Step {
  no: number
  title: string
  owners: string[]
  intro: string
  todo: string[]
  rules: { text: string; warn?: boolean }[]
  result: string[]
  example: string
  tryIt?: { text: string; href: string; label: string }
}

const STEPS: Step[] = [
  {
    no: 1,
    title: 'ยื่นใบขอซื้อ',
    owners: ['Staff'],
    intro:
      'มีสองทาง — กรอกใน Zoho Expense แล้วกดปุ่ม “Sync จาก Zoho” หรือกดปุ่ม “สร้างใบขอซื้อ” ทำในแอปนี้เลย สำหรับรายจ่ายที่ไม่ผ่าน Zoho เช่น ค่าใช้จ่ายประจำ เงินทดรองจ่าย',
    todo: [
      'กรอกเหตุผล/รายละเอียดที่ขอซื้อ',
      'เลือกประเภท PR บริษัท และกลุ่มรายจ่าย',
      'ใส่จำนวนเงิน วันที่ยื่น และวันที่ต้องการ',
    ],
    rules: [
      { text: 'เหตุผลและจำนวนเงินเป็นช่องบังคับ' },
      { text: 'วันที่ต้องการต้องไม่ก่อนวันที่ยื่น' },
      { text: 'ใบที่สร้างในแอปได้เลขขึ้นต้น PR-IN- แยกจากใบที่ sync มาจาก Zoho' },
    ],
    result: ['สถานะ “รอเซ็น”', 'ยังไม่วิ่งไปหาใคร จนกว่าจะกดเซ็น'],
    example:
      'PR-02668 · จัดซื้อ E-Learning Suite โครงการ ACME · 385,000 บาท · ยื่น 7 ก.ค. 2569',
    tryIt: { text: 'ลองสร้างใบขอซื้อของคุณเอง', href: '/pr/new', label: 'สร้างใบขอซื้อ' },
  },
  {
    no: 2,
    title: 'อนุมัติใบขอซื้อ',
    owners: ['Staff', 'Team Lead', 'Manager', 'ExCom'],
    intro:
      'เจ้าของเรื่องเซ็นก่อน แล้วเอกสารจึงวิ่งขึ้นสายอนุมัติทีละขั้น ปุ่มบนหน้ารายละเอียดจะเปลี่ยนไปตามคิวของคุณ — ถ้ายังไม่ถึงคิว จะไม่มีปุ่มให้กด',
    todo: [
      'เปิดใบขอซื้อจากรายการ',
      'กดปุ่ม “เซ็น” หรือ “อนุมัติ” ที่มุมขวาบน',
      'ถ้าไม่อนุมัติ ต้องใส่เหตุผลก่อน',
    ],
    rules: [
      { text: 'เซ็นได้เฉพาะคนที่ยื่นเอง' },
      { text: 'เกิน 500,000 บาท ต้องผ่าน ExCom เพิ่มอีกขั้นหลัง Manager', warn: true },
      { text: 'กด “ไม่อนุมัติ” โดยไม่ใส่เหตุผล ระบบจะไม่รับ', warn: true },
    ],
    result: [
      'ไล่สถานะ รอเซ็น → รอ Team Lead → รอ Manager → (รอ ExCom) → อนุมัติแล้ว',
      'บันทึกลงประวัติการอนุมัติทุกครั้ง',
      'ถูกตีกลับแล้วจบสาย ไม่วิ่งต่อ',
    ],
    example:
      'PR-02668 มูลค่า 385,000 ไม่ถึงเกณฑ์ ExCom จึงจบที่ Manager — เทียบกับ PR-02688 ต่ออายุ Endpoint Protection Suite 1,450,000 บาท ที่ยังค้างรอ ExCom อยู่',
    tryIt: { text: 'ดูใบที่รออนุมัติอยู่ตอนนี้', href: '/pr?status=pending_tl', label: 'ใบขอซื้อรอ Approve' },
  },
  {
    no: 3,
    title: 'ออกใบสั่งซื้อ',
    owners: ['ระบบทำให้เอง'],
    intro:
      'ฝ่ายจัดซื้อออก PO ใน PEAK ตามปกติ PEAK ยิงข้อมูลกลับมาที่แอป ระบบตรวจลายเซ็นดิจิทัลแล้วบันทึก PO พร้อมสร้างใบรับสินค้าให้อัตโนมัติ ไม่ต้องมีใครกดอะไร',
    todo: ['ออก PO ที่ PEAK', 'กลับมาดูผลที่เมนูใบสั่งซื้อ'],
    rules: [
      { text: 'หน้าใบสั่งซื้อในแอปนี้อ่านอย่างเดียว แก้ไขไม่ได้' },
      { text: 'PO หนึ่งใบมีใบรับสินค้าได้หลายใบ กรณีรับของเป็นงวด' },
    ],
    result: ['มี PO ในระบบ', 'เกิดใบรับสินค้าใหม่รอกรอกข้อมูล'],
    example:
      'PO202507007 ออก 14 ก.ค. 2569 · 385,000 + VAT 7% = 411,950 บาท · เครดิต 30 วัน → ระบบสร้าง GRD-69-07-01 ให้ทันที',
    tryIt: { text: 'ดูใบสั่งซื้อทั้งหมด', href: '/po', label: 'ใบสั่งซื้อ' },
  },
  {
    no: 4,
    title: 'กรอกข้อมูลและเซ็นรับงาน',
    owners: ['Staff ผู้รับผิดชอบ'],
    intro:
      'เมื่อของมาถึงหรืองานส่งมอบแล้ว ผู้รับผิดชอบเปิดใบรับสินค้าใบนั้น กรอกวันที่รับงาน ระบุผู้อนุมัติ แนบเอกสาร แล้วจึงกดเซ็น',
    todo: [
      'กรอกวันที่รับงาน และหมายเหตุถ้ามี',
      'เลือก Team Lead และ Manager ผู้อนุมัติ',
      'แนบใบส่งของหรือเอกสารประกอบ',
      'กด “เซ็นรับงาน”',
    ],
    rules: [
      { text: 'ต้องกรอกวันที่รับงานและระบุ Team Lead ก่อน ไม่งั้นเซ็นไม่ได้', warn: true },
      { text: 'แนบไฟล์ได้เฉพาะก่อนเซ็นเท่านั้น' },
      { text: 'รับไฟล์ PDF, JPG, PNG, WebP, Word, Excel ไม่เกิน 10 MB ต่อไฟล์' },
    ],
    result: ['สถานะเปลี่ยนเป็น “รอ Team Lead”', 'แจ้งเตือน Team Lead ให้มาอนุมัติ'],
    example:
      'GRD-69-07-01 รับงาน 24 ก.ค. 2569 หมายเหตุ “ได้รับ License Key และเอกสารครบถ้วน” แนบสองไฟล์ แล้วเซ็น 25 ก.ค.',
    tryIt: { text: 'ดูใบที่รอกรอกข้อมูล', href: '/grd?status=pending_input', label: 'ใบรับสินค้ารอกรอกข้อมูล' },
  },
  {
    no: 5,
    title: 'อนุมัติใบรับสินค้า',
    owners: ['Team Lead', 'Manager'],
    intro:
      'สายอนุมัติของใบรับสินค้าสั้นกว่าใบขอซื้อ มีแค่สองขั้น ไม่มี ExCom ไม่ว่ายอดเท่าไหร่ ผู้อนุมัติจะเห็นแบนเนอร์บนหน้าแรกว่ามีกี่รายการรอตัวเองอยู่',
    todo: [
      'เปิดใบรับสินค้าจากแบนเนอร์บนหน้าแรก หรือจากหน้า Pipeline',
      'ตรวจเอกสารแนบและจำนวนเงิน',
      'กดอนุมัติ หรือตีกลับพร้อมเหตุผล',
    ],
    rules: [
      { text: 'อนุมัติได้เฉพาะเมื่อถึงคิวของ role ตัวเอง' },
      { text: 'ตีกลับต้องใส่เหตุผล และเมื่อตีกลับแล้วจบสาย', warn: true },
    ],
    result: [
      'ประทับเวลาแยกแต่ละขั้น',
      'อนุมัติครบแล้วออกไฟล์ PDF ได้',
      'ส่งต่อให้ Finance ตั้งเบิก',
    ],
    example:
      'GRD-69-07-01 — Team Lead อนุมัติ 26 ก.ค. พร้อมหมายเหตุ “เอกสารครบถ้วน” Manager อนุมัติปิดท้าย 28 ก.ค.',
    tryIt: { text: 'ดูใบที่รออนุมัติ', href: '/grd?status=pending_tl', label: 'ใบรับสินค้ารอ Approve' },
  },
  {
    no: 6,
    title: 'ตั้งเบิกและชำระเงิน',
    owners: ['Finance'],
    intro:
      'เมื่อใบรับสินค้าอนุมัติครบ Finance จะเห็นมันโผล่ในกล่อง “GRD ที่ approved แล้ว — ยังไม่มี Payment record” กดสร้างรายการจ่าย แล้วกรอกเลขและวันที่ในตารางเดียวกันได้เลย',
    todo: [
      'กดสร้างรายการจ่ายจากใบที่อนุมัติแล้ว',
      'กรอกเลข UV และ PV',
      'ใส่วันนัดจ่ายและวันจ่ายจริง',
      'เปลี่ยนสถานะเป็น “ชำระแล้ว”',
    ],
    rules: [
      { text: 'สร้างรายการจ่ายไม่ได้ถ้าใบรับสินค้ายังไม่อนุมัติครบ', warn: true },
      { text: 'เห็นและแก้ได้เฉพาะ Finance กับผู้ดูแลระบบ' },
    ],
    result: [
      'ตั้งสถานะ “ชำระแล้ว” ระบบจะปิด Aging ของใบรับสินค้าให้เอง',
      'เอกสารเดินครบทั้งหกขั้น',
    ],
    example:
      'GRD-69-07-01 ตั้งเบิกเป็น UV-202608012 ออก PV-202608031 จ่ายจริง 5 ส.ค. 2569 ยอด 411,950 บาท',
    tryIt: { text: 'เปิดหน้าการชำระเงิน', href: '/payments', label: 'การชำระเงิน' },
  },
]

const FEATURES = [
  { href: '/dashboard', icon: LayoutDashboard, name: 'หน้าแรก', desc: 'สรุปจำนวนใบขอซื้อและใบรับสินค้า พร้อมแบนเนอร์เตือนงานที่รอคุณอยู่' },
  { href: '/pipeline', icon: Workflow, name: 'Pipeline', desc: 'ดูเส้นทางเอกสารทีละใบ พร้อมแท็บข้อมูล อนุมัติ และประวัติ กดอนุมัติได้จากหน้านี้' },
  { href: '/pr', icon: FileText, name: 'ใบขอซื้อ (PR)', desc: 'รายการใบขอซื้อ กรองตามสถานะ สร้างใบใหม่ และ sync จาก Zoho' },
  { href: '/po', icon: ShoppingCart, name: 'ใบสั่งซื้อ (PO)', desc: 'ใบสั่งซื้อที่รับมาจาก PEAK กรองตามบริษัท เปิดดูผู้ขายและใบรับสินค้าที่ผูกอยู่' },
  { href: '/grd', icon: ClipboardCheck, name: 'ใบรับสินค้า (GRD)', desc: 'กรอกข้อมูล แนบเอกสาร เซ็น อนุมัติ และออก PDF ได้ในหน้าเดียว' },
  { href: '/finance', icon: BarChart3, name: 'Finance Dashboard', desc: 'ตัวเลขสรุปห้าช่อง ยอดรวมที่รอชำระ และตารางรวมทุกใบพร้อมเลข UV' },
  { href: '/payments', icon: CreditCard, name: 'การชำระเงิน', desc: 'ตารางแก้ในบรรทัดสำหรับกรอก UV, PV, วันที่ และสถานะการจ่าย' },
  { href: '/master', icon: Users, name: 'ข้อมูลหลัก', desc: 'เพิ่มพนักงาน แก้ role และเปิดปิดการใช้งานบัญชี — เฉพาะผู้ดูแลระบบ' },
]

const PERMISSIONS: { role: string; pr: string; grd: string; finance: string; payments: string; master: string }[] = [
  { role: 'Staff', pr: 'เฉพาะของตัวเอง · เซ็นได้', grd: 'เฉพาะที่รับผิดชอบ · กรอกและเซ็น', finance: '—', payments: '—', master: '—' },
  { role: 'Team Lead', pr: 'ทั้งหมด · อนุมัติขั้นแรก', grd: 'ที่ตัวเองเป็นผู้อนุมัติ', finance: '—', payments: '—', master: '—' },
  { role: 'Manager', pr: 'ทั้งหมด · อนุมัติขั้นสอง', grd: 'ทั้งหมด · อนุมัติขั้นสอง', finance: 'ดูได้', payments: '—', master: '—' },
  { role: 'ExCom', pr: 'อนุมัติใบเกิน 500,000', grd: 'ดูได้', finance: '—', payments: '—', master: '—' },
  { role: 'Finance', pr: 'ดูได้', grd: 'ดูได้', finance: '✓', payments: '✓', master: '—' },
  { role: 'ผู้ดูแลระบบ', pr: 'ทั้งหมด', grd: 'ทั้งหมด', finance: '✓', payments: '✓', master: '✓' },
]

export default async function GuidePage() {
  const session = await getSession()
  if (!session) return null

  const role = session.role as EmployeeRole
  const mySteps = ROLE_STEPS[role] ?? []

  return (
    <div className="p-6 max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">คู่มือการใช้งาน</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          ระบบนี้รวมงานอนุมัติทั้งสายไว้ที่เดียว ตั้งแต่ใบขอซื้อจนถึงวันที่โอนเงินให้ผู้ขาย
          คู่มือนี้ไล่ตามเส้นทางเอกสารทีละขั้น พร้อมยกเอกสารจริงในระบบมาเป็นตัวอย่าง
        </p>
      </div>

      {/* Role banner */}
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2 py-4 text-sm">
          <span className="text-muted-foreground">คุณกำลังใช้งานเป็น</span>
          <strong>{session.name}</strong>
          <Badge>{ROLE_LABEL[role] ?? role}</Badge>
          <span className="text-muted-foreground">— ขั้นตอนที่คุณเกี่ยวข้องคือ</span>
          <span className="flex gap-1.5">
            {mySteps.map((n) => (
              <span
                key={n}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
              >
                {n}
              </span>
            ))}
          </span>
          <span className="text-muted-foreground">(ทำเครื่องหมายไว้ด้านล่าง)</span>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">หกขั้นตอน ทีละขั้น</h2>
          <p className="text-sm text-muted-foreground mt-1">
            แต่ละขั้นบอกว่าใครทำ ต้องทำอะไร มีเงื่อนไขอะไร และเอกสารจะเปลี่ยนสถานะเป็นอะไร
          </p>
        </div>

        {STEPS.map((step) => {
          const mine = mySteps.includes(step.no)
          return (
            <Card key={step.no} className={mine ? 'border-primary/50' : undefined}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      mine
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.no}
                  </span>
                  <CardTitle className="text-base">{step.title}</CardTitle>
                  {step.owners.map((o) => (
                    <Badge key={o} variant="secondary">{o}</Badge>
                  ))}
                  {mine && <Badge variant="outline">ขั้นของคุณ</Badge>}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-sm">
                <p className="text-muted-foreground">{step.intro}</p>

                <Separator />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <Column title="ต้องทำอะไร" items={step.todo.map((t) => ({ text: t }))} />
                  <Column title="เงื่อนไข" items={step.rules} />
                  <Column title="ผลลัพธ์" items={step.result.map((t) => ({ text: t, ok: true }))} />
                </div>

                <div className="rounded-lg border-l-2 border-primary bg-muted/50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    ตัวอย่าง
                  </p>
                  <p className="mt-1">{step.example}</p>
                </div>

                {step.tryIt && (
                  <Link
                    href={step.tryIt.href}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    {step.tryIt.text}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Features */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">ฟีเจอร์รายหน้า</h2>
          <p className="text-sm text-muted-foreground mt-1">
            กดที่การ์ดเพื่อเปิดหน้านั้นได้เลย — เมนูในแถบซ้ายจะแสดงเฉพาะหน้าที่ role ของคุณเข้าได้
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <Link key={f.href} href={f.href}>
                <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/40">
                  <CardContent className="flex gap-3 py-4">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{f.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Permissions */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">สิทธิ์ตาม Role</h2>
          <p className="text-sm text-muted-foreground mt-1">
            ระบบตรวจสิทธิ์ที่ฝั่งเซิร์ฟเวอร์ทุกครั้ง ไม่ได้เชื่อสิ่งที่ส่งมาจากหน้าเว็บ
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">ใบขอซื้อ</th>
                  <th className="px-4 py-3 text-left font-medium">ใบรับสินค้า</th>
                  <th className="px-4 py-3 text-center font-medium">Finance</th>
                  <th className="px-4 py-3 text-center font-medium">ชำระเงิน</th>
                  <th className="px-4 py-3 text-center font-medium">ข้อมูลหลัก</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {PERMISSIONS.map((p) => (
                  <tr
                    key={p.role}
                    className={p.role === (ROLE_LABEL[role] ?? '') ? 'bg-primary/5' : undefined}
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{p.role}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.pr}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.grd}</td>
                    <Cell value={p.finance} />
                    <Cell value={p.payments} />
                    <Cell value={p.master} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Demo limits */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">ข้อจำกัดโหมดเดโม</h2>
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
          <CardContent className="space-y-2 py-4 text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              ตอนนี้ระบบรันด้วยข้อมูลตัวอย่าง ยังไม่ได้ต่อฐานข้อมูลและบริการภายนอกจริง
            </p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>· ปุ่ม “Sync จาก Zoho” ยังดึงใบขอซื้อใหม่ไม่ได้ — ให้ใช้ปุ่มสร้างใบขอซื้อแทน</li>
              <li>· การแจ้งเตือนทาง Cliq และอีเมลยังไม่ส่งจริง</li>
              <li>· ลิงก์เอกสารแนบของใบที่มีมาให้แต่แรกจะเปิดไม่ขึ้น แต่ PDF ที่กดสร้างเองเปิดได้ปกติ</li>
              <li>· ข้อมูลจะรีเซ็ตกลับเป็นชุดตั้งต้นทุกครั้งที่รีสตาร์ทเซิร์ฟเวอร์ — กดอนุมัติเล่นได้เต็มที่</li>
            </ul>
            <p className="pt-1 text-muted-foreground">
              นอกนั้นทำงานเหมือนของจริงทุกอย่าง — การตรวจสิทธิ์ ลำดับสถานะ เงื่อนไขก่อนเซ็น
              การบันทึกประวัติ และการออก PDF ภาษาไทย
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Column({
  title,
  items,
}: {
  title: string
  items: { text: string; warn?: boolean; ok?: boolean }[]
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed">
            {item.warn ? (
              <CircleAlert className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-500" />
            ) : item.ok ? (
              <CircleCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-green-500" />
            ) : (
              <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            )}
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Cell({ value }: { value: string }) {
  if (value === '✓') {
    return (
      <td className="px-4 py-3 text-center">
        <CircleCheck className="mx-auto h-4 w-4 text-green-500" />
      </td>
    )
  }
  if (value === '—') {
    return <td className="px-4 py-3 text-center text-muted-foreground">—</td>
  }
  return <td className="px-4 py-3 text-center text-muted-foreground">{value}</td>
}
