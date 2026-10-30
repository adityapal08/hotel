'use client';

import { motion } from 'framer-motion';
import {
  Tv,
  Wind,
  Droplets,
  UtensilsCrossed,
  Wifi,
  ShoppingBag,
  ChefHat,
  Waves,
  Sparkles,
  Car,
  ShieldCheck,
  Check,
} from 'lucide-react';
import Tilt3DCard from '@/components/ui/Tilt3DCard';

export default function HighlightsSection() {
  const experiences = [
    {
      title: 'Fabulous View & Entertainment',
      category: 'In-Room Luxury',
      icon: Tv,
      items: [
        'Smart TV for endless cinematic entertainment',
        'Fully Air-Conditioned bedrooms throughout',
        'Hot water in every lavatory via solar heater',
        'WiFi connectivity with dedicated workspace in every room',
      ],
    },
    {
      title: 'Culinary Freedom',
      category: 'Self-Cooking & Dining',
      icon: ChefHat,
      items: [
        'Fully equipped functional kitchen ready for cooking',
        'Plates, spoons, microwave, refrigerator & cookware',
        'Enjoy home-cooked family meals in your own space',
        'Direct doorstep food delivery through Swiggy',
      ],
    },
    {
      title: 'Private Pool & Leisure',
      category: 'Wellness & Relaxation',
      icon: Waves,
      items: [
        'Private Swimming Pool exclusively for your party',
        'Attached safe shallow pool for children',
        'Fresh premium bedsheets, pillows & towels provided',
        'Quiet neighbourhood with zero city disturbance',
      ],
    },
    {
      title: 'Caretaker & Convenience',
      category: 'Hospitality & Care',
      icon: ShieldCheck,
      items: [
        'Friendly on-site caretaker for daily assistance',
        'Spacious, secure private car parking inside property',
        'Eco-friendly solar powered continuous hot water',
        'Peaceful individual private villa compound',
      ],
    },
  ];

  return (
    <section id="experience" className="py-24 sm:py-36 bg-[#f7f4ef] text-[#1a202c] relative overflow-hidden">
      {/* Decorative ambient subtle lines */}
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-[#c5a059]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-3"
          >
            <span className="w-8 h-px bg-[#c5a059]" />
            <span className="text-xs uppercase tracking-[0.28em] text-[#9e7d3b] font-bold">
              Bespoke Amenities
            </span>
            <span className="w-8 h-px bg-[#c5a059]" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0b132b] uppercase"
          >
            HIGHLIGHTS OF YOUR <span className="italic font-normal text-[#9e7d3b]">STAY</span>
          </motion.h2>
          <p className="text-[#4a5568] text-sm sm:text-base mt-4 max-w-xl mx-auto font-light">
            Every feature at Red Roots Villa is designed to offer corporate travelers and families
            the comfort of home with the indulgence of a private boutique resort.
          </p>
        </div>

        {/* 4 Interactive 3D Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
          {experiences.map((exp, idx) => {
            const Icon = exp.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Tilt3DCard
                  maxRotation={6}
                  scaleOnHover={1.02}
                  className="bg-white p-8 sm:p-10 rounded-[2rem] border border-[#e6ded1] shadow-md hover:shadow-2xl hover:border-[#c5a059]/50 transition-all flex flex-col justify-between h-full group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-7">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9e7d3b] bg-[#c5a059]/12 px-3.5 py-1.5 rounded-full border border-[#c5a059]/20">
                        {exp.category}
                      </span>
                      <div className="w-13 h-13 rounded-2xl bg-[#070c1b] text-[#e5c384] flex items-center justify-center group-hover:bg-[#c5a059] group-hover:text-[#070c1b] transition-all shadow-md">
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>

                    <h3 className="font-serif text-2xl font-bold text-[#0b132b] mb-5">
                      {exp.title}
                    </h3>

                    <ul className="space-y-3.5">
                      {exp.items.map((item, iIdx) => (
                        <li key={iIdx} className="flex items-start gap-3 text-xs sm:text-sm text-[#4a5568] leading-relaxed">
                          <span className="w-5 h-5 rounded-full bg-[#c5a059]/20 text-[#9e7d3b] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Tilt3DCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
