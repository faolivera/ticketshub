import { NavLink, useLocation } from 'react-router-dom';
import { Home, Ticket, Tag, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/app/contexts/UserContext';

export function MobileNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, canSell } = useUser();

  if (!isAuthenticated) return null;

  const baseClass =
    'flex flex-col items-center justify-center gap-1 flex-1 py-3 text-gray-500 transition-colors';
  const activeClass = 'text-indigo-600';
  const iconClass = 'w-6 h-6';

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 w-full z-50 bg-white border-t border-gray-200 flex items-stretch pb-[env(safe-area-inset-bottom)]">
      <NavLink
        to="/"
        className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ''}`}
      >
        <Home className={iconClass} />
        <span className="text-xs font-medium">{t('header.home')}</span>
      </NavLink>

      <NavLink
        to="/my-tickets"
        className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ''}`}
      >
        <Ticket className={iconClass} />
        <span className="text-xs font-medium">{t('header.myTickets')}</span>
      </NavLink>

      <NavLink
        to="/sell-ticket"
        state={{ from: location.pathname }}
        className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ''}`}
      >
        <Tag className={iconClass} />
        <span className="text-xs font-medium">{t('header.sellTickets')}</span>
      </NavLink>

      {canSell?.() && (
        <NavLink
          to="/seller-dashboard"
          className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ''}`}
        >
          <TrendingUp className={iconClass} />
          <span className="text-xs font-medium">{t('header.mySales')}</span>
        </NavLink>
      )}
    </nav>
  );
}
