import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PRStatus, GRDStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---------------------------------------------------------------------------
// Number formatting
// ---------------------------------------------------------------------------

export function formatTHB(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount)
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

// ---------------------------------------------------------------------------
// Status labels / badge variants
// ---------------------------------------------------------------------------

export const PR_STATUS_LABEL: Record<PRStatus, string> = {
  submitted: 'รอเซ็น',
  signed: 'รอ Team Lead',
  pending_tl: 'รอ Team Lead',
  pending_manager: 'รอ Manager',
  pending_excom: 'รอ ExCom',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
  po_created: 'เปิด PO แล้ว',
}

export const PR_STATUS_VARIANT: Record<
  PRStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  submitted: 'secondary',
  signed: 'secondary',
  pending_tl: 'secondary',
  pending_manager: 'secondary',
  pending_excom: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  po_created: 'default',
}

export const GRD_STATUS_LABEL: Record<GRDStatus, string> = {
  draft: 'Draft',
  pending_input: 'รอกรอกข้อมูล',
  signed: 'รอ Team Lead',
  pending_tl: 'รอ Team Lead',
  pending_manager: 'รอ Manager',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
}

export const GRD_STATUS_VARIANT: Record<
  GRDStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  pending_input: 'secondary',
  signed: 'secondary',
  pending_tl: 'secondary',
  pending_manager: 'secondary',
  approved: 'default',
  rejected: 'destructive',
}
