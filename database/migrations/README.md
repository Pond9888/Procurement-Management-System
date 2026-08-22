# GRD Migration — Run Order

## ขั้นตอน (ทำตามลำดับ)

### Phase 1: Schema + Static Master Data
รัน SQL ทั้งหมดใน **Supabase SQL Editor** ตามลำดับ:

```
001_schema.sql              → สร้าง tables, indexes, functions, views
002_seed_companies.sql      → 2 บริษัท (vertex_corp, vertex_infosec)
003_seed_customers.sql      → 27 customers (normalized)
004_seed_vendors.sql        → 104 vendors (Peak ID)
005_seed_employees_template.sql → 3 employees (ที่รู้แล้ว)
```

### Phase 2: Complete Employees
กรอกข้อมูลที่เหลือใน `005_seed_employees_template.sql`:
- Option A: Export จาก Zoho Expense API → `GET /api/v1/employees`
- Option B: ขอ HR ส่ง CSV มาให้

### Phase 3: Historical Data Migration
```bash
cd scripts/
pip install supabase python-dotenv
cp .env.example .env    # ใส่ Supabase URL + service key
python migrate_historical.py
```

## .env ที่ต้องการ
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...   # service_role key (ไม่ใช่ anon key)
```

## Data Quality Issues (พบจาก Excel)
- Vendor code duplicate: C00004 = C000004, C00010 = C000010 → ใช้รูปแบบ 5 หลัก
- Customer ซ้ำต่างรูป: normalize แล้วใน migration 003
- Type Expense "COSG" = typo ของ "COGS" → map ใน migrate script แล้ว
- Status field เป็น free text ไม่ใช่ enum → เก็บเป็น status_remark
