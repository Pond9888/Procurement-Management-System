-- ================================================================
-- SEED: Vendors (104 unique จาก Peak — deduped)
-- Migration: 004_seed_vendors.sql
-- Run AFTER 002_seed_companies.sql
--
-- DATA QUALITY NOTES (พบจาก Excel):
--   C00004  = C000004  → ใช้ C00004 (standard format)
--   C00010  = C000010  → ใช้ C00010
--   C00067  = C000067  → ใช้ C00067
--   000000  = Employee Payroll (internal — ไม่ใช่ vendor จริง)
-- ================================================================

INSERT INTO vendors (vendor_code, name, is_individual) VALUES

-- ── Internal / Payroll (ไม่ใช่ vendor ภายนอก) ─────────────────
('000000',   'Employee Payroll (Internal)',                  FALSE),
('C00016',   'Payroll (Internal)',                           FALSE),

-- ── Financial / Government ────────────────────────────────────
('C00002',   'SAMPLE BANK A',                               FALSE),
('C00004',   'สำนักงานประกันสังคม (สมมติ)',                        FALSE),
('C00005',   'กรมสรรพากร',                                  FALSE),
('C00019',   'บริษัท หลักทรัพย์จัดการกองทุน แซมเปิล จำกัด (กองทุนสำรองเลี้ยงชีพ)', FALSE),
('C00029',   'กองทุนสำรองเลี้ยงชีพ แซมเปิล พูล ฟันด์', FALSE),
('C00051',   'กองทุนสำรองเลี้ยงชีพ แซมเปิล พูล ฟันด์ (2)', FALSE),
('C00067',   'กรมสรรพากร (สาขา)',                           FALSE),
('C00117',   'SAMPLE BANK B',                          FALSE),
('C00127',   'กองทุนเงินให้กู้ยืมเพื่อการศึกษา',          FALSE),
('C00847',   'บริษัท หลักทรัพย์จัดการกองทุน แซมเปิลทู จำกัด', FALSE),

-- ── Utilities / Facilities ────────────────────────────────────
('C00010',   'บริษัท เมโทรพาวเวอร์ จำกัด',                             FALSE),
('C00055',   'บริษัท เมโทรวอเตอร์ จำกัด',                             FALSE),
('C00058',   'บริษัท คลีนวอเตอร์ จำกัด',                FALSE),
('C00062',   'Netway Communication Co., Ltd.',              FALSE),
('C00063',   'บริษัท แอดวานซ์ ไวร์เลส เน็ทเวอร์ค จำกัด', FALSE),
('C00064',   'National Telecom Public Company Limited',     FALSE),
('C00070',   'บริษัท ทรู มูฟ เอช ยูนิเวอร์แซล คอมมิวนิเคชั่น จำกัด', FALSE),
('C00093',   'นิติบุคคลหมู่บ้านจัดสรร บ้านกลางกรุง บิสทาวน์ ลาดพร้าว', FALSE),
('C00462',   'ไทยโอริกซ์ลีสซิ่ง จำกัด',                   FALSE),
('C00874',   'โตโยต้า ลีสซิ่ง',                            FALSE),

-- ── IT / Software / Cloud ─────────────────────────────────────
('C00024',   'FLOWACCOUNT',                                 FALSE),
('C00122',   'เอสไอเอส ดิสทริบิวชั่น (ประเทศไทย)',        FALSE),
('C00154',   'แอ็ดวานซ์อินฟอร์เมชั่นเทคโนโลยี',           FALSE),
('C00191',   'Adobe Systems Software Ireland Ltd.',         FALSE),
('C00201',   'Google Asia Pacific Pte.Ltd.',                FALSE),
('C00488',   'Namecheap, Inc.',                             FALSE),
('C00731',   'Perplexity AI, Inc.',                         FALSE),
('C00755',   'Eleven Labs Inc.',                            FALSE),
('C00773',   'AITable',                                     FALSE),
('C00948',   'BitSight Technologies, Inc.',                 FALSE),
('C00947',   'บริษัท ดาต้าเซฟ จำกัด',                     FALSE),
('C00894',   'D One Solution Co.,Ltd.',                     FALSE),
('C00893',   'บริษัท ซีเคียว ดี เซ็นเตอร์ จำกัด',        FALSE),
('C00749',   'บริษัท ลีเรคโก (ประเทศไทย) จำกัด',         FALSE),
('C00625',   'ดาต้าฟาร์ม',                                  FALSE),
('C00612',   'Fast Work',                                   FALSE),
('C00534',   'เจบีเอ็ม คอมเมิร์ซ',                         FALSE),
('C00054',   'ทรานซิสชั่น ซิสเต็มส์ แอนด์ เน็ทเวอร์คส (ประเทศไทย)', FALSE),
('C00987',   'Fico Development Company Limited',            FALSE),
('C00980',   'บริษัท จีโมทีฟ กรุ๊ป จำกัด',                FALSE),
('C00880',   'บริษัท ฟ้าใสมีสุข จำกัด',                   FALSE),

