import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// Register Sarabun for Thai text support
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/sarabun/v17/DtVjJx26TKEr37c9WBI.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/sarabun/v17/DtVmJx26TKEr37c9YK5sulw.ttf', fontWeight: 700 },
  ],
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 10,
    padding: '20mm 20mm 15mm 20mm',
    color: '#1a1a1a',
  },
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  companyBlock: { flex: 1 },
  companyName: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  companyAddress: { fontSize: 8.5, color: '#555', lineHeight: 1.4 },
  docBlock: { alignItems: 'flex-end' },
  docTitle: { fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 },
  docNumber: { fontSize: 11, fontWeight: 700, color: '#2563eb' },
  formCode: { fontSize: 8, color: '#888', marginTop: 2 },
  divider: { borderBottomWidth: 1.5, borderBottomColor: '#1a1a1a', marginVertical: 8 },
  thinDivider: { borderBottomWidth: 0.5, borderBottomColor: '#ccc', marginVertical: 6 },
  // Info rows
  infoGrid: { flexDirection: 'row', gap: 24, marginBottom: 8 },
  infoCol: { flex: 1 },
  infoRow: { flexDirection: 'row', marginBottom: 4 },
  infoLabel: { width: 90, color: '#555', fontSize: 9 },
  infoValue: { flex: 1, fontWeight: 700 },
  // Amount table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  colDesc: { flex: 3, fontSize: 9 },
  colNum: { width: 60, textAlign: 'right', fontSize: 9 },
  // Amount summary
  amountBlock: { alignItems: 'flex-end', marginTop: 8 },
  amountRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
  amountLabel: { width: 110, textAlign: 'right', color: '#555', fontSize: 9 },
  amountValue: { width: 90, textAlign: 'right', fontSize: 9 },
  amountTotal: { fontWeight: 700, fontSize: 11 },
  amountWords: { marginTop: 6, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: '#ccc' },
  // No italic face is registered for Sarabun — keep fontStyle normal
  amountWordsText: { fontSize: 9, color: '#374151' },
  // Signature area
  sigArea: { flexDirection: 'row', marginTop: 32, gap: 16 },
  sigBox: { flex: 1, alignItems: 'center' },
  sigLine: { borderBottomWidth: 1, borderBottomColor: '#1a1a1a', width: '80%', marginBottom: 4 },
  sigLabel: { fontSize: 9, color: '#555' },
  sigName: { fontSize: 9, fontWeight: 700, marginTop: 2 },
  sigDate: { fontSize: 8, color: '#888', marginTop: 2 },
  // Supporting docs
  docsSection: { marginTop: 12 },
  docsSectionTitle: { fontSize: 9, fontWeight: 700, marginBottom: 4 },
  docItem: { fontSize: 8.5, color: '#374151', marginBottom: 2 },
})

export interface GRDPDFData {
  grd_number: string
  form_code: string
  date_of_completion: string | null
  description: string
  product_category: string | null
  remark: string | null
  amount: number
  vat_rate: number
  vat_amount: number
  total_amount: number
  amount_in_words: string | null
  vendor_name: string
  vendor_tax_id: string | null
  customer_code: string | null
  po_number: string
  pr_number: string | null
  company_name: string
  company_address: string
  receiver_name: string | null
  team_lead_name: string | null
  manager_name: string | null
  signed_at: string | null
  tl_approved_at: string | null
  manager_approved_at: string | null
  supporting_docs: Array<{ name: string; url: string }>
}

function formatDateTH(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr))
}

function formatTHB(n: number): string {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(n)
}

