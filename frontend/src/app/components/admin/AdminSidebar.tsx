import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Calendar,
  CreditCard,
  Settings,
  Ticket,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../ui/sidebar';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  labelKey: string;
}

const navItems: NavItem[] = [
  {
    to: '/admin',
    icon: <LayoutDashboard className="w-4 h-4" />,
    labelKey: 'admin.sidebar.dashboard',
  },
  {
    to: '/admin/events',
    icon: <Calendar className="w-4 h-4" />,
    labelKey: 'admin.sidebar.events',
  },
  {
    to: '/admin/transactions',
    icon: <CreditCard className="w-4 h-4" />,
    labelKey: 'admin.sidebar.transactions',
  },
];

export function AdminSidebar() {
  const { t } = useTranslation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <Ticket className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-lg">{t('admin.title')}</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('admin.sidebar.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end={item.to === '/admin'}
                      className={({ isActive }) =>
                        isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                      }
                    >
                      {item.icon}
                      <span>{t(item.labelKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default AdminSidebar;
