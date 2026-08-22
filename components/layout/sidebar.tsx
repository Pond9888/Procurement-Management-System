'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  ClipboardCheck,
  CreditCard,
  BarChart3,
  Users,
  Workflow,
  BookOpen,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import type { EmployeeRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles: EmployeeRole[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['staff', 'team_lead', 'manager', 'excom', 'finance', 'admin'],
  },
  {
    label: 'Pipeline',
    href: '/pipeline',
    icon: Workflow,
    roles: ['staff', 'team_lead', 'manager', 'excom', 'finance', 'admin'],
  },
  {
    label: 'ใบขอซื้อ (PR)',
    href: '/pr',
    icon: FileText,
    roles: ['staff', 'team_lead', 'manager', 'excom', 'finance', 'admin'],
  },
  {
    label: 'ใบสั่งซื้อ (PO)',
    href: '/po',
    icon: ShoppingCart,
    roles: ['team_lead', 'manager', 'excom', 'finance', 'admin'],
  },
  {
    label: 'ใบรับสินค้า (GRD)',
    href: '/grd',
    icon: ClipboardCheck,
    roles: ['staff', 'team_lead', 'manager', 'excom', 'finance', 'admin'],
  },
  {
    label: 'Finance Dashboard',
    href: '/finance',
    icon: BarChart3,
    roles: ['finance', 'admin', 'manager'],
  },
  {
    label: 'การชำระเงิน',
    href: '/payments',
    icon: CreditCard,
    roles: ['finance', 'admin'],
  },
  {
    label: 'ข้อมูลหลัก',
    href: '/master',
    icon: Users,
    roles: ['admin'],
  },
  {
    label: 'คู่มือการใช้งาน',
    href: '/guide',
    icon: BookOpen,
    roles: ['staff', 'team_lead', 'manager', 'excom', 'finance', 'admin'],
  },
]

interface SidebarProps {
  role: EmployeeRole
  name: string
}

export function Sidebar({ role, name }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          R
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">ProcureFlow</p>
          <p className="text-xs text-muted-foreground">v0.1.0</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t px-3 py-4 space-y-1">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground capitalize">{role.replace('_', ' ')}</p>
        </div>
        <ThemeToggle />
        <a
          href="/api/auth/logout"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </a>
      </div>
    </aside>
  )
}
