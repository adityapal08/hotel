'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { ArrowRight, Sparkles, ShieldCheck, MapPin, Compass } from 'lucide-react';
import MagneticButton from '@/components/ui/MagneticButton';

export default function HeroSection({ onOpenModal }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.7], [0, 60]);

  const words = ['Where', 'Serenity', 'Meets', 'Coastal', 'Luxury.'];

  const statsPills = [
    { label: 'Private Swimming Pool', sub: 'With Kids Section' },
    { label: '3BHK Air-Conditioned', sub: 'Designer Suites' },
    { label: 'Gourmet Kitchen', sub: 'Self-Cooking Allowed' },
    { label: '24/7 Caretaker', sub: 'On-Site Concierge' },
  ];

  return (
    <section
      ref={containerRef}
      id="home"
      className="relative w-full min-h-[96vh] flex flex-col justify-between bg-[#070c1b] text-white overflow-hidden"
    >
      {/* Parallax Background Photography Layer with Cinematic Slow-Zoom Reveal */}
      <motion.div
        initial={{ scale: 1.14, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ y: heroY }}
        className="absolute inset-0 z-0 origin-center"
      >
        <Image
          src="/images/hero.jpg"
          alt="Red Roots Villa Luxury Living Space and High Ceiling Chandelier"
          fill
          priority
          loading="eager"
          sizes="100vw"
          className="object-cover object-center brightness-70"
        />

        {/* Cinematic Vignettes and Ambient Lighting */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070c1b] via-[#070c1b]/35 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070c1b]/85 via-transparent to-[#070c1b]/55" />
      </motion.div>

      {/* Ambient Floating Gold Particles / Lighting Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#c5a059]/15 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#e5c384]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Center Content Container */}
      <motion.div
        style={{ opacity: textOpacity, y: textY }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-24 sm:pt-36 pb-12 w-full flex-1 flex flex-col justify-center"
      >
        <div className="max-w-4xl">
          {/* Eyebrow Badge with Clip-in reveal */}
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2.5 px-4 sm:px-5 py-2 rounded-full bg-[#0b132b]/80 border border-[#c5a059]/50 backdrop-blur-xl mb-6 shadow-2xl"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e5c384] animate-spin-slow" />
            <span className="text-xs sm:text-[13px] uppercase tracking-[0.28em] text-[#e5c384] font-bold">
              Private 3BHK Sanctuary • Moratandi - Pondicherry
            </span>
          </motion.div>

          {/* Staggered Animated Words Headline with inline-block for true 3D rising effect */}
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7.5xl font-bold tracking-tight text-white leading-[1.08] mb-6 flex flex-wrap gap-x-4 sm:gap-x-5 py-1">
            {words.map((word, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, y: 45, rotate: 2 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{
                  duration: 0.85,
                  delay: 0.2 + idx * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`inline-block origin-bottom-left ${word === 'Coastal' || word === 'Luxury.'
                    ? 'italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#e5c384] via-[#f7e2b6] to-[#c5a059]'
                    : ''
                  }`}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {/* Narrative Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.65 }}
            className="text-base sm:text-lg lg:text-xl text-gray-200/90 leading-relaxed font-light max-w-2xl mb-10"
          >
            Escape corporate haste to our brand-new, minimalist individual villa in Moratandi.
            Indulge in your private swimming pool, gourmet kitchen freedom, and uncompromised tranquility.
          </motion.p>

          {/* Magnetic CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex items-center gap-4 sm:gap-6 flex-wrap"
          >
            <MagneticButton
              onClick={onOpenModal}
              className="px-8 sm:px-10 py-4 sm:py-4.5 text-xs sm:text-sm shadow-2xl"
            >
              <span>Reserve The Entire Villa</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </MagneticButton>

            <MagneticButton
              variant="outline"
              onClick={() => {
                const el = document.getElementById('about');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 sm:px-8 py-4 sm:py-4.5 text-xs sm:text-sm"
            >
              <Compass className="w-4 h-4 mr-1 text-[#e5c384]" />
              <span>Explore Estate</span>
            </MagneticButton>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating Modern Luxury Highlights & Booking Strip */}
      <div className="relative z-10 w-full border-t border-white/10 bg-[#070c1b]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {statsPills.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.6, delay: 0.1 + idx * 0.08 }}
                className="flex items-center gap-3.5 border-r last:border-r-0 border-white/10 pr-3 sm:pr-4"
              >
                <div className="w-9 h-9 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/30 flex items-center justify-center text-[#e5c384] flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white block truncate">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium block">
                    {item.sub}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
