import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Minus, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/app/components/UserAvatar';
import { formatTime } from '@/lib/format-date';
import { transactionsService } from '@/api/services';
import type { TransactionChatMessage } from '@/api/types';
import { useSocket, SOCKET_EVENTS } from '@/app/contexts/SocketContext';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { SUCCESS, SUCCESS_LIGHT, SUCCESS_BORDER, S, R_INPUT, R_CARD } from '@/lib/design-tokens';

export interface TicketChatProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  currentUserRole: 'buyer' | 'seller';
  counterpartName: string;
  counterpartImage: string;
  counterpartRating?: number;
  counterpartLevel?: number;
  ticketTitle: string;
  pollIntervalSeconds: number;
  chatMaxMessages: number;
  /** When true, chat is read-only (no send); e.g. when transaction is completed */
  readOnly?: boolean;
  /** When true, messages are marked as read only when the user interacts with the chat (click/focus), not on open */
  wasAutoOpened?: boolean;
  /** Called once when user first interacts with the chat and wasAutoOpened is true (to mark messages as read) */
  onMarkAsRead?: () => void;
}

export function TicketChat({
  isOpen,
  onClose,
  transactionId,
  currentUserRole,
  counterpartName,
  counterpartImage,
  counterpartRating = 0,
  counterpartLevel = 1,
  ticketTitle,
  pollIntervalSeconds,
  chatMaxMessages,
  readOnly = false,
  wasAutoOpened = false,
  onMarkAsRead,
}: TicketChatProps) {
  const { t } = useTranslation();
  const { socket, isConnected } = useSocket();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<TransactionChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFiredMarkAsReadRef = useRef(false);

  useEffect(() => {
    if (wasAutoOpened) hasFiredMarkAsReadRef.current = false;
  }, [wasAutoOpened]);

  const fetchMessages = useCallback(async (): Promise<void> => {
    if (!transactionId) return;
    try {
      setLoading(true);
      const { messages: next } = await transactionsService.getTransactionChatMessages(transactionId);
      setMessages(next);
      setSendError(null);
    } catch (err) {
      console.error('Failed to fetch chat messages:', err);
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  // Always fetch messages when chat opens so the list is visible. When opened automatically use markRead=false; mark as read on first user interaction instead.
  useEffect(() => {
    if (!isOpen || !transactionId) return;
    if (wasAutoOpened) {
      setLoading(true);
      transactionsService
        .getTransactionChatMessages(transactionId, undefined, false)
        .then(({ messages: next }) => setMessages(next))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      void fetchMessages();
    }
  }, [isOpen, transactionId, wasAutoOpened, fetchMessages]);

  // Socket: join transaction room while on this page so we receive messages even when chat is closed; leave only when unmounting (navigate away)
  useEffect(() => {
    if (!socket || !transactionId) return;
    socket.emit(SOCKET_EVENTS.CHAT_JOIN, { transactionId });
    return () => {
      socket.emit(SOCKET_EVENTS.CHAT_LEAVE, { transactionId });
    };
  }, [socket, transactionId]);

  // Socket: subscribe to new messages for this transaction
  useEffect(() => {
    if (!socket || !transactionId) return;
    const handler = (payload: TransactionChatMessage & { transactionId?: string }) => {
      if (payload.transactionId && payload.transactionId !== transactionId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) return prev;
        const msg: TransactionChatMessage = {
          id: payload.id,
          senderId: payload.senderId,
          senderRole: payload.senderRole,
          content: payload.content,
          createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : new Date(payload.createdAt).toISOString(),
        };
        return [...prev, msg];
      });
    };
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handler);
    return () => {
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handler);
    };
  }, [socket, transactionId]);

  // Poll messages only when socket is disconnected (fallback); when connected, rely on socket events
  useEffect(() => {
    if (!isOpen || !transactionId || pollIntervalSeconds <= 0 || isConnected) return;
    const id = setInterval(() => {
      void transactionsService.getTransactionChatMessages(transactionId).then(({ messages: next }) => {
        setMessages((prev) => {
          if (next.length !== prev.length || next[next.length - 1]?.id !== prev[prev.length - 1]?.id) {
            return next;
          }
          return prev;
        });
      }).catch(() => {});
    }, pollIntervalSeconds * 1000);
    pollIntervalRef.current = id;
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, transactionId, pollIntervalSeconds, isConnected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && !readOnly) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, readOnly]);

  const atLimit = messages.length >= chatMaxMessages;

  const handleSendMessage = async (): Promise<void> => {
    if (readOnly) return;
    const trimmed = inputMessage.trim();
    if (trimmed === '' || sending || atLimit) return;
    setSendError(null);
    setSending(true);
    try {
      const newMsg = await transactionsService.postTransactionChatMessage(transactionId, trimmed);
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setInputMessage('');
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : t('common.errorLoading');
      setSendError(message);
    } finally {
      setSending(false);
    }
  };

  const handleChatInteraction = useCallback(() => {
    if (!wasAutoOpened || !onMarkAsRead || hasFiredMarkAsReadRef.current) return;
    hasFiredMarkAsReadRef.current = true;
    onMarkAsRead();
  }, [wasAutoOpened, onMarkAsRead]);

  if (!isOpen) return null;

  // Mobile: true full screen — replaces the entire viewport while open.
  // Desktop: floating panel bottom-right.
  const containerClass =
    'fixed overflow-hidden flex flex-col bg-white ' +
    'inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[380px] md:max-h-[90vh] md:rounded-2xl md:shadow-2xl ' +
    'z-[9999]';
  const containerStyle: React.CSSProperties = {};

  return (
    <div
      className={containerClass}
      style={containerStyle}
      role="dialog"
      aria-label="Chat"
      onClick={handleChatInteraction}
      onKeyDown={(e) => { if (e.key === 'Tab' || e.key === 'Enter') handleChatInteraction(); }}
    >
      {/* Header */}
      <div
        className="text-white p-3 flex items-center justify-between shrink-0"
        style={{ background: '#692dd4', cursor: isMobile ? 'default' : 'pointer' }}
        onClick={() => { if (!isMobile) setIsMinimized(!isMinimized); }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <UserAvatar
              name={counterpartName}
              src={counterpartImage}
              className="w-10 h-10 rounded-full object-cover border-2 border-white"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm truncate">{counterpartName}</h3>
              {counterpartLevel === 2 && (
                <Shield className="w-3.5 h-3.5 text-yellow-300 flex-shrink-0" />
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="hidden md:flex p-1.5 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded transition-colors flex items-center gap-1.5"
          >
            {isMobile
              ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg><span className="text-sm font-semibold">Cerrar</span></>
              : <X className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="border-b shrink-0 px-3 py-2" style={{ background: '#f2f2f2', borderColor: '#e5e7eb' }}>
            <p className="text-xs truncate" style={{ color: '#6b7280' }}>
              {ticketTitle}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3" style={{ background: '#f2f2f2' }}>
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                {t('common.loading')}
              </div>
            ) : (
              messages.map((message) => {
                const isCurrentUser = message.senderRole === currentUserRole;
                const isDelivery = message.messageType === 'delivery' && message.payloadType;
                const deliveryLabel =
                  message.payloadType === 'ticketera'
                    ? t('chat.deliverySentTicketera')
                    : message.payloadType === 'pdf_or_image'
                      ? t('chat.deliverySentPdfEmail')
                      : message.payloadType === 'other'
                        ? t('chat.deliverySentOther')
                        : t('chat.deliverySent');
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex gap-2 max-w-[85%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {!isCurrentUser && (
                        <div className="flex-shrink-0">
                          <UserAvatar
                            name={counterpartName}
                            src={counterpartImage}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div
                          className={`rounded-card px-3 py-2 ${
                            isDelivery
                              ? 'text-center border'
                              : isCurrentUser
                                ? 'rounded-br-sm'
                                : 'border rounded-bl-sm'
                          }`}
                          style={
                            isDelivery
                              ? { background: SUCCESS_LIGHT, borderColor: SUCCESS_BORDER, color: SUCCESS }
                              : isCurrentUser
                                ? { background: '#692dd4', color: 'white' }
                                : { background: 'white', borderColor: '#e5e7eb', color: '#262626' }
                          }
                        >
                          {isDelivery ? (
                            <p className="text-sm font-medium">{deliveryLabel}</p>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          )}
                        </div>
                        <p
                          className={`text-xs text-gray-500 mt-0.5 ${
                            isCurrentUser ? 'text-right' : 'text-left'
                          }`}
                        >
                          {formatTime(new Date(message.createdAt))}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {!readOnly && (
            <div className="border-t border-gray-200 p-3 bg-white shrink-0">
              {sendError && (
                <p className="text-xs text-red-600 mb-2">{sendError}</p>
              )}
              {atLimit && (
                <p className="text-xs text-amber-700 mb-2">{t('chat.maxMessagesReached')}</p>
              )}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder={t('chat.typePlaceholder')}
                  disabled={atLimit}
                  className="flex-1 px-3 py-2 text-sm border focus:outline-none focus:ring-2 disabled:opacity-50"
                  style={{
                    borderRadius: R_INPUT,
                    borderColor: '#e5e7eb',
                    ...S,
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={inputMessage.trim() === '' || sending || atLimit}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
                  style={{
                    background: inputMessage.trim() === '' || sending || atLimit ? '#d1d5db' : '#692dd4',
                    color: inputMessage.trim() === '' || sending || atLimit ? '#6b7280' : 'white',
                    cursor: inputMessage.trim() === '' || sending || atLimit ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">{t('chat.disclaimer')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
