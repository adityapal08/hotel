'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Phone } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import AboutSection from '@/components/sections/AboutSection';
import SuitesSection from '@/components/sections/SuitesSection';
import HighlightsSection from '@/components/sections/HighlightsSection';
import LuxuryVillaSection from '@/components/sections/LuxuryVillaSection';
import GallerySection from '@/components/sections/GallerySection';
import BookingExperienceSection from '@/components/sections/BookingExperienceSection';
import BookNowModal from '@/components/ui/BookNowModal';

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState({});

  const handleOpenModal = (initialData = {}) => {
    setModalInitialData(initialData);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalInitialData({});
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f7f4ef] text-[#1a202c] relative selection:bg-[#c5a059] selection:text-white">
      {/* 1. Floating Luxury Navbar with Top Bar */}
      <Navbar onOpenModal={handleOpenModal} />

      <main className="flex-1 w-full">
        {/* 2. Cinematic Hero Section with Parallax & Kinetic Typography */}
        <HeroSection onOpenModal={handleOpenModal} />

        {/* 3. The Estate (About Red Roots Villa & 3D Stats Cards) */}
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
        <BookingExperienceSection onOpenModal={handleOpenModal} />
      </main>

      {/* 9. Luxury Concierge Footer */}
      <Footer onOpenModal={handleOpenModal} />

      {/* Floating Concierge Action Buttons with Physics Hover */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <motion.a
          whileHover={{ scale: 1.1, rotate: 3 }}
          whileTap={{ scale: 0.9 }}
          href="https://wa.me/919363432220?text=Hi%20Red%20Roots%20Villa,%20I%20would%20like%20to%20inquire%20about%20booking%20the%20villa."
          target="_blank"
          rel="noopener noreferrer"
          className="w-13 h-13 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-2xl hover:bg-emerald-500 transition-colors border-2 border-[#c5a059]/40 relative group cursor-pointer"
          aria-label="WhatsApp Concierge"
        >
          <MessageCircle className="w-6 h-6 fill-white" />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-[#070c1b] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[#c5a059]/30">
            WhatsApp Concierge
          </span>
        </motion.a>

        <motion.button
          whileHover={{ scale: 1.1, rotate: -3 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleOpenModal()}
          className="w-13 h-13 rounded-full bg-gradient-to-r from-[#c5a059] to-[#e5c384] text-[#070c1b] flex items-center justify-center shadow-2xl hover:shadow-[#c5a059]/50 transition-all border-2 border-white/60 relative group cursor-pointer"
          aria-label="Request Instant Call Back"
        >
          <Phone className="w-5 h-5 fill-current" />
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-[#070c1b] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[#c5a059]/30">
            Request Call Back
          </span>
        </motion.button>
      </div>

      {/* Interactive Reservation Modal with Real Backend Integration */}
      <BookNowModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        initialData={modalInitialData}
      />
    </div>
  );
}
