"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  ArrowLeftRight,
  FileText,
  User,
  Users,
  UserCheck,
  Calculator,
  BarChart3,
  Settings,
  ChevronLeft,
  LogOut,
  Bell,
  Search,
  Activity,
  ClipboardList,
  UserPlus,
  Menu,
  X,
  Building2,
  Upload,
  MapPin,
  Package,
  MessageSquare,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ProfileAvatar } from "@/components/profile-avatar"
import { useAuth } from "@/lib/auth-context"
import { TRANSACTION_ROLES } from "@/lib/permissions"
import { normalizeRole, type UserRole } from "@/types/roles"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarProps {
  userType: "member" | "admin"
  userName?: string
  userRole?: string
  memberNo?: string
  profileImageKey?: string | null
  avatarUpdatedAt?: string | null
  children?: React.ReactNode
}

const memberNavItems = [
  { href: "/member/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/member/accounts", label: "Accounts", icon: Wallet },
  { href: "/member/loans", label: "Loans", icon: CreditCard },
  { href: "/member/guarantors", label: "Guarantors", icon: UserCheck },
  { href: "/member/transfers", label: "Transfers", icon: ArrowLeftRight },
  { href: "/member/statements", label: "Statements", icon: FileText },
  { href: "/member/support", label: "Support", icon: MessageSquare },
  { href: "/member/profile", label: "Profile", icon: User },
]

