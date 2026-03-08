import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, User, FileText, MessageSquare } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { supportService } from '@/api/services/support.service';
import {
  SupportCategory,
  SupportTicketSource,
} from '@/api/types/support';

export function Contact() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId') ?? undefined;
  const { user, isAuthenticated, isLoading: userLoading } = useUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const lockedNameEmail = isAuthenticated && user;
  const showPurchaseId = Boolean(transactionId);

  useEffect(() => {
    if (user) {
      const displayName =
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        user.publicName ||
        user.email;
      setName(displayName);
      setEmail(user.email);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isAuthenticated && user) {
        await supportService.createTicket({
          category: SupportCategory.Other,
          source: transactionId
            ? SupportTicketSource.ContactFromTransaction
            : SupportTicketSource.ContactForm,
          subject: subject.trim(),
          description: message.trim(),
          transactionId,
        });
      } else {
        await supportService.createContactTicket({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          description: message.trim(),
          transactionId,
        });
      }
      setSuccess(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : t('contact.error');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('contact.successTitle')}
          </h1>
          <p className="text-gray-600 mb-6">{t('contact.successMessage')}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
          >
            {t('contact.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('contact.title')}
        </h1>
        <p className="text-gray-600 mb-6">{t('contact.intro')}</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('contact.name')}
              </span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={lockedNameEmail}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={t('contact.namePlaceholder')}
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t('contact.email')}
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={lockedNameEmail}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={t('contact.emailPlaceholder')}
              autoComplete="email"
            />
          </div>

          {showPurchaseId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('contact.purchaseId')}
              </label>
              <input
                type="text"
                value={transactionId}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600 font-mono text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t('contact.subject')}
              </span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder={t('contact.subjectPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t('contact.message')}
              </span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
              placeholder={t('contact.messagePlaceholder')}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? t('contact.submitting') : t('contact.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
