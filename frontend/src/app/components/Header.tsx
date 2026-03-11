import { Link, useLocation } from 'react-router-dom';
import { User, Ticket, ChevronDown, LogOut, Languages, Shield, MessageCircle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/app/contexts/UserContext';
import { NotificationBell } from './NotificationBell';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/app/components/ui/drawer';

export function Header() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user, isAuthenticated, logout, canSell } = useUser();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isMobileLangOpen, setIsMobileLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsLangDropdownOpen(false);
  };

  // Close mobile lang dropdown when user dropdown closes
  useEffect(() => {
    if (!isDropdownOpen) setIsMobileLangOpen(false);
  }, [isDropdownOpen]);

  // Close dropdown when clicking outside (desktop only; mobile uses Drawer overlay)
  useEffect(() => {
    if (isMobile) return;
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
  }, [isMobile]);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Ticket className="w-8 h-8 text-indigo-600" />
          <span className="text-2xl font-bold text-gray-900">TicketsHub</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Admin Button - only for admins */}
          {isAuthenticated && user?.role === 'Admin' && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">{t('header.admin')}</span>
            </Link>
          )}

          {/* Language Selector — desktop: always in header; mobile: only when not logged in (else in user drawer) */}
          {!isMobile && (
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
          )}

          {/* Mobile + not logged in: language selector in header */}
          {isMobile && !isAuthenticated && (
            <div className="relative" ref={langDropdownRef}>
              <button
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                aria-label={t('header.language')}
              >
                <Languages className="w-5 h-5" />
                <span className="text-sm font-medium uppercase sr-only sm:not-sr-only">{i18n.language}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button
                    onClick={() => changeLanguage('en')}
                    className={`w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-gray-700 hover:bg-gray-50 transition-colors touch-manipulation ${
                      i18n.language === 'en' ? 'bg-blue-50 text-blue-600 font-semibold' : ''
                    }`}
                  >
                    <span>🇺🇸</span>
                    <span>English</span>
                  </button>
                  <button
                    onClick={() => changeLanguage('es')}
                    className={`w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-gray-700 hover:bg-gray-50 transition-colors touch-manipulation ${
                      i18n.language === 'es' ? 'bg-blue-50 text-blue-600 font-semibold' : ''
                    }`}
                  >
                    <span>🇪🇸</span>
                    <span>Español</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notifications Bell */}
          {isAuthenticated && <NotificationBell />}

          {/* Sell Tickets Button — hidden on mobile (accessible via MobileNav) */}
          {isAuthenticated && (
            <Link
              to="/sell-ticket"
              state={{ from: location.pathname }}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 border-2 border-indigo-600 rounded-full hover:bg-indigo-50 transition-colors"
            >
              {t('header.sellTickets')}
            </Link>
          )}

          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-center min-w-[44px] min-h-[44px] gap-2 px-3 py-2 sm:px-4 sm:min-w-0 sm:min-h-0 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors touch-manipulation"
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{user?.firstName} {user?.lastName}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMobile ? (
                <Drawer open={isDropdownOpen} onOpenChange={setIsDropdownOpen} direction="top">
                  <DrawerContent className="max-h-[90vh] flex flex-col">
                    <DrawerHeader className="flex-shrink-0 border-b border-gray-200 pb-3">
                      <div className="pr-10">
                        <DrawerTitle className="text-lg font-semibold text-gray-900 truncate">
                          {user?.firstName} {user?.lastName}
                        </DrawerTitle>
                      </div>
                    </DrawerHeader>
                    <nav className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 flex flex-col gap-1">
                      <Link
                        to="/user-profile"
                        className="min-h-[44px] flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <User className="w-5 h-5 shrink-0 text-gray-500" />
                        <span>{t('header.myProfile')}</span>
                      </Link>
                      <Link
                        to="/support"
                        className="min-h-[44px] flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <MessageCircle className="w-5 h-5 shrink-0 text-gray-500" />
                        <span>{t('header.support')}</span>
                      </Link>
                      <div className="border-t border-gray-200 pt-3 mt-2">
                        <button
                          type="button"
                          onClick={() => setIsMobileLangOpen(!isMobileLangOpen)}
                          className="w-full min-h-[44px] flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                          aria-expanded={isMobileLangOpen}
                          aria-haspopup="true"
                        >
                          <Languages className="w-5 h-5 shrink-0 text-gray-500" />
                          <span className="flex-1 text-left font-medium">{t('header.language')}</span>
                          <span className="text-sm text-gray-500">
                            {i18n.language === 'en' ? 'English' : 'Español'}
                          </span>
                          <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${isMobileLangOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isMobileLangOpen && (
                          <div className="mt-1 py-1 bg-gray-50 rounded-lg">
                            <button
                              onClick={() => { changeLanguage('en'); setIsMobileLangOpen(false); }}
                              className={`w-full min-h-[44px] flex items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation ${i18n.language === 'en' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                              <span aria-hidden>🇺🇸</span>
                              <span>English</span>
                            </button>
                            <button
                              onClick={() => { changeLanguage('es'); setIsMobileLangOpen(false); }}
                              className={`w-full min-h-[44px] flex items-center gap-3 px-4 py-3 text-left transition-colors touch-manipulation ${i18n.language === 'es' ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
                            >
                              <span aria-hidden>🇪🇸</span>
                              <span>Español</span>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-gray-200 my-2" />
                      <button
                        className="w-full min-h-[44px] flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
                        onClick={() => { setIsDropdownOpen(false); logout(); }}
                      >
                        <LogOut className="w-5 h-5 shrink-0" />
                        <span>{t('header.logout')}</span>
                      </button>
                    </nav>
                    <DrawerClose className="absolute top-4 right-4 rounded-full p-2 min-w-[44px] min-h-[44px] touch-manipulation" />
                  </DrawerContent>
                </Drawer>
              ) : isDropdownOpen ? (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="sm:hidden px-4 py-2 border-b border-gray-200">
                    <span className="font-semibold text-gray-900 truncate block">
                      {user?.firstName} {user?.lastName}
                    </span>
                  </div>
                  <Link
                    to="/my-tickets"
                    className="hidden md:flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Ticket className="w-4 h-4" />
                    <span>{t('header.myTickets')}</span>
                  </Link>
                  {canSell?.() && (
                    <Link
                      to="/seller-dashboard"
                      className="hidden md:flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Ticket className="w-4 h-4" />
                      <span>{t('header.mySales')}</span>
                    </Link>
                  )}
                  <Link
                    to="/support"
                    className="hidden md:flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{t('header.support')}</span>
                  </Link>
                  <Link
                    to="/user-profile"
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>{t('header.myProfile')}</span>
                  </Link>
                  {/* Language selector on mobile: dropdown (hidden on desktop; header has its own) */}
                  <div className="md:hidden border-t border-gray-200 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsMobileLangOpen(!isMobileLangOpen)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
                      aria-expanded={isMobileLangOpen}
                      aria-haspopup="true"
                    >
                      <Languages className="w-4 h-4 shrink-0" />
                      <span className="flex-1 text-left font-medium">{t('header.language')}</span>
                      <span className="text-sm text-gray-500">
                        {i18n.language === 'en' ? 'English' : 'Español'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 transition-transform ${isMobileLangOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {isMobileLangOpen && (
                      <div className="mt-1 py-1 bg-gray-50 rounded-lg">
                        <button
                          onClick={() => {
                            changeLanguage('en');
                            setIsMobileLangOpen(false);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            i18n.language === 'en'
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span aria-hidden>🇺🇸</span>
                          <span>English</span>
                        </button>
                        <button
                          onClick={() => {
                            changeLanguage('es');
                            setIsMobileLangOpen(false);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            i18n.language === 'es'
                              ? 'bg-blue-50 text-blue-600 font-semibold'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span aria-hidden>🇪🇸</span>
                          <span>Español</span>
                        </button>
                      </div>
                    )}
                  </div>
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
              ) : null}
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 sm:gap-2">
              <Link
                to="/login"
                className="py-2 text-sm text-indigo-600 font-semibold hover:underline underline-offset-2 sm:text-base sm:px-6 sm:py-2 sm:bg-white sm:border-2 sm:border-indigo-600 sm:rounded-full sm:hover:bg-indigo-50 sm:hover:no-underline sm:transition-colors"
              >
                {t('header.login')}
              </Link>
              <span className="text-gray-400 hidden sm:inline" aria-hidden="true">|</span>
              <Link
                to="/register"
                className="py-2 text-sm text-indigo-600 font-semibold hover:underline underline-offset-2 sm:text-base sm:px-6 sm:py-2 sm:bg-indigo-600 sm:text-white sm:rounded-full sm:hover:bg-indigo-700 sm:hover:no-underline sm:transition-colors"
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
