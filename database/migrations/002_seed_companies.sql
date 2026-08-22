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
