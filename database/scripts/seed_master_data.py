"""
GRD Automation — Seed Master Data via Supabase REST API
Vertex Corporation Co., Ltd.

วัตถุประสงค์: Insert customers, vendors ผ่าน supabase-py
(ต้อง run RUNFIRST_schema_and_companies.sql ใน SQL Editor ก่อน)

การใช้งาน:
  python3 seed_master_data.py
"""

import os, sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: ตั้งค่า .env ก่อน"); sys.exit(1)

from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

def upsert(table: str, rows: list[dict], conflict_col: str):
    try:
        sb.table(table).upsert(rows, on_conflict=conflict_col).execute()
        print(f"  ✓ {table}: {len(rows)} rows")
    except Exception as e:
        print(f"  ✗ {table}: {e}")

# ================================================================
# CUSTOMERS
# ================================================================
customers = [
    # External
    {"code": "ACME",                "name_en": "Acme Capital Co., Ltd.",      "is_internal": False},
    {"code": "GBK",                  "name_en": "Global Bank",                           "is_internal": False},
    {"code": "TTS",                  "name_en": "Thales Thailand Solution",                 "is_internal": False},
    {"code": "TMA",                  "name_en": "Thai Microelectronics Association",        "is_internal": False},
    {"code": "BAAC",                 "name_en": "Bank for Agriculture and Agri. Coop.",     "is_internal": False},
    {"code": "PTT-GC",               "name_en": "PTT Global Chemical",                      "is_internal": False},
    {"code": "PTT-Digital",          "name_en": "PTT Digital Solutions",                    "is_internal": False},
    {"code": "East Water",           "name_en": "Eastern Water Resources Dev. & Mgmt",      "is_internal": False},
    {"code": "Bualuang",             "name_en": "Bualuang Securities",                      "is_internal": False},
    {"code": "SMBC",                 "name_en": "Sumitomo Mitsui Banking Corporation",      "is_internal": False},
    {"code": "AXA",                  "name_en": "AXA Insurance",                            "is_internal": False},
    {"code": "Europ-Assistance",     "name_en": "Europ Assistance",                         "is_internal": False},
    {"code": "Srichand",             "name_en": "Srichand United Dispensary",               "is_internal": False},
    {"code": "EVEANDBOY",            "name_en": "EVE&BOY",                                  "is_internal": False},
    {"code": "Jaymart",              "name_en": "Jaymart Group Holdings",                   "is_internal": False},
    {"code": "Saint Gobain",         "name_en": "Saint-Gobain",                             "is_internal": False},
    {"code": "Villa Market",         "name_en": "Villa Market",                             "is_internal": False},
    {"code": "Yakult",               "name_en": "Yakult (Thailand) Co., Ltd.",              "is_internal": False},
    {"code": "Thai Seng",            "name_en": "Thai Seng",                                "is_internal": False},
    {"code": "Thainamtip",           "name_en": "Thai Namtip Co., Ltd.",                    "is_internal": False},
    {"code": "Terrabit",             "name_en": "Terrabit Co., Ltd.",                       "is_internal": False},
    {"code": "Nobel",                "name_en": "Nobel",                                    "is_internal": False},
    {"code": "UTCC",                 "name_en": "Univ. of the Thai Chamber of Commerce",   "is_internal": False},
    {"code": "BAAC-Cyber Security 2026", "name_en": "BAAC Cyber Security Project 2026",   "is_internal": False},
    {"code": "Invitracehealth",      "name_en": "Invitrace Health",                         "is_internal": False},
    # Internal
    {"code": "Share",   "name_en": "Internal - Shared Cost",   "is_internal": True},
    {"code": "Asset",   "name_en": "Internal - Asset",         "is_internal": True},
    {"code": "Power App","name_en": "Internal - Power App",    "is_internal": True},
]

