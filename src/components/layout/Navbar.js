'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, CalendarCheck, Phone, Sparkles } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import MagneticButton from '@/components/ui/MagneticButton';

export default function Navbar({ onOpenModal }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [hoveredLink, setHoveredLink] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      // Smooth threshold for sticky transition
      if (scrollY > 25) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // Dynamic active section detection based on viewport position
      const sections = ['home', 'about', 'gallery', 'contact'];
      const scrollPosition = scrollY + 160;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'HOME', href: '#home', id: 'home', num: '01' },
    { label: 'ABOUT US', href: '#about', id: 'about', num: '02' },
    { label: 'GALLERY', href: '#gallery', id: 'gallery', num: '03' },
    { label: 'CONTACT US', href: '#contact', id: 'contact', num: '04' },
  ];

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-50 w-full transition-all duration-500 ${
        isScrolled
          ? 'bg-[#070c1b]/95 backdrop-blur-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.6)] py-2 sm:py-2.5 border-b border-[#c5a059]/30'
          : 'bg-gradient-to-b from-[#070c1b]/90 via-[#070c1b]/65 to-transparent backdrop-blur-md py-3.5 sm:py-4 border-b border-white/10'
      }`}
    >
      {/* Subtle top golden light ray */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#e5c384]/70 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between relative">
        {/* Brand Logo Presentation with 3D Tilt, Starlight Particles & Breathing Halo */}
        <div className="flex items-center">
          <BrandLogo isScrolled={isScrolled} />
        </div>

        {/* Desktop Navigation Links with Magnetic Floating Capsule & Radiant Active Glow */}
        <nav
          className="hidden md:flex items-center gap-1 lg:gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_20px_rgba(0,0,0,0.3)]"
          onMouseLeave={() => setHoveredLink(null)}
        >
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            const isHovered = hoveredLink === link.id;

            return (
              <motion.a
                key={link.id}
                href={link.href}
                whileHover={{ y: -1 }}
                onMouseEnter={() => setHoveredLink(link.id)}
                onClick={() => setHoveredLink(null)}
                className={`relative px-4 py-2 text-xs lg:text-[13px] font-semibold tracking-[0.2em] uppercase transition-colors duration-200 rounded-full select-none ${
                  isActive
                    ? 'text-[#e5c384] font-bold'
                    : isHovered
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {/* 1. Floating Frosted Hover Capsule */}
                {isHovered && (
                  <motion.div
                    layoutId="navHoverPill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-white/10 rounded-full border border-[#c5a059]/40 pointer-events-none shadow-[0_0_15px_rgba(197,160,89,0.2)]"
                  />
                )}

                {/* 2. Animated Golden Navigation Underline */}
                <motion.span
                  className="absolute bottom-1 inset-x-3.5 h-[2px] bg-gradient-to-r from-[#c5a059] via-[#e5c384] to-[#c5a059] rounded-full pointer-events-none shadow-[0_0_8px_#e5c384]"
                  initial={false}
                  animate={{
                    scaleX: isHovered || isActive ? 1 : 0,
                    opacity: isHovered || isActive ? 1 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  style={{ originX: 0.5 }}
                />

                <span className="relative z-10 flex items-center gap-1.5">
                  {link.label}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e5c384] animate-pulse inline-block shadow-[0_0_6px_#e5c384]" />
                  )}
                </span>
              </motion.a>
            );
          })}
        </nav>

        {/* Right Action: Magnetic Luxury Reserve CTA Button */}
        <div className="hidden md:flex items-center gap-3">
          <MagneticButton
            onClick={onOpenModal}
            className="px-5 py-2.5 text-xs font-bold tracking-[0.18em] shadow-[0_4px_20px_rgba(197,160,89,0.35)] hover:shadow-[0_6px_28px_rgba(197,160,89,0.6)]"
          >
            <CalendarCheck className="w-3.5 h-3.5 stroke-[2.2] relative z-10 text-[#0b132b]" />
            <span className="relative z-10 font-bold">Reserve Villa</span>
          </MagneticButton>
        </div>

        {/* Mobile Header Controls */}
        <div className="flex md:hidden items-center gap-2.5">
          {/* Compact Mobile Reserve Trigger */}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={onOpenModal}
            className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#c5a059] to-[#e5c384] text-[#070c1b] text-[11px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1.5"
          >
            <CalendarCheck className="w-3 h-3 stroke-[2.2]" />
            <span>Book</span>
          </motion.button>

          {/* Animated Hamburger Icon Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white hover:text-[#e5c384] transition-colors focus:outline-none"
            aria-label="Toggle navigation drawer"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-5 h-5 stroke-[2]" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="w-5 h-5 stroke-[2]" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Cinematic Mobile Curtain Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden bg-[#070c1b]/98 backdrop-blur-2xl border-t border-[#c5a059]/30 shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/10 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e5c384]">
                <Sparkles className="w-3 h-3" />
                <span>Private Villa Sanctuary • Pondicherry</span>
              </div>

              <nav className="flex flex-col space-y-1">
                {navLinks.map((link, idx) => (
                  <motion.a
                    key={link.id}
                    href={link.href}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + idx * 0.06, duration: 0.3 }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 border-b border-white/5 hover:text-[#e5c384] transition-colors group"
                  >
                    <span className="text-sm font-semibold tracking-[0.18em] uppercase text-gray-200 group-hover:text-[#e5c384] transition-colors">
                      {link.label}
                    </span>
                    <span className="font-mono text-xs text-[#c5a059]/60 font-semibold">
                      {link.num}
                    </span>
                  </motion.a>
                ))}
              </nav>

              {/* Mobile Drawer Call & Reserve CTAs */}
              <div className="pt-2 space-y-2.5">
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenModal) onOpenModal();
                  }}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#c5a059] via-[#e5c384] to-[#c5a059] text-[#070c1b] font-bold text-xs uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2"
                >
                  <CalendarCheck className="w-4 h-4 stroke-[2.2]" />
                  <span>Reserve The Villa</span>
                </motion.button>

                <a
                  href="tel:+919363432220"
                  className="w-full py-2.5 rounded-xl border border-white/15 bg-white/5 text-gray-300 text-xs font-semibold tracking-wider flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#e5c384]" />
                  <span>Call Concierge: +91 9363432220</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
