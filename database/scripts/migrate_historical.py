"""
GRD Automation — Historical Data Migration Script
Demo Corporation Co., Ltd.

วัตถุประสงค์: Import ข้อมูลประวัติจาก Excel Master DB → Supabase
Source: "Purchase Request 2569data.csv" (3,007 rows)

การใช้งาน:
  1. pip install supabase python-dotenv
  2. สร้างไฟล์ .env ในโฟลเดอร์นี้:
       SUPABASE_URL=https://xxxx.supabase.co
       SUPABASE_SERVICE_KEY=eyJ...  (ใช้ service_role key — ไม่ใช่ anon)
  3. python migrate_historical.py

หมายเหตุ: Run migrations/001-004_*.sql ใน Supabase ก่อน
"""

import csv
import re
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")
CSV_PATH = os.path.join(os.path.dirname(__file__), "../Database/Purchase Request 2569data.csv")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: ต้องตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_KEY ใน .env")
    sys.exit(1)

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ================================================================
# HELPERS
# ================================================================

def parse_amount(raw: str) -> float | None:
    """' 200,468.50 ' → 200468.50"""
    s = raw.strip().replace(",", "").replace(" ", "")
    try:
        return float(s) if s else None
    except ValueError:
        return None

def parse_date(raw: str) -> str | None:
    """'14/07/2025' or '14/07/25' → '2025-07-14'"""
    if not raw or not raw.strip():
        return None
    s = raw.strip()
    for fmt in ("%d/%m/%Y", "%d/%m/%y", "%m/%d/%y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None

def normalize_customer(raw: str) -> str | None:
    """'ACME - Deltatech 2024 - 2025\n' → 'ACME'"""
    if not raw or raw.strip() in ["-", "none", ""]:
        return None
    s = raw.strip().replace("\n", "").split(" - ")[0].strip()
    s = re.sub(r"\s+", " ", s).strip()
    # Normalize duplicates
    mapping = {
        "PTT GC": "PTT-GC",
        "PTT GC Renew E-Learning": "PTT-GC",
        "ACME": "ACME",
        "TTS-Renew (Media)FY25": "TTS",
        "TTS-Renew Security Awareness": "TTS",
        "TTS-Service Pentest": "TTS",
        "TMA-Bitsight 2026": "TMA",
        "BAAC-2026": "BAAC",
    }
    return mapping.get(s, s) if s else None

def map_cf_company(raw: str) -> str:
    mapping = {
        "Vertex Corp": "vertex_corp",
        "Vertex Infosec": "vertex_infosec",
        "ข้าม": "vertex_corp",  # default
    }
    return mapping.get(raw.strip(), "vertex_corp")

def map_pr_type(raw: str) -> str:
    mapping = {
        "PR": "pr",
        "Fixed": "fixed",
        "No PR": "no_pr",
        "Advance": "advance",
    }
    return mapping.get(raw.strip(), "pr")

def map_type_group(raw: str) -> str | None:
    valid = {"PO", "Fixed", "Bill", "Card", "Advance"}
    s = raw.strip()
    return s if s in valid else None

def map_type_expense(raw: str) -> str | None:
    mapping = {
        "COGS": "COGS", "COSG": "COGS",  # fix typo
        "OPEX": "OPEX", "Expense": "Expense",
        "Asset": "Asset", "Infra": "Infra",
        "Marketing": "Marketing", "Taxes": "Taxes",
        "Training": "Training",
    }
    return mapping.get(raw.strip())

# ================================================================
# STEP 1: Load employees from Supabase (ต้อง import แยก ดู step 0)
# ================================================================

def get_employee_map() -> dict[str, str]:
    """Returns {name_lower: uuid} for lookup by name"""
    result = sb.table("employees").select("id, name").execute()
    return {e["name"].lower(): e["id"] for e in result.data}

def get_vendor_map() -> dict[str, str]:
    """Returns {vendor_code: uuid}"""
    result = sb.table("vendors").select("id, vendor_code").execute()
    return {v["vendor_code"]: v["id"] for v in result.data}

def get_customer_map() -> dict[str, str]:
    """Returns {code: uuid}"""
    result = sb.table("customers").select("id, code").execute()
    return {c["code"]: c["id"] for c in result.data}

# ================================================================
# STEP 2: Load and parse CSV
# ================================================================

def load_csv() -> list[dict]:
    rows = []
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        all_rows = list(reader)

    # Row 0 = title, Row 1 = headers, Row 2+ = data
    headers = all_rows[1]
    for row in all_rows[2:]:
        if len(row) < 20:
            continue
        rows.append(dict(zip(headers, row)))
    return rows

# ================================================================
# STEP 3: Migrate purchase_requests
# ================================================================

def migrate_purchase_requests(rows, emp_map, vendor_map):
    print("\n[PR] Migrating purchase_requests...")
    inserted = skipped = 0

    for row in rows:
        pr_num = row.get("Request Number", "").strip()
        if not pr_num.startswith("PR-"):
            skipped += 1
            continue

        owner_name = row.get("Owner Name", "").strip().lower()
        submitted_by = emp_map.get(owner_name)

        payload = {
            "pr_number":    pr_num,
            "pr_type":      map_pr_type(row.get("PR/NO PR", "PR")),
            "cf_company":   map_cf_company(row.get("CF.Company", "")),
            "submitted_on": parse_date(row.get("Created Time", "")) or parse_date(row.get("วันที่ทำ", "")),
            "approved_date":parse_date(row.get("Approved Date", "")),
            "expected_date":parse_date(row.get("Expected Date", "")),
            "reason":       row.get("Business Purpose", "").strip() or None,
            "type_group":   map_type_group(row.get("Type Group", "")),
            "type_expense": map_type_expense(row.get("Type Expense", "")),
            "amount":       parse_amount(row.get(" Total PR(Baht)", "0")) or 0,
            "submitted_by": submitted_by,
        }

        # skip ถ้าไม่มี submitted_on
        if not payload["submitted_on"]:
            skipped += 1
            continue

        try:
            sb.table("purchase_requests").upsert(
                payload, on_conflict="pr_number"
            ).execute()
            inserted += 1
        except Exception as e:
            print(f"  WARN PR {pr_num}: {e}")
            skipped += 1

    print(f"  PR → inserted/updated: {inserted}, skipped: {skipped}")

# ================================================================
# STEP 4: Migrate purchase_orders
# ================================================================

def migrate_purchase_orders(rows, vendor_map, customer_map):
    print("\n[PO] Migrating purchase_orders...")
    inserted = skipped = 0

    # Build PR number → id map
    pr_result = sb.table("purchase_requests").select("id, pr_number").execute()
    pr_map = {p["pr_number"]: p["id"] for p in pr_result.data}

    for row in rows:
        po_num = row.get("เลขที่ PO", "").strip()
        if not po_num.startswith("PO"):
            skipped += 1
            continue

        pr_num     = row.get("Request Number", "").strip()
        vendor_code = row.get("Peak ID", "").strip()
        customer_raw = normalize_customer(row.get("Customer", ""))

        amount_excl = parse_amount(row.get("Amount PO", "0")) or 0
        vat_amount  = parse_amount(row.get("Vat PO", "0")) or 0
        vat_rate    = 7.0 if vat_amount > 0 else 0.0

        payload = {
            "po_number":       po_num,
            "pr_id":           pr_map.get(pr_num),
            "vendor_id":       vendor_map.get(vendor_code),
            "customer_id":     customer_map.get(customer_raw) if customer_raw else None,
            "issued_date":     parse_date(row.get("วันที่ PO", "")),
            "product_category":row.get("Product", "").strip() or None,
            "description":     row.get("Business Purpose", "").strip() or po_num,
            "amount_excl_vat": amount_excl,
            "vat_rate":        vat_rate,
        }

        if not payload["issued_date"] or not payload["vendor_id"]:
            skipped += 1
            continue

        try:
            sb.table("purchase_orders").upsert(
                payload, on_conflict="po_number"
            ).execute()
            inserted += 1
        except Exception as e:
            print(f"  WARN PO {po_num}: {e}")
            skipped += 1

    print(f"  PO → inserted/updated: {inserted}, skipped: {skipped}")

# ================================================================
# STEP 5: Migrate goods_receipts (249 completed rows)
# ================================================================

def migrate_goods_receipts(rows):
    print("\n[GRD] Migrating goods_receipts (rows with receipt date + PO)...")
    inserted = skipped = 0

    # Build PO number → id map
    po_result = sb.table("purchase_orders").select("id, po_number, vendor_id, customer_id, amount_excl_vat, vat_rate, vat_amount, total_amount").execute()
    po_map = {p["po_number"]: p for p in po_result.data}

    pr_result = sb.table("purchase_requests").select("id, pr_number, submitted_by, submitted_to").execute()
    pr_map = {p["pr_number"]: p for p in pr_result.data}

    grd_counter = {}  # {yyyymm: count} สำหรับ generate GRD number

    for row in rows:
        receipt_date = parse_date(row.get("วันที่ได้รับสินค้า", ""))
        po_num = row.get("เลขที่ PO", "").strip()

        if not receipt_date or not po_num.startswith("PO"):
            skipped += 1
            continue

        po = po_map.get(po_num)
        if not po:
            skipped += 1
            continue

        # Generate GRD number จาก receipt date
        dt = datetime.strptime(receipt_date, "%Y-%m-%d")
        thai_yy = (dt.year + 543) % 100
        mm = dt.month
        key = f"{thai_yy:02d}{mm:02d}"
        grd_counter[key] = grd_counter.get(key, 0) + 1
        grd_num = f"GRD-{thai_yy:02d}-{mm:02d}-{grd_counter[key]:02d}"

        pr_num = row.get("Request Number", "").strip()
        pr = pr_map.get(pr_num) if pr_num.startswith("PR-") else None

        uv_num = row.get("UV", "").strip()
        aging_raw = row.get("Aging AP", "").strip()

        payload = {
            "grd_number":        grd_num,
            "po_id":             po["id"],
            "pr_id":             pr["id"] if pr else None,
            "vendor_id":         po.get("vendor_id"),
            "customer_id":       po.get("customer_id"),
            "date_of_completion":receipt_date,
            "description":       row.get("Business Purpose", "").strip() or po_num,
            "product_category":  row.get("Product", "").strip() or None,
            "amount":            po.get("amount_excl_vat", 0),
            "vat_rate":          po.get("vat_rate", 0),
            "vat_amount":        po.get("vat_amount", 0) or 0,
            "total_amount":      po.get("total_amount", 0),
            "receiver_id":       pr["submitted_by"] if pr else None,
            "manager_id":        pr["submitted_to"] if pr else None,
            "aging_status":      "pending" if aging_raw == "x" else "done",
            "status":            "approved",   # historical = approved
            "sent_to_finance_at":parse_date(row.get("Finance Send Date", "")),
            "status_remark":     row.get("Status Remark", "").strip() or None,
        }

        try:
            sb.table("goods_receipts").upsert(
                payload, on_conflict="grd_number"
            ).execute()

            # Migrate payment info
            if uv_num and uv_num not in ["UV", ""]:
                grd_result = sb.table("goods_receipts").select("id").eq("grd_number", grd_num).single().execute()
                if grd_result.data:
                    sb.table("payments").upsert({
                        "grd_id":           grd_result.data["id"],
                        "po_id":            po["id"],
                        "vendor_id":        po.get("vendor_id"),
                        "uv_number":        uv_num,
                        "finance_send_date":parse_date(row.get("Finance Send Date", "")),
                        "paid_date":        parse_date(row.get("Date Paid", "")),
                        "estimated_date":   parse_date(row.get("ประมาณการจ่าย", "")),
                        "planned_date":     parse_date(row.get("Plan จ่าย", "")),
                        "week_number":      row.get("Week Finance", "").strip() or None,
                        "status":           "paid" if parse_date(row.get("Date Paid", "")) else "pending",
                    }, on_conflict="uv_number").execute()

            inserted += 1
        except Exception as e:
            print(f"  WARN GRD {grd_num}: {e}")
            skipped += 1

    print(f"  GRD → inserted/updated: {inserted}, skipped: {skipped}")

# ================================================================
# MAIN
# ================================================================

def main():
    print("=" * 60)
    print("GRD Migration — Vertex Corporation")
    print("=" * 60)

    rows = load_csv()
    print(f"\nLoaded {len(rows)} rows from CSV")

    print("\nLoading master data maps from Supabase...")
    emp_map    = get_employee_map()
    vendor_map = get_vendor_map()
    customer_map = get_customer_map()
    print(f"  employees: {len(emp_map)}, vendors: {len(vendor_map)}, customers: {len(customer_map)}")

    if len(emp_map) == 0:
        print("\nWARNING: employees table ว่างอยู่!")
        print("  → ต้อง import employees ก่อน (ดู migration/005_seed_employees.sql)")
        print("  → ข้ามการ migrate PR/GRD ที่ต้องการ submitted_by\n")

    migrate_purchase_requests(rows, emp_map, vendor_map)
    migrate_purchase_orders(rows, vendor_map, customer_map)
    migrate_goods_receipts(rows)

    print("\n" + "=" * 60)
    print("Migration complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()
