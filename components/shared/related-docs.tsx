import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatTHB, formatDate } from '@/lib/utils'
import { FileText, ShoppingCart, ClipboardCheck, CreditCard, ArrowRight } from 'lucide-react'

export type RelatedKind = 'PR' | 'PO' | 'GRD' | 'PAYMENT'

export interface RelatedItem {
  kind: RelatedKind
  /** Document number shown as the row's headline */
  number: string
  /** Omitted when there is no page to open (e.g. a payment record) */
  href?: string
  status?: { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
  /** Date shown under the number */
  date?: string | null
  dateLabel?: string
  amount?: number | null
}

const KIND_META: Record<RelatedKind, { icon: React.ElementType; label: string }> = {
  PR: { icon: FileText, label: 'ใบขอซื้อ' },
  PO: { icon: ShoppingCart, label: 'ใบสั่งซื้อ' },
  GRD: { icon: ClipboardCheck, label: 'ใบรับสินค้า' },
  PAYMENT: { icon: CreditCard, label: 'การชำระเงิน' },
}

/**
 * Shows the other documents on the same procurement chain so any detail page
 * can be a starting point rather than a dead end.
 */
export function RelatedDocs({
  items,
  title = 'เอกสารที่เกี่ยวข้อง',
  emptyText = 'ยังไม่มีเอกสารอื่นในสายนี้',
  className,
}: {
  items: RelatedItem[]
  title?: string
  emptyText?: string
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">
          {title} {items.length > 0 && <span className="text-muted-foreground">({items.length})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="divide-y border-t">
            {items.map((item, i) => (
              <li key={`${item.kind}-${item.number}-${i}`}>
                <RowInner item={item} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function RowInner({ item }: { item: RelatedItem }) {
  const { icon: Icon, label } = KIND_META[item.kind]

  const body = (
    <div className="flex items-center gap-3 px-6 py-3 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="font-medium truncate">
          <span className="text-xs text-muted-foreground mr-2">{label}</span>
          {item.number}
        </p>
        {item.date && (
          <p className="text-xs text-muted-foreground">
            {item.dateLabel ? `${item.dateLabel} ` : ''}
            {formatDate(item.date)}
          </p>
        )}
      </div>
      {item.status && (
        <Badge variant={item.status.variant} className="shrink-0">
          {item.status.label}
        </Badge>
      )}
      {item.amount != null && (
        <span className="ml-auto shrink-0 font-medium tabular-nums">
          {formatTHB(item.amount)}
        </span>
      )}
      {item.href && (
        <ArrowRight className={`h-4 w-4 shrink-0 text-muted-foreground ${item.amount != null ? '' : 'ml-auto'}`} />
      )}
    </div>
  )

  if (!item.href) return <div className="opacity-90">{body}</div>

  return (
    <Link href={item.href} className="block transition-colors hover:bg-muted/50">
      {body}
    </Link>
  )
}