-- ── Office Supplies / Equipment ───────────────────────────────
('C00056',   'CANON MARKETING (THAILAND) CO.,LTD.',        FALSE),
('C00084',   'พี.เอส.ดับเบิลยู.ยูไนเต็ด',                  FALSE),
('C00085',   'อะยะซัน เซอร์วิส',                           FALSE),
('C00099',   'โฮม โปรดักส์',                               FALSE),
('C00120',   'ปริญช์',                                      FALSE),
('C00148',   'บุญลือ',                                      FALSE),
('C00356',   'บริษัท คอมเซเว่น จำกัด (มหาชน)',            FALSE),
('C00396',   'บริษัท พรีเมี่ยม เพอร์เฟค จำกัด',           FALSE),
('C00496',   'บริษัท โคนิก้า มินอลต้า บิสสิเนส โซลูชันส์ (ประเทศไทย) จำกัด', FALSE),
('C00559',   'พีเค สเตชั่น',                               FALSE),
('C00653',   'บริษัท วิคทอรี่ อะคริลิค จำกัด',            FALSE),
('C00679',   '108 อิงค์เจ็ท',                              FALSE),
('C00699',   'แอล แอนด์ เอช พร็อพเพอร์ตี้',               FALSE),
('C00836',   'โมชิ โมชิ รีเทล คอร์ปอเรชั่น',               FALSE),
('C00888',   'บริษัท พิมพ์ 24 จำกัด',                      FALSE),

-- ── Professional Services / Consulting ───────────────────────
('C00052',   'จอมโว แอคเค้าท์ติ้ง',                        FALSE),
('C00114',   'Starbucks',                                   FALSE),
('C00178',   'สภาวิชาชีพบัญชีในพระบรมราชูปถัมภ์',         FALSE),
('C00227',   'Meta Platforms Ireland Limited',              FALSE),
('C00335',   'บริษัท ฝึกอบรมและสัมมนาธรรมนิติ จำกัด',   FALSE),
('C00458',   'SGS (Thailand) Limited',                      FALSE),
('C00715',   'Gartner Thailand',                            FALSE),  -- col shows C00716 but normalized
('C00716',   'Gartner Thailand',                            FALSE),
('C00726',   'จอมโว แอคเค้าท์ติ้ง (สาขา)',                FALSE),
('C00728',   'บริษัท เอปซีลอง ลีกัล จำกัด',               FALSE),
('C00863',   'แกร็บแท็กซี่ (ประเทศไทย)',                   FALSE),
('C00966',   'แอคเค้าติ้ง โค้ช',                           FALSE),
('C01038',   'Champ Lawfirm',                               FALSE),
('C01043',   'บริษัท ท๊อป โปรเฟสชันแนล แอนด์ ดีเวลลอปเมนต์ จํากัด', FALSE),
('C01045',   'สำนักงานที่เดิน',                             FALSE),
('C00913',   'สำนักงานเขตวังทองหลาง',                      FALSE),
('C00986',   'พันตำรวจเอก อมรชัย สิลาขจรจิต',             TRUE),  -- individual
('C01035',   'บริษัท กิ๊ฟท์ไวซ์เอเชีย จำกัด',             FALSE),

-- ── Freelancers / Individuals (is_individual = TRUE) ──────────
('C00006',   'Sarocha Bunraksa',                            TRUE),
('C00290',   'Sarocha Bunraksa (สำรอง)',                    TRUE),
('C00291',   'วันพิชิต',                                    TRUE),
('C00341',   'Director-Surajit Piphitkul',                  TRUE),
('C00360',   'Anan Chaiyaporn',                        TRUE),
('C00440',   'Thanaporn Chotirangsan',                      TRUE),
('C00490',   'อัญชลี',                                      TRUE),
('C00515',   'สุวรรธน์ เกษเกษม',                           TRUE),
('C00669',   'Ratchada Panit',                          TRUE),
('C00673',   'เวลธ์ สปา',                                   FALSE),
('C00760',   'Praewwanid Techarojchanawarin',               TRUE),
('C00804',   'นางสาว สมหญิง ทองดี',                       TRUE),
('C00805',   'นาย พงศธร สุทธิโชคสถิต',                     TRUE),
('C00806',   'นาย ณัฐคนินทร์ แสงศรี',                      TRUE),
('C00818',   'Chalunton Thongyaem',                         TRUE),
('C00826',   'Paitoon Adam',                                TRUE),
('C00832',   'Wisutthichart Khemklad',                      TRUE),
('C00920',   'จเด็ด',                                       TRUE),
('C00928',   'เยาวลักษณ์',                                  TRUE),
('C00943',   'Chonthicha Chumnarnkitkosol',                 TRUE),
('C00960',   'นายรวิพล ประจำวงษ์',                         TRUE),
('C00961',   'ศราวุฒิ',                                     TRUE),
('C00969',   'วลิตา',                                       TRUE),
('C00996',   'นายภาณุพงษ์ ธนูทอง',                         TRUE),
('C00999',   'นางสาว นฤมล เหลาเส็ง',                       TRUE)

ON CONFLICT (vendor_code) DO NOTHING;
