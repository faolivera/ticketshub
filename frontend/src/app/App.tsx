import '@/i18n/config';
import i18n from '@/i18n/config';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { UserProvider } from '@/app/contexts/UserContext';
import { SocketProvider } from '@/app/contexts/SocketContext';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { MobileNav } from '@/app/components/MobileNav';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { AdminProtectedRoute } from '@/app/components/admin/AdminProtectedRoute';
import { AdminLayout } from '@/app/components/admin/AdminLayout';
import { Landing } from '@/app/pages/Landing';
import { EventTickets } from '@/app/pages/EventTickets';
import { UserProfile } from '@/app/pages/UserProfile';
import { SellerProfile } from '@/app/pages/SellerProfile';
import { BuyTicketPage } from '@/app/pages/BuyTicketPage';
import { MyTicketsPage, SellerDashboardPage } from '@/app/pages/BoughtTicketManager';
import { HowItWorks } from '@/app/pages/HowItWorks';
import { Contact } from '@/app/pages/Contact';
import { SupportListPage } from '@/app/pages/SupportListPage';
import { SupportCaseDetail } from '@/app/pages/SupportCaseDetail';
import { SellListingWizard } from '@/app/pages/SellListingWizard';
import { CreateEvent } from '@/app/pages/CreateEvent';
import { Login } from '@/app/pages/Login';
import { Register } from '@/app/pages/Register';
import { SellerVerification } from '@/app/pages/SellerVerification';
import { BankAccountPage } from '@/app/pages/BankAccountPage';
import { PhoneVerification } from '@/app/pages/PhoneVerification';
import { BecomeSellerWizard } from '@/app/pages/BecomeSellerWizard';
import { VerifyUserWizard } from '@/app/pages/VerifyUserWizard';
import { MyTicket } from '@/app/pages/MyTicket';
import { EditListing } from '@/app/pages/EditListing';
import { AdminDashboard } from '@/app/pages/admin/AdminDashboard';
import { EventManagement } from '@/app/pages/admin/EventManagement';
import { ImportEvents } from '@/app/pages/admin/ImportEvents';
import { UserManagement } from '@/app/pages/admin/UserManagement';
import TransactionManagement from '@/app/pages/admin/TransactionManagement';
import { PaymentMethodsManagement } from '@/app/pages/admin/PaymentMethodsManagement';
import { IdentityVerificationManagement } from '@/app/pages/admin/IdentityVerificationManagement';
import { NotificationManagement } from '@/app/pages/admin/NotificationManagement';
import { PlatformConfig } from '@/app/pages/admin/PlatformConfig';
import { EventsScoreConfig } from '@/app/pages/admin/EventsScoreConfig';
import { PromotionsManagement } from '@/app/pages/admin/PromotionsManagement';
import { SellerPayouts } from '@/app/pages/admin/SellerPayouts';
import SupportTicketsManagement from '@/app/pages/admin/SupportTicketsManagement';
import SupportTicketDetail from '@/app/pages/admin/SupportTicketDetail';
import { NotFound } from '@/app/pages/NotFound';
import { getGoogleClientId } from '@/config/env';

const googleClientId = getGoogleClientId();

function AppContent() {
  return (
    <UserProvider>
      <SocketProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col w-full min-w-0 overflow-x-hidden">
          <Header />
          <main className="flex-1 pb-16 sm:pb-0 w-full min-w-0">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/event/:eventSlug" element={<EventTickets />} />
              <Route path="/seller/:sellerId" element={<SellerProfile />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/contact" element={<Contact />} />

              <Route path="/support" element={<ProtectedRoute><SupportListPage /></ProtectedRoute>} />
              <Route path="/support/:id" element={<ProtectedRoute><SupportCaseDetail /></ProtectedRoute>} />

              {/* Protected routes — require authentication */}
              <Route path="/my-tickets" element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
              <Route path="/bought-tickets" element={<Navigate to="/my-tickets" replace />} />
              <Route path="/seller-dashboard" element={<ProtectedRoute><SellerDashboardPage /></ProtectedRoute>} />
              <Route path="/transaction/:transactionId" element={<ProtectedRoute><MyTicket /></ProtectedRoute>} />
              <Route path="/edit-listing/:listingId" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
              <Route path="/sell-ticket" element={<ProtectedRoute><SellListingWizard /></ProtectedRoute>} />
              <Route path="/user-profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              {/* Wallet route hidden from UI (backend still has wallet); uncomment to re-enable */}
              {/* <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} /> */}
              <Route path="/phone-verification" element={<ProtectedRoute><PhoneVerification /></ProtectedRoute>} />
              <Route path="/verify-user" element={<ProtectedRoute><VerifyUserWizard /></ProtectedRoute>} />
              <Route path="/become-seller" element={<ProtectedRoute><BecomeSellerWizard /></ProtectedRoute>} />
              <Route path="/seller-verification" element={<ProtectedRoute><SellerVerification /></ProtectedRoute>} />
              <Route path="/bank-account" element={<ProtectedRoute><BankAccountPage /></ProtectedRoute>} />
              <Route path="/create-event" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
              <Route path="/buy/:eventSlug/:listingId" element={<BuyTicketPage />} />

              {/* Admin routes — require Admin role */}
              <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="events" element={<EventManagement />} />
                <Route path="import-events" element={<ImportEvents />} />
                <Route path="transactions" element={<TransactionManagement />} />
                <Route path="seller-payouts" element={<SellerPayouts />} />
                <Route path="payment-methods" element={<PaymentMethodsManagement />} />
                <Route path="identity-verifications" element={<IdentityVerificationManagement />} />
                <Route path="notifications" element={<NotificationManagement />} />
                <Route path="platform-config" element={<PlatformConfig />} />
                <Route path="events-score" element={<EventsScoreConfig />} />
                <Route path="promotions" element={<PromotionsManagement />} />
                <Route path="support-tickets" element={<SupportTicketsManagement />} />
                <Route path="support-tickets/:id" element={<SupportTicketDetail />} />
              </Route>

              {/* Catch-all: unknown routes */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <MobileNav />
        </div>
      </BrowserRouter>
      </SocketProvider>
    </UserProvider>
  );
}

export default function App() {
  if (googleClientId) {
    return (
      <GoogleOAuthProvider clientId={googleClientId} locale={'es'}>
        <AppContent />
      </GoogleOAuthProvider>
    );
  }
  return <AppContent />;
}
