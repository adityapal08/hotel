'use client';

import { useRef, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export default function MagneticButton({
  children,
  className = '',
  onClick,
  variant = 'primary', // 'primary', 'gold', 'outline', 'dark'
  strength = 0.35,
  ...props
}) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 180, mass: 0.1 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const distanceX = (clientX - centerX) * strength;
    const distanceY = (clientY - centerY) * strength;
    x.set(distanceX);
    y.set(distanceY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  const baseStyles =
    'relative inline-flex items-center justify-center font-bold tracking-[0.18em] uppercase text-xs sm:text-sm rounded-full overflow-hidden transition-all duration-300 cursor-pointer select-none';

  const variants = {
    primary:
      'bg-gradient-to-r from-[#c5a059] via-[#e5c384] to-[#c5a059] text-[#0b132b] shadow-xl shadow-[#c5a059]/25 hover:shadow-2xl hover:shadow-[#c5a059]/40 border border-[#e5c384]',
    outline:
      'border-2 border-[#c5a059]/60 text-white hover:text-[#0b132b] hover:bg-[#c5a059] backdrop-blur-md',
    dark:
      'bg-[#0b132b] text-[#e5c384] border border-[#c5a059]/40 shadow-xl hover:border-[#c5a059]',
    goldGlow:
      'bg-[#0b132b] text-white border-2 border-[#c5a059] shadow-[0_0_25px_rgba(197,160,89,0.35)] hover:shadow-[0_0_40px_rgba(197,160,89,0.6)]',
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ x: smoothX, y: smoothY }}
      whileTap={{ scale: 0.94 }}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {/* Subtle shine ray that sweeps on hover */}
      <motion.span
        initial={{ x: '-100%' }}
        animate={{ x: isHovered ? '200%' : '-100%' }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 pointer-events-none"
      />

      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
