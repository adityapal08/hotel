'use client';

import { use, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  MapPin,
  CalendarCheck,
  Check,
  ArrowLeft,
  Sparkles,
  Bed,
  Users,
  ShieldCheck,
  Clock,
  ChevronRight,
  Phone,
  Layers,
  Info,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import BookNowModal from '@/components/ui/BookNowModal';
import CompactCalendar from '@/components/ui/CompactCalendar';
import { PROPERTY_DATA } from '@/components/ui/BookNowModal';
import HotelChatbot from '@/components/ui/HotelChatbot';

export default function PropertyDetailPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;

  const property = PROPERTY_DATA[slug];

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState({});
  const [selectedGalleryImg, setSelectedGalleryImg] = useState(null);

  if (!property) {
    notFound();
  }

  const handleOpenReserve = (roomType = '') => {
    setModalInitialData({
      propertyId: property.id,
      roomType: roomType || property.rooms[0]?.name || '',
    });
    setModalOpen(true);
  };

  // Gallery images list
  const galleryImages = [
    property.heroImage || '/images/hero.jpg',
    '/images/gallery-pool.jpg',
    '/images/bedroom-olive.jpg',
    '/images/gallery-bedroom.jpg',
    '/images/gallery-living.jpg',
    '/images/gallery-kitchen.jpg',
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f7f4ef] text-[#1a202c] relative selection:bg-[#c5a059] selection:text-white">
      {/* Top Navigation */}
      <Navbar onOpenModal={() => handleOpenReserve()} />

      <main className="flex-1 w-full pt-24 sm:pt-28">
        {/* Breadcrumb Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center gap-2 text-xs text-[#7A746B]">
            <Link href="/" className="hover:text-[#1C1B1A] transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#B5AEA4]" />
            <Link href="/#homestays" className="hover:text-[#1C1B1A] transition-colors">
              Homestays
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#B5AEA4]" />
            <span className="text-[#1C1B1A] font-semibold">{property.name}</span>
          </div>
        </div>

        {/* Hero Banner */}
        <section className="relative w-full aspect-[21/9] min-h-[380px] max-h-[520px] bg-[#070c1b] overflow-hidden">
          <Image
            src={property.rooms[0]?.image || '/images/hero.jpg'}
            alt={property.name}
            fill
            priority
            className="object-cover object-center brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a101d] via-[#0a101d]/40 to-transparent" />

          <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-8 flex flex-col justify-end pb-8 sm:pb-12 text-white">
            <div className="inline-flex items-center gap-2 bg-[#c5a059]/20 border border-[#c5a059]/40 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider text-[#e5c384] w-fit mb-3">
              <MapPin className="w-3.5 h-3.5" />
              <span>{property.location}</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white uppercase drop-shadow-sm">
              {property.name}
            </h1>
            <p className="text-[#e5c384] text-sm sm:text-lg font-light mt-2 max-w-2xl">
              {property.tagline || 'Experience serene luxury and dedicated hospitality'}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenReserve()}
                className="py-3 px-6 rounded-xl text-xs font-bold uppercase tracking-wider text-[#070c1b] bg-gradient-to-r from-[#c5a059] to-[#e5c384] hover:shadow-xl hover:shadow-[#c5a059]/20 transition-all cursor-pointer flex items-center gap-2"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Reserve This Homestay</span>
              </button>

              <a
                href="#rooms"
                className="py-3 px-5 rounded-xl text-xs font-semibold uppercase tracking-wider text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center gap-2"
              >
                <span>View Accommodations ({property.rooms.length})</span>
              </a>
            </div>
          </div>
        </section>

        {/* Placeholder Information Notice for Homestay 2 & 3 */}
        {property.isPlaceholder && (
          <section className="max-w-7xl mx-auto px-4 sm:px-8 -mt-4 relative z-20">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 shadow-sm text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm text-amber-900">
                    Property Information Notice
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    High-resolution property photos, detailed narrative, and owner-verified amenities for{' '}
                    <strong>{property.name}</strong> are currently being prepared. Complete room inventory,
                    pricing, and direct reservations below are live for booking and preview.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-3 py-1 bg-amber-200/80 text-amber-900 rounded-full whitespace-nowrap self-start sm:self-center">
                Preview Mode
              </span>
            </div>
          </section>
        )}

        {/* Property Overview & Amenities */}
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
            {/* Left 7 Cols: Overview */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#9e7d3b] block mb-2">
                  About The Property
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0b132b] leading-tight">
                  Tranquil Living Crafted for Peace & Comfort
                </h2>
              </div>

              <p className="text-[#4a453e] text-sm sm:text-base leading-relaxed font-light">
                Welcome to {property.name}, an exceptional getaway nestled in Pondicherry. Whether you are
                traveling with family, on a romantic escape, or taking a peaceful respite from urban
                demands, our homestay provides unmatched seclusion, genuine warmth, and contemporary
                conveniences.
              </p>

              {/* Zero Payment Policy Callout */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong className="block font-semibold">Zero Online Payment Required</strong>
                  All reservations at {property.name} are 100% cardless and confirmed instantly with an
                  official booking reference. Payment is made directly upon check-in.
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Key Highlights & Facilities */}
            <div className="lg:col-span-5 bg-white border border-[#E2DBD2] rounded-3xl p-6 sm:p-8 shadow-sm">
              <h3 className="font-serif text-xl font-bold text-[#0b132b] mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c5a059]" />
                Key Facilities & Services
              </h3>

              <ul className="space-y-3">
                {[
                  'Air-Conditioned Rooms with Climate Control',
                  'High Speed Complimentary WiFi',
                  'Dedicated Secure Parking on Grounds',
                  'Daily Housekeeping & Fresh Linens',
                  '24/7 Caretaker & Host Assistance',
                  'Zero Cancellation Fee Options',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-[#4a453e]">
                    <div className="w-5 h-5 rounded-full bg-[#EBF2ED] text-[#2F5238] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Available Rooms Section */}
        <section id="rooms" className="py-16 sm:py-24 bg-[#0a101d] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#e5c384] block mb-2">
                Inventory & Rates
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white uppercase">
                Available Accommodations
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-3 font-light">
                Each room is backed by dynamic SQLite inventory. Booking any room here updates availability
                strictly for {property.name}.
              </p>
            </div>

            {/* Rooms Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {property.rooms.map((room, idx) => (
                <div
                  key={idx}
                  className="bg-[#0f172a] rounded-3xl overflow-hidden border border-[#c5a059]/20 hover:border-[#c5a059]/50 transition-all flex flex-col justify-between shadow-xl"
                >
                  <div className="relative aspect-[16/10] w-full bg-black/40">
                    <Image
                      src={room.image || '/images/hero.jpg'}
                      alt={room.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold text-gray-200">
                      Up to {room.maxGuests} Guests
                    </span>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-white mb-1.5">
                        {room.name}
                      </h3>
                      <p className="text-xs text-[#e5c384] font-medium mb-3">
                        {room.tagline}
                      </p>
                      <p className="text-xs text-gray-400 font-light leading-relaxed mb-4">
                        {room.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <span className="font-serif text-2xl font-bold text-white">
                          ₹{room.rate.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-gray-400 font-light block">/ night</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenReserve(room.name)}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-[#070c1b] bg-gradient-to-r from-[#c5a059] to-[#e5c384] hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Reserve</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Photo Gallery Grid */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#9e7d3b] block mb-2">
              Visual Tour
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0b132b] uppercase">
              Property Gallery
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((imgSrc, idx) => (
              <div
                key={idx}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black/10 border border-[#E2DBD2] group cursor-pointer"
                onClick={() => setSelectedGalleryImg(imgSrc)}
              >
                <Image
                  src={imgSrc}
                  alt={`${property.name} gallery ${idx + 1}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer onOpenModal={() => handleOpenReserve()} />

      {/* AI Hotel Concierge Chatbot */}
      <HotelChatbot onOpenModal={handleOpenReserve} />

      {/* Booking Modal Pre-Configured for this Property */}
      <BookNowModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={modalInitialData}
      />
    </div>
  );
}
