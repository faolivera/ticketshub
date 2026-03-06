import { Mail, Calendar, Ticket, Phone, Camera, Loader2, Shield, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { useTranslation } from 'react-i18next';
import { SellerBadge } from '@/app/components/SellerBadge';
import { useState, useEffect, useRef } from 'react';
import { SellerIntroModal } from '@/app/components/SellerIntroModal';
import { VerificationHelper } from '@/lib/verification';
import { usersService } from '@/api/services';
import { ticketsService } from '@/api/services/tickets.service';
import { UserAvatar } from '@/app/components/UserAvatar';
import { formatMonthYear } from '@/lib/format-date';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_MB = 5;

interface TicketStats {
  bought: number;
  sold: number;
}

export function UserProfile() {
  const { user, logout, refreshUser } = useUser();
  const { t } = useTranslation();
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ticketsService
      .getMyTickets()
      .then((data) => setTicketStats({ bought: data.bought.length, sold: data.sold.length }))
      .catch(() => setTicketStats(null))
      .finally(() => setStatsLoading(false));
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setAvatarError(t('userProfile.invalidFileType'));
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setAvatarError(t('userProfile.fileTooLarge'));
      return;
    }

    setAvatarError(null);
    setAvatarUploading(true);

    try {
      await usersService.uploadAvatar(file);
      await refreshUser();
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      setAvatarError(t('userProfile.uploadError'));
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!user) {
    return null;
  }

  const isSeller = VerificationHelper.isSeller(user);
  const showIdentityRow = isSeller || user.buyerDisputed === true;
  const idStatus = user.identityVerificationStatus ?? 'none';
  const bankStatus = user.bankAccountStatus ?? 'none';

  const badgeClass = (verified: boolean, pending: boolean) => {
    if (verified) return 'bg-green-100 text-green-800';
    if (pending) return 'bg-amber-100 text-amber-800';
    return 'bg-amber-100 text-amber-800';
  };
  const badgeLabel = (verified: boolean, pending: boolean) => {
    if (verified) return t('userProfile.badgeVerified');
    if (pending) return t('userProfile.badgeVerifying');
    return t('userProfile.badgeNotVerified');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('userProfile.title')}</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
          <div className="flex items-start gap-4 mb-6">
            {/* Avatar with upload */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={avatarUploading}
                className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full disabled:cursor-not-allowed"
                aria-label={t('userProfile.changePhoto')}
              >
                <UserAvatar
                  name={`${user.firstName} ${user.lastName}`}
                  src={user.pic?.src}
                  className="w-16 h-16 text-xl"
                />
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {avatarUploading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden="true"
              />
              {avatarError && (
                <p className="absolute -bottom-5 left-0 right-0 text-xs text-red-600 text-center whitespace-nowrap">
                  {avatarError}
                </p>
              )}
            </div>

            {/* Name + member since */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h2>
                {isSeller && <SellerBadge user={user} />}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  {t('userProfile.memberSince')}{' '}
                  {user.createdAt ? formatMonthYear(user.createdAt) : formatMonthYear('2025-01-01')}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                {t('userProfile.editProfile')}
              </button>
              <button
                onClick={logout}
                className="px-4 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
              >
                {t('userProfile.logout')}
              </button>
            </div>
          </div>

          {/* Verification grid: label | value + badge + verify link */}
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 items-baseline text-sm">
            {/* Email */}
            <span className="text-gray-600 font-medium flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              {t('userProfile.labelEmail')}
            </span>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="truncate text-gray-900">{user.email}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeClass(user.emailVerified, false)}`}
              >
                {badgeLabel(user.emailVerified, false)}
              </span>
              {!user.emailVerified && (
                <Link
                  to="/register"
                  state={{ verifyEmail: true, email: user.email, from: '/user-profile' }}
                  className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                >
                  {t('userProfile.verifyLink')}
                </Link>
              )}
            </div>

            {/* Phone */}
            <span className="text-gray-600 font-medium flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              {t('userProfile.labelPhone')}
            </span>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="truncate text-gray-900">{user.phone ?? t('userProfile.phoneNotSet')}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeClass(user.phoneVerified, false)}`}
              >
                {badgeLabel(user.phoneVerified, false)}
              </span>
              {!user.phoneVerified && (
                <Link
                  to="/phone-verification"
                  className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                >
                  {t('userProfile.verifyLink')}
                </Link>
              )}
            </div>

            {/* Identity (only if seller or buyerDisputed) */}
            {showIdentityRow && (
              <>
                <span className="text-gray-600 font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('userProfile.labelIdentity')}
                </span>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeClass(idStatus === 'approved', idStatus === 'pending')}`}
                  >
                    {badgeLabel(idStatus === 'approved', idStatus === 'pending')}
                  </span>
                  {idStatus !== 'approved' && (
                    <Link
                      to="/seller-verification"
                      className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                    >
                      {t('userProfile.verifyLink')}
                    </Link>
                  )}
                </div>
              </>
            )}

            {/* Bank account (sellers only) */}
            {isSeller && (
              <>
                <span className="text-gray-600 font-medium flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('userProfile.labelBankAccount')}
                </span>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="text-gray-900">
                    {user.bankAccountLast4 != null
                      ? `••• ${user.bankAccountLast4}`
                      : t('userProfile.bankAccountNotSet')}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeClass(bankStatus === 'approved', bankStatus === 'pending')}`}
                  >
                    {badgeLabel(bankStatus === 'approved', bankStatus === 'pending')}
                  </span>
                  {bankStatus !== 'approved' && (
                    <Link
                      to="/bank-account"
                      className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                    >
                      {t('userProfile.verifyLink')}
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Become a Seller CTA */}
          {!isSeller && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowSellerModal(true)}
                className="w-full px-6 py-3.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('userProfile.becomeSeller')}
              </button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-gray-100">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-medium text-gray-600">{t('userProfile.ticketsPurchased')}</p>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {statsLoading ? '—' : (ticketStats?.bought ?? '—')}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Ticket className="w-4 h-4 text-green-600" />
                <p className="text-xs font-medium text-gray-600">{t('userProfile.ticketsSold')}</p>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {statsLoading ? '—' : (ticketStats?.sold ?? '—')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showSellerModal && <SellerIntroModal onClose={() => setShowSellerModal(false)} />}
    </div>
  );
}
