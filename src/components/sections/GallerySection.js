'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export default function GallerySection() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeImageIndex, setActiveImageIndex] = useState(null);

  const categories = [
    { id: 'all', label: 'All Photos' },
    { id: 'living', label: 'Living & Lounge' },
    { id: 'bedroom', label: 'Bedrooms' },
    { id: 'pool', label: 'Pool & Kitchen' },
  ];

  const galleryItems = [
    {
      src: '/images/gallery-hallway.jpg',
      alt: 'Red Roots Villa Upper Floor Corridor with Wooden Bench and Staircase',
      title: 'Upper Corridor & Landing',
      category: 'living',
      badge: 'First Floor',
    },
    {
      src: '/images/gallery-bedroom.jpg',
      alt: 'Luxury Bedroom with Magenta Bedspread, Teal Drapes and Landscape Artwork',
      title: 'Deluxe Air-Conditioned Suite',
      category: 'bedroom',
      badge: 'King Suite',
    },
    {
      src: '/images/gallery-living.jpg',
      alt: 'Spacious Two-Story Living Room with TV and Plush Blue Cushions Couch',
      title: 'High-Ceiling Living Hall',
      category: 'living',
      badge: 'Main Hall',
    },
    {
      src: '/images/gallery-pool.jpg',
      alt: 'Private Swimming Pool and Sun Loungers at Red Roots Villa',
      title: 'Private Swimming Pool',
      category: 'pool',
      badge: 'Outdoor Oasis',
    },
    {
      src: '/images/bedroom-olive.jpg',
      alt: 'Master Bedroom with Olive Green Quilt and Teak Wardrobe',
      title: 'Master Bedroom Suite',
      category: 'bedroom',
      badge: 'En-Suite',
    },
    {
      src: '/images/gallery-kitchen.jpg',
      alt: 'Fully Functional Kitchen with Microwave, Refrigerator and Dining Counter',
      title: 'Fully Functional Kitchen',
      category: 'pool',
      badge: 'Self-Cooking',
    },
  ];

  const filteredItems =
    selectedCategory === 'all'
      ? galleryItems
      : galleryItems.filter((item) => item.category === selectedCategory);

  const handleNextImage = (e) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % filteredItems.length);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
  };

  return (
    <section id="gallery" className="w-full bg-[#faf8f5] py-20 sm:py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[#df9700]" />
            <span className="font-serif italic text-zinc-500 text-sm md:text-base tracking-wide">
              Tour Of Our Villa
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight uppercase">
            CHECKOUT VILLA <span className="text-[#df9700]">PHOTOS</span>
          </h2>
          <div className="w-16 h-[3px] bg-gradient-to-r from-[#df9700] to-[#f5b027] mx-auto mt-3 rounded-full" />
        </motion.div>

        {/* Category Filter Pills with Smooth Sliding Capsule */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap mb-10 sm:mb-12">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-colors duration-200 cursor-pointer select-none ${
                  isSelected
                    ? 'text-[#070c1b] font-extrabold'
                    : 'text-zinc-700 hover:text-zinc-950 border border-zinc-200 bg-white hover:border-[#df9700]/50'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="galleryFilterActive"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    className="absolute inset-0 bg-gradient-to-r from-[#df9700] via-[#f5b027] to-[#df9700] rounded-full shadow-md shadow-[#df9700]/30 -z-0"
                  />
                )}
                <span className="relative z-10">{cat.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Animated Photo Grid */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <AnimatePresence>
            {filteredItems.map((item, idx) => (
              <motion.div
                key={item.src}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                onClick={() => setActiveImageIndex(idx)}
                className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-md cursor-pointer bg-zinc-200 border border-zinc-200/80 hover:shadow-2xl hover:border-[#df9700]/50 transition-all duration-300"
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-108"
                />

                {/* Badge top-left */}
                <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white tracking-wider uppercase border border-white/10">
                  {item.badge}
                </div>

                {/* Gradient and Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                  <div className="flex items-center justify-between text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <div>
                      <h4 className="text-base font-bold drop-shadow-md">{item.title}</h4>
                      <p className="text-xs text-[#df9700] font-medium">Click to expand</p>
                    </div>
                    <span className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg">
                      <ZoomIn className="w-5 h-5 text-[#df9700]" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Lightbox Modal with Next/Prev Navigation */}
      <AnimatePresence>
        {activeImageIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={() => setActiveImageIndex(null)}
          >
            {/* Close Button */}
            <button
              onClick={() => setActiveImageIndex(null)}
              className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors z-20"
              aria-label="Close preview"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Previous Button */}
            <button
              onClick={handlePrevImage}
              className="absolute left-4 sm:left-8 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-20"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Next Button */}
            <button
              onClick={handleNextImage}
              className="absolute right-4 sm:right-8 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-20"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Image Container */}
            <motion.div
              key={activeImageIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="relative max-w-5xl w-full aspect-[4/3] max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl border border-white/15"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={filteredItems[activeImageIndex].src}
                alt={filteredItems[activeImageIndex].alt}
                fill
                className="object-contain"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white text-center">
                <h4 className="text-lg font-bold">{filteredItems[activeImageIndex].title}</h4>
                <p className="text-xs text-gray-300 mt-1">
                  {activeImageIndex + 1} of {filteredItems.length}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
