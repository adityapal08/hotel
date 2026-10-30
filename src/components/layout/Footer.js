'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Phone, Mail, MapPin, Sparkles, MessageCircle } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';

export default function Footer() {
  const navLinks = [
    { label: 'HOME', href: '#home' },
    { label: 'ABOUT US', href: '#about' },
    { label: 'GALLERY', href: '#gallery' },
    { label: 'CONTACT US', href: '#contact' },
  ];

  const amenities = [
    'Private Swimming Pool',
    '3BHK AC Bedrooms',
    'Self-Cooking Kitchen',
    'Dedicated Car Parking',
    'High Speed WiFi',
    'On-site Caretaker',
  ];

  return (
    <footer id="contact" className="w-full bg-[#0c1017] text-white pt-16 pb-12 border-t border-white/10 relative overflow-hidden">
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#df9700] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 pb-12 border-b border-white/10">
          {/* Column 1: Brand & Logo */}
          <div className="md:col-span-5 flex flex-col items-start">
            <BrandLogo size="footer" showLockupText={false} className="mb-4" />

            <h3 className="text-lg font-extrabold tracking-wider uppercase text-white">
              RED ROOTS <span className="text-[#df9700]">VILLA</span>
            </h3>
            <p className="text-xs text-gray-400 mt-2 max-w-sm leading-relaxed">
              Your perfect getaway from hectic corporate lifestyle. Experience luxury,
              privacy, and tranquility in our brand-new 3BHK private pool villa.
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-300">
              <MapPin className="w-4 h-4 text-[#df9700] flex-shrink-0" />
              <span>Moratandi - Pondicherry, India</span>
            </div>
          </div>

          {/* Column 2: Highlights / Amenities */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#df9700] mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Key Features
            </h4>
            <ul className="space-y-2">
              {amenities.map((item, idx) => (
                <li key={idx} className="text-xs text-gray-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#df9700]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact & Quick Links */}
          <div className="md:col-span-4 flex flex-col">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#df9700] mb-4">
              Direct Inquiries
            </h4>

            <div className="space-y-3 mb-6">
              <a
                href="tel:+919363432220"
                className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-[#df9700] transition-colors"
              >
                <Phone className="w-4 h-4 text-[#df9700]" />
                <span className="font-semibold">+91 9363432220</span>
              </a>

              <a
                href="mailto:redrootsvilla@gmail.com"
                className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-[#df9700] transition-colors"
              >
                <Mail className="w-4 h-4 text-[#df9700]" />
                <span>redrootsvilla@gmail.com</span>
              </a>

              {/* WhatsApp Caretaker Chat (Temporarily disabled)
              <a
                href="https://wa.me/919363432220?text=Hello,%20I%20would%20like%20to%20know%20availability%20for%20Red%20Roots%20Villa."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat with Caretaker on WhatsApp</span>
              </a>
              */}
            </div>

            {/* Navigation links matching reference */}
            <nav className="flex flex-wrap items-center gap-4 sm:gap-6 mt-auto">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-xs font-bold tracking-wider uppercase text-white hover:text-[#df9700] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom Bar matching Screenshot 5 */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-xs text-gray-400">
            @ 2025.Red Roots Villla. All Rights Reserved.{' '}
            <span className="text-[#4a90e2] hover:underline cursor-pointer">
              Designed By Viswaroop.
            </span>
          </p>

          <p className="text-[11px] text-gray-500">
            Moratandi, Pondicherry • 3BHK Private Pool Villa
          </p>
        </div>
      </div>
    </footer>
  );
}
