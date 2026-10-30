'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  AnimatePresence,
} from 'framer-motion';

/**
 * 4-pointed golden luxury sparkle icon for ambient particles
 */
function SparkleStar({ className = '', style = {} }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
    </svg>
  );
}

// Configured coordinates & delays for 5 refined ambient starlight particles
const PARTICLES = [
  { id: 1, top: '-8%', left: '18%', size: 'w-2 h-2', delay: 0, duration: 3.2 },
  { id: 2, top: '15%', right: '-10%', size: 'w-2.5 h-2.5', delay: 1.1, duration: 4.1 },
  { id: 3, bottom: '-6%', right: '22%', size: 'w-1.5 h-1.5', delay: 2.2, duration: 3.6 },
  { id: 4, bottom: '24%', left: '-8%', size: 'w-2 h-2', delay: 0.6, duration: 3.8 },
  { id: 5, top: '-4%', right: '14%', size: 'w-1.5 h-1.5', delay: 1.7, duration: 4.5 },
];

/**
 * Ultra-Premium, Cinema-Grade BrandLogo component:
 * 1. 100% preservation of original logo asset (/images/logo.jpg).
 * 2. Multi-layered physical 3D tilt + true magnetic cursor tracking.
 * 3. Cinematic multi-stage entrance animation (halo bloom, counter-rotation, light sweep).
 * 4. Realistic dual-band specular light sweep & dynamic cursor glare.
 * 5. Floating starlight sparkles & organic multi-axis levitation.
 * 6. Dual-zone breathing golden halo with deep ambient luster.
 * 7. Seamless sticky scroll scaling & full prefers-reduced-motion accessibility.
 */
