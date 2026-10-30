'use client';

import { motion } from 'framer-motion';
import { Quote, Sparkles, MessageCircle } from 'lucide-react';
import MagneticButton from '@/components/ui/MagneticButton';

export default function LuxuryVillaSection({ onOpenModal }) {
  return (
    <section id="luxury" className="w-full bg-[#f6f3ed] py-18 sm:py-24 relative overflow-hidden">
      {/* Decorative ambient subtle lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#df9700_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2, margin: '-20px' }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center bg-white/70 backdrop-blur-md p-8 sm:p-12 lg:p-14 rounded-3xl border border-[#df9700]/25 shadow-xl"
        >
          {/* Left Column: Heading, Subtitle & Action */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#df9700]" />
              <span className="font-serif italic text-zinc-500 text-sm md:text-base tracking-wide">
                A Few Words About House
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight uppercase">
              LUXURY-<span className="text-[#df9700]">VILLA</span>
            </h2>

            <div className="w-16 h-[3px] bg-gradient-to-r from-[#df9700] to-[#f5b027] mt-3 mb-8 rounded-full" />

            <div className="flex items-center gap-3.5 flex-wrap">
              <MagneticButton
                onClick={onOpenModal}
                className="px-8 py-3.5 text-sm md:text-base font-extrabold shadow-lg"
              >
                <span>Book Now</span>
              </MagneticButton>

              {/* WhatsApp Caretaker Button (Temporarily disabled)
              <a
                href="https://wa.me/919363432220?text=Hi%20Red%20Roots%20Villa,%20I%20would%20like%20to%20inquire%20about%20booking%20the%20villa."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-300 text-zinc-800 text-sm font-semibold hover:border-[#df9700] hover:text-[#df9700] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Caretaker</span>
              </a>
              */}
            </div>
          </div>

          {/* Right Column: Narrative Italic Paragraph with Quote styling */}
          <div className="lg:col-span-7 relative pl-0 lg:pl-6">
            <Quote className="w-10 h-10 text-[#df9700]/30 mb-3" />
            <p className="font-serif italic text-zinc-700 text-base sm:text-lg lg:text-xl leading-relaxed">
              Whether you&apos;re lounging by the private swimming pool, enjoying a home-cooked meal,
              or simply relaxing in one of our spacious rooms, Red Root Villa offers a peaceful retreat
              from the hustle and bustle of daily life. Book your stay today and experience the perfect
              blend of nature, comfort, and modern amenities at Red Root Villa!
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#df9700]">
              <span>— Experience Moratandi, Pondicherry</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
