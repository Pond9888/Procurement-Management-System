#!/usr/bin/env node
/**
 * Supabase Database Setup Script
 * Runs schema migration + seed data via Supabase REST API
 * 
 * Usage: node setup-db.mjs
 */

const SUPABASE_URL = 'https://jhbyazscgevbhphabyne.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoYnlhenNjZ2V2YmhwaGFieW5lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzM3OTMzMCwiZXhwIjoyMTAyOTU1MzMwfQ.kaiHO0ZwvMGrec83bd3yvj2yrxSiml-XJjlhLcDqzCo';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Prefer': 'return=minimal',
};

async function rpc(fn, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`RPC ${fn} failed (${res.status}): ${t}`);
  }
  return res.json().catch(() => null);
}

async function insertRow(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const t = await res.text();
    // If already exists (conflict), that's OK
    if (res.status === 409) {
      console.log(`  ⏭  ${table}: already exists, skipping`);
      return null;
    }
    throw new Error(`INSERT ${table} failed (${res.status}): ${t}`);
  }
  return res.json();
}

async function upsertRows(table, data, onConflict) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      ...headers,
      'Prefer': 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`UPSERT ${table} failed (${res.status}): ${t}`);
  }
  return res.json();
}

async function query(table, select = '*') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}`, {
    headers,
  });
  return res.json();
}

// ──────────────────────────────────────────────────────────────
// STEP 1: Test connection
// ──────────────────────────────────────────────────────────────
async function testConnection() {
  console.log('🔌 Testing Supabase connection...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
  if (res.ok) {
    console.log('✅ Connected to Supabase successfully!\n');
    return true;
  }
  console.error('❌ Connection failed:', res.status, await res.text());
  return false;
}

// ──────────────────────────────────────────────────────────────
// STEP 2: Seed companies
// ──────────────────────────────────────────────────────────────
async function seedCompanies() {
  console.log('🏢 Seeding companies...');
  const companies = [
    {
      code: 'vertex_corp',
      name_th: 'บริษัท เวอร์เท็กซ์ คอร์ปอเรชั่น จำกัด',
      name_en: 'Vertex Corporation Co., Ltd.',
      tax_id: '0105500000001',
      address: '99/1 Sample Tower ชั้น 15, ถนนรัชดาภิเษก, แขวงห้วยขวาง, เขตห้วยขวาง, กรุงเทพมหานคร 10310',
    },
    {
      code: 'vertex_infosec',
      name_th: 'บริษัท เวอร์เท็กซ์ อินโฟเซ็ค จำกัด',
      name_en: 'Vertex Infosec Co., Ltd.',
      tax_id: '0105500000002',
      address: '99/1 Sample Tower ชั้น 15, ถนนรัชดาภิเษก, กรุงเทพมหานคร 10310',
    },
  ];
  for (const c of companies) {
    try {
      await insertRow('companies', c);
      console.log(`  ✅ ${c.code}`);
    } catch (e) {
      console.log(`  ⚠️  ${c.code}: ${e.message.slice(0, 100)}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────