export function GRDDocument({ data }: { data: GRDPDFData }) {
  return (
    <Document title={`GRD ${data.grd_number}`} author="ProcureFlow Corp.">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{data.company_name}</Text>
            <Text style={styles.companyAddress}>{data.company_address}</Text>
          </View>
          <View style={styles.docBlock}>
            <Text style={styles.docTitle}>ใบรับสินค้า/บริการ</Text>
            <Text style={styles.docTitle}>Goods Receipt Document</Text>
            <Text style={styles.docNumber}>{data.grd_number}</Text>
            <Text style={styles.formCode}>{data.form_code}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Vendor + Document Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ผู้ขาย/ผู้รับจ้าง:</Text>
              <Text style={styles.infoValue}>{data.vendor_name}</Text>
            </View>
            {data.vendor_tax_id && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>เลขผู้เสียภาษี:</Text>
                <Text style={styles.infoValue}>{data.vendor_tax_id}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>PO Number:</Text>
              <Text style={styles.infoValue}>{data.po_number}</Text>
            </View>
            {data.pr_number && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>PR Number:</Text>
                <Text style={styles.infoValue}>{data.pr_number}</Text>
              </View>
            )}
          </View>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>วันที่รับงาน:</Text>
              <Text style={styles.infoValue}>{formatDateTH(data.date_of_completion)}</Text>
            </View>
            {data.customer_code && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>ลูกค้า (Project):</Text>
                <Text style={styles.infoValue}>{data.customer_code}</Text>
              </View>
            )}
            {data.product_category && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>หมวดหมู่:</Text>
                <Text style={styles.infoValue}>{data.product_category}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.thinDivider} />

        {/* Description table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colDesc, { fontWeight: 700 }]}>รายละเอียดสินค้า/บริการ</Text>
          <Text style={[styles.colNum, { fontWeight: 700 }]}>มูลค่า (บาท)</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.colDesc}>{data.description}</Text>
          <Text style={styles.colNum}>{formatTHB(data.amount)}</Text>
        </View>
        {data.remark && (
          <View style={[styles.tableRow, { backgroundColor: '#fafafa' }]}>
            <Text style={[styles.colDesc, { color: '#6b7280' }]}>
              หมายเหตุ: {data.remark}
            </Text>
            <Text style={styles.colNum}></Text>
          </View>
        )}

        {/* Amount summary */}
        <View style={styles.amountBlock}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>มูลค่าก่อนภาษี</Text>
            <Text style={styles.amountValue}>{formatTHB(data.amount)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>ภาษีมูลค่าเพิ่ม {data.vat_rate}%</Text>
            <Text style={styles.amountValue}>{formatTHB(data.vat_amount)}</Text>
          </View>
          <View style={[styles.amountRow, { borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 4 }]}>
            <Text style={[styles.amountLabel, styles.amountTotal]}>รวมทั้งสิ้น</Text>
            <Text style={[styles.amountValue, styles.amountTotal]}>{formatTHB(data.total_amount)}</Text>
          </View>
          <View style={styles.amountWords}>
            <Text style={styles.amountWordsText}>
              ({data.amount_in_words ?? '—'})
            </Text>
          </View>
        </View>

        {/* Supporting docs list */}
        {data.supporting_docs.length > 0 && (
          <View style={styles.docsSection}>
            <View style={styles.thinDivider} />
            <Text style={styles.docsSectionTitle}>เอกสารแนบ</Text>
            {data.supporting_docs.map((doc, i) => (
              <Text key={i} style={styles.docItem}>
                {i + 1}. {doc.name}
              </Text>
            ))}
          </View>
        )}

        {/* Signatures */}
        <View style={styles.divider} />
        <View style={styles.sigArea}>
          <View style={styles.sigBox}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>ผู้รับสินค้า/บริการ</Text>
            <Text style={styles.sigName}>{data.receiver_name ?? '—'}</Text>
            {data.signed_at && (
              <Text style={styles.sigDate}>{formatDateTH(data.signed_at)}</Text>
            )}
          </View>
          <View style={styles.sigBox}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Team Lead</Text>
            <Text style={styles.sigName}>{data.team_lead_name ?? '—'}</Text>
            {data.tl_approved_at && (
              <Text style={styles.sigDate}>{formatDateTH(data.tl_approved_at)}</Text>
            )}
          </View>
          <View style={styles.sigBox}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Manager</Text>
            <Text style={styles.sigName}>{data.manager_name ?? '—'}</Text>
            {data.manager_approved_at && (
              <Text style={styles.sigDate}>{formatDateTH(data.manager_approved_at)}</Text>
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}
