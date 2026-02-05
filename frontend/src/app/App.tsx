import '@/i18n/config';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider } from '@/app/contexts/UserContext';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
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
              <Route path="/" element={<Landing />} />
              <Route path="/register" element={<Register />} />
              <Route path="/phone-verification" element={<PhoneVerification />} />
              <Route path="/event/:eventId" element={<EventTickets />} />
              <Route path="/user-profile" element={<UserProfile />} />
              <Route path="/seller/:sellerId" element={<SellerProfile />} />
              <Route path="/buy/:ticketId" element={<BuyTicketPage />} />
              <Route path="/bought-tickets" element={<BoughtTicketManager />} />
              <Route path="/my-tickets" element={<BoughtTicketManager />} />
              <Route path="/ticket/:ticketId" element={<MyTicket />} />
              <Route path="/edit-listing/:listingId" element={<EditListing />} />
              <Route path="/sell-ticket" element={<SellTicket />} />
              <Route path="/seller-verification" element={<SellerVerification />} />
              <Route path="/create-event" element={<CreateEvent />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/wallet" element={<Wallet />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </UserProvider>
  );
}
