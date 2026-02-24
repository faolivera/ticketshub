import '@/i18n/config';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from '@/app/contexts/UserContext';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { Landing } from '@/app/pages/Landing';
import { EventTickets } from '@/app/pages/EventTickets';
import { UserProfile } from '@/app/pages/UserProfile';
import { SellerProfile } from '@/app/pages/SellerProfile';
import { BuyTicketPage } from '@/app/pages/BuyTicketPage';
import { BoughtTicketManager } from '@/app/pages/BoughtTicketManager';
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

export default function App() {
  return (
    <UserProvider>
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
              <Route path="/my-tickets" element={<ProtectedRoute><BoughtTicketManager /></ProtectedRoute>} />
              <Route path="/bought-tickets" element={<ProtectedRoute><BoughtTicketManager /></ProtectedRoute>} />
              <Route path="/ticket/:ticketId" element={<ProtectedRoute><MyTicket /></ProtectedRoute>} />
              <Route path="/edit-listing/:listingId" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
              <Route path="/sell-ticket" element={<ProtectedRoute><SellTicket /></ProtectedRoute>} />
              <Route path="/user-profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
              <Route path="/phone-verification" element={<ProtectedRoute><PhoneVerification /></ProtectedRoute>} />
              <Route path="/seller-verification" element={<ProtectedRoute><SellerVerification /></ProtectedRoute>} />
              <Route path="/create-event" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
              <Route path="/buy/:ticketId" element={<ProtectedRoute><BuyTicketPage /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </UserProvider>
  );
}
