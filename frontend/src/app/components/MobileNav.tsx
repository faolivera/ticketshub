import { NavLink, useLocation } from 'react-router-dom';
import { Ticket, Tag, TrendingUp, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/app/contexts/UserContext';

export function MobileNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, canSell } = useUser();

  if (!isAuthenticated) return null;

  const baseClass =
    'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-gray-500 transition-colors';
  const activeClass = 'text-indigo-600';

  return (
    <nav className="sm:hidden bg-white border-t border-gray-200 flex items-stretch shrink-0">
      <NavLink
        to="/my-tickets"
        className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ''}`}
      >
        <Ticket className="w-5 h-5" />
        <span className="text-xs font-medium">{t('header.myTickets')}</span>
      </NavLink>

      <NavLink
        to="/sell-ticket"
        state={{ from: location.pathname }}
        className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ''}`}
      >
        <Tag className="w-5 h-5" />
        <span className="text-xs font-medium">{t('header.sellTickets')}</span>
      </NavLink>

      {canSell?.() && (
        <NavLink
          to="/seller-dashboard"
          className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ''}`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-xs font-medium">{t('header.mySales')}</span>
        </NavLink>
      )}

      <NavLink
        to="/user-profile"
        className={({ isActive }) => `${baseClass} ${isActive ? activeClass : ''}`}
      >
        <User className="w-5 h-5" />
        <span className="text-xs font-medium">{t('header.myProfile')}</span>
      </NavLink>
    </nav>
  );
}
