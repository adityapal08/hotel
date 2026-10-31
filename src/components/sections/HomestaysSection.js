'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  Sparkles,
  ArrowRight,
  Bed,
  Users,
  ShieldCheck,
  Building2,
  CalendarCheck,
  Check,
  Clock,
} from 'lucide-react';
import Tilt3DCard from '@/components/ui/Tilt3DCard';

export const HOMESTAYS_LIST = [
  {
    id: 'red-roots-villa',
    slug: 'red-roots-villa',
    name: 'Red Roots Villa',
    badge: 'Featured Villa',
    badgeColor: 'bg-[#c5a059] text-[#070c1b]',
    tagline: 'Rejuvenate Your Inner Peace in Coastal Luxury',
    location: 'Moratandi • Pondicherry',
    image: '/images/hero.jpg',
    description:
      'Minimalistic brand new 3BHK individual villa with private swimming pool in Moratandi - Pondicherry. Your perfect getaway from hectic corporate lifestyle.',
    amenities: [
      'Private Swimming Pool with kids pool',
      '3BHK Air-Conditioned Bedrooms',
      'Fully Functional Kitchen',
      'High Speed WiFi & Caretaker',
    ],
    startingPrice: 4500,
    roomCountText: '5 Suite Categories',
    isPlaceholder: false,
  },
  {
    id: 'homestay-2',
    slug: 'homestay-2',
    name: 'Homestay 2',
    badge: 'Preview Mode',
    badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    tagline: 'Peaceful Coastal Stay (Details Updating Soon)',
    location: 'Pondicherry',
    image: '/images/gallery-bedroom.jpg',
    description:
      'Property details, high-resolution photography, and amenities for Homestay 2 are currently being prepared. Complete information and gallery will be published soon. Room inventory and booking reservations are open for preview.',
    amenities: [
      'Air-Conditioned Accommodation',
      'High Speed WiFi',
      'Complimentary Secure Parking',
      '24/7 Caretaker Assistance',
    ],
    startingPrice: 2900,
    roomCountText: '5 Suite Categories',
    isPlaceholder: true,
  },
  {
    id: 'homestay-3',
    slug: 'homestay-3',
    name: 'Homestay 3',
    badge: 'Preview Mode',
    badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    tagline: 'Tranquil Getaway (Details Updating Soon)',
    location: 'Pondicherry',
    image: '/images/gallery-living.jpg',
    description:
      'Property details, high-resolution photography, and amenities for Homestay 3 are currently being prepared. Complete information and gallery will be published soon. Room inventory and booking reservations are open for preview.',
    amenities: [
      'Air-Conditioned Accommodation',
      'High Speed WiFi',
      'Lounge & Dining Area',
      'On-Site Host Assistance',
    ],
    startingPrice: 2600,
    roomCountText: '5 Suite Categories',
    isPlaceholder: true,
  },
];

export default function HomestaysSection({ onOpenModal }) {
  return (
    <section id="homestays" className="py-24 sm:py-32 bg-[#0a101d] text-white relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-[#c5a059]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#e5c384]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-3"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e5c384]" />
            <span className="text-xs uppercase tracking-[0.28em] text-[#e5c384] font-bold">
              Our Collection
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white uppercase"
          >
            THREE CURATED <span className="italic font-normal text-[#e5c384]">HOMESTAYS</span>
          </motion.h2>
          <p className="text-gray-400 text-sm sm:text-base mt-4 max-w-xl mx-auto font-light leading-relaxed">
            Discover our distinct homestay properties in Pondicherry. Each property features isolated
            inventory, verified amenities, and direct instant reservation without online payment.
          </p>
        </div>

        {/* 3-Column Homestay Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOMESTAYS_LIST.map((homestay, idx) => (
            <motion.div
              key={homestay.id}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.15 }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="flex flex-col h-full"
            >
              <Tilt3DCard
                maxRotation={6}
                scaleOnHover={1.02}
                className="bg-[#0f172a] rounded-[2rem] overflow-hidden border border-[#c5a059]/20 hover:border-[#c5a059]/50 shadow-2xl transition-all duration-300 flex flex-col h-full group"
              >
                {/* Image Frame */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
                  <Image
                    src={homestay.image}
                    alt={homestay.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-black/30" />

                  {/* Top Badge */}
                  <span
                    className={`absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-lg ${homestay.badgeColor}`}
                  >
                    {homestay.badge}
                  </span>

                  {/* Location Tag */}
                  <div className="absolute bottom-3 left-4 z-10 flex items-center gap-1.5 text-xs text-gray-200 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <MapPin className="w-3.5 h-3.5 text-[#e5c384]" />
                    <span>{homestay.location}</span>
                  </div>
                </div>

                {/* Content Box */}
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-serif text-2xl font-bold text-white group-hover:text-[#e5c384] transition-colors">
                        {homestay.name}
                      </h3>
                      <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                        {homestay.roomCountText}
                      </span>
                    </div>

                    <p className="text-xs text-[#e5c384] font-medium mb-3">
                      {homestay.tagline}
                    </p>

                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-4 font-light">
                      {homestay.description}
                    </p>

                    {/* Placeholder Warning Banner if applicable */}
                    {homestay.isPlaceholder && (
                      <div className="mb-4 p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span>Owner is updating photos & full narrative soon.</span>
                      </div>
                    )}

                    {/* Key Amenities */}
                    <ul className="space-y-1.5 mb-6">
                      {homestay.amenities.map((amenity, aIdx) => (
                        <li key={aIdx} className="text-xs text-gray-300 flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#e5c384] flex-shrink-0" />
                          <span className="truncate">{amenity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pricing & CTA */}
                  <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                        Starting Rate
                      </span>
                      <div className="text-right">
                        <span className="font-serif text-xl font-bold text-white">
                          ₹{homestay.startingPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-gray-400 font-light"> / night</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <Link
                        href={`/homestays/${homestay.slug}`}
                        className="py-2.5 px-3 rounded-xl text-center text-xs font-semibold uppercase tracking-wider text-white bg-white/5 hover:bg-white/15 border border-white/15 hover:border-[#c5a059] transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => onOpenModal && onOpenModal({ propertyId: homestay.id })}
                        className="py-2.5 px-3 rounded-xl text-center text-xs font-semibold uppercase tracking-wider text-[#070c1b] bg-gradient-to-r from-[#c5a059] to-[#e5c384] hover:shadow-lg hover:shadow-[#c5a059]/25 transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Reserve</span>
                      </button>
                    </div>
                  </div>
                </div>
              </Tilt3DCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
