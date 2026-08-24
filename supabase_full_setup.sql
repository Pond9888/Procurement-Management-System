-- ================================================================
-- Vertex Payment Webapp — Initial Schema
-- Migration: 20260511000001_initial_schema.sql
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ================================================================

-- ================================================================
-- ENUM TYPES
-- ================================================================

CREATE TYPE employee_role AS ENUM (
  'staff',
  'team_lead',
  'manager',
  'excom',
  'finance',
  'admin'
);

CREATE TYPE pr_type AS ENUM ('pr', 'fixed', 'no_pr', 'advance');

CREATE TYPE pr_status AS ENUM (
  'submitted',      -- synced จาก Zoho Expense
  'signed',         -- Staff sign แล้ว รอ Team Lead
  'pending_tl',     -- รอ Team Lead approve
  'pending_manager',-- รอ Manager approve
  'pending_excom',  -- รอ ExCom approve (มูลค่าสูง)
  'approved',       -- approved ครบ chain
  'rejected',
  'po_created'      -- PO ถูกสร้างที่ PEAK แล้ว
);

CREATE TYPE grd_status AS ENUM (
  'draft',           -- auto-created จาก PEAK webhook
  'pending_input',   -- รอ Staff กรอกวันรับ + upload docs
  'signed',          -- Staff sign แล้ว รอ Team Lead
  'pending_tl',      -- รอ Team Lead approve
  'pending_manager', -- รอ Manager approve
  'approved',        -- approved ครบ chain
  'rejected'
);

CREATE TYPE type_group AS ENUM ('PO', 'Fixed', 'Bill', 'Card', 'Advance');

CREATE TYPE type_expense AS ENUM (
  'COGS', 'OPEX', 'Asset', 'Infra', 'Marketing', 'Taxes', 'Training', 'Expense'
);

CREATE TYPE payment_status AS ENUM ('pending', 'invoiced', 'paid');

-- ================================================================
-- MASTER: companies
-- ================================================================

CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,   -- 'vertex_corp' | 'vertex_infosec'
  name_th     TEXT NOT NULL,
  name_en     TEXT,
  tax_id      TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- MASTER: employees (sync จาก Zoho)
-- ================================================================

CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code   TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  department      TEXT,
  team            TEXT,
  company_id      UUID REFERENCES companies(id),
  role            employee_role DEFAULT 'staff',
  zoho_user_id    TEXT UNIQUE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- MASTER: vendors (จาก PEAK)
-- ================================================================

CREATE TABLE vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code   TEXT UNIQUE NOT NULL,   -- C00804 (PEAK ID)
  name          TEXT NOT NULL,
  tax_id        TEXT,
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  is_individual BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- MASTER: customers
-- ================================================================