// STEP 3: Seed customers
// ──────────────────────────────────────────────────────────────
async function seedCustomers() {
  console.log('👥 Seeding customers...');
  const customers = [
    { code: 'ACME', name_th: 'บริษัท เอคเม่ แคปปิตอล จำกัด', name_en: 'Acme Capital Co., Ltd.', notes: 'โครงการ E-Learning Suite' },
    { code: 'GBK', name_th: 'ธนาคารโกลบอล จำกัด (มหาชน)', name_en: 'Global Bank PCL', notes: 'MA Security Platform' },
    { code: 'TTS', name_th: 'บริษัท ไทยเทคโซลูชั่น จำกัด', name_en: 'Thai Tech Solution Co., Ltd.', notes: null },
    { code: 'INTERNAL', name_th: 'ใช้ภายในองค์กร', name_en: 'Internal Use', notes: null },
    { code: 'Share', name_th: 'ค่าใช้จ่ายร่วม', name_en: 'Shared Expense', notes: null },
    { code: 'Asset', name_th: 'สินทรัพย์', name_en: 'Asset Acquisition', notes: null },
  ];
  for (const c of customers) {
    try {
      await insertRow('customers', c);
      console.log(`  ✅ ${c.code}`);
    } catch (e) {
      console.log(`  ⚠️  ${c.code}: ${e.message.slice(0, 100)}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────
// STEP 4: Seed vendors
// ──────────────────────────────────────────────────────────────
async function seedVendors() {
  console.log('🏪 Seeding vendors...');
  const vendors = [
    { vendor_code: 'C00804', name: 'บริษัท เดลตาเทค จำกัด', tax_id: '0105500000012', address: 'ถนนพระราม 9 ห้วยขวาง กรุงเทพฯ 10310', phone: '02-245-7788', email: 'sales@deltatech.example', is_individual: false },
    { vendor_code: 'C00812', name: 'บริษัท ออร์บิทซอฟท์ (ประเทศไทย) จำกัด', tax_id: '0105500000011', address: 'อาคารสาทรสแควร์ ชั้น 22 กรุงเทพฯ 10310', phone: '02-088-1200', email: 'th.billing@orbitsoft.example', is_individual: false },
    { vendor_code: 'C00010', name: 'บริษัท เมโทรพาวเวอร์ จำกัด', tax_id: '0105500000013', phone: '1130', is_individual: false },
    { vendor_code: 'C00058', name: 'บริษัท คลีนวอเตอร์ จำกัด', tax_id: '0105500000014', phone: '02-361-4455', email: 'service@cleanwater.example', is_individual: false },
    { vendor_code: 'C00921', name: 'บริษัท ไอทีฮับ โซลูชั่น จำกัด', tax_id: '0105500000015', phone: '02-514-9900', email: 'contact@ithub.example', is_individual: false },
    { vendor_code: 'C00877', name: 'บริษัท ไซเบอร์การ์ด (ประเทศไทย) จำกัด', tax_id: '0105500000016', phone: '02-670-1200', email: 'th_sales@cyberguard.example', is_individual: false },
    { vendor_code: 'C00933', name: 'บริษัท ออฟฟิศพลัส จำกัด (มหาชน)', tax_id: '0105500000017', phone: '1281', email: 'corp@officeplus.example', is_individual: false },
    { vendor_code: 'C00945', name: 'บริษัท เน็ตลิงก์ คอร์ปอเรชั่น จำกัด (มหาชน)', tax_id: '0105500000018', phone: '1239', email: 'business@netlink.example', is_individual: false },
    { vendor_code: 'C00966', name: 'นายอนุชา ศรีสวัสดิ์ (ที่ปรึกษาอิสระ)', tax_id: '1100000000002', phone: '081-445-2210', email: 'anucha.freelance@example.com', is_individual: true },
  ];
  for (const v of vendors) {
    try {
      await insertRow('vendors', v);
      console.log(`  ✅ ${v.vendor_code} — ${v.name}`);
    } catch (e) {
      console.log(`  ⚠️  ${v.vendor_code}: ${e.message.slice(0, 100)}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────
// STEP 5: Seed employees
// ──────────────────────────────────────────────────────────────
async function seedEmployees() {
  console.log('👨‍💼 Seeding employees...');
  const companies = await query('companies', 'id,code');
  const corpId = companies.find(c => c.code === 'vertex_corp')?.id;
  const infosecId = companies.find(c => c.code === 'vertex_infosec')?.id;

  if (!corpId) {
    console.error('  ❌ Could not find vertex_corp company');
    return;
  }

  const employees = [
    { employee_code: 'EMP-001', name: 'สมชาย ใจดี', email: 'manager@example.com', department: 'Operations', team: 'OPS', role: 'manager', company_id: corpId },
    { employee_code: 'EMP-002', name: 'มณีรัตน์ งาม', email: 'finance@example.com', department: 'Finance', team: 'FIN', role: 'finance', company_id: corpId },
    { employee_code: 'EMP-003', name: 'กิตติ พลาย', email: 'team_lead@example.com', department: 'Engineering', team: 'ENG', role: 'team_lead', company_id: corpId },
    { employee_code: 'EMP-004', name: 'สุดา รุ่งเรือง', email: 'staff@example.com', department: 'Operations', team: 'OPS', role: 'staff', company_id: corpId },
    { employee_code: 'EMP-010', name: 'ปรีชา วงศ์ดี', email: 'excom@example.com', department: 'Executive', team: 'EXCOM', role: 'excom', company_id: corpId },
    { employee_code: 'ADMIN-001', name: 'ผู้ดูแลระบบ', email: 'admin@example.com', department: 'IT', team: 'IT', role: 'admin', company_id: corpId },
    { employee_code: 'EMP-101', name: 'Somchai Jaidee', email: 'somchai.j@example.com', department: 'Client Touchpoint Management (CTM)', team: 'CTM', role: 'staff', company_id: corpId },
    { employee_code: 'EMP-102', name: 'Manee Rakdee', email: 'manee.r@example.com', department: 'Enterprise Customer Management (ECM)', team: 'ECM', role: 'manager', company_id: corpId },
    { employee_code: 'EMP-103', name: 'Somsak Wattana', email: 'somsak.w@example.com', department: 'Data & Analytics', team: 'DNA', role: 'team_lead', company_id: corpId },
    { employee_code: 'EMP-104', name: 'Pimchanok Rattana', email: 'pimchanok.r@example.com', department: 'Procurement', team: 'PU', role: 'staff', company_id: corpId },
    { employee_code: 'EMP-105', name: 'Weerayut Thongchai', email: 'weerayut.t@example.com', department: 'Infrastructure', team: 'INFRA', role: 'staff', company_id: infosecId || corpId },
  ];

  for (const e of employees) {
    try {
      await insertRow('employees', e);
      console.log(`  ✅ ${e.employee_code} — ${e.name} (${e.role})`);
    } catch (err) {
      console.log(`  ⚠️  ${e.employee_code}: ${err.message.slice(0, 100)}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Supabase Database Setup\n');
  console.log('📍 URL:', SUPABASE_URL);
  console.log('');

  const connected = await testConnection();
  if (!connected) {
    console.log('\n⚠️  Cannot connect. Please run the SQL schema manually in Supabase Dashboard SQL Editor first:');
    console.log('   1. supabase/migrations/20260511000001_initial_schema.sql');
    console.log('   2. supabase/migrations/20260511000002_storage_buckets.sql');
    process.exit(1);
  }

  // Check if tables exist by trying to query companies
  try {
    const existing = await query('companies', 'id');
    console.log(`📊 Tables exist. Found ${existing.length} companies.\n`);
    
    if (existing.length > 0) {
      console.log('ℹ️  Database already has data. Seeding will skip duplicates.\n');
    }
  } catch (e) {
    console.log('⚠️  Tables not found. Please run the SQL schema first:');
    console.log('   Supabase Dashboard → SQL Editor → New query');
    console.log('   Paste: supabase/migrations/20260511000001_initial_schema.sql');
    console.log('   Then:  supabase/migrations/20260511000002_storage_buckets.sql');
    console.log('\nThen run this script again to seed data.');
    process.exit(1);
  }

  // Seed data
  await seedCompanies();
  console.log('');
  await seedCustomers();
  console.log('');
  await seedVendors();
  console.log('');
  await seedEmployees();
  
  console.log('\n🎉 Database setup complete!\n');
  console.log('Next steps:');
  console.log('  1. Run: npm run dev');
  console.log('  2. Open: http://localhost:3000');
  console.log('  3. Set DEV_MOCK_LOGIN=true in .env.local for demo mode');
}

main().catch(e => {
  console.error('💥 Fatal error:', e.message);
  process.exit(1);
});
