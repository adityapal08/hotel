'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, CalendarCheck } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';

export default function Navbar({ onOpenModal }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      const sections = ['home', 'about', 'highlights', 'gallery', 'contact'];
      const scrollPosition = window.scrollY + 140;

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

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'HOME', href: '#home', id: 'home' },
    { label: 'ABOUT US', href: '#about', id: 'about' },
    { label: 'GALLERY', href: '#gallery', id: 'gallery' },
    { label: 'CONTACT US', href: '#contact', id: 'contact' },
  ];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`sticky top-0 z-40 transition-all duration-300 w-full ${isScrolled
          ? 'bg-[#0f1624]/92 backdrop-blur-md shadow-xl py-2 border-b border-white/10'
          : 'bg-[#df9700] py-3 shadow-md'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between relative">
        {/* Brand Logo Presentation with 3D Tilt & Specular Shine */}
        <BrandLogo isScrolled={isScrolled} />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-9">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <a
                key={link.id}
                href={link.href}
                className={`relative text-xs lg:text-sm font-bold tracking-widest uppercase transition-colors duration-200 py-1.5 ${isScrolled
                    ? isActive
                      ? 'text-[#df9700]'
                      : 'text-gray-200 hover:text-[#df9700]'
                    : isActive
                      ? 'text-zinc-950 font-extrabold'
                      : 'text-white hover:text-zinc-950'
                  }`}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full ${isScrolled ? 'bg-[#df9700]' : 'bg-zinc-950'
                      }`}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </a>
            );
          })}

          {/* Quick Booking CTA Pill in Header */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenModal}
            className={`hidden lg:flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase shadow-sm transition-all cursor-pointer ${isScrolled
                ? 'bg-gradient-to-r from-[#df9700] to-[#f5b027] text-zinc-950 hover:shadow-lg hover:shadow-[#df9700]/20'
                : 'bg-zinc-950 text-white hover:bg-zinc-900'
              }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            Book Now
          </motion.button>

          {/* Hamburger Icon Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white hover:text-[#df9700] transition-colors p-1 cursor-pointer"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-6 h-6 stroke-[2.5]" />
          </button>
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onOpenModal}
            className="bg-zinc-950 text-white px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase mr-1"
          >
            Book
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-white p-1 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 stroke-[2.5]" />
            ) : (
              <Menu className="w-6 h-6 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>

      {/* Animated Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-[#0f1624] text-white px-6 py-6 border-t border-white/10 shadow-2xl overflow-hidden"
          >
            <nav className="flex flex-col gap-3">
              {navLinks.map((link, idx) => (
                <motion.a
                  key={link.id}
                  href={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm font-bold tracking-widest uppercase py-2.5 border-b border-white/5 hover:text-[#df9700] transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenModal) onOpenModal();
                }}
                className="mt-3 w-full bg-gradient-to-r from-[#df9700] to-[#f5b027] text-zinc-950 font-bold py-3.5 rounded-lg text-sm uppercase tracking-wider shadow-lg"
              >
                Book Your Stay
              </motion.button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
