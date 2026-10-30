'use client';

import { useRef, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

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

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);

  const springConfig = { damping: 20, stiffness: 200, mass: 0.1 };
  const smoothRotateX = useSpring(rotateX, springConfig);
  const smoothRotateY = useSpring(rotateY, springConfig);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();

    const normalizedX = (clientX - left) / width - 0.5;
    const normalizedY = (clientY - top) / height - 0.5;

    rotateX.set(-normalizedY * maxRotation);
    rotateY.set(normalizedX * maxRotation);

    glareX.set(((clientX - left) / width) * 100);
    glareY.set(((clientY - top) / height) * 100);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        rotateX: smoothRotateX,
        rotateY: smoothRotateY,
      }}
      animate={{ scale: isHovered ? scaleOnHover : 1 }}
      transition={{ duration: 0.3 }}
      className={`relative perspective-1000 ${className}`}
      {...props}
    >
      {/* Glare Sheen Layer */}
      {glare && (
        <motion.div
          className="absolute inset-0 z-30 pointer-events-none rounded-[inherit] overflow-hidden transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.35 : 0,
            background: `radial-gradient(circle 320px at ${glareX.get()}% ${glareY.get()}%, rgba(255,255,255,0.7), transparent 80%)`,
          }}
        />
      )}

      {children}
    </motion.div>
  );
}
