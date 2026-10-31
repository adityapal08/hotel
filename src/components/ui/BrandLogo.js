'use client';

import Image from 'next/image';
import Link from 'next/link';

/**
 * Premium Boutique Hotel BrandLogo:
 * - 100% untouched original logo asset (/images/logo.jpg).
 * - Sophisticated, architectural framing matching the Warm Ivory, Dark Charcoal, and Deep Burgundy palette.
 * - Perfectly proportioned for balanced header placement without distracting particles or neon glows.
 */
export default function BrandLogo({
  isScrolled = false,
  showLockupText = true,
  className = '',
  size = 'default', // 'default' | 'compact' | 'footer'
}) {
  const getDimensions = () => {
    if (size === 'footer') {
      return {
        outer: 'w-20 h-20 sm:w-22 sm:h-22',
        inner: 'w-16 h-16 sm:w-18 sm:h-18',
        padding: 'p-1',
      };
    }
    if (isScrolled) {
      return {
        outer: 'w-10 h-10 sm:w-11 sm:h-11',
        inner: 'w-8 h-8 sm:w-8.5 sm:h-8.5',
        padding: 'p-0.5',
      };
    }
    return {
      outer: 'w-11 h-11 sm:w-12 sm:h-12',
      inner: 'w-8.5 h-8.5 sm:w-9.5 sm:h-9.5',
      padding: 'p-0.5',
    };
  };

  const { outer, inner, padding } = getDimensions();

  return (
    <Link
      href="/#home"
      aria-label="Red Roots Villa Home"
      className={`group relative inline-flex items-center gap-3 select-none focus:outline-none transition-opacity duration-200 hover:opacity-95 ${className}`}
    >
      {/* Refined Circular Medallion Frame */}
      <div
        className={`${outer} relative rounded-full bg-[#171719] border border-[#F7F3ED]/20 ring-1 ring-[#762F3D]/30 shadow-sm flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:border-[#762F3D]/50 group-hover:ring-[#762F3D]/60`}
      >
        {/* Crisp Pure White Inner Canvas for Pristine Logo Visibility */}
        <div
          className={`w-full h-full rounded-full bg-white relative overflow-hidden flex items-center justify-center ${padding}`}
        >
          {/* 100% UNTOUCHED ORIGINAL LOGO IMAGE */}
          <div className={`relative ${inner} transition-transform duration-300 group-hover:scale-105`}>
            <Image
              src="/images/logo.jpg"
              alt="Red Roots Villa Logo"
              fill
              sizes="(max-width: 640px) 48px, (max-width: 768px) 56px, 80px"
              className="object-contain pointer-events-none select-none"
              priority
            />
          </div>
        </div>
      </div>

      {/* Typographic Identity Lockup */}
      {showLockupText && (
        <div className="flex flex-col text-left transition-colors duration-200">
          <div className="flex items-baseline leading-none">
            <span className="font-serif text-[15px] sm:text-base font-bold tracking-[0.08em] uppercase text-[#F7F3ED]">
              RED ROOTS
            </span>
            <span className="font-serif text-[15px] sm:text-base font-normal italic text-[#762F3D] ml-1.5">
              VILLA
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[9px] sm:text-[10px] tracking-[0.22em] uppercase font-medium text-[#F7F3ED]/65">
              Moratandi • Pondicherry
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}
