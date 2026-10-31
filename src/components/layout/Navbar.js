'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, CalendarCheck, Phone } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';

/**
 * Premium Boutique Hotel Navbar:
 * - Palette: Deep Burgundy (#762F3D), Dark Charcoal (#171719), Warm Ivory (#F7F3ED), White (#FFFFFF).
 * - Architectural, sophisticated layout with generous spacing and balanced typography.
 * - Restrained animations: subtle animated Burgundy underlines and fluid sticky scroll transition.
 * - Prominent Deep Burgundy "Reserve Villa" CTA button.
 */
export default function Navbar({ onOpenModal }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [hoveredLink, setHoveredLink] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      setIsScrolled(scrollY > 25);

      // Dynamic active section detection based on viewport position
      const sections = ['home', 'homestays', 'about', 'gallery', 'contact'];
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
    { label: 'Home', href: '/#home', id: 'home', num: '01' },
    { label: 'Homestays', href: '/#homestays', id: 'homestays', num: '02' },
    { label: 'About Us', href: '/#about', id: 'about', num: '03' },
    { label: 'Gallery', href: '/#gallery', id: 'gallery', num: '04' },
    { label: 'Contact', href: '/#contact', id: 'contact', num: '05' },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 w-full transition-all duration-300 ease-out ${
        isScrolled
          ? 'bg-[#171719]/96 backdrop-blur-md py-2.5 sm:py-3 border-b border-[#762F3D]/25 shadow-[0_4px_24px_rgba(0,0,0,0.35)]'
          : 'bg-[#171719]/85 backdrop-blur-md py-3.5 sm:py-4 border-b border-[#F7F3ED]/10'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between relative">
        {/* Left: Brand Logo Presentation */}
        <div className="flex items-center flex-shrink-0">
          <BrandLogo isScrolled={isScrolled} />
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-6 lg:gap-8 xl:gap-10"
          onMouseLeave={() => setHoveredLink(null)}
        >
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            const isHovered = hoveredLink === link.id;

            return (
              <a
                key={link.id}
                href={link.href}
                onMouseEnter={() => setHoveredLink(link.id)}
                className={`relative py-1 text-[12px] lg:text-[13px] font-medium tracking-[0.18em] uppercase transition-colors duration-200 select-none ${
                  isActive
                    ? 'text-white font-semibold'
                    : isHovered
                    ? 'text-white'
                    : 'text-[#F7F3ED]/75 hover:text-white'
                }`}
              >
                <span>{link.label}</span>

                {/* Subtle Animated Deep Burgundy Underline */}
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-[1.5px] bg-[#762F3D] rounded-full pointer-events-none"
                  initial={false}
                  animate={{
                    scaleX: isActive || isHovered ? 1 : 0,
                    opacity: isActive || isHovered ? 1 : 0,
                  }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  style={{ originX: 0.5 }}
                />
              </a>
            );
          })}
        </nav>

        {/* Right: Reserve Villa Button (Deep Burgundy with White Text) */}
        <div className="hidden md:flex items-center">
          <button
            type="button"
            onClick={onOpenModal}
            className="px-5 py-2.5 sm:px-6 sm:py-2.5 rounded-full bg-[#762F3D] text-white text-[11px] sm:text-xs font-semibold tracking-[0.16em] uppercase border border-[#762F3D] shadow-[0_2px_12px_rgba(118,47,61,0.28)] hover:bg-[#5F2530] hover:border-[#5F2530] hover:shadow-[0_4px_18px_rgba(118,47,61,0.42)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer flex items-center gap-2"
          >
            <CalendarCheck className="w-3.5 h-3.5 stroke-[2.2] text-white" />
            <span>Reserve Villa</span>
          </button>
        </div>

        {/* Mobile Header Controls (< md) */}
        <div className="flex md:hidden items-center gap-2">
          {/* Quick Mobile Reserve Trigger */}
          <button
            type="button"
            onClick={onOpenModal}
            className="px-3.5 py-1.5 rounded-full bg-[#762F3D] text-white text-[11px] font-semibold tracking-wider uppercase shadow-sm flex items-center gap-1.5 hover:bg-[#5F2530] transition-colors"
          >
            <CalendarCheck className="w-3 h-3 stroke-[2.2]" />
            <span>Reserve</span>
          </button>

          {/* Minimalist Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 rounded-full bg-[#171719] border border-[#F7F3ED]/20 flex items-center justify-center text-[#F7F3ED] hover:text-white hover:border-[#F7F3ED]/40 transition-colors focus:outline-none"
            aria-label="Toggle navigation drawer"
          >
            <AnimatePresence mode="wait" initial={false}>
              {mobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Menu className="w-4 h-4 stroke-[2]" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Refined Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden bg-[#171719]/98 backdrop-blur-xl border-t border-[#762F3D]/30 shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-5 space-y-4">
              <div className="pb-2.5 border-b border-[#F7F3ED]/10 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F7F3ED]/60">
                <span>Red Roots Villa Sanctuary • Pondicherry</span>
              </div>

              {/* Vertical Navigation Links */}
              <nav className="flex flex-col space-y-1">
                {navLinks.map((link) => {
                  const isActive = activeSection === link.id;

                  return (
                    <a
                      key={link.id}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between py-3 px-2 rounded-lg transition-colors border-b border-[#F7F3ED]/5 ${
                        isActive
                          ? 'text-white font-semibold border-l-2 border-l-[#762F3D] pl-3 bg-white/[0.03]'
                          : 'text-[#F7F3ED]/80 hover:text-white hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className="text-xs font-medium tracking-[0.18em] uppercase">
                        {link.label}
                      </span>
                      <span className="font-mono text-[10px] text-[#F7F3ED]/40">
                        {link.num}
                      </span>
                    </a>
                  );
                })}
              </nav>

              {/* Mobile Drawer Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onOpenModal) onOpenModal();
                  }}
                  className="w-full py-3.5 rounded-full bg-[#762F3D] hover:bg-[#5F2530] text-white font-semibold text-xs uppercase tracking-[0.18em] shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CalendarCheck className="w-4 h-4 stroke-[2.2]" />
                  <span>Reserve The Villa</span>
                </button>

                <a
                  href="tel:+919363432220"
                  className="w-full py-2.5 rounded-full border border-[#F7F3ED]/20 bg-white/[0.03] text-[#F7F3ED]/80 hover:text-white text-xs font-medium tracking-wider flex items-center justify-center gap-2 hover:border-[#F7F3ED]/40 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#762F3D]" />
                  <span>Concierge: +91 9363432220</span>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
