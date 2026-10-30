'use client';

import { motion } from 'framer-motion';
import { Phone, Mail, MapPin } from 'lucide-react';

export default function TopBar({ onOpenModal }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="bg-[#181c24] text-white text-xs md:text-sm py-2.5 px-4 sm:px-8 border-b border-white/10 z-50 relative"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Left: Request Call Back button */}
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenModal}
            className="flex items-center gap-2 group cursor-pointer"
          >
            <span className="relative flex h-6 w-6 items-center justify-center rounded-md bg-[#df9700] text-[#181c24] shadow-sm overflow-hidden">
              <Phone className="w-3.5 h-3.5 fill-current relative z-10" />
              <span className="absolute inset-0 bg-white/30 animate-pulse" />
            </span>
            <span className="font-serif italic text-gray-200 text-sm md:text-base tracking-wide group-hover:text-[#df9700] transition-colors">
              Request Call Back
            </span>
          </motion.button>

          <span className="hidden lg:flex items-center gap-1.5 text-gray-400 text-xs pl-3 border-l border-white/15">
            <MapPin className="w-3.5 h-3.5 text-[#df9700]" />
            Moratandi, Pondicherry
          </span>
        </div>

        {/* Right: Contact details */}
        <div className="flex items-center gap-5 sm:gap-7 text-gray-300 font-medium text-xs sm:text-sm">
          <a
            href="mailto:redrootsvilla@gmail.com"
            className="flex items-center gap-2 hover:text-[#df9700] transition-colors group"
          >
            <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#df9700]/20 transition-colors">
              <Mail className="w-3.5 h-3.5 text-white group-hover:text-[#df9700] transition-colors" />
            </span>
            <span className="hidden sm:inline">redrootsvilla@gmail.com</span>
          </a>

          <a
            href="tel:+919363432220"
            className="flex items-center gap-2 text-white hover:text-[#df9700] transition-colors group"
          >
            <span className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#df9700]/20 transition-colors">
              <Phone className="w-3.5 h-3.5 fill-white text-white group-hover:text-[#df9700] group-hover:fill-[#df9700] transition-colors" />
            </span>
            <span className="font-semibold tracking-wider text-xs sm:text-sm">
              +91 9363432220
            </span>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
