import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Calendar,
  CreditCard,
  Wallet,
  Ticket,
  Shield,
  Bell,
  Settings,
  Tag,
  Banknote,
  MessageSquare,
  Users,
  Upload,
  BarChart3,
  Star,
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
  SidebarSeparator,
} from '../ui/sidebar';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  labelKey: string;
}

interface NavGroup {
  labelKey: string | null;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    labelKey: null,
    items: [
      {
        to: '/admin',
        icon: <LayoutDashboard className="w-4 h-4" />,
        labelKey: 'admin.sidebar.dashboard',
      },
    ],
  },
  {
    labelKey: 'admin.sidebar.groups.catalog',
    items: [
      {
        to: '/admin/events',
        icon: <Calendar className="w-4 h-4" />,
        labelKey: 'admin.sidebar.events',
      },
      {
        to: '/admin/import-events',
        icon: <Upload className="w-4 h-4" />,
        labelKey: 'admin.sidebar.importEvents',
      },
      {
        to: '/admin/featured-events',
        icon: <Star className="w-4 h-4" />,
        labelKey: 'admin.sidebar.featuredEvents',
      },
      {
        to: '/admin/events-score',
        icon: <BarChart3 className="w-4 h-4" />,
        labelKey: 'admin.sidebar.eventsScore',
      },
    ],
  },
  {
    labelKey: 'admin.sidebar.groups.usersCompliance',
    items: [
      {
        to: '/admin/users',
        icon: <Users className="w-4 h-4" />,
        labelKey: 'admin.sidebar.users',
      },
      {
        to: '/admin/identity-verifications',
        icon: <Shield className="w-4 h-4" />,
        labelKey: 'admin.sidebar.identityVerifications',
      },
    ],
  },
  {
    labelKey: 'admin.sidebar.groups.commerce',
    items: [
      {
        to: '/admin/transactions',
        icon: <CreditCard className="w-4 h-4" />,
        labelKey: 'admin.sidebar.transactions',
      },
      {
        to: '/admin/seller-payouts',
        icon: <Banknote className="w-4 h-4" />,
        labelKey: 'admin.sidebar.sellerPayouts',
      },
      {
        to: '/admin/payment-methods',
        icon: <Wallet className="w-4 h-4" />,
        labelKey: 'admin.sidebar.paymentMethods',
      },
    ],
  },
  {
    labelKey: 'admin.sidebar.groups.marketing',
    items: [
      {
        to: '/admin/promotions',
        icon: <Tag className="w-4 h-4" />,
        labelKey: 'admin.sidebar.promotions',
      },
    ],
  },
  {
    labelKey: 'admin.sidebar.groups.support',
    items: [
      {
        to: '/admin/support-tickets',
        icon: <MessageSquare className="w-4 h-4" />,
        labelKey: 'admin.sidebar.supportTickets',
      },
      {
        to: '/admin/notifications',
        icon: <Bell className="w-4 h-4" />,
        labelKey: 'admin.sidebar.notifications',
      },
    ],
  },
  {
    labelKey: 'admin.sidebar.groups.configuration',
    items: [
      {
        to: '/admin/platform-config',
        icon: <Settings className="w-4 h-4" />,
        labelKey: 'admin.sidebar.platformConfig',
      },
    ],
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
        {navGroups.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex}>
            {group.labelKey && (
              <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
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
            {groupIndex < navGroups.length - 1 && <SidebarSeparator />}
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

export default AdminSidebar;
