import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Minus, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { formatTime } from '@/lib/format-date';
import { transactionsService } from '@/api/services';
import type { TransactionChatMessage } from '@/api/types';

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
}: TicketChatProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<TransactionChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (isOpen && transactionId) {
      void fetchMessages();
    }
  }, [isOpen, transactionId, fetchMessages]);

  useEffect(() => {
    if (!isOpen || !transactionId || pollIntervalSeconds <= 0) return;
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
  }, [isOpen, transactionId, pollIntervalSeconds]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const atLimit = messages.length >= chatMaxMessages;

  const handleSendMessage = async (): Promise<void> => {
    const trimmed = inputMessage.trim();
    if (trimmed === '' || sending || atLimit) return;
    setSendError(null);
    setSending(true);
    try {
      const newMsg = await transactionsService.postTransactionChatMessage(transactionId, trimmed);
      setMessages((prev) => [...prev, newMsg]);
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

  if (!isOpen) return null;

  const containerClass =
    'fixed z-50 overflow-hidden bg-white flex flex-col ' +
    'inset-0 md:inset-auto md:bottom-4 md:right-4 md:w-[380px] md:max-h-[90vh] md:rounded-lg md:shadow-2xl';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 flex items-center justify-between cursor-pointer shrink-0"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
            <ImageWithFallback
              src={counterpartImage || '/images/default/default.png'}
              alt={counterpartName}
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
            <div className="flex items-center gap-1 text-xs text-blue-100">
              <span>⭐ {counterpartRating.toFixed(1)}</span>
              <span>•</span>
              <span>{t('chat.online')}</span>
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
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="bg-blue-50 border-b border-blue-200 p-2 shrink-0">
            <p className="text-xs text-gray-700 truncate">
              <span className="font-semibold">{t('chat.regarding')}</span> {ticketTitle}
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                {t('common.loading')}
              </div>
            ) : (
              messages.map((message) => {
                const isCurrentUser = message.senderRole === currentUserRole;
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
                          <ImageWithFallback
                            src={counterpartImage || '/images/default/default.png'}
                            alt={counterpartName}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div
                          className={`rounded-2xl px-3 py-2 ${
                            isCurrentUser
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
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
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={inputMessage.trim() === '' || sending || atLimit}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                  inputMessage.trim() === '' || sending || atLimit
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">{t('chat.disclaimer')}</p>
          </div>
        </>
      )}
    </div>
  );
}
