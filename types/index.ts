// ==============================================
// Vertex Payment Webapp — Shared Types
// ==============================================

export type EmployeeRole = 'staff' | 'team_lead' | 'manager' | 'excom' | 'finance' | 'admin'
export type PRType = 'pr' | 'fixed' | 'no_pr' | 'advance'
export type TypeGroup = 'PO' | 'Fixed' | 'Bill' | 'Card' | 'Advance'
export type TypeExpense = 'COGS' | 'OPEX' | 'Asset' | 'Infra' | 'Marketing' | 'Taxes' | 'Training' | 'Expense'
export type AgingFlag = 'pending' | 'done'
export type PaymentStatus = 'pending' | 'invoiced' | 'paid'

export type PRStatus =
  | 'submitted'
  | 'signed'
  | 'pending_tl'
  | 'pending_manager'
  | 'pending_excom'
  | 'approved'
  | 'rejected'
  | 'po_created'

export type GRDStatus =
  | 'draft'
  | 'pending_input'
  | 'signed'
  | 'pending_tl'
  | 'pending_manager'
  | 'approved'
  | 'rejected'

// --------------------------------------------------
// Master Tables
// --------------------------------------------------

export interface Company {
  id: string
  code: string
  name_th: string
  name_en: string | null
  tax_id: string | null
  address: string | null
  created_at: string
}

export interface Employee {
  id: string
  employee_code: string
  name: string
  email: string
  department: string | null
  team: string | null
  company_id: string | null
  role: EmployeeRole
  zoho_user_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  vendor_code: string
  name: string
  tax_id: string | null
  address: string | null
  phone: string | null
  email: string | null
  is_individual: boolean
  created_at: string
}

export interface Customer {
  id: string
  code: string
  name_th: string | null
  name_en: string | null
  notes: string | null
  created_at: string
}

// --------------------------------------------------
// Core Tables
// --------------------------------------------------

export interface PurchaseRequest {
  id: string
  pr_number: string | null
  pr_type: PRType
  cf_company: string | null
  status: PRStatus
  signed_at: string | null
  approved_date: string | null
  submitted_by: string | null
  submitted_to: string | null
  submitted_on: string
  expected_date: string | null
  item_category: string | null
  reason: string | null
  type_group: TypeGroup | null
  type_expense: TypeExpense | null
  quantity: number
  discount: number
  amount: number
  amount_usd: number | null
  zoho_pr_id: string | null
  raw_payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Joined fields
  submitted_by_employee?: Employee
  submitted_to_employee?: Employee
  approvals?: PRApproval[]
}

export interface PurchaseOrder {
  id: string
  po_number: string
  pr_id: string | null
  vendor_id: string
  customer_id: string | null
  issued_by: string | null
  approved_by: string | null
  issued_date: string
  product_category: string | null
  description: string
  quantity: number
  unit_price: number | null
  amount_excl_vat: number
  vat_rate: number
  vat_amount: number
  total_amount: number
  payment_terms: string | null
  po_sign_doc_id: string | null
  peak_po_id: string | null
  raw_payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Joined fields
  vendor?: Vendor
  customer?: Customer
  purchase_request?: PurchaseRequest
}

export interface SupportingDoc {
  name: string
  url: string
  type: string
  size: number
  uploaded_at: string
}

export interface GoodsReceipt {
  id: string
  grd_number: string
  form_code: string
  po_id: string
  pr_id: string | null
  vendor_id: string | null
  customer_id: string | null
  date_of_completion: string | null
  product_category: string | null
  description: string
  remark: string | null
  amount: number
  vat_rate: number
  vat_amount: number
  total_amount: number
  amount_in_words: string | null
  receiver_id: string | null
  team_lead_id: string | null
  manager_id: string | null
  signed_at: string | null
  tl_approved_at: string | null
  manager_approved_at: string | null
  supporting_docs: SupportingDoc[]
  aging_status: AgingFlag
  sent_to_finance_at: string | null
  status_remark: string | null
  status: GRDStatus
  grd_sign_doc_id: string | null
  signed_pdf_url: string | null
  created_at: string
  updated_at: string
  // Joined fields
  vendor?: Vendor
  customer?: Customer
  purchase_order?: PurchaseOrder
  purchase_request?: PurchaseRequest
  receiver?: Employee
  team_lead?: Employee
  manager?: Employee
  approvals?: GRDApproval[]
}

export interface Payment {
  id: string
  grd_id: string | null
  po_id: string | null
  vendor_id: string | null
  uv_number: string | null
  pv_number: string | null
  estimated_date: string | null
  planned_date: string | null
  finance_send_date: string | null
  paid_date: string | null
  year_finance: number | null
  month_finance: number | null
  week_number: string | null
  amount: number | null
  status: PaymentStatus
  created_at: string
}

// --------------------------------------------------
// Approval History
// --------------------------------------------------

export interface PRApproval {
  id: string
  pr_id: string
  approver_id: string
  role: EmployeeRole
  action: 'approved' | 'rejected'
  comment: string | null
  created_at: string
  approver?: Employee
}

export interface GRDApproval {
  id: string
  grd_id: string
  approver_id: string
  role: EmployeeRole
  action: 'signed' | 'approved' | 'rejected'
  comment: string | null
  created_at: string
  approver?: Employee
}

// --------------------------------------------------
// Session / Auth
// --------------------------------------------------

export interface UserSession {
  id: string           // employee.id (UUID)
  employee_code: string
  name: string
  email: string
  role: EmployeeRole
  department: string | null
  company_id: string | null
  zoho_access_token: string
  zoho_refresh_token: string
  expires_at: number   // unix timestamp
}

// --------------------------------------------------
// API Response Wrappers
// --------------------------------------------------

export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    detail?: string
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// --------------------------------------------------
// Finance Dashboard
// --------------------------------------------------

export interface FinanceSummary {
  total_grd: number
  pending_input: number
  pending_approval: number
  approved_unpaid: number
  paid: number
}

export interface GRDDashboardRow {
  grd_number: string
  status: GRDStatus
  vendor_name: string
  customer_code: string | null
  total_amount: number
  date_of_completion: string | null
  aging_status: AgingFlag
  uv_number: string | null
  pv_number: string | null
  paid_date: string | null
  created_at: string
  po_number: string
  pr_number: string | null
  receiver_name: string | null
}

// --------------------------------------------------
// PEAK Webhook Payload
// --------------------------------------------------

export interface PeakWebhookPayload {
  event: 'purchase_order.created' | 'purchase_order.updated'
  data: {
    document_number: string
    reference: string | null
    issue_date: string
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
  }
}
