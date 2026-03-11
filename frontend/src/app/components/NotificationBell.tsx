import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { notificationsService, type NotificationItem } from '@/api/services/notifications.service';
import { useSocket, SOCKET_EVENTS } from '@/app/contexts/SocketContext';
import { cn } from '@/app/components/ui/utils';
import { formatDateShort } from '@/lib/format-date';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/app/components/ui/drawer';

const POLL_INTERVAL_MS = 30000; // Poll every 30 seconds (fallback when socket disconnected)

export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { socket, isConnected } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silently fail - count will remain stale
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await notificationsService.getNotifications(1, 10);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
      setHasLoaded(true);
      // Mark visible unread notifications as read when dropdown is opened
      const unreadIds = response.notifications
        .filter((n) => !n.read)
        .map((n) => n.id);
      if (unreadIds.length > 0) {
        try {
          const marked = await notificationsService.markAsReadBatch(unreadIds);
          setNotifications((prev) =>
            prev.map((n) =>
              unreadIds.includes(n.id) ? { ...n, read: true } : n
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - marked));
        } catch {
          // Keep UI state as-is if batch mark fails
        }
      }
    } catch {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Realtime: push new notifications when socket emits
  useEffect(() => {
    if (!socket) return;
    const handler = (payload: NotificationItem) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === payload.id)) return prev;
        return [payload, ...prev];
      });
      setUnreadCount((prev) => prev + (payload.read ? 0 : 1));
    };
    socket.on(SOCKET_EVENTS.NOTIFICATION, handler);
    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION, handler);
    };
  }, [socket]);

  // Initial fetch on load; polling only when socket is disconnected (fallback)
  useEffect(() => {
    void fetchUnreadCount();
    if (isConnected) return;
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, isConnected]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown when clicking outside (desktop only; mobile uses Drawer overlay)
  useEffect(() => {
    if (isMobile) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  const handleNotificationClick = (notification: NotificationItem) => {
    setIsOpen(false);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Error handled silently
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.justNow');
    if (diffMins < 60) return t('notifications.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('notifications.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('notifications.daysAgo', { count: diffDays });
    return formatDateShort(dateString);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-10 sm:min-w-0 sm:min-h-0 text-gray-700 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
        aria-label={t('notifications.title')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={setIsOpen} direction="top">
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader className="flex-shrink-0 border-b border-gray-200 pb-3">
              <div className="flex items-center justify-between pr-8">
                <DrawerTitle className="text-lg font-semibold text-gray-900">
                  {t('notifications.title')}
                </DrawerTitle>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-3 py-2 -my-2 -mr-2 text-sm text-blue-600 hover:text-blue-700 font-medium touch-manipulation"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span className="sm:inline">{t('notifications.markAllRead')}</span>
                  </button>
                )}
              </div>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
              {isLoading && !hasLoaded ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base">{t('notifications.empty')}</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 -mx-4">
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          'w-full min-h-[44px] px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation',
                          !notification.read && 'bg-blue-50/50'
                        )}
                      >
                        <div className="flex gap-3">
                          {!notification.read && (
                            <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <div className={cn('flex-1 min-w-0', notification.read && 'ml-5')}>
                            <p className={cn(
                              'text-base text-gray-900 line-clamp-1',
                              !notification.read && 'font-semibold'
                            )}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                              {notification.body}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <DrawerClose className="absolute top-4 right-4 rounded-full p-2 min-w-[44px] min-h-[44px] touch-manipulation" />
          </DrawerContent>
        </Drawer>
      ) : isOpen ? (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('notifications.title')}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium min-h-[44px] min-w-[44px] items-center justify-center sm:min-w-0 sm:min-h-0 sm:py-0 sm:px-0"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading && !hasLoaded ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">{t('notifications.empty')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                        !notification.read && 'bg-blue-50/50'
                      )}
                    >
                      <div className="flex gap-3">
                        {!notification.read && (
                          <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <div className={cn('flex-1', notification.read && 'ml-5')}>
                          <p className={cn(
                            'text-sm text-gray-900 line-clamp-1',
                            !notification.read && 'font-semibold'
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                            {notification.body}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
