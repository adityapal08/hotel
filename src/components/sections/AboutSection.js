'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Bed, Wind, Waves, UtensilsCrossed, Sparkles, Check, ArrowRight } from 'lucide-react';
import Tilt3DCard from '@/components/ui/Tilt3DCard';
import MagneticButton from '@/components/ui/MagneticButton';

export default function AboutSection({ onOpenModal }) {
  const stats = [
    { number: '4', label: 'Spacious Beds', sub: 'Premium mattresses & fresh linens', icon: Bed },
    { number: '3', label: 'AC Bedrooms', sub: 'Individual climate control', icon: Wind },
    { number: '1', label: 'Private Swimming Pool', sub: 'With kids pool attached', icon: Waves },
    { number: '1', label: 'Functional Kitchen', sub: 'Microwave, fridge & utensils', icon: UtensilsCrossed },
  ];

  const estateFeatures = [
    'Private Swimming Pool with attached kids pool',
    'Minimalistic brand new 3BHK individual villa',
    'Located in tranquil Moratandi - Pondicherry',
    'Eco-friendly solar water heater system',
    'Spacious secure on-site car parking',
    'Dedicated on-site caretaker for assistance',
  ];

  return (
    <section id="about" className="py-24 sm:py-36 bg-[#f7f4ef] text-[#1a202c] relative overflow-hidden">
      {/* Decorative ambient subtle lines & glows */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-[#c5a059]/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-40 w-96 h-96 bg-[#c5a059]/12 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-3"
          >
            <span className="w-8 h-px bg-[#c5a059]" />
            <span className="text-xs uppercase tracking-[0.28em] text-[#9e7d3b] font-bold">
              A Few Words About House
            </span>
            <span className="w-8 h-px bg-[#c5a059]" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0b132b] uppercase"
          >
            RED ROOTS <span className="italic font-normal text-[#9e7d3b]">VILLA</span>
          </motion.h2>
          <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[#c5a059] to-transparent mx-auto mt-4" />
        </div>

        {/* 2-Column Showcase with 3D Tilt Card and Layered Images */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center mb-24 sm:mb-32">
          {/* Left Column: 3D Tilt Card Composition */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2, margin: '-20px' }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 relative flex justify-center lg:justify-start"
          >
            <Tilt3DCard
              maxRotation={10}
              className="relative w-full max-w-[460px] aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white"
            >
              <Image
                src="/images/vanity-mirror.jpg"
                alt="Minimalist Vanity and Oval LED Mirror at Red Roots Villa"
                fill
                sizes="(max-width: 1024px) 100vw, 460px"
                className="object-cover"
              />
              <div className="absolute inset-5 border-2 border-white/75 rounded-[2rem] pointer-events-none" />

              {/* Floating Gold Pill Badge */}
              <div className="absolute top-6 left-6 z-20 bg-[#0b132b]/90 backdrop-blur-md px-4 py-2 rounded-full border border-[#c5a059]/40 text-white text-xs font-semibold tracking-wider flex items-center gap-2 shadow-xl">
                <Sparkles className="w-3.5 h-3.5 text-[#e5c384]" />
                <span>Private 3BHK Sanctuary</span>
              </div>
            </Tilt3DCard>

            {/* Overlapping Secondary Image with Parallax Floating Effect */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              whileHover={{ scale: 1.05, y: -4 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-6 -right-2 sm:-bottom-8 sm:-right-6 lg:-right-8 w-48 sm:w-64 lg:w-72 aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.35)] border-3 sm:border-4 border-white z-20 cursor-pointer"
            >
              <Image
                src="/images/gallery-pool.jpg"
                alt="Private Swimming Pool and Sun Terrace at Red Roots Villa"
                fill
                sizes="(max-width: 640px) 192px, 288px"
                className="object-cover transition-transform duration-700 hover:scale-108"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070c1b]/70 via-transparent to-transparent flex items-end p-3.5 sm:p-4">
                <span className="text-[10px] sm:text-[11px] font-bold text-white uppercase tracking-wider drop-shadow-md">
                  Private Pool & Terrace
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Narrative Storytelling */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.2, margin: '-20px' }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <h3 className="font-serif text-2xl sm:text-4xl font-semibold text-[#0b132b] mb-6 leading-snug">
              Your Perfect Getaway From Hectic Corporate Lifestyle.
            </h3>

            <p className="text-[#4a5568] text-sm sm:text-base leading-relaxed mb-5 font-light">
              Escape to our brand-new, minimalist 3BHK individual villa nestled in Moratandi - Pondicherry.
              Experience supreme comfort, unhurried convenience, and deep tranquility with all the modern
              amenities you need for an unforgettable stay.
            </p>

            <p className="text-[#4a5568] text-sm sm:text-base leading-relaxed mb-9 font-medium text-[#2d3748]">
              This is a private swimming pool villa featuring 3BHK air-conditioned rooms, a fully functional
              kitchen where cooking is allowed, solar water heating, and generous secure car parking.
            </p>

            {/* Feature Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-10">
              {estateFeatures.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm font-medium text-[#2d3748]">
                  <span className="w-5 h-5 rounded-full bg-[#c5a059]/15 text-[#9e7d3b] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-5 flex-wrap">
              <MagneticButton
                onClick={onOpenModal}
                className="px-8 py-4 text-xs sm:text-sm"
              >
                <span>Book Your Stay</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </MagneticButton>

              <a
                href="#suites"
                className="text-xs sm:text-sm font-bold uppercase tracking-[0.18em] text-[#0b132b] hover:text-[#9e7d3b] transition-colors py-4 px-2"
              >
                View Suites →
              </a>
            </div>
          </motion.div>
        </div>

        {/* 4 Luxury Interactive 3D Stats Cards with Staggered Scroll Reveal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.15, margin: '-20px' }}
                transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <Tilt3DCard
                  scaleOnHover={1.04}
                  maxRotation={12}
                  className="bg-white p-8 rounded-3xl border border-[#e6ded1] shadow-md hover:shadow-2xl hover:border-[#c5a059]/50 transition-all text-center flex flex-col items-center group cursor-pointer h-full"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#c5a059]/10 text-[#9e7d3b] flex items-center justify-center mb-5 group-hover:bg-[#c5a059] group-hover:text-white transition-all shadow-sm">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-serif italic text-4xl sm:text-5xl font-bold text-[#0b132b]">
                    {item.number}
                  </span>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.16em] text-[#0b132b] mt-3 mb-1">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-[#718096] font-light">
                    {item.sub}
                  </span>
                </Tilt3DCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