CREATE TABLE customers (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code      TEXT UNIQUE NOT NULL,   -- 'ACME', 'GBK'
  name_th   TEXT,
  name_en   TEXT,
  notes     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CORE: purchase_requests (Zoho Expense)
-- ================================================================

CREATE TABLE purchase_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number       TEXT UNIQUE,                          -- PR-02668 (NULL ถ้า Fixed/No PR)
  pr_type         pr_type DEFAULT 'pr',
  cf_company      TEXT REFERENCES companies(code),      -- 'vertex_corp' | 'vertex_infosec'

  status          pr_status DEFAULT 'submitted',
  signed_at       TIMESTAMPTZ,                          -- เมื่อ Staff sign
  approved_date   DATE,

  submitted_by    UUID REFERENCES employees(id),        -- Staff
  submitted_to    UUID REFERENCES employees(id),        -- Team Lead (direct)

  submitted_on    DATE NOT NULL,
  expected_date   DATE,

  item_category   TEXT,
  reason          TEXT,
  type_group      type_group,
  type_expense    type_expense,

  quantity        NUMERIC(10,2) DEFAULT 1,
  discount        NUMERIC(12,2) DEFAULT 0,
  amount          NUMERIC(14,2) NOT NULL,
  amount_usd      NUMERIC(14,4),

  zoho_pr_id      TEXT UNIQUE,
  raw_payload     JSONB,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CORE: purchase_orders (PEAK webhook)
-- ================================================================

CREATE TABLE purchase_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number        TEXT UNIQUE NOT NULL,   -- PO202507007
  pr_id            UUID REFERENCES purchase_requests(id),
  vendor_id        UUID REFERENCES vendors(id) NOT NULL,
  customer_id      UUID REFERENCES customers(id),

  issued_by        UUID REFERENCES employees(id),
  approved_by      UUID REFERENCES employees(id),
  issued_date      DATE NOT NULL,

  product_category TEXT,
  description      TEXT NOT NULL,

  quantity         NUMERIC(10,2) DEFAULT 1,
  unit_price       NUMERIC(14,2),
  amount_excl_vat  NUMERIC(14,2) NOT NULL,
  vat_rate         NUMERIC(5,2) DEFAULT 0,
  vat_amount       NUMERIC(14,2) GENERATED ALWAYS AS
                     (ROUND(amount_excl_vat * vat_rate / 100, 2)) STORED,
  total_amount     NUMERIC(14,2) GENERATED ALWAYS AS
                     (amount_excl_vat + ROUND(amount_excl_vat * vat_rate / 100, 2)) STORED,

  payment_terms    TEXT,
  po_sign_doc_id   TEXT,   -- Zoho Sign ID (background audit)
  peak_po_id       TEXT UNIQUE,
  raw_payload      JSONB,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CORE: goods_receipts (GRD — auto-created จาก PO webhook)
-- ================================================================

CREATE TABLE goods_receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grd_number        TEXT UNIQUE NOT NULL,          -- GRD-68-07-01
  form_code         TEXT DEFAULT 'FM-PU-07 01-01/67',

  po_id             UUID REFERENCES purchase_orders(id) NOT NULL,
  pr_id             UUID REFERENCES purchase_requests(id),
  vendor_id         UUID REFERENCES vendors(id),
  customer_id       UUID REFERENCES customers(id),

  -- Manual input (Staff กรอก)
  date_of_completion DATE,

  -- Auto-filled จาก PO
  product_category   TEXT,
  description        TEXT NOT NULL,
  remark             TEXT,

  -- Amount snapshot (denormalized จาก PO ณ เวลาสร้าง)
  amount             NUMERIC(14,2) NOT NULL,
  vat_rate           NUMERIC(5,2) DEFAULT 0,
  vat_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount       NUMERIC(14,2) NOT NULL,
  amount_in_words    TEXT,

  -- Approval chain: Staff → Team Lead → Manager
  receiver_id        UUID REFERENCES employees(id),   -- Staff
  team_lead_id       UUID REFERENCES employees(id),
  manager_id         UUID REFERENCES employees(id),
  signed_at          TIMESTAMPTZ,                     -- Staff sign timestamp
  tl_approved_at     TIMESTAMPTZ,
  manager_approved_at TIMESTAMPTZ,

  -- Supporting documents
  supporting_docs    JSONB DEFAULT '[]',   -- [{name, url, type, size, uploaded_at}]

  -- Finance tracking
  aging_status       TEXT DEFAULT 'pending',          -- 'pending' | 'done'
  sent_to_finance_at TIMESTAMPTZ,
  status_remark      TEXT,

  status             grd_status DEFAULT 'draft',
  grd_sign_doc_id    TEXT,        -- Zoho Sign ID (background)
  signed_pdf_url     TEXT,        -- Supabase Storage URL

  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CORE: payments (UV/PV tracking — Finance only)
-- ================================================================

CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grd_id            UUID REFERENCES goods_receipts(id),
  po_id             UUID REFERENCES purchase_orders(id),
  vendor_id         UUID REFERENCES vendors(id),

  uv_number         TEXT,   -- UV-202501059
  pv_number         TEXT,

  estimated_date    DATE,
  planned_date      DATE,
  finance_send_date DATE,
  paid_date         DATE,

  year_finance      SMALLINT,
  month_finance     SMALLINT,
  week_number       TEXT,    -- "15-27"

  amount            NUMERIC(14,2),
  status            payment_status DEFAULT 'pending',

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- AUDIT: activity_logs
-- ================================================================

CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  action      TEXT NOT NULL,   -- created|updated|signed|approved|rejected|paid
  actor_id    UUID REFERENCES employees(id),
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- APPROVAL HISTORY: pr_approvals
-- ================================================================

CREATE TABLE pr_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id       UUID REFERENCES purchase_requests(id) NOT NULL,
  approver_id UUID REFERENCES employees(id) NOT NULL,
  role        employee_role NOT NULL,   -- team_lead | manager | excom
  action      TEXT NOT NULL,            -- 'approved' | 'rejected'
  comment     TEXT,                     -- required เมื่อ rejected
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- APPROVAL HISTORY: grd_approvals
-- ================================================================

CREATE TABLE grd_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grd_id      UUID REFERENCES goods_receipts(id) NOT NULL,
  approver_id UUID REFERENCES employees(id) NOT NULL,
  role        employee_role NOT NULL,   -- staff (sign) | team_lead | manager
  action      TEXT NOT NULL,            -- 'signed' | 'approved' | 'rejected'
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX idx_pr_number        ON purchase_requests(pr_number) WHERE pr_number IS NOT NULL;
CREATE INDEX idx_pr_status        ON purchase_requests(status);
CREATE INDEX idx_pr_submitted_by  ON purchase_requests(submitted_by);
CREATE INDEX idx_pr_company       ON purchase_requests(cf_company);
CREATE INDEX idx_pr_zoho_id       ON purchase_requests(zoho_pr_id) WHERE zoho_pr_id IS NOT NULL;

CREATE INDEX idx_po_pr_id         ON purchase_orders(pr_id);
CREATE INDEX idx_po_vendor        ON purchase_orders(vendor_id);
CREATE INDEX idx_po_issued_date   ON purchase_orders(issued_date);
CREATE INDEX idx_po_peak_id       ON purchase_orders(peak_po_id) WHERE peak_po_id IS NOT NULL;

CREATE INDEX idx_grd_po_id        ON goods_receipts(po_id);
CREATE INDEX idx_grd_status       ON goods_receipts(status);
CREATE INDEX idx_grd_receiver     ON goods_receipts(receiver_id);
CREATE INDEX idx_grd_team_lead    ON goods_receipts(team_lead_id);
CREATE INDEX idx_grd_aging        ON goods_receipts(aging_status);

CREATE INDEX idx_pay_grd          ON payments(grd_id);
CREATE INDEX idx_pay_uv           ON payments(uv_number) WHERE uv_number IS NOT NULL;

CREATE INDEX idx_pr_approvals_pr  ON pr_approvals(pr_id);
CREATE INDEX idx_grd_approvals_grd ON grd_approvals(grd_id);

CREATE INDEX idx_log_record       ON activity_logs(table_name, record_id);
CREATE INDEX idx_log_time         ON activity_logs(created_at DESC);

-- ================================================================
-- TRIGGERS: auto-update updated_at
-- ================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_emp_upd  BEFORE UPDATE ON employees          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vnd_upd  BEFORE UPDATE ON vendors            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_pr_upd   BEFORE UPDATE ON purchase_requests  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_po_upd   BEFORE UPDATE ON purchase_orders    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_grd_upd  BEFORE UPDATE ON goods_receipts     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
-- FUNCTION: Generate GRD number → GRD-68-07-01
-- ================================================================

CREATE OR REPLACE FUNCTION generate_grd_number()
RETURNS TEXT AS $$
DECLARE
  yy  TEXT;
  mm  TEXT;
  seq INT;
BEGIN
  yy  := ((EXTRACT(YEAR FROM NOW())::INT + 543) % 100)::TEXT;
  mm  := LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0');
  SELECT COUNT(*) + 1 INTO seq
  FROM goods_receipts
  WHERE grd_number LIKE 'GRD-' || yy || '-' || mm || '-%';
  RETURN 'GRD-' || yy || '-' || mm || '-' || LPAD(seq::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- VIEW: GRD Dashboard (Finance / Manager)
-- ================================================================

CREATE OR REPLACE VIEW v_grd_dashboard AS
SELECT
  gr.id,
  gr.grd_number,
  gr.status,
  gr.aging_status,
  gr.date_of_completion,
  gr.total_amount,
  gr.amount_in_words,
  gr.status_remark,
  gr.grd_sign_doc_id,
  gr.signed_pdf_url,
  gr.sent_to_finance_at,
  gr.created_at,
  v.vendor_code,
  v.name              AS vendor_name,
  c.code              AS customer_code,
  po.product_category,
  po.po_number,
  po.issued_date      AS po_date,
  po.payment_terms,
  pr.pr_number,
  pr.type_group,
  pr.type_expense,
  pr.cf_company,
  e_recv.name         AS receiver_name,
  e_recv.email        AS receiver_email,
  e_tl.name           AS team_lead_name,
  e_mgr.name          AS manager_name,
  p.uv_number,
  p.pv_number,
  p.planned_date,
  p.paid_date,
  p.status            AS payment_status
FROM goods_receipts gr
LEFT JOIN purchase_orders   po     ON gr.po_id       = po.id
LEFT JOIN purchase_requests pr     ON gr.pr_id       = pr.id
LEFT JOIN vendors           v      ON gr.vendor_id   = v.id
LEFT JOIN customers         c      ON gr.customer_id = c.id
LEFT JOIN employees         e_recv ON gr.receiver_id = e_recv.id
LEFT JOIN employees         e_tl   ON gr.team_lead_id = e_tl.id
LEFT JOIN employees         e_mgr  ON gr.manager_id  = e_mgr.id
LEFT JOIN payments          p      ON p.grd_id       = gr.id
ORDER BY gr.created_at DESC;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_approvals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE grd_approvals       ENABLE ROW LEVEL SECURITY;

-- Master data: ทุกคนที่ login เห็นได้ (authenticated users)
CREATE POLICY "auth_read_companies"  ON companies  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_vendors"    ON vendors    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_customers"  ON customers  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_employees"  ON employees  FOR SELECT TO authenticated USING (true);

-- purchase_requests: Staff เห็นเฉพาะของตัวเอง, หัวหน้าเห็นทั้งหมด
CREATE POLICY "staff_own_pr" ON purchase_requests
  FOR SELECT TO authenticated USING (
    submitted_by = auth.uid()
    OR submitted_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
      AND role IN ('team_lead', 'manager', 'excom', 'finance', 'admin')
    )
  );

CREATE POLICY "staff_insert_pr" ON purchase_requests
  FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "system_update_pr" ON purchase_requests
  FOR UPDATE TO authenticated USING (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
      AND role IN ('team_lead', 'manager', 'excom', 'admin')
    )
  );

