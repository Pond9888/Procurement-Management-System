-- ================================================================
-- SEED: Customers (27 unique codes หลัง normalize)
-- Migration: 003_seed_customers.sql
-- Run AFTER 002_seed_companies.sql
--
-- NOTE: BAAC-2026, BAAC-Cyber Security 2026 → normalize เป็น BAAC
--       PTT GC, PTT GC Renew E-Learning, PTT-GC → normalize เป็น PTT-GC
--       TTS-Renew*, TTS-Service* → normalize เป็น TTS
--       TMA-Bitsight 2026 → normalize เป็น TMA
-- ================================================================

INSERT INTO customers (code, name_en, name_th, is_internal) VALUES

-- ── ลูกค้าภายนอก (External) ─────────────────────────────────
('ACME',           'Acme Capital Co., Ltd.',  'บริษัท เอคเม่ แคปปิตอล จำกัด', FALSE),
('GBK',             'Global Bank',                       'ธนาคารโกลบอล',                            FALSE),
('TTS',             'Thales Thailand Solution',             NULL,                                        FALSE),
('TMA',             'Thai Microelectronics Association',    NULL,                                        FALSE),
('BAAC',            'Bank for Agriculture and Agricultural Cooperatives', 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร', FALSE),
('PTT-GC',          'PTT Global Chemical',                 'บริษัท พีทีที โกลบอล เคมิคอล',             FALSE),
('PTT-Digital',     'PTT Digital Solutions',               NULL,                                        FALSE),
('East Water',      'Eastern Water Resources Dev. & Mgmt', NULL,                                        FALSE),
('Bualuang',        'Bualuang Securities',                  'หลักทรัพย์บัวหลวง',                        FALSE),
('SMBC',            'Sumitomo Mitsui Banking Corporation',  NULL,                                        FALSE),
('AXA',             'AXA Insurance',                        NULL,                                        FALSE),
('Europ-Assistance','Europ Assistance',                     NULL,                                        FALSE),
('Srichand',        'Srichand United Dispensary',           'ศรีจันทร์',                                FALSE),
('EVEANDBOY',       'EVE&BOY',                              NULL,                                        FALSE),
('Jaymart',         'Jaymart Group Holdings',               NULL,                                        FALSE),
('Saint Gobain',    'Saint-Gobain',                         NULL,                                        FALSE),
('Villa Market',    'Villa Market',                         NULL,                                        FALSE),
('Yakult',          'Yakult (Thailand) Co., Ltd.',          NULL,                                        FALSE),
('Thai Seng',       'Thai Seng',                            NULL,                                        FALSE),
('Thainamtip',      'Thai Namtip Co., Ltd.',                NULL,                                        FALSE),
('Terrabit',        'Terrabit Co., Ltd.',                   NULL,                                        FALSE),
('Nobel',           'Nobel',                                NULL,                                        FALSE),
('UTCC',            'University of the Thai Chamber of Commerce', 'มหาวิทยาลัยหอการค้าไทย',            FALSE),
('BAAC-Cyber Security 2026', NULL,                          NULL,                                        FALSE),  -- keep ถ้าต้องการแยก project
('Invitracehealth', 'Invitrace Health',                     NULL,                                        FALSE),

-- ── ภายใน / Overhead ─────────────────────────────────────────
('Share',           'Internal - Shared Cost',               'ค่าใช้จ่ายส่วนกลาง',                      TRUE),
('Asset',           'Internal - Asset',                     'สินทรัพย์ภายใน',                          TRUE),
('Power App',       'Internal - Power App Project',         NULL,                                        TRUE)

ON CONFLICT (code) DO NOTHING;
