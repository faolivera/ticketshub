import { useState, useRef, useEffect } from 'react';
import { X, Send, Minus, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
  isCurrentUser: boolean;
}

interface TicketChatProps {
  isOpen: boolean;
  onClose: () => void;
  sellerName: string;
  sellerImage: string;
  sellerRating: number;
  sellerLevel: number;
  ticketTitle: string;
}

export function TicketChat({
  isOpen,
  onClose,
  sellerName,
  sellerImage,
  sellerRating,
  sellerLevel,
  ticketTitle
}: TicketChatProps) {
  const { t } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderId: 'seller',
      senderName: sellerName,
      text: t('chat.sellerGreeting'),
      timestamp: new Date(Date.now() - 3600000),
      isCurrentUser: false
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'current-user',
      senderName: 'You',
      text: inputMessage,
      timestamp: new Date(),
      isCurrentUser: true
    };

    setMessages([...messages, newMessage]);
    setInputMessage('');

    // Simulate seller response after 2 seconds
    setTimeout(() => {
      const sellerResponse: Message = {
        id: (Date.now() + 1).toString(),
        senderId: 'seller',
        senderName: sellerName,
        text: t('chat.sellerAutoResponse'),
        timestamp: new Date(),
        isCurrentUser: false
      };
      setMessages(prev => [...prev, sellerResponse]);
    }, 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] shadow-2xl rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 flex items-center justify-between cursor-pointer"
           onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2 flex-1">
          <div className="relative">
            <ImageWithFallback
              src={sellerImage}
              alt={sellerName}
              className="w-10 h-10 rounded-full object-cover border-2 border-white"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm truncate">{sellerName}</h3>
              {sellerLevel === 2 && (
                <Shield className="w-3.5 h-3.5 text-yellow-300 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-blue-100">
              <span>⭐ {sellerRating.toFixed(1)}</span>
              <span>•</span>
              <span>{t('chat.online')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="p-1.5 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
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

      {/* Chat Body - Only shown when not minimized */}
      {!isMinimized && (
        <>
          {/* Ticket Context */}
          <div className="bg-blue-50 border-b border-blue-200 p-2">
            <p className="text-xs text-gray-700 truncate">
              <span className="font-semibold">{t('chat.regarding')}</span> {ticketTitle}
            </p>
          </div>

          {/* Messages Area */}
          <div className="h-[400px] overflow-y-auto p-3 space-y-3 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-2 max-w-[85%] ${message.isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!message.isCurrentUser && (
                    <div className="flex-shrink-0">
                      <ImageWithFallback
                        src={sellerImage}
                        alt={message.senderName}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <div
                      className={`rounded-2xl px-3 py-2 ${
                        message.isCurrentUser
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                    </div>
                    <p className={`text-xs text-gray-500 mt-0.5 ${message.isCurrentUser ? 'text-right' : 'text-left'}`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t('chat.typePlaceholder')}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={inputMessage.trim() === ''}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                  inputMessage.trim() === ''
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('chat.disclaimer')}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
