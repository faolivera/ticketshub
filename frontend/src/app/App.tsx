import '@/i18n/config';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from '@/app/contexts/UserContext';
import { SocketProvider } from '@/app/contexts/SocketContext';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { AdminProtectedRoute } from '@/app/components/admin/AdminProtectedRoute';
import { AdminLayout } from '@/app/components/admin/AdminLayout';
import { Landing } from '@/app/pages/Landing';
import { EventTickets } from '@/app/pages/EventTickets';
import { UserProfile } from '@/app/pages/UserProfile';
import { SellerProfile } from '@/app/pages/SellerProfile';
import { BuyTicketPage } from '@/app/pages/BuyTicketPage';
import { BoughtTicketManager, MyTicketsPage, SellerDashboardPage } from '@/app/pages/BoughtTicketManager';
import { HowItWorks } from '@/app/pages/HowItWorks';
import { Wallet } from '@/app/pages/Wallet';
import { SellTicket } from '@/app/pages/SellTicket';
import { CreateEvent } from '@/app/pages/CreateEvent';
import { Login } from '@/app/pages/Login';
import { Register } from '@/app/pages/Register';
import { SellerVerification } from '@/app/pages/SellerVerification';
import { PhoneVerification } from '@/app/pages/PhoneVerification';
import { MyTicket } from '@/app/pages/MyTicket';
import { EditListing } from '@/app/pages/EditListing';
import { AdminDashboard } from '@/app/pages/admin/AdminDashboard';
import { EventManagement } from '@/app/pages/admin/EventManagement';
import TransactionManagement from '@/app/pages/admin/TransactionManagement';
import { PaymentMethodsManagement } from '@/app/pages/admin/PaymentMethodsManagement';
import { IdentityVerificationManagement } from '@/app/pages/admin/IdentityVerificationManagement';
import { NotificationManagement } from '@/app/pages/admin/NotificationManagement';
import { PlatformConfig } from '@/app/pages/admin/PlatformConfig';
import { PromotionsManagement } from '@/app/pages/admin/PromotionsManagement';
import { NotFound } from '@/app/pages/NotFound';

export default function App() {
  return (
    <UserProvider>
      <SocketProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/event/:eventId" element={<EventTickets />} />
              <Route path="/seller/:sellerId" element={<SellerProfile />} />
              <Route path="/how-it-works" element={<HowItWorks />} />

              {/* Protected routes — require authentication */}
              <Route path="/my-tickets" element={<ProtectedRoute><MyTicketsPage /></ProtectedRoute>} />
              <Route path="/bought-tickets" element={<Navigate to="/my-tickets" replace />} />
              <Route path="/seller-dashboard" element={<ProtectedRoute><SellerDashboardPage /></ProtectedRoute>} />
              <Route path="/transaction/:transactionId" element={<ProtectedRoute><MyTicket /></ProtectedRoute>} />
              <Route path="/edit-listing/:listingId" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
              <Route path="/sell-ticket" element={<ProtectedRoute><SellTicket /></ProtectedRoute>} />
              <Route path="/user-profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
              <Route path="/phone-verification" element={<ProtectedRoute><PhoneVerification /></ProtectedRoute>} />
              <Route path="/seller-verification" element={<ProtectedRoute><SellerVerification /></ProtectedRoute>} />
              <Route path="/create-event" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
              <Route path="/buy/:ticketId" element={<BuyTicketPage />} />

              {/* Admin routes — require Admin role */}
              <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="events" element={<EventManagement />} />
                <Route path="transactions" element={<TransactionManagement />} />
                <Route path="payment-methods" element={<PaymentMethodsManagement />} />
                <Route path="identity-verifications" element={<IdentityVerificationManagement />} />
                <Route path="notifications" element={<NotificationManagement />} />
                <Route path="platform-config" element={<PlatformConfig />} />
                <Route path="promotions" element={<PromotionsManagement />} />
              </Route>

              {/* Catch-all: unknown routes */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
      </SocketProvider>
    </UserProvider>
  );
}