# ================================================================
# VENDORS
# ================================================================
vendors = [
    # Internal
    {"vendor_code": "000000", "name": "Employee Payroll (Internal)",    "is_individual": False},
    {"vendor_code": "C00016", "name": "Payroll (Internal)",             "is_individual": False},
    # Financial / Government
    {"vendor_code": "C00002", "name": "SAMPLE BANK A",                  "is_individual": False},
    {"vendor_code": "C00004", "name": "สำนักงานประกันสังคม (สมมติ)",            "is_individual": False},
    {"vendor_code": "C00005", "name": "กรมสรรพากร",                     "is_individual": False},
    {"vendor_code": "C00019", "name": "บลจ.แซมเปิล (กองทุนสำรองเลี้ยงชีพ)", "is_individual": False},
    {"vendor_code": "C00029", "name": "กองทุนสำรองเลี้ยงชีพ แซมเปิล พูล ฟันด์", "is_individual": False},
    {"vendor_code": "C00051", "name": "กองทุนสำรองเลี้ยงชีพ เค มาสเตอร์ (2)", "is_individual": False},
    {"vendor_code": "C00067", "name": "กรมสรรพากร (สาขา)",              "is_individual": False},
    {"vendor_code": "C00117", "name": "SAMPLE BANK B",              "is_individual": False},
    {"vendor_code": "C00127", "name": "กองทุนเงินให้กู้ยืมเพื่อการศึกษา","is_individual": False},
    {"vendor_code": "C00847", "name": "บลจ.บางกอกแคปปิตอล",             "is_individual": False},
    # Utilities
    {"vendor_code": "C00010", "name": "บริษัท เมโทรพาวเวอร์ จำกัด",                "is_individual": False},
    {"vendor_code": "C00055", "name": "บริษัท เมโทรวอเตอร์ จำกัด",                "is_individual": False},
    {"vendor_code": "C00058", "name": "บริษัท คลีนวอเตอร์ จำกัด",    "is_individual": False},
    {"vendor_code": "C00062", "name": "Netway Communication Co., Ltd.",  "is_individual": False},
    {"vendor_code": "C00063", "name": "บจ.แอดวานซ์ ไวร์เลส เน็ทเวอร์ค","is_individual": False},
    {"vendor_code": "C00064", "name": "National Telecom PCL",           "is_individual": False},
    {"vendor_code": "C00070", "name": "บจ.ทรู มูฟ เอช ยูนิเวอร์แซล",  "is_individual": False},
    {"vendor_code": "C00093", "name": "นิติบุคคลหมู่บ้านบ้านกลางกรุง บิสทาวน์", "is_individual": False},
    {"vendor_code": "C00462", "name": "ไทยโอริกซ์ลีสซิ่ง จำกัด",      "is_individual": False},
    {"vendor_code": "C00874", "name": "โตโยต้า ลีสซิ่ง",               "is_individual": False},
    # IT / Cloud
    {"vendor_code": "C00024", "name": "FLOWACCOUNT",                    "is_individual": False},
    {"vendor_code": "C00122", "name": "เอสไอเอส ดิสทริบิวชั่น (ประเทศไทย)", "is_individual": False},
    {"vendor_code": "C00154", "name": "แอ็ดวานซ์อินฟอร์เมชั่นเทคโนโลยี", "is_individual": False},
    {"vendor_code": "C00191", "name": "Adobe Systems Software Ireland Ltd.", "is_individual": False},
    {"vendor_code": "C00201", "name": "Google Asia Pacific Pte.Ltd.",   "is_individual": False},
    {"vendor_code": "C00488", "name": "Namecheap, Inc.",                "is_individual": False},
    {"vendor_code": "C00731", "name": "Perplexity AI, Inc.",            "is_individual": False},
    {"vendor_code": "C00755", "name": "Eleven Labs Inc.",               "is_individual": False},
    {"vendor_code": "C00773", "name": "AITable",                        "is_individual": False},
    {"vendor_code": "C00948", "name": "BitSight Technologies, Inc.",    "is_individual": False},
    {"vendor_code": "C00947", "name": "บจ.ดาต้าเซฟ",                   "is_individual": False},
    {"vendor_code": "C00894", "name": "D One Solution Co.,Ltd.",        "is_individual": False},
    {"vendor_code": "C00893", "name": "บจ.ซีเคียว ดี เซ็นเตอร์",      "is_individual": False},
    {"vendor_code": "C00749", "name": "บจ.ลีเรคโก (ประเทศไทย)",        "is_individual": False},
    {"vendor_code": "C00625", "name": "ดาต้าฟาร์ม",                     "is_individual": False},
    {"vendor_code": "C00612", "name": "Fast Work",                      "is_individual": False},
    {"vendor_code": "C00534", "name": "เจบีเอ็ม คอมเมิร์ซ",            "is_individual": False},
    {"vendor_code": "C00054", "name": "ทรานซิสชั่น ซิสเต็มส์ แอนด์ เน็ทเวอร์คส (ประเทศไทย)", "is_individual": False},
    {"vendor_code": "C00987", "name": "Fico Development Company Limited","is_individual": False},
    {"vendor_code": "C00980", "name": "บจ.จีโมทีฟ กรุ๊ป",             "is_individual": False},
    {"vendor_code": "C00880", "name": "บจ.ฟ้าใสมีสุข",                 "is_individual": False},
    # Office / Equipment
    {"vendor_code": "C00056", "name": "CANON MARKETING (THAILAND) CO.,LTD.", "is_individual": False},
    {"vendor_code": "C00084", "name": "พี.เอส.ดับเบิลยู.ยูไนเต็ด",    "is_individual": False},
    {"vendor_code": "C00085", "name": "อะยะซัน เซอร์วิส",              "is_individual": False},
    {"vendor_code": "C00099", "name": "โฮม โปรดักส์",                  "is_individual": False},
    {"vendor_code": "C00120", "name": "ปริญช์",                         "is_individual": False},
    {"vendor_code": "C00148", "name": "บุญลือ",                         "is_individual": False},
    {"vendor_code": "C00356", "name": "บจ.คอมเซเว่น (มหาชน)",          "is_individual": False},
    {"vendor_code": "C00396", "name": "บจ.พรีเมี่ยม เพอร์เฟค",         "is_individual": False},
    {"vendor_code": "C00496", "name": "บจ.โคนิก้า มินอลต้า บิสสิเนส โซลูชันส์ (ประเทศไทย)", "is_individual": False},
    {"vendor_code": "C00559", "name": "พีเค สเตชั่น",                   "is_individual": False},
    {"vendor_code": "C00653", "name": "บจ.วิคทอรี่ อะคริลิค",          "is_individual": False},
    {"vendor_code": "C00679", "name": "108 อิงค์เจ็ท",                  "is_individual": False},
    {"vendor_code": "C00699", "name": "แอล แอนด์ เอช พร็อพเพอร์ตี้",  "is_individual": False},
    {"vendor_code": "C00836", "name": "โมชิ โมชิ รีเทล คอร์ปอเรชั่น", "is_individual": False},
    {"vendor_code": "C00888", "name": "บจ.พิมพ์ 24",                   "is_individual": False},
    # Professional Services
    {"vendor_code": "C00052", "name": "จอมโว แอคเค้าท์ติ้ง",           "is_individual": False},
    {"vendor_code": "C00114", "name": "Starbucks",                      "is_individual": False},
    {"vendor_code": "C00178", "name": "สภาวิชาชีพบัญชีในพระบรมราชูปถัมภ์","is_individual": False},
    {"vendor_code": "C00227", "name": "Meta Platforms Ireland Limited", "is_individual": False},
    {"vendor_code": "C00335", "name": "บจ.ฝึกอบรมและสัมมนาธรรมนิติ",  "is_individual": False},
    {"vendor_code": "C00458", "name": "SGS (Thailand) Limited",         "is_individual": False},
    {"vendor_code": "C00716", "name": "Gartner Thailand",               "is_individual": False},
    {"vendor_code": "C00726", "name": "จอมโว แอคเค้าท์ติ้ง (สาขา)",   "is_individual": False},
    {"vendor_code": "C00728", "name": "บจ.เอปซีลอง ลีกัล",             "is_individual": False},
    {"vendor_code": "C00863", "name": "แกร็บแท็กซี่ (ประเทศไทย)",      "is_individual": False},
    {"vendor_code": "C00966", "name": "แอคเค้าติ้ง โค้ช",              "is_individual": False},
    {"vendor_code": "C01038", "name": "Champ Lawfirm",                  "is_individual": False},
    {"vendor_code": "C01043", "name": "บจ.ท๊อป โปรเฟสชันแนล แอนด์ ดีเวลลอปเมนต์", "is_individual": False},
    {"vendor_code": "C01045", "name": "สำนักงานที่เดิน",                "is_individual": False},
    {"vendor_code": "C00913", "name": "สำนักงานเขตวังทองหลาง",          "is_individual": False},
    {"vendor_code": "C01035", "name": "บจ.กิ๊ฟท์ไวซ์เอเชีย",           "is_individual": False},
    # Freelancers / Individuals
    {"vendor_code": "C00006", "name": "Sarocha Bunraksa",               "is_individual": True},
    {"vendor_code": "C00290", "name": "Sarocha Bunraksa (2)",           "is_individual": True},
    {"vendor_code": "C00291", "name": "วันพิชิต",                        "is_individual": True},
    {"vendor_code": "C00341", "name": "Director-Surajit Piphitkul",     "is_individual": True},
    {"vendor_code": "C00360", "name": "Manee Rakdee",           "is_individual": True},
    {"vendor_code": "C00440", "name": "Thanaporn Chotirangsan",         "is_individual": True},
    {"vendor_code": "C00490", "name": "อัญชลี",                          "is_individual": True},
    {"vendor_code": "C00515", "name": "สุวรรธน์ เกษเกษม",              "is_individual": True},
    {"vendor_code": "C00669", "name": "Ratchada Panit",             "is_individual": True},
    {"vendor_code": "C00673", "name": "เวลธ์ สปา",                      "is_individual": False},
    {"vendor_code": "C00760", "name": "Praewwanid Techarojchanawarin",  "is_individual": True},
    {"vendor_code": "C00804", "name": "นางสาว สมหญิง ทองดี",           "is_individual": True},
    {"vendor_code": "C00805", "name": "นาย พงศธร สุทธิโชคสถิต",         "is_individual": True},
    {"vendor_code": "C00806", "name": "นาย ณัฐคนินทร์ แสงศรี",          "is_individual": True},
    {"vendor_code": "C00818", "name": "Chalunton Thongyaem",            "is_individual": True},
    {"vendor_code": "C00826", "name": "Paitoon Adam",                   "is_individual": True},
    {"vendor_code": "C00832", "name": "Wisutthichart Khemklad",         "is_individual": True},
    {"vendor_code": "C00920", "name": "จเด็ด",                           "is_individual": True},
    {"vendor_code": "C00928", "name": "เยาวลักษณ์",                      "is_individual": True},
    {"vendor_code": "C00943", "name": "Chonthicha Chumnarnkitkosol",    "is_individual": True},
    {"vendor_code": "C00960", "name": "นายรวิพล ประจำวงษ์",             "is_individual": True},
    {"vendor_code": "C00961", "name": "ศราวุฒิ",                         "is_individual": True},
    {"vendor_code": "C00969", "name": "วลิตา",                           "is_individual": True},
    {"vendor_code": "C00986", "name": "พันตำรวจเอก อมรชัย สิลาขจรจิต", "is_individual": True},
    {"vendor_code": "C00996", "name": "นายภาณุพงษ์ ธนูทอง",            "is_individual": True},
    {"vendor_code": "C00999", "name": "นางสาว นฤมล เหลาเส็ง",           "is_individual": True},
]

