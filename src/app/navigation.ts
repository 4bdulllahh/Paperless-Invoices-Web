import { Building2, FileText, History, Settings, Users, type LucideIcon } from 'lucide-react'

export type PanelId = 'invoice' | 'history' | 'clients' | 'business' | 'settings'

export type NavItem = {
  id: PanelId
  label: string
  icon: LucideIcon
  /** What the panel will do, shown until it's built. */
  description: string
  milestone: number
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: 'invoice',
    label: 'Invoice',
    icon: FileText,
    description: 'Create and edit the current invoice.',
    milestone: 5,
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    description:
      'Every invoice you download, with paid and overdue status, search, and one-click re-download.',
    milestone: 8,
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    description: 'Saved clients that fill in the “Bill to” section for you.',
    milestone: 5,
  },
  {
    id: 'business',
    label: 'Business',
    icon: Building2,
    description: 'Your business details, logo and payment information.',
    milestone: 4,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Defaults for new invoices, plus backup and restore.',
    milestone: 4,
  },
]