const ALL_ADMIN_NAV: Array<{ href: string; label: string; icon: LucideIcon; roles: UserRole[] }> = [
  { href: "/admin/dashboard",         label: "Dashboard",      icon: LayoutDashboard, roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER","AUDITOR"] },
  { href: "/admin/members",           label: "Members",        icon: Users,           roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER","TELLER","AUDITOR"] },
  { href: "/admin/applications",      label: "Member Applications", icon: UserPlus,   roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER"] },
  { href: "/admin/members/pending",   label: "KYC Queue",      icon: ClipboardList,   roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER","LOAN_OFFICER"] },
  { href: "/admin/stages",            label: "Stages",         icon: MapPin,          roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER","TELLER","AUDITOR"] },
  { href: "/admin/users",             label: "Staff Users",    icon: User,            roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER"] },
  { href: "/admin/loans",             label: "Loan Management",icon: CreditCard,      roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER","LOAN_OFFICER"] },
  { href: "/admin/products",          label: "Loan Products",  icon: Package,         roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER"] },
  { href: "/admin/accounting",        label: "Accounting",     icon: Calculator,      roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER","ACCOUNTANT"] },
  { href: "/admin/transactions",      label: "Transactions",   icon: ArrowLeftRight,  roles: TRANSACTION_ROLES },
  { href: "/admin/support",           label: "Support",        icon: MessageSquare,   roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER","LOAN_OFFICER"] },
  { href: "/admin/import/upload",     label: "Import Members", icon: Upload,          roles: ["SUPER_ADMIN","TENANT_ADMIN"] },
  { href: "/admin/audit-log",         label: "Audit Trail",    icon: ClipboardList,   roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER","AUDITOR"] },
  { href: "/admin/reports",           label: "Reports",        icon: BarChart3,       roles: ["SUPER_ADMIN","TENANT_ADMIN","MANAGER","AUDITOR"] },
  { href: "/admin/system-health",     label: "System Health",  icon: Activity,        roles: ["SUPER_ADMIN","TENANT_ADMIN"] },
  { href: "/admin/settings",          label: "Settings",       icon: Settings,        roles: ["SUPER_ADMIN","TENANT_ADMIN"] },
  { href: "/admin/tenants",           label: "Tenants",        icon: Building2,       roles: ["SUPER_ADMIN"] },
]

function getAdminNavItems(role?: string) {
  const normalized = normalizeRole(role)
  return normalized ? ALL_ADMIN_NAV.filter(item => item.roles.includes(normalized)) : []
}
const SidebarContext = React.createContext<{
  collapsed: boolean
  setCollapsed: (value: boolean) => void
}>({ collapsed: false, setCollapsed: () => {} })

export function AppSidebar({
  userType,
  userName = "Admin User",
  userRole = "Administrator",
  memberNo,
  profileImageKey,
  avatarUpdatedAt,
  children,
}: SidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const navItems = userType === "member" ? memberNavItems : getAdminNavItems(userRole)
  const displayName = userName || "User"

  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  React.useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="flex min-h-screen bg-background">
        {/* Mobile Overlay */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
            mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
        />

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 flex h-screen flex-col border-r bg-card transition-all duration-300 ease-in-out",
            collapsed ? "lg:w-[72px]" : "lg:w-64",
            mobileOpen ? "w-64 translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* Logo Section */}
          <div className="flex h-16 items-center border-b px-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">KC</span>
              </div>
              <div className={cn(
                "flex flex-col overflow-hidden transition-all duration-300",
                collapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
              )}>
                <span className="text-sm font-semibold leading-none whitespace-nowrap">KC Boda</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">Sacco Portal</span>
              </div>
            </Link>
            
            {/* Collapse Button - Desktop Only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "ml-auto h-8 w-8 shrink-0 hidden lg:flex",
                collapsed && "lg:ml-0 lg:mx-auto"
              )}
            >
              <ChevronLeft className={cn(
                "h-4 w-4 transition-transform duration-300",
                collapsed && "rotate-180"
              )} />
            </Button>

            {/* Close Button - Mobile Only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(false)}
              className="ml-auto h-8 w-8 lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3">
            <TooltipProvider delayDuration={0}>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  const linkContent = (
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && "lg:justify-center lg:px-2"
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className={cn(
                        "transition-all duration-300 whitespace-nowrap overflow-hidden",
                        collapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
                      )}>
                        {item.label}
                      </span>
                    </Link>
                  )

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild className="hidden lg:flex">
                          {linkContent}
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10} className="hidden lg:block">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return <div key={item.href}>{linkContent}</div>
                })}
              </div>
            </TooltipProvider>
          </nav>

          {/* Bottom Section */}
          <div className="border-t p-3">
            {/* Theme Toggle */}
            <div className={cn(
              "mb-3 flex items-center",
              collapsed ? "lg:justify-center" : "gap-3"
            )}>
              <span className={cn(
                "text-xs text-muted-foreground transition-all duration-300 overflow-hidden whitespace-nowrap",
                collapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
              )}>Theme</span>
              <div className={cn(!collapsed && "ml-auto")}>
                <ThemeToggle />
              </div>
            </div>

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-auto w-full gap-3 px-2 py-2 hover:bg-muted",
                    collapsed ? "lg:justify-center" : "justify-start"
                  )}
                >
                  <ProfileAvatar
                    name={displayName}
                    profileImageKey={profileImageKey}
                    updatedAt={avatarUpdatedAt}
                    className="h-9 w-9 shrink-0 ring-2 ring-primary/20"
                    fallbackClassName="bg-primary text-primary-foreground text-xs font-medium"
                  />
                  <div className={cn(
                    "flex flex-col items-start text-left transition-all duration-300 overflow-hidden",
                    collapsed ? "lg:w-0 lg:opacity-0" : "w-auto opacity-100"
                  )}>
                    <span className="text-sm font-medium whitespace-nowrap">{displayName}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {memberNo || userRole}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{memberNo || userRole}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={userType === "member" ? "/member/profile" : "/admin/settings"}>
                    <User className="mr-2 h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={userType === "member" ? "/member/profile#security" : "/admin/settings#security"}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => logout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          collapsed ? "lg:ml-[72px]" : "lg:ml-64"
        )}>
          {/* Top Header */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="shrink-0 lg:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="h-9 w-64 pl-9 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1"
              />
            </div>

            {/* Spacer to push right actions to far right */}
            <div className="flex-1" />

            {/* Right Actions - aligned to far right */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge 
                  variant="destructive" 
                  className="absolute -right-1 -top-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  4
                </Badge>
              </Button>
              <div className="hidden md:flex md:items-center md:gap-3 md:pl-3 md:border-l">
                <div className="text-right">
                  <p className="text-sm font-medium leading-none">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{memberNo || userRole}</p>
                </div>
                <ProfileAvatar
                  name={displayName}
                  profileImageKey={profileImageKey}
                  updatedAt={avatarUpdatedAt}
                  className="h-9 w-9"
                  fallbackClassName="bg-primary text-primary-foreground text-xs"
                />
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