# ================================================================
# EMPLOYEES (known so far)
# ================================================================
def get_company_id(code: str) -> str | None:
    res = sb.table("companies").select("id").eq("code", code).single().execute()
    return res.data["id"] if res.data else None

def seed_employees():
    vertex_corp_id = get_company_id("vertex_corp")
    employees = [
        {
            "employee_code": "EMP-101",
            "name":          "Somchai Jaidee",
            "email":         "somchai.j@example.com",
            "department":    "Client Touchpoint Management (CTM)",
            "role":          "staff",
            "company_id":    vertex_corp_id,
        },
        {
            "employee_code": "EMP-102",
            "name":          "Manee Rakdee",
            "email":         "manee.r@example.com",
            "department":    "Enterprise Consulting Management",
            "role":          "manager",
            "company_id":    vertex_corp_id,
        },
        {
            "employee_code": "TEMP01",
            "name":          "Suda Sukchai",
            "email":         "suda.s@example.com",
            "department":    "Finance",
            "role":          "finance",
            "company_id":    vertex_corp_id,
        },
    ]
    upsert("employees", employees, "employee_code")

# ================================================================
# MAIN
# ================================================================
def main():
    print("=" * 55)
    print("Seed Master Data → Supabase")
    print("=" * 55)

    # Test connection
    try:
        sb.table("companies").select("id").limit(1).execute()
        print("✓ Supabase connection OK\n")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        print("\nต้อง run RUNFIRST_schema_and_companies.sql ใน SQL Editor ก่อน")
        sys.exit(1)

    print("Seeding customers...")
    upsert("customers", customers, "code")

    print("Seeding vendors...")
    upsert("vendors", vendors, "vendor_code")

    print("Seeding employees (known)...")
    seed_employees()

    print("\n" + "=" * 55)
    print("✓ Master data seeded!")
    print("\nขั้นตอนต่อไป:")
    print("  1. กรอก employee ที่เหลือใน 005_seed_employees_template.sql")
    print("  2. python3 migrate_historical.py  (import 3,007 rows)")
    print("=" * 55)

if __name__ == "__main__":
    main()
