import { Link } from 'react-router-dom';
import { User, Ticket, ChevronDown, Wallet, LogOut, Languages, Plus, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/app/contexts/UserContext';

export function Header() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsLangDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Ticket className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">TicketHub</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Admin Button - only for admins */}
          {isAuthenticated && user?.role === 'Admin' && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">{t('header.admin')}</span>
            </Link>
          )}

          {/* Sell Tickets Button */}
          {isAuthenticated && (
            <Link
              to="/sell-ticket"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('header.sellTickets')}</span>
            </Link>
          )}

          {/* Language Selector */}
          <div className="relative" ref={langDropdownRef}>
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Languages className="w-4 h-4" />
              <span className="text-sm font-medium uppercase">{i18n.language}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <button
                  onClick={() => changeLanguage('en')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors ${
                    i18n.language === 'en' ? 'bg-blue-50 text-blue-600 font-semibold' : ''
                  }`}
                >
                  <span>🇺🇸</span>
                  <span>English</span>
                </button>
                <button
                  onClick={() => changeLanguage('es')}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors ${
                    i18n.language === 'es' ? 'bg-blue-50 text-blue-600 font-semibold' : ''
                  }`}
                >
                  <span>🇪🇸</span>
                  <span>Español</span>
                </button>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>{user?.firstName} {user?.lastName}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <Link
                    to="/my-tickets"
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Ticket className="w-4 h-4" />
                    <span>{t('header.myTickets')}</span>
                  </Link>
                  <Link
                    to="/user-profile"
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>{t('header.myProfile')}</span>
                  </Link>
                  <Link
                    to="/wallet"
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>{t('header.myWallet')}</span>
                  </Link>
                  <div className="border-t border-gray-200 my-2"></div>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('header.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-6 py-2 bg-white text-blue-600 border-2 border-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                {t('header.login')}
              </Link>
              <Link
                to="/register"
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('header.signUp')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
