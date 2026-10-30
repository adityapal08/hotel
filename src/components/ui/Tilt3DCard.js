'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useSpring, useMotionValue, useMotionTemplate, useReducedMotion } from 'framer-motion';

export default function Tilt3DCard({
  children,
  className = '',
  maxRotation = 12,
  glare = true,
  scaleOnHover = 1.02,
  ...props
}) {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);

  const springConfig = { damping: 20, stiffness: 220, mass: 0.1 };
  const smoothRotateX = useSpring(rotateX, springConfig);
  const smoothRotateY = useSpring(rotateY, springConfig);

  const glareBackground = useMotionTemplate`radial-gradient(circle 350px at ${glareX}% ${glareY}%, rgba(255,255,255,0.45), transparent 80%)`;

  const handleMouseMove = (e) => {
    if (prefersReducedMotion || !cardRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();

    const normalizedX = (clientX - left) / width - 0.5;
    const normalizedY = (clientY - top) / height - 0.5;

    rotateX.set(-normalizedY * maxRotation);
    rotateY.set(normalizedX * maxRotation);

    glareX.set(((clientX - left) / width) * 100);
    glareY.set(((clientY - top) / height) * 100);
  };

  const resetCard = () => {
    rotateX.set(0);
    rotateY.set(0);
    setIsHovered(false);
  };

  useEffect(() => {
    return () => {
      resetCard();
    };
  }, []);

  return (
    <div style={{ perspective: 1200 }} className={`relative w-full ${className}`}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={resetCard}
        onPointerLeave={resetCard}
        onPointerCancel={resetCard}
        onTouchEnd={resetCard}
        onBlur={resetCard}
        style={{
          transformStyle: 'preserve-3d',
          rotateX: prefersReducedMotion ? 0 : smoothRotateX,
          rotateY: prefersReducedMotion ? 0 : smoothRotateY,
        }}
        whileHover={prefersReducedMotion ? {} : { scale: scaleOnHover }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="relative w-full h-full rounded-[inherit] overflow-hidden"
        {...props}
      >
        {/* Dynamic Glare Sheen Layer */}
        {glare && !prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 z-30 pointer-events-none rounded-[inherit] overflow-hidden transition-opacity duration-300"
            style={{
              opacity: isHovered ? 0.4 : 0,
              background: glareBackground,
            }}
          />
        )}

        {children}
      </motion.div>
    </div>
  );
}
