import { Mail, Calendar, Ticket, Phone, CheckCircle, AlertCircle, Clock, Camera, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { useTranslation } from 'react-i18next';
import { SellerBadge } from '@/app/components/SellerBadge';
import { useState, useEffect, useRef } from 'react';
import { SellerIntroModal } from '@/app/components/SellerIntroModal';
import { UserLevel } from '@/api/types/users';
import { identityVerificationService, usersService } from '@/api/services';
import { ticketsService } from '@/api/services/tickets.service';
import type { IdentityVerificationRequest } from '@/api/types/identity-verification';
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
  const [identityVerification, setIdentityVerification] = useState<IdentityVerificationRequest | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.level === UserLevel.Seller) {
      loadIdentityVerification();
    }
  }, [user?.level]);

  useEffect(() => {
    ticketsService
      .getMyTickets()
      .then((data) => setTicketStats({ bought: data.bought.length, sold: data.sold.length }))
      .catch(() => setTicketStats(null))
      .finally(() => setStatsLoading(false));
  }, []);

  const loadIdentityVerification = async () => {
    try {
      setVerificationLoading(true);
      const response = await identityVerificationService.getMyVerification();
      setIdentityVerification(response.verification);
    } catch (err) {
      console.error('Failed to load verification status:', err);
    } finally {
      setVerificationLoading(false);
    }
  };

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

  const isSeller = user.level === UserLevel.Seller || user.level === UserLevel.VerifiedSeller;

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

            {/* Name + info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">
                  {user.firstName} {user.lastName}
                </h2>
                {isSeller && <SellerBadge level={user.level} />}
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                <div className="flex items-center gap-2 flex-wrap">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      user.emailVerified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {user.emailVerified
                      ? t('userProfile.badgeVerified')
                      : t('userProfile.badgeNotVerified')}
                  </span>
                  {!user.emailVerified && (
                    <Link
                      to="/register"
                      state={{ verifyEmail: true, email: user.email, from: '/user-profile' }}
                      className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                    >
                      {t('userProfile.verifyEmail')}
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{user.phone ?? t('userProfile.phoneNotSet')}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      user.phoneVerified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {user.phoneVerified
                      ? t('userProfile.badgeVerified')
                      : t('userProfile.badgeNotVerified')}
                  </span>
                  {!user.phoneVerified && (
                    <Link
                      to="/phone-verification"
                      className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                    >
                      {t('userProfile.verifyPhone')}
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {t('userProfile.memberSince')}{' '}
                    {user.createdAt ? formatMonthYear(user.createdAt) : formatMonthYear('2025-01-01')}
                  </span>
                </div>
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

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
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

        {/* Verifications Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('userProfile.verifications')}</h2>

          <div className="space-y-3">
            {/* Phone Verification */}
            <div
              className={`p-4 rounded-lg border ${
                user.phoneVerified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <Phone
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    user.phoneVerified ? 'text-green-600' : 'text-amber-600'
                  }`}
                />
                <div className="flex-1">
                  {user.phoneVerified ? (
                    <>
                      <p className="font-semibold text-gray-900 mb-0.5">{t('userProfile.phoneVerified')}</p>
                      <p className="text-sm text-gray-600">{user.phone}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-900 mb-1">{t('userProfile.phoneNotVerified')}</p>
                      <p className="text-sm text-gray-600 mb-3">{t('userProfile.phoneVerificationNotice')}</p>
                      <Link
                        to="/phone-verification"
                        className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {t('userProfile.verifyPhone')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Become a Seller CTA */}
            {(user.level === UserLevel.Basic || user.level === UserLevel.Buyer) && (
              <button
                onClick={() => setShowSellerModal(true)}
                className="w-full px-6 py-3.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('userProfile.becomeSeller')}
              </button>
            )}

            {/* Seller identity verification */}
            {user.level === UserLevel.Seller && !verificationLoading && (
              <>
                {identityVerification?.status === 'pending' ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">
                          {t('userProfile.identityVerificationPending')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t('userProfile.identityVerificationPendingNotice')}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : identityVerification?.status === 'rejected' ? (
                  <>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-red-900 mb-1">
                            {t('userProfile.identityVerificationRejected')}
                          </p>
                          <p className="text-sm text-red-800">
                            {t('userProfile.identityVerificationRejectedNotice')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/seller-verification"
                      className="block w-full px-6 py-3.5 bg-red-600 text-white font-semibold text-center rounded-lg hover:bg-red-700 transition-colors"
                    >
                      {t('userProfile.retryVerification')}
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-blue-900 mb-1">
                            {t('userProfile.identityVerificationRequired')}
                          </p>
                          <p className="text-sm text-blue-800">
                            {t('userProfile.identityVerificationNotice')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      to="/seller-verification"
                      className="block w-full px-6 py-3.5 bg-blue-600 text-white font-semibold text-center rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {t('userProfile.verifyIdentity')}
                    </Link>
                  </>
                )}
              </>
            )}

            {/* Fully Verified Seller */}
            {user.level === UserLevel.VerifiedSeller && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900">{t('userProfile.fullyVerified')}</p>
                    <p className="text-sm text-green-800">{t('userProfile.fullyVerifiedDescription')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSellerModal && <SellerIntroModal onClose={() => setShowSellerModal(false)} />}
    </div>
  );
}
