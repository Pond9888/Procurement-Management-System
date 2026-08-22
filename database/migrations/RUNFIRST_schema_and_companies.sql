-- ================================================================
-- GRD AUTOMATION SYSTEM — SUPABASE SCHEMA
-- Vertex Corporation Co., Ltd.
-- Migration: 001_schema.sql
-- Run this FIRST in Supabase SQL Editor
-- ================================================================

-- ================================================================
-- ENUM TYPES
-- ================================================================

CREATE TYPE company_entity  AS ENUM ('vertex_corp', 'vertex_infosec');
CREATE TYPE employee_role   AS ENUM ('staff', 'manager', 'excom', 'finance', 'admin');
CREATE TYPE pr_type         AS ENUM ('pr', 'fixed', 'no_pr', 'advance');
CREATE TYPE type_group      AS ENUM ('PO', 'Fixed', 'Bill', 'Card', 'Advance');
CREATE TYPE type_expense     AS ENUM ('COGS', 'OPEX', 'Asset', 'Infra', 'Marketing', 'Taxes', 'Training', 'Expense');
CREATE TYPE pr_status       AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'po_created');
CREATE TYPE grd_status      AS ENUM ('draft', 'pending_input', 'pending_review', 'pending_excom', 'approved', 'rejected');
CREATE TYPE payment_status  AS ENUM ('pending', 'invoiced', 'paid');
CREATE TYPE aging_flag      AS ENUM ('pending', 'done');

-- ================================================================
-- MASTER: Companies (3 entities)
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
-- MASTER: Customers (ลูกค้า — 27 unique codes หลัง normalize)
-- ================================================================

CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,  -- 'ACME', 'GBK', 'TTS' ...
  name_en     TEXT,
  name_th     TEXT,
  notes       TEXT,
  is_internal BOOLEAN DEFAULT FALSE, -- TRUE สำหรับ 'Share', 'Asset'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- MASTER: Vendors (104 unique จาก Peak — Peak ID เป็น vendor_code)
-- ================================================================

CREATE TABLE vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_code   TEXT UNIQUE NOT NULL,  -- C00804 (Peak ID)
  name          TEXT NOT NULL,
  tax_id        TEXT,
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  is_individual BOOLEAN DEFAULT FALSE, -- TRUE สำหรับ นาย/นางสาว (บุคคลธรรมดา)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- MASTER: Employees (ดึงจาก Zoho — ต้องมี employee_code + email)
-- ================================================================

CREATE TABLE employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code   TEXT UNIQUE NOT NULL,   -- 6017
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  department      TEXT,
  team            TEXT,
  company_id      UUID REFERENCES companies(id),
  role            employee_role DEFAULT 'staff',
  zoho_user_id    TEXT UNIQUE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CORE: Purchase Requests (Zoho Expense)
-- ================================================================

CREATE TABLE purchase_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number       TEXT UNIQUE,            -- PR-02668 (NULL ถ้า Fixed/No PR)
  pr_type         pr_type DEFAULT 'pr',
  cf_company      company_entity DEFAULT 'vertex_corp',
  status          pr_status DEFAULT 'submitted',
  approved_date   DATE,

  submitted_by    UUID REFERENCES employees(id),
  submitted_to    UUID REFERENCES employees(id),

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
-- CORE: Purchase Orders (Peak)
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
  po_sign_doc_id   TEXT,   -- Zoho Sign ID ของ PO (≠ GRD sign ID)
  peak_po_id       TEXT UNIQUE,
  raw_payload      JSONB,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CORE: Goods Receipts (GRD)
-- ================================================================

CREATE TABLE goods_receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grd_number        TEXT UNIQUE NOT NULL,
  form_code         TEXT DEFAULT 'FM-PU-07 01-01/67',

  po_id             UUID REFERENCES purchase_orders(id) NOT NULL,
  pr_id             UUID REFERENCES purchase_requests(id),
  vendor_id         UUID REFERENCES vendors(id),
  customer_id       UUID REFERENCES customers(id),

  -- GRD Form (staff fills only date_of_completion + supporting_docs)
  date_of_completion DATE,
  product_category   TEXT,
  description        TEXT NOT NULL,
  remark             TEXT,

  -- Amount snapshot (denormalized จาก PO ณ เวลาสร้าง GRD)
  amount             NUMERIC(14,2) NOT NULL,
  vat_rate           NUMERIC(5,2) DEFAULT 0,
  vat_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount       NUMERIC(14,2) NOT NULL,
  amount_in_words    TEXT,

  -- Approval chain
  receiver_id        UUID REFERENCES employees(id),
  manager_id         UUID REFERENCES employees(id),
  excom_required     BOOLEAN GENERATED ALWAYS AS (total_amount > 100000) STORED,
  excom_id           UUID REFERENCES employees(id),

  -- Supporting docs: [{name, url, type, size_bytes, uploaded_at}]
  supporting_docs    JSONB DEFAULT '[]',

  -- Finance tracking (จาก Excel)
  aging_status       aging_flag DEFAULT 'pending',
  sent_to_finance_at TIMESTAMPTZ,
  status_remark      TEXT,

  status             grd_status DEFAULT 'draft',
  grd_sign_doc_id    TEXT,
  signed_pdf_url     TEXT,

  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CORE: Payments (UV/PV/Finance tracking — จาก Excel)
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
  week_number       TEXT,   -- "15-27"

  amount            NUMERIC(14,2),
  status            payment_status DEFAULT 'pending',

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- AUDIT: Activity Log
-- ================================================================

CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  action      TEXT NOT NULL,   -- created|updated|approved|rejected|signed|paid
  actor_id    UUID REFERENCES employees(id),
  old_data    JSONB,
  new_data    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX idx_pr_number       ON purchase_requests(pr_number)    WHERE pr_number IS NOT NULL;
CREATE INDEX idx_pr_type         ON purchase_requests(pr_type);
CREATE INDEX idx_pr_status       ON purchase_requests(status);
CREATE INDEX idx_pr_by           ON purchase_requests(submitted_by);
CREATE INDEX idx_pr_company      ON purchase_requests(cf_company);

CREATE INDEX idx_po_pr           ON purchase_orders(pr_id);
CREATE INDEX idx_po_vendor       ON purchase_orders(vendor_id);
CREATE INDEX idx_po_customer     ON purchase_orders(customer_id);
CREATE INDEX idx_po_date         ON purchase_orders(issued_date);

CREATE INDEX idx_grd_po          ON goods_receipts(po_id);
CREATE INDEX idx_grd_status      ON goods_receipts(status);
CREATE INDEX idx_grd_date        ON goods_receipts(date_of_completion);
CREATE INDEX idx_grd_excom       ON goods_receipts(excom_required) WHERE excom_required = TRUE;
CREATE INDEX idx_grd_aging       ON goods_receipts(aging_status);

CREATE INDEX idx_pay_grd         ON payments(grd_id);
CREATE INDEX idx_pay_uv          ON payments(uv_number);
CREATE INDEX idx_act_record      ON activity_logs(table_name, record_id);
CREATE INDEX idx_act_time        ON activity_logs(created_at DESC);

-- ================================================================
-- TRIGGER: auto update updated_at
-- ================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pr_upd  BEFORE UPDATE ON purchase_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_po_upd  BEFORE UPDATE ON purchase_orders    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_grd_upd BEFORE UPDATE ON goods_receipts     FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
-- FUNCTION: Generate GRD Number  →  GRD-68-07-07
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
-- VIEW: GRD Dashboard (Finance/Manager)
-- ================================================================

CREATE OR REPLACE VIEW v_grd_dashboard AS
SELECT
  gr.id,
  gr.grd_number,
  gr.status,
  gr.aging_status,
  gr.date_of_completion,
  gr.total_amount,
  gr.excom_required,
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
  e_mgr.name          AS manager_name,
  p.uv_number,
  p.pv_number,
  p.planned_date,
  p.paid_date,
  p.status            AS payment_status
FROM goods_receipts gr
LEFT JOIN purchase_orders   po     ON gr.po_id      = po.id
LEFT JOIN purchase_requests pr     ON gr.pr_id      = pr.id
LEFT JOIN vendors           v      ON gr.vendor_id   = v.id
LEFT JOIN customers         c      ON gr.customer_id = c.id
LEFT JOIN employees         e_recv ON gr.receiver_id = e_recv.id
LEFT JOIN employees         e_mgr  ON gr.manager_id  = e_mgr.id
LEFT JOIN payments          p      ON p.grd_id       = gr.id
ORDER BY gr.created_at DESC;
-- ================================================================
-- SEED: Companies (3 entities)
-- Migration: 002_seed_companies.sql
-- Run AFTER 001_schema.sql
-- ================================================================

INSERT INTO companies (code, name_th, name_en, tax_id, address) VALUES
(
  'vertex_corp',
  'บริษัท เวอร์เท็กซ์ คอร์ปอเรชั่น จำกัด',
  'Vertex Corporation Co., Ltd.',
  '0105500000001',
  '99/1 Sample Tower, Rama IX Road, Huai Khwang, Bangkok 10310'
),
(
  'vertex_infosec',
  'บริษัท เวอร์เท็กซ์ อินโฟเซ็ค จำกัด',
  'Vertex Infosec Co., Ltd.',
  NULL,  -- ใส่ tax ID จริงเมื่อทราบ
  NULL
)
ON CONFLICT (code) DO NOTHING;
