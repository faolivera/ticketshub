import { User, Mail, MapPin, Calendar, Ticket, Shield, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { useTranslation } from 'react-i18next';
import { SellerBadge } from '@/app/components/SellerBadge';
import { useState } from 'react';
import { SellerIntroModal } from '@/app/components/SellerIntroModal';

const mockActivity = [
  {
    id: '1',
    type: 'purchase',
    eventName: 'Summer Music Festival',
    ticketType: 'VIP',
    date: 'January 20, 2026',
    price: 250
  },
  {
    id: '2',
    type: 'sale',
    eventName: 'Rock Night',
    ticketType: 'General Admission',
    date: 'January 18, 2026',
    price: 125
  },
  {
    id: '3',
    type: 'purchase',
    eventName: 'Jazz Evening',
    ticketType: 'Premium',
    date: 'January 15, 2026',
    price: 75
  }
];

export function UserProfile() {
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [showSellerModal, setShowSellerModal] = useState(false);

  if (!user) {
    return null;
  }

  const getRole = () => {
    if (user.level === 0) return t('userProfile.roleBuyer');
    if (user.level === 1) return t('userProfile.roleBuyerAndSeller');
    return t('userProfile.roleBuyerAndSeller');
  };

  const getAccountLevel = () => {
    if (user.level === 0) return t('userProfile.level0');
    if (user.level === 1) return t('userProfile.level1');
    return t('userProfile.level2');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('userProfile.title')}</h1>

        {/* Main Profile Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
                {user.level > 0 && <SellerBadge level={user.level} />}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>{user.country}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>{t('userProfile.memberSince')} January 2025</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                {t('userProfile.editProfile')}
              </button>
              <button 
                onClick={logout}
                className="px-6 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                {t('userProfile.logout')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Ticket className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">{t('userProfile.ticketsPurchased')}</h3>
              </div>
              <p className="text-4xl font-bold text-blue-600">12</p>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Ticket className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">{t('userProfile.ticketsSold')}</h3>
              </div>
              <p className="text-4xl font-bold text-green-600">{user.level > 0 ? '5' : '0'}</p>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('userProfile.accountStatus')}</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-semibold text-gray-900">{t('userProfile.role')}</p>
                  <p className="text-gray-600">{getRole()}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-semibold text-gray-900">{t('userProfile.accountLevel')}</p>
                  <p className="text-gray-600">{getAccountLevel()}</p>
                </div>
              </div>
            </div>

            {/* Phone Verification Status */}
            <div className={`p-4 rounded-lg border-2 ${
              user.phoneVerified 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start gap-3">
                <Phone className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  user.phoneVerified ? 'text-green-600' : 'text-yellow-600'
                }`} />
                <div className="flex-1">
                  {user.phoneVerified ? (
                    <>
                      <p className="font-semibold text-gray-900 mb-1">
                        {t('userProfile.phoneVerified')}
                      </p>
                      <p className="text-sm text-gray-600">{user.phone}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-900 mb-1">
                        {t('userProfile.phoneNotVerified')}
                      </p>
                      <p className="text-sm text-gray-700 mb-3">
                        {t('userProfile.phoneVerificationNotice')}
                      </p>
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
          </div>

          {/* Become a Seller CTA */}
          {user.level === 0 && (
            <div className="border-t pt-6">
              <button
                onClick={() => setShowSellerModal(true)}
                className="w-full px-6 py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('userProfile.becomeSeller')}
              </button>
            </div>
          )}

          {/* Seller Level 1 - Verification CTA */}
          {user.level === 1 && (
            <div className="border-t pt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
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
                className="block w-full px-6 py-4 bg-blue-600 text-white font-bold text-center rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('userProfile.verifyIdentity')}
              </Link>
            </div>
          )}

          {/* Seller Level 2 - Fully Verified */}
          {user.level === 2 && (
            <div className="border-t pt-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">
                      {t('userProfile.fullyVerified')}
                    </p>
                    <p className="text-sm text-green-800">
                      {t('userProfile.fullyVerifiedDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('userProfile.recentActivity')}</h2>

          <div className="space-y-4">
            {mockActivity.map((activity) => (
              <div 
                key={activity.id}
                className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    activity.type === 'purchase' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-green-100 text-green-600'
                  }`}>
                    <Ticket className="w-6 h-6" />
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900">
                      {activity.type === 'purchase' ? t('userProfile.purchased') : t('userProfile.sold')} - {activity.eventName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {activity.ticketType} • {activity.date}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    ${activity.price}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link 
              to="/bought-tickets"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('userProfile.viewAllTickets')}
            </Link>
          </div>
        </div>
      </div>

      {showSellerModal && (
        <SellerIntroModal onClose={() => setShowSellerModal(false)} />
      )}
    </div>
  );
}
