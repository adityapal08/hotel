'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Bed, Users, Wifi, Wind, Tv, ArrowUpRight, Sparkles } from 'lucide-react';
import Tilt3DCard from '@/components/ui/Tilt3DCard';
import MagneticButton from '@/components/ui/MagneticButton';

export default function SuitesSection({ onOpenModal }) {
  const suites = [
    {
      title: 'The Master Suite',
      tag: 'Suite 01 • Ground Level',
      desc: 'Solid teak wooden bed with olive green quilt, floral oil painting, dedicated workspace, and dark mahogany wardrobe.',
      image: '/images/bedroom-olive.jpg',
      specs: ['King Bed', 'AC Climate Control', 'Work Desk', 'En-Suite'],
      capacity: '2–3 Guests',
    },
    {
      title: 'The Garden Deluxe Suite',
      tag: 'Suite 02 • Sunlit View',
      desc: 'Serene mint walls, plush magenta blanket, emerald green curtains with natural garden sunlight and serene river artwork.',
      image: '/images/gallery-bedroom.jpg',
      specs: ['Queen Bed', 'AC Climate Control', 'Garden Window', 'Wardrobe'],
      capacity: '2 Guests',
    },
    {
      title: 'High-Ceiling Grand Living Hall',
      tag: 'Central Lounge • Two Stories',
      desc: 'Magnificent illuminated red chandelier fixture, cascading glowing glass rings, ceiling fan, and cozy entertainment lounge.',
      image: '/images/hero.jpg',
      specs: ['Smart TV', 'Terracotta Lattice', 'Cerulean Couches', 'Dining'],
      capacity: 'All Guests',
    },
  ];

  return (
    <section id="suites" className="py-24 sm:py-36 bg-[#070c1b] text-white relative overflow-hidden">
      {/* Decorative ambient subtle lines & glowing orbs */}
      <div className="absolute top-1/2 left-10 w-96 h-96 bg-[#c5a059]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#e5c384]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#e5c384]" />
            <span className="text-xs uppercase tracking-[0.28em] text-[#e5c384] font-bold">
              Accommodations
            </span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
            Designed for Rest. <span className="italic font-normal text-[#e5c384]">Crafted for Privacy.</span>
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mt-4 max-w-xl mx-auto font-light">
            Each bedroom at Red Roots Villa is fully air-conditioned, equipped with high-speed WiFi,
            fresh linens, and a tranquil atmosphere.
          </p>
        </div>

        {/* 3-Column 3D Tilt Suite Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          {suites.map((suite, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
            >
              <Tilt3DCard
                maxRotation={8}
                scaleOnHover={1.03}
                className="bg-[#0f172a] rounded-[2rem] overflow-hidden border border-[#c5a059]/25 hover:border-[#c5a059]/60 shadow-2xl hover:shadow-[#c5a059]/20 transition-all duration-300 flex flex-col h-full group"
              >
                {/* Image Frame with Zoom Effect */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                  <Image
                    src={suite.image}
                    alt={suite.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-black/30" />

                  {/* Tag Pill */}
                  <span className="absolute top-4 left-4 z-10 bg-[#070c1b]/85 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-[#e5c384] border border-[#c5a059]/40 shadow-lg">
                    {suite.tag}
                  </span>

                  <span className="absolute bottom-4 right-4 z-10 bg-black/70 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-semibold text-gray-200">
                    {suite.capacity}
                  </span>
                </div>

                {/* Content Body */}
                <div className="p-7 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-white mb-3 group-hover:text-[#e5c384] transition-colors">
                      {suite.title}
                    </h3>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed mb-6 font-light">
                      {suite.desc}
                    </p>

                    {/* Specs Pills */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      {suite.specs.map((spec, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Action */}
                  <button
                    onClick={() => {
                      const roomTypeMap = {
                        'The Master Suite': 'The Master King Suite',
                        'The Garden Deluxe Suite': 'The Garden Deluxe Suite',
                        'High-Ceiling Grand Living Hall': 'Entire 3BHK Private Pool Villa',
                      };
                      if (onOpenModal) {
                        onOpenModal({ roomType: roomTypeMap[suite.title] || 'Entire 3BHK Private Pool Villa' });
                      }
                    }}
                    className="w-full py-3.5 px-4 rounded-xl border border-[#c5a059]/50 hover:bg-gradient-to-r hover:from-[#c5a059] hover:to-[#e5c384] hover:text-[#070c1b] text-[#e5c384] text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <span>Reserve Suite</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </Tilt3DCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
