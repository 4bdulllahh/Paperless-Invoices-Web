import { Building2, FileText, History, Settings, Users, type LucideIcon } from 'lucide-react'

export type PanelId = 'invoice' | 'history' | 'clients' | 'business' | 'settings'

export type NavItem = {
  id: PanelId
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'invoice', label: 'Invoice', icon: FileText },
  { id: 'history', label: 'History', icon: History },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'business', label: 'Business', icon: Building2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]
