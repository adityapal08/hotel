'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import HomestaysSection from '@/components/sections/HomestaysSection';
import AboutSection from '@/components/sections/AboutSection';
import SuitesSection from '@/components/sections/SuitesSection';
import HighlightsSection from '@/components/sections/HighlightsSection';
import LuxuryVillaSection from '@/components/sections/LuxuryVillaSection';
import GallerySection from '@/components/sections/GallerySection';
import BookingExperienceSection from '@/components/sections/BookingExperienceSection';
import BookNowModal from '@/components/ui/BookNowModal';
import HotelChatbot from '@/components/ui/HotelChatbot';

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState({});
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);

  const handleOpenModal = (initialData = {}) => {
    setModalInitialData(initialData);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalInitialData({});
  };

  const handleBookingSuccess = () => {
    setInventoryRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f7f4ef] text-[#1a202c] relative selection:bg-[#c5a059] selection:text-white">
      {/* 1. Floating Luxury Navbar with Top Bar */}
      <Navbar onOpenModal={handleOpenModal} />

      <main className="flex-1 w-full">
        {/* 2. Cinematic Hero Section with Parallax & Kinetic Typography */}
        <HeroSection onOpenModal={handleOpenModal} />

        {/* 3. The Homestay Collection (Explore All Three Homestays) */}
        <HomestaysSection onOpenModal={handleOpenModal} />

        {/* 4. The Estate (About Red Roots Villa & 3D Stats Cards) */}
        <AboutSection onOpenModal={handleOpenModal} />

        {/* 4. Luxury Accommodations / 3D Suites Showcase */}
        <SuitesSection onOpenModal={handleOpenModal} />

        {/* 5. Curated Experiences (Highlights of Your Stay with 3D Cards) */}
        <HighlightsSection />

        {/* 6. The Luxury-Villa Philosophy & Narrative Quote */}
        <LuxuryVillaSection onOpenModal={handleOpenModal} />

        {/* 7. Gallery Section (Checkout Villa Photos & Lightbox) */}
        <GallerySection />

        {/* 8. Dedicated Interactive Booking & Reservation Experience */}
        <BookingExperienceSection
          onOpenModal={handleOpenModal}
          refreshKey={inventoryRefreshKey}
        />
      </main>

      {/* 9. Luxury Concierge Footer */}
      <Footer onOpenModal={handleOpenModal} />

      {/* AI Hotel Concierge Chatbot */}
      <HotelChatbot onOpenModal={handleOpenModal} />

      {/* Interactive Reservation Modal with Real Backend Integration */}
      <BookNowModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        initialData={modalInitialData}
        onBookingSuccess={handleBookingSuccess}
      />
    </div>
  );
}
