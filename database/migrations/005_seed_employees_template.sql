-- ================================================================
-- SEED: Employees — Template (ต้องกรอกข้อมูลจริง)
-- Migration: 005_seed_employees_template.sql
--
-- วิธีได้ข้อมูลจริง:
--   Option A (แนะนำ): Export จาก Zoho Expense
--     GET https://expense.zoho.com/api/v1/employees
--     → ได้ employee_id, name, email, department
--
--   Option B: ขอ HR export เป็น CSV แล้วใส่ด้านล่างนี้
--
-- Owner Names จาก Excel (39 unique — ยังไม่มี employee_code + email):
--   Apisit Meekaew, Mali Homklin, Chalunton Thongyaem,
--   Chetta Khannapo, Chonthicha Chumnarnkitkosol, Chutinan Pantanathiti,
--   Issaraporn Silawat, Kanyanat Kumkailng, Kasidit Siriprapakorn,
--   Kitthanannop Sriprai, Weerayut Thongchai, Suphaphon Aksorn,
--   Nannaphat Phongphaew, Niracha Chewabantung, Paitoon Adam,
--   Manee Rakdee (EMP-102), Peeraya Jira-anankul, Somchai Deedee,
--   Phubeth Manorat, Praewwanid Techarojchanawarin, Somchai Jaidee (EMP-101),
--   Pimchanok Rattana, Sarinya Somkane, Sarocha Bunraksa, Nittaya Somboon,
--   Surajit, Teera La-Orkarnchanakul, Wichai Sukchai,
--   Prasert Ruangdet, Wannasiri Komkongsak, Sompong Meesuk,
--   Warachaya Pungpang
--
-- ข้อมูลที่รู้จาก PDF (PR-02668):
--   6017 | Somchai Jaidee  | somchai.j@example.com  | CTM    | staff
--   6001 | Manee Rakdee| manee.r@example.com   | ECM    | manager
-- ================================================================

-- ต้องหา company_id ก่อน (จาก migration 002)
-- ใช้ subquery ดึง id จาก companies table

INSERT INTO employees (employee_code, name, email, department, role, company_id) VALUES

-- ── Known จาก PDF ───────────────────────────────────────────────
(
  'EMP-101',
  'Somchai Jaidee',
  'somchai.j@example.com',
  'Client Touchpoint Management (CTM)',
  'staff',
  (SELECT id FROM companies WHERE code = 'vertex_corp')
),
(
  'EMP-102',
  'Manee Rakdee',
  'manee.r@example.com',
  'Enterprise Consulting Management',
  'manager',
  (SELECT id FROM companies WHERE code = 'vertex_corp')
),

-- ── ต้องกรอกเพิ่ม (employee_code + email จาก Zoho/HR) ──────────
-- ('XXXX', 'Somchai Deedee',              'somchai.d@example.com',      'Finance',   'finance',  (SELECT id FROM companies WHERE code = 'vertex_corp')),
-- ('XXXX', 'Sompong Meesuk',         'sompong.m@example.com',     'Finance',   'manager',  (SELECT id FROM companies WHERE code = 'vertex_corp')),
-- ('XXXX', 'Wichai Sukchai',             'wichai.s@example.com',       'IT/Ops',    'admin',    (SELECT id FROM companies WHERE code = 'vertex_corp')),
-- ('XXXX', 'Nittaya Somboon',                 'nittaya.s@example.com',       'Accounting','finance',  (SELECT id FROM companies WHERE code = 'vertex_corp')),
-- ('XXXX', 'Prasert Ruangdet',            'prasert.r@example.com',      NULL,        'staff',    (SELECT id FROM companies WHERE code = 'vertex_corp')),
-- ('XXXX', 'Mali Homklin',                'mali.h@example.com',        NULL,        'staff',    (SELECT id FROM companies WHERE code = 'vertex_corp')),
-- ... เพิ่มที่เหลือ

('TEMP01', 'Somchai Deedee', 'somchai.d@example.com', 'Finance', 'finance',
  (SELECT id FROM companies WHERE code = 'vertex_corp'))

ON CONFLICT (employee_code) DO NOTHING;

-- ================================================================
-- หลังจาก Import Zoho API ให้ update zoho_user_id:
-- UPDATE employees SET zoho_user_id = '...' WHERE employee_code = 'EMP-101';
-- ================================================================
