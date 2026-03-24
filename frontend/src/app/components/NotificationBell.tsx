import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { notificationsService, type NotificationItem } from '@/api/services/notifications.service';
import { useSocket, SOCKET_EVENTS } from '@/app/contexts/SocketContext';
import { formatDateShort } from '@/lib/format-date';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { V, VLIGHT, DARK, MUTED, HINT, BG, CARD, BORDER, S, R_BUTTON, R_INPUT } from '@/lib/design-tokens';

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

  // Close when clicking outside the bell button and outside the drawer content (portal)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (dropdownRef.current?.contains(target)) return;
      if (target.closest('[data-slot="drawer-content"]')) return;
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 44,
          minHeight: 44,
          width: 40,
          height: 40,
          color: DARK,
          background: 'transparent',
          border: 'none',
          borderRadius: 100,
          cursor: 'pointer',
          transition: 'background 0.14s',
          ...S,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        aria-label={t('notifications.title')}
      >
        <Bell size={20} strokeWidth={2} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 20,
              height: 20,
              paddingLeft: 4,
              paddingRight: 4,
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              background: V,
              borderRadius: 100,
              ...S,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isMobile && isOpen && createPortal(
        <>
          <style>{`@keyframes notif-slide-down{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {/* Backdrop — closes on tap, sits below the header (z-499) */}
          <div
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 499, background: 'rgba(0,0,0,0.35)' }}
          />
          {/* Panel — slides in below the header */}
          <div
            style={{
              position: 'fixed',
              top: 58,
              left: 0,
              right: 0,
              zIndex: 499,
              background: CARD,
              borderBottom: `1px solid ${BORDER}`,
              borderBottomLeftRadius: R_INPUT,
              borderBottomRightRadius: R_INPUT,
              boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
              maxHeight: 'calc(85vh - 58px)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'notif-slide-down 0.2s ease',
            }}
          >
            <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORDER}`, padding: '12px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: DARK, ...S }}>{t('notifications.title')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    style={{ minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', fontSize: 13, fontWeight: 600, color: V, background: 'none', border: 'none', cursor: 'pointer', ...S }}
                  >
                    <CheckCheck size={16} />
                    <span>{t('notifications.markAllRead')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{ minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, borderRadius: 100 }}
                  aria-label={t('notifications.close')}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '12px 16px 24px' }}>
              {isLoading && !hasLoaded ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                  <Loader2 size={32} style={{ color: MUTED }} className="animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: MUTED }}>
                  <Bell size={48} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                  <p style={{ fontSize: 14, ...S }}>{t('notifications.empty')}</p>
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        style={{ width: '100%', minHeight: 44, padding: '14px 16px', textAlign: 'left', background: !notification.read ? VLIGHT : 'transparent', border: 'none', borderBottom: `1px solid ${BORDER}`, cursor: 'pointer', transition: 'background 0.14s', ...S }}
                      >
                        <div style={{ display: 'flex', gap: 12 }}>
                          {!notification.read && (
                            <div style={{ marginTop: 6, width: 10, height: 10, borderRadius: '50%', background: V, flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0, marginLeft: notification.read ? 22 : 0 }}>
                            <p style={{ fontSize: 14, color: DARK, fontWeight: !notification.read ? 600 : 400, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>
                              {notification.title}
                            </p>
                            <p style={{ fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', ...S }}>
                              {notification.body}
                            </p>
                            <p style={{ fontSize: 11, color: HINT, marginTop: 4, ...S }}>
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
        </>,
        document.body
      )}
      {!isMobile && isOpen ? (
        <div
          style={{
            position: 'absolute',
            right: 0,
            marginTop: 8,
            width: 400,
            maxWidth: '96vw',
            background: CARD,
            borderRadius: R_INPUT,
            boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
            border: `1px solid ${BORDER}`,
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: `1px solid ${BORDER}`,
              background: BG,
            }}
          >
            <h3 style={{ fontSize: 13, fontWeight: 600, color: DARK, margin: 0, ...S }}>
              {t('notifications.title')}
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: V,
                  background: 'none',
                  border: 'none',
                  borderRadius: R_BUTTON,
                  cursor: 'pointer',
                  minHeight: 44,
                  minWidth: 44,
                  ...S,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = VLIGHT; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <CheckCheck size={14} />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {isLoading && !hasLoaded ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                <Loader2 size={24} style={{ color: MUTED }} className="animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: MUTED }}>
                <Bell size={40} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                <p style={{ fontSize: 13, ...S }}>{t('notifications.empty')}</p>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: !notification.read ? VLIGHT : 'transparent',
                        border: 'none',
                        borderBottom: `1px solid ${BORDER}`,
                        cursor: 'pointer',
                        transition: 'background 0.14s',
                        ...S,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = !notification.read ? VLIGHT : '#f9fafb'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = !notification.read ? VLIGHT : 'transparent'; }}
                    >
                      <div style={{ display: 'flex', gap: 12 }}>
                        {!notification.read && (
                          <div
                            style={{
                              marginTop: 5,
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: V,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0, marginLeft: notification.read ? 20 : 0 }}>
                          <p
                            style={{
                              fontSize: 13,
                              color: DARK,
                              fontWeight: !notification.read ? 600 : 400,
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              ...S,
                            }}
                          >
                            {notification.title}
                          </p>
                          <p
                            style={{
                              fontSize: 12,
                              color: MUTED,
                              marginTop: 4,
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              ...S,
                            }}
                          >
                            {notification.body}
                          </p>
                          <p style={{ fontSize: 11, color: HINT, marginTop: 4, ...S }}>
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