export default function BrandLogo({
  isScrolled = false,
  showLockupText = true,
  className = '',
  size = 'default', // 'default' | 'compact' | 'footer'
}) {
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Mark entrance complete after initial animation
  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // 1. Magnetic cursor attraction physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs with luxury weight & dampening
  const springConfig = { damping: 18, stiffness: 220, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Magnetic displacement: physically pulls the medallion towards cursor
  const magneticX = useTransform(smoothX, [-0.5, 0.5], [-10, 10]);
  const magneticY = useTransform(smoothY, [-0.5, 0.5], [-10, 10]);

  // 3D perspective rotation degrees
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-12, 12]);

  // Specular reflection position following mouse
  const glareLeft = useTransform(smoothX, [-0.5, 0.5], ['10%', '90%']);
  const glareTop = useTransform(smoothY, [-0.5, 0.5], ['10%', '90%']);

  const handleMouseMove = (e) => {
    if (shouldReduceMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  // Dimensional sizes based on context
  const getDimensions = () => {
    if (size === 'footer') {
      return {
        outer: 'w-20 h-20 sm:w-24 sm:h-24',
        inner: 'w-16 h-16 sm:w-20 sm:h-20',
      };
    }
    if (isScrolled) {
      return {
        outer: 'w-12 h-12 sm:w-13 sm:h-13',
        inner: 'w-9 h-9 sm:w-10 sm:h-10',
      };
    }
    return {
      outer: 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20',
      inner: 'w-11 h-11 sm:w-13 sm:h-13 md:w-16 md:h-16',
    };
  };

  const { outer, inner } = getDimensions();

  return (
    <Link
      href="#home"
      aria-label="Red Roots Villa Home"
      className={`group relative inline-flex items-center gap-3 sm:gap-3.5 select-none focus:outline-none ${className}`}
    >
      {/* Magnetic & 3D Interactive Medallion Container */}
      <motion.div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, scale: 0.75, rotate: -15, y: -12 }}
        animate={{
          opacity: 1,
          scale: 1,
          rotate: 0,
          y: 0,
        }}
        transition={{
          duration: 0.9,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          perspective: 1000,
          x: shouldReduceMotion ? 0 : magneticX,
          y: shouldReduceMotion ? 0 : magneticY,
        }}
        className="relative flex-shrink-0 cursor-pointer"
      >
        {/* Floating Organic Sine-Wave wrapper (runs continuously after entrance) */}
        <motion.div
          animate={
            shouldReduceMotion || !hasEntered
              ? {}
              : {
                  y: [0, -3.5, 0, 3, 0],
                  x: [0, 2, 0, -2, 0],
                  rotateZ: [0, 0.8, 0, -0.8, 0],
                }
          }
          transition={{
            duration: 6.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            rotateX: shouldReduceMotion ? 0 : rotateX,
            rotateY: shouldReduceMotion ? 0 : rotateY,
            transformStyle: 'preserve-3d',
          }}
          className="relative"
        >
          {/* ================= 1. DUAL-ZONE BREATHING GLOW AURA ================= */}
          {/* Deep ambient radial dispersion */}
          <motion.div
            animate={
              shouldReduceMotion
                ? {}
                : {
                    scale: isHovered ? [1.2, 1.35, 1.25] : [1, 1.18, 1],
                    opacity: isHovered ? 0.85 : [0.35, 0.6, 0.35],
                  }
            }
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -inset-3 sm:-inset-4 rounded-full bg-gradient-to-tr from-[#df9700]/30 via-[#f5b027]/40 to-[#e5a823]/25 blur-xl pointer-events-none"
          />

          {/* Concentrated golden rim halo */}
          <motion.div
            animate={
              shouldReduceMotion
                ? {}
                : {
                    scale: isHovered ? 1.15 : [1, 1.08, 1],
                    opacity: isHovered ? 0.9 : [0.5, 0.75, 0.5],
                  }
            }
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#ffd375]/60 via-[#df9700]/60 to-[#ffd375]/60 blur-sm pointer-events-none"
          />

          {/* ================= 2. AMBIENT FLOATING STARLIGHT PARTICLES ================= */}
          {!shouldReduceMotion &&
            PARTICLES.map((p) => (
              <motion.div
                key={p.id}
                animate={{
                  y: [0, -6, 0],
                  x: [0, 3, 0],
                  scale: isHovered ? [0.8, 1.4, 0.8] : [0.5, 1.1, 0.5],
                  opacity: isHovered ? [0.4, 1, 0.4] : [0.2, 0.8, 0.2],
                  rotate: [0, 90, 180],
                }}
                transition={{
                  duration: isHovered ? p.duration * 0.7 : p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={`absolute ${p.size} text-[#fce8a6] pointer-events-none z-20 drop-shadow-[0_0_6px_rgba(245,176,39,0.9)]`}
                style={{
                  top: p.top,
                  left: p.left,
                  right: p.right,
                  bottom: p.bottom,
                }}
              >
                <SparkleStar className="w-full h-full" />
              </motion.div>
            ))}

          {/* ================= 3. MULTI-TIER METALLIC BEZEL HOUSING ================= */}
          <motion.div
            whileHover={shouldReduceMotion ? {} : { scale: 1.06 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            className={`${outer} relative rounded-full p-[2.5px] sm:p-[3.5px] bg-gradient-to-br from-[#ffe7a9] via-[#df9700] via-45% to-[#7a4e00] shadow-[0_10px_30px_-5px_rgba(223,151,0,0.45),0_6px_16px_rgba(0,0,0,0.3)] transition-all duration-300 group-hover:shadow-[0_16px_40px_-4px_rgba(245,176,39,0.7),0_0_20px_rgba(255,215,115,0.5)] flex items-center justify-center`}
          >
            {/* Fine Concentric Metallic Ring with Specular Edge */}
            <div className="w-full h-full rounded-full p-[2px] bg-gradient-to-tl from-[#5c3c00] via-[#ffd983] via-50% to-[#ffffff] flex items-center justify-center shadow-xs">
              {/* Pristine Pure White Medallion Canvas with Subtle Inner Mint Bevel */}
              <div className="w-full h-full rounded-full bg-white relative overflow-hidden flex items-center justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.1),inset_0_-2px_6px_rgba(223,151,0,0.15)]">
                {/* 100% UNTOUCHED ORIGINAL LOGO IMAGE */}
                <div
                  className={`relative ${inner} transition-transform duration-300 group-hover:scale-106`}
                >
                  <Image
                    src="/images/logo.jpg"
                    alt="Red Roots Villa Logo"
                    fill
                    sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
                    className="object-contain pointer-events-none select-none"
                    priority
                  />
                </div>

                {/* ================= 4. REALISTIC DUAL-LAYER LIGHT SWEEP ================= */}
                {!shouldReduceMotion && (
                  <>
                    {/* Primary Sharp Specular Beam */}
                    <motion.div
                      initial={{ x: '-180%' }}
                      animate={
                        isHovered
                          ? { x: ['180%', '-180%'] }
                          : {
                              x: ['-180%', '220%'],
                            }
                      }
                      transition={{
                        repeat: Infinity,
                        repeatDelay: isHovered ? 1.2 : 5.5,
                        duration: 1.15,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/70 via-50% to-transparent -skew-x-28 pointer-events-none z-10"
                    />

                    {/* Secondary Broad Ambient Lustre Glaze */}
                    <motion.div
                      initial={{ x: '-220%' }}
                      animate={
                        isHovered
                          ? { x: ['220%', '-220%'] }
                          : {
                              x: ['-220%', '260%'],
                            }
                      }
                      transition={{
                        repeat: Infinity,
                        repeatDelay: isHovered ? 1.2 : 5.5,
                        duration: 1.6,
                        delay: 0.1,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-[#ffd773]/35 to-transparent -skew-x-28 pointer-events-none z-10"
                    />
                  </>
                )}

                {/* ================= 5. CURSOR-TRACKING DYNAMIC GLARE ================= */}
                {!shouldReduceMotion && (
                  <motion.div
                    style={{
                      left: glareLeft,
                      top: glareTop,
                    }}
                    className="absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 bg-radial from-white/45 to-transparent rounded-full blur-[3px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                  />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ================= 6. TYPOGRAPHIC IDENTITY LOCKUP ================= */}
      {showLockupText && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col text-left transition-colors duration-200"
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`font-serif text-sm sm:text-base md:text-lg font-bold tracking-tight uppercase leading-none transition-colors duration-300 ${
                isScrolled ? 'text-white' : 'text-zinc-950'
              }`}
            >
              RED ROOTS
            </span>
            <span className="font-serif text-sm sm:text-base md:text-lg font-normal italic text-[#f5b027] leading-none drop-shadow-xs">
              VILLA
            </span>
          </div>

          <div className="hidden min-[420px]:flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#df9700] inline-block animate-pulse shadow-[0_0_6px_#df9700]" />
            <span
              className={`text-[9px] sm:text-[10px] tracking-[0.24em] uppercase font-semibold transition-colors duration-300 ${
                isScrolled ? 'text-gray-300' : 'text-zinc-900'
              }`}
            >
              Moratandi • Pondicherry
            </span>
          </div>
        </motion.div>
      )}
    </Link>
  );
}