-- goods_receipts: Staff เห็นเฉพาะของตัวเอง, Team Lead เห็นของทีม
CREATE POLICY "role_based_grd" ON goods_receipts
  FOR SELECT TO authenticated USING (
    receiver_id = auth.uid()
    OR team_lead_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
      AND role IN ('manager', 'finance', 'admin')
    )
  );

CREATE POLICY "staff_update_grd" ON goods_receipts
  FOR UPDATE TO authenticated USING (
    receiver_id = auth.uid()
    OR team_lead_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

-- purchase_orders: ทุกคน read ได้ (ข้อมูลเชิง business ไม่ sensitive)
CREATE POLICY "auth_read_po" ON purchase_orders
  FOR SELECT TO authenticated USING (true);

-- payments: finance และ admin เท่านั้น
CREATE POLICY "finance_read_payments" ON payments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

CREATE POLICY "finance_write_payments" ON payments
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

-- activity_logs: read-only สำหรับ finance และ admin
CREATE POLICY "audit_log_read" ON activity_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

-- pr_approvals: approver เห็น, หรือ PR owner เห็น
CREATE POLICY "auth_read_pr_approvals" ON pr_approvals
  FOR SELECT TO authenticated USING (
    approver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM purchase_requests
      WHERE id = pr_approvals.pr_id
      AND submitted_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

CREATE POLICY "auth_insert_pr_approvals" ON pr_approvals
  FOR INSERT TO authenticated WITH CHECK (approver_id = auth.uid());

-- grd_approvals: approver เห็น, หรือ GRD owner เห็น
CREATE POLICY "auth_read_grd_approvals" ON grd_approvals
  FOR SELECT TO authenticated USING (
    approver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM goods_receipts
      WHERE id = grd_approvals.grd_id
      AND receiver_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
      AND role IN ('finance', 'admin')
    )
  );

CREATE POLICY "auth_insert_grd_approvals" ON grd_approvals
  FOR INSERT TO authenticated WITH CHECK (approver_id = auth.uid());

-- ================================================================
-- STORAGE BUCKETS
-- ================================================================
-- =============================================================
-- Sprint 5: Supabase Storage buckets for document uploads
-- =============================================================

-- grd-pdfs bucket (already used in Sprint 4, ensure it exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('grd-pdfs', 'grd-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- grd-docs bucket for supporting document uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('grd-docs', 'grd-docs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: authenticated users can read all docs
CREATE POLICY "authenticated read grd-docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'grd-docs');

-- RLS policy: service role can do everything (used by API routes via createServiceClient)
-- Note: service_role bypasses RLS by default — no explicit policy needed.

-- RLS policy: authenticated users can read PDFs
CREATE POLICY "authenticated read grd-pdfs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'grd-pdfs');


-- ================================================================
-- SEED DATA: Companies
-- ================================================================

INSERT INTO companies (code, name_th, name_en, tax_id, address) VALUES
('vertex_corp', 'บริษัท เวอร์เท็กซ์ คอร์ปอเรชั่น จำกัด', 'Vertex Corporation Co., Ltd.', '0105500000001', '99/1 Sample Tower ชั้น 15, ถนนรัชดาภิเษก, แขวงห้วยขวาง, เขตห้วยขวาง, กรุงเทพมหานคร 10310'),
('vertex_infosec', 'บริษัท เวอร์เท็กซ์ อินโฟเซ็ค จำกัด', 'Vertex Infosec Co., Ltd.', '0105500000002', '99/1 Sample Tower ชั้น 15, ถนนรัชดาภิเษก, กรุงเทพมหานคร 10310')
ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- SEED DATA: Customers
-- ================================================================

INSERT INTO customers (code, name_th, name_en, notes) VALUES
('ACME', 'บริษัท เอคเม่ แคปปิตอล จำกัด', 'Acme Capital Co., Ltd.', 'โครงการ E-Learning Suite'),
('GBK', 'ธนาคารโกลบอล จำกัด (มหาชน)', 'Global Bank PCL', 'MA Security Platform'),
('TTS', 'บริษัท ไทยเทคโซลูชั่น จำกัด', 'Thai Tech Solution Co., Ltd.', NULL),
('INTERNAL', 'ใช้ภายในองค์กร', 'Internal Use', NULL),
('Share', 'ค่าใช้จ่ายร่วม', 'Shared Expense', NULL),
('Asset', 'สินทรัพย์', 'Asset Acquisition', NULL)
ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- SEED DATA: Vendors
-- ================================================================

INSERT INTO vendors (vendor_code, name, tax_id, address, phone, email, is_individual) VALUES
('C00804', 'บริษัท เดลตาเทค จำกัด', '0105500000012', 'ถนนพระราม 9 ห้วยขวาง กรุงเทพฯ 10310', '02-245-7788', 'sales@deltatech.example', false),
('C00812', 'บริษัท ออร์บิทซอฟท์ (ประเทศไทย) จำกัด', '0105500000011', 'อาคารสาทรสแควร์ ชั้น 22 กรุงเทพฯ 10310', '02-088-1200', 'th.billing@orbitsoft.example', false),
('C00010', 'บริษัท เมโทรพาวเวอร์ จำกัด', '0105500000013', 'ห้วยขวาง กรุงเทพฯ 10310', '1130', NULL, false),
('C00058', 'บริษัท คลีนวอเตอร์ จำกัด', '0105500000014', 'ห้วยขวาง กรุงเทพฯ 10310', '02-361-4455', 'service@cleanwater.example', false),
('C00921', 'บริษัท ไอทีฮับ โซลูชั่น จำกัด', '0105500000015', 'ห้วยขวาง กรุงเทพฯ 10310', '02-514-9900', 'contact@ithub.example', false),
('C00877', 'บริษัท ไซเบอร์การ์ด (ประเทศไทย) จำกัด', '0105500000016', 'อาคารเอ็มไพร์ทาวเวอร์ กรุงเทพฯ 10310', '02-670-1200', 'th_sales@cyberguard.example', false),
('C00933', 'บริษัท ออฟฟิศพลัส จำกัด (มหาชน)', '0105500000017', 'ห้วยขวาง กรุงเทพฯ 10310', '1281', 'corp@officeplus.example', false),
('C00945', 'บริษัท เน็ตลิงก์ คอร์ปอเรชั่น จำกัด (มหาชน)', '0105500000018', 'พระราม 9 ห้วยขวาง กรุงเทพฯ 10310', '1239', 'business@netlink.example', false),
('C00966', 'นายอนุชา ศรีสวัสดิ์ (ที่ปรึกษาอิสระ)', '1100000000002', 'นนทบุรี 11000', '081-445-2210', 'anucha.freelance@example.com', true)
ON CONFLICT (vendor_code) DO NOTHING;

-- ================================================================
-- SEED DATA: Employees
-- ================================================================

INSERT INTO employees (employee_code, name, email, department, team, role, company_id) VALUES
('EMP-001', 'สมชาย ใจดี', 'manager@example.com', 'Operations', 'OPS', 'manager', (SELECT id FROM companies WHERE code = 'vertex_corp')),
('EMP-002', 'มณีรัตน์ งาม', 'finance@example.com', 'Finance', 'FIN', 'finance', (SELECT id FROM companies WHERE code = 'vertex_corp')),
('EMP-003', 'กิตติ พลาย', 'team_lead@example.com', 'Engineering', 'ENG', 'team_lead', (SELECT id FROM companies WHERE code = 'vertex_corp')),
('EMP-004', 'สุดา รุ่งเรือง', 'staff@example.com', 'Operations', 'OPS', 'staff', (SELECT id FROM companies WHERE code = 'vertex_corp')),
('EMP-010', 'ปรีชา วงศ์ดี', 'excom@example.com', 'Executive', 'EXCOM', 'excom', (SELECT id FROM companies WHERE code = 'vertex_corp')),
('ADMIN-001', 'ผู้ดูแลระบบ', 'admin@example.com', 'IT', 'IT', 'admin', (SELECT id FROM companies WHERE code = 'vertex_corp')),
('EMP-101', 'Somchai Jaidee', 'somchai.j@example.com', 'Client Touchpoint Management', 'CTM', 'staff', (SELECT id FROM companies WHERE code = 'vertex_corp')),
('EMP-102', 'Manee Rakdee', 'manee.r@example.com', 'Enterprise Consulting', 'ECM', 'manager', (SELECT id FROM companies WHERE code = 'vertex_corp')),
('EMP-103', 'Somsak Wattana', 'somsak.w@example.com', 'Data & Analytics', 'DNA', 'team_lead', (SELECT id FROM companies WHERE code = 'vertex_corp')),
('EMP-104', 'Pimchanok Rattana', 'pimchanok.r@example.com', 'Procurement', 'PU', 'staff', (SELECT id FROM companies WHERE code = 'vertex_corp')),
('EMP-105', 'Weerayut Thongchai', 'weerayut.t@example.com', 'Infrastructure', 'INFRA', 'staff', (SELECT id FROM companies WHERE code = 'vertex_infosec'))
ON CONFLICT (employee_code) DO NOTHING;

-- ================================================================
-- ✅ SETUP COMPLETE
-- ================================================================
SELECT 'Setup complete!' AS status,
       (SELECT count(*) FROM companies) AS companies,
       (SELECT count(*) FROM customers) AS customers,
       (SELECT count(*) FROM vendors) AS vendors,
       (SELECT count(*) FROM employees) AS employees;
