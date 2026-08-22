/**
 * Server-only utilities (no 'use client')
 */

// ---------------------------------------------------------------------------
// Thai Baht amount in words
// e.g. 1,600 → "หนึ่งพันหกร้อยบาทถ้วน"
// ---------------------------------------------------------------------------

const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const tens = ['', 'สิบ', 'ยี่สิบ', 'สามสิบ', 'สี่สิบ', 'ห้าสิบ', 'หกสิบ', 'เจ็ดสิบ', 'แปดสิบ', 'เก้าสิบ']
const places = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']

function readChunk(n: number): string {
  if (n === 0) return ''
  if (n < 10) return ones[n]
  if (n < 100) {
    const t = Math.floor(n / 10)
    const o = n % 10
    const tenPart = t === 1 ? 'สิบ' : tens[t]
    const onePart = o === 1 ? 'เอ็ด' : ones[o]
    return tenPart + onePart
  }
  if (n < 1_000) {
    return ones[Math.floor(n / 100)] + 'ร้อย' + readChunk(n % 100)
  }
  if (n < 10_000) {
    return ones[Math.floor(n / 1000)] + 'พัน' + readChunk(n % 1000)
  }
  if (n < 100_000) {
    return ones[Math.floor(n / 10000)] + 'หมื่น' + readChunk(n % 10000)
  }
  if (n < 1_000_000) {
    return ones[Math.floor(n / 100000)] + 'แสน' + readChunk(n % 100000)
  }
  return readChunk(Math.floor(n / 1_000_000)) + 'ล้าน' + readChunk(n % 1_000_000)
}

export function amountInThaiWords(amount: number): string {
  if (amount === 0) return 'ศูนย์บาทถ้วน'

  const rounded = Math.round(amount * 100) / 100
  const baht = Math.floor(rounded)
  const satang = Math.round((rounded - baht) * 100)

  let result = readChunk(baht) + 'บาท'
  if (satang > 0) {
    result += readChunk(satang) + 'สตางค์'
  } else {
    result += 'ถ้วน'
  }
  return result
}
