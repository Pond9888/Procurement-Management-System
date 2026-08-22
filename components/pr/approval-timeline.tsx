import { formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, PenLine } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PRApproval, GRDApproval } from '@/types'

const ROLE_LABEL: Record<string, string> = {
  staff: 'Staff (เซ็น)',
  team_lead: 'Team Lead',
  manager: 'Manager',
  excom: 'ExCom',
  finance: 'Finance',
  admin: 'Admin',
}

const ACTION_ICON = {
  signed: <PenLine className="h-4 w-4 text-blue-500" />,
  approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
}

const ACTION_LABEL = {
  signed: 'เซ็น',
  approved: 'อนุมัติ',
  rejected: 'ไม่อนุมัติ',
}

type Approval = (PRApproval | GRDApproval) & {
  approver?: { id: string; name: string; role: string }
}

export function ApprovalTimeline({ approvals }: { approvals: Approval[] }) {
  if (!approvals.length) return null

  const sorted = [...approvals].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ประวัติการอนุมัติ</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="relative border-l border-muted-foreground/20 space-y-6 ml-3">
          {sorted.map((approval) => (
            <li key={approval.id} className="ml-6">
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-muted">
                {ACTION_ICON[approval.action as keyof typeof ACTION_ICON]}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">
                  {approval.approver?.name ?? '—'}{' '}
                  <span className="font-normal text-muted-foreground">
                    ({ROLE_LABEL[approval.role] ?? approval.role})
                  </span>{' '}
                  <span
                    className={
                      approval.action === 'rejected'
                        ? 'text-destructive'
                        : approval.action === 'approved'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-blue-600'
                    }
                  >
                    {ACTION_LABEL[approval.action as keyof typeof ACTION_LABEL] ?? approval.action}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(approval.created_at)}
                </p>
                {approval.comment && (
                  <p className="mt-1 text-sm bg-muted rounded px-3 py-2 italic">
                    "{approval.comment}"
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
