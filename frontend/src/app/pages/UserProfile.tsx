import { Mail, Calendar, Phone, Camera, Shield, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { useTranslation } from 'react-i18next';
import { SellerBadge } from '@/app/components/SellerBadge';
import { useState } from 'react';
import { VerificationHelper } from '@/lib/verification';
import { usersService } from '@/api/services';
import { UserAvatar } from '@/app/components/UserAvatar';
import AvatarCropModal from '@/app/components/Avatarcropmodal';
import { formatMonthYear } from '@/lib/format-date';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';

export function UserProfile() {
  const { user, logout, refreshUser } = useUser();
  const { t } = useTranslation();
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);

  const handleAvatarClick = () => {
    setAvatarCropOpen(true);
  };

  const handleAvatarSave = async (blob: Blob) => {
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    await usersService.uploadAvatar(file);
    await refreshUser();
  };

  if (!user) {
    return null;
  }

  const isSeller = VerificationHelper.isSeller(user);
  const showIdentityRow = isSeller || user.buyerDisputed === true;
  const idStatus = user.identityVerificationStatus ?? 'none';
  const bankStatus = user.bankAccountStatus ?? 'none';
  const identitySubmitted =
    idStatus === 'pending' || idStatus === 'approved' || idStatus === 'rejected';
  const bankSubmitted =
    bankStatus === 'pending' || bankStatus === 'approved';
  const becomeSellerCtaLabel = !isSeller
    ? t('becomeSeller.cta.becomeSeller')
    : !identitySubmitted
      ? t('becomeSeller.cta.verifySellerData')
      : t('becomeSeller.cta.completeVerification');

  const badgeLabel = (verified: boolean, pending: boolean) => {
    if (verified) return t('userProfile.badgeVerified');
    if (pending) return t('userProfile.badgeVerifying');
    return t('userProfile.badgeNotVerified');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
          {t('userProfile.title')}
        </h1>

        <Card className="border-border overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            {/* Profile header: stacked on mobile, row on sm+ */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Avatar: centered on mobile, left on desktop */}
              <div className="flex flex-col items-center sm:items-start gap-3">
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    className="relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full min-w-[72px] min-h-[72px] sm:min-w-0 sm:min-h-0"
                    aria-label={t('userProfile.changePhoto')}
                  >
                    <UserAvatar
                      name={`${user.firstName} ${user.lastName}`}
                      src={user.pic?.src}
                      className="w-20 h-20 sm:w-16 sm:h-16 text-xl ring-2 ring-border"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Name, badge, member since - full width on mobile */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-start">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">
                    {user.firstName} {user.lastName}
                  </h2>
                  {isSeller && <SellerBadge user={user} />}
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground mt-1.5">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {t('userProfile.memberSince')}{' '}
                    {user.createdAt ? formatMonthYear(user.createdAt) : formatMonthYear('2025-01-01')}
                  </span>
                </div>
              </div>

              {/* Actions: full-width stacked on mobile, column on sm+ */}
              <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-shrink-0">
                <Button
                  variant="destructive"
                  size="lg"
                  className="min-h-[44px] w-full sm:w-auto border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={logout}
                >
                  {t('userProfile.logout')}
                </Button>
              </div>
            </div>

            {/* Verification list: fixed label width so value column aligns; tighter on desktop */}
            <div className="space-y-4 sm:space-y-2">
              {/* Email */}
              <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-1.5 sm:gap-y-0 sm:items-center min-h-[2.75rem] sm:min-h-0">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5 text-sm">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('userProfile.labelEmail')}
                </span>
                <div className="flex flex-wrap items-center gap-2 min-w-0 pl-5 sm:pl-0">
                  <span className="truncate text-foreground">{user.email}</span>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      user.emailVerified ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    )}
                  >
                    {badgeLabel(user.emailVerified, false)}
                  </span>
                  {!user.emailVerified && (
                    <Link
                      to="/register"
                      state={{ verifyEmail: true, email: user.email, from: '/user-profile' }}
                      className="text-primary hover:underline font-medium whitespace-nowrap py-2 -my-2 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-0 sm:my-0"
                    >
                      {t('userProfile.verifyLink')}
                    </Link>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-1.5 sm:gap-y-0 sm:items-center min-h-[2.75rem] sm:min-h-0">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5 text-sm">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('userProfile.labelPhone')}
                </span>
                <div className="flex flex-wrap items-center gap-2 min-w-0 pl-5 sm:pl-0">
                  <span className="truncate text-foreground">{user.phone ?? t('userProfile.phoneNotSet')}</span>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      user.phoneVerified ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    )}
                  >
                    {badgeLabel(user.phoneVerified, false)}
                  </span>
                  {!user.phoneVerified && (
                    <Link
                      to="/verify-user"
                      state={{ verifyPhone: true, returnTo: '/user-profile' }}
                      className="text-primary hover:underline font-medium whitespace-nowrap py-2 -my-2 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-0 sm:my-0"
                    >
                      {t('userProfile.verifyLink')}
                    </Link>
                  )}
                </div>
              </div>

              {/* Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-1.5 sm:gap-y-0 sm:items-center min-h-[2.75rem] sm:min-h-0">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5 text-sm">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('userProfile.labelIdentity')}
                </span>
                <div className="flex flex-wrap items-center gap-2 min-w-0 pl-5 sm:pl-0">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      idStatus === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    )}
                  >
                    {badgeLabel(idStatus === 'approved', idStatus === 'pending')}
                  </span>
                  {(idStatus === 'none' || idStatus === 'rejected') && (
                    <Link
                      to="/verify-user"
                      state={{ verifyIdentity: true, returnTo: '/user-profile' }}
                      className="text-primary hover:underline font-medium whitespace-nowrap py-2 -my-2 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-0 sm:my-0"
                    >
                      {t('userProfile.verifyLink')}
                    </Link>
                  )}
                </div>
              </div>

              {/* Bank account */}
              {isSeller && (
                <div className="grid grid-cols-1 sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-1.5 sm:gap-y-0 sm:items-center min-h-[2.75rem] sm:min-h-0">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5 text-sm">
                    <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                    {t('userProfile.labelBankAccount')}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 min-w-0 pl-5 sm:pl-0">
                    <span className="text-foreground">
                      {user.bankAccountLast4 != null
                        ? `••• ${user.bankAccountLast4}`
                        : t('userProfile.bankAccountNotSet')}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        bankStatus === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      )}
                    >
                      {badgeLabel(bankStatus === 'approved', bankStatus === 'pending')}
                    </span>
                    {bankStatus === 'none' && (
                      <Link
                        to="/bank-account"
                        className="text-primary hover:underline font-medium whitespace-nowrap py-2 -my-2 inline-flex items-center min-h-[44px] sm:min-h-0 sm:py-0 sm:my-0"
                      >
                        {t('userProfile.verifyLink')}
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Become a Seller / Verify seller data CTA */}
            {(!isSeller || !bankSubmitted) && (
              <div className="mt-6 pt-4 border-t border-border">
                <Link
                  to="/become-seller"
                  className="flex items-center justify-center min-h-[48px] w-full px-6 py-3.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-center"
                >
                  {becomeSellerCtaLabel}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <AvatarCropModal
          open={avatarCropOpen}
          onClose={() => setAvatarCropOpen(false)}
          onSave={handleAvatarSave}
          cropShape="round"
        />
      </div>
    </div>
  );
}
