/**
 * Centralized Multi-Property Configuration
 * Single Source of Truth for all homestays, room types, pricing, and capacities.
 *
 * Update property names, room names, prices, and room capacities directly in this file.
 * Both backend database seed scripts and frontend UI components consume this configuration.
 */

export const PROPERTIES_CONFIG = {
  'red-roots-villa': {
    id: 'red-roots-villa',
    slug: 'red-roots-villa',
    name: 'Red Roots Villa',
    codePrefix: 'RRV',
    tagline: 'Rejuvenate Your Inner Peace in Coastal Luxury',
    location: 'Moratandi, Pondicherry',
    description:
      'Minimalistic brand new 3BHK individual villa with private swimming pool in Moratandi - Pondicherry. Your perfect getaway from hectic corporate lifestyle.',
    heroImage: '/images/hero.jpg',
    gallery: [
      '/images/hero.jpg',
      '/images/gallery-pool.jpg',
      '/images/bedroom-olive.jpg',
      '/images/gallery-bedroom.jpg',
      '/images/gallery-living.jpg',
      '/images/gallery-kitchen.jpg',
      '/images/gallery-hallway.jpg',
      '/images/vanity-mirror.jpg',
    ],
    amenities: [
      'Private Swimming Pool with attached kids pool',
      '3BHK Air-Conditioned Bedrooms',
      'Fully Functional Kitchen (Self-Cooking)',
      'High Speed WiFi & Smart TV',
      'Solar Water Heater System',
      'Secure On-Site Car Parking',
      'Dedicated On-Site Caretaker',
    ],
    isPlaceholder: false,
    rooms: {
      'Entire 3BHK Private Pool Villa': {
        slug: 'entire-villa',
        pricePerNight: 15000,
        maxGuests: 8,
        maxRooms: 10,
        totalInventory: 20,
        tagline: 'Exclusive 3BHK individual villa with private pool',
        description: 'Exclusive 3BHK Villa with private pool, kitchen, and grounds.',
        image: '/images/hero.jpg',
      },
      'The Master King Suite': {
        slug: 'master-suite',
        pricePerNight: 6500,
        maxGuests: 3,
        maxRooms: 10,
        totalInventory: 20,
        tagline: 'Ground-floor master suite with private en-suite',
        description: 'Ground floor master bedroom with king bed and en-suite bath.',
        image: '/images/bedroom-olive.jpg',
      },
      'The Garden Deluxe Suite': {
        slug: 'garden-suite',
        pricePerNight: 5500,
        maxGuests: 2,
        maxRooms: 10,
        totalInventory: 20,
        tagline: 'Upper floor suite with garden views & balcony',
        description: 'Upper floor suite with garden views and queen bed.',
        image: '/images/gallery-bedroom.jpg',
      },
      'Deluxe Room': {
        slug: 'deluxe-room',
        pricePerNight: 4500,
        maxGuests: 2,
        maxRooms: 10,
        totalInventory: 20,
        tagline: 'Spacious air-conditioned room with king bed',
        description: 'Minimalist air-conditioned room with en-suite shower and workspace.',
        image: '/images/gallery-hallway.jpg',
      },
      'Premium Room': {
        slug: 'premium-room',
        pricePerNight: 5500,
        maxGuests: 3,
        maxRooms: 10,
        totalInventory: 20,
        tagline: 'Luxury pool-view room with premium amenities',
        description: 'Premium suite with private balcony, pool view, and luxury linens.',
        image: '/images/gallery-pool.jpg',
      },
    },
  },

  'homestay-2': {
    id: 'homestay-2',
    slug: 'homestay-2',
    name: 'Homestay 2',
    codePrefix: 'HS2',
    tagline: 'Peaceful Coastal Stay (Details Updating Soon)',
    location: 'Pondicherry (Location details to be provided)',
    description:
      'Property details, high-resolution photography, and amenities for Homestay 2 are currently being prepared. Complete information and gallery will be published soon. Room inventory and booking reservations are open for preview.',
    heroImage: '/images/gallery-bedroom.jpg',
    gallery: [
      '/images/gallery-bedroom.jpg',
      '/images/bedroom-olive.jpg',
      '/images/gallery-living.jpg',
      '/images/gallery-hallway.jpg',
      '/images/gallery-kitchen.jpg',
    ],
    amenities: [
      'Air-Conditioned Accommodation',
      'High Speed WiFi',
      'Complimentary Secure Parking',
      'Daily Housekeeping',
      '24/7 Caretaker Assistance',
    ],
    isPlaceholder: true,
    rooms: {
      'Deluxe Pool-View Suite': {
        slug: 'h2-deluxe-pool-suite',
        pricePerNight: 4800,
        maxGuests: 3,
        maxRooms: 5,
        totalInventory: 10,
        tagline: 'Spacious air-conditioned suite overlooking the pool',
        description: 'Premium pool-view suite with king bed, private en-suite bathroom, and balcony.',
        image: '/images/gallery-bedroom.jpg',
      },
      'Superior King Room': {
        slug: 'h2-superior-king',
        pricePerNight: 3800,
        maxGuests: 2,
        maxRooms: 5,
        totalInventory: 12,
        tagline: 'Elegant sunlit bedroom with solid wood furnishings',
        description: 'Comfortable air-conditioned king room with dedicated work desk and garden views.',
        image: '/images/bedroom-olive.jpg',
      },
      'Standard Garden Queen': {
        slug: 'h2-standard-garden-queen',
        pricePerNight: 3200,
        maxGuests: 2,
        maxRooms: 5,
        totalInventory: 15,
        tagline: 'Peaceful queen room facing landscaped garden greenery',
        description: 'Serene air-conditioned room with queen-size mattress and attached bath.',
        image: '/images/gallery-living.jpg',
      },
      'Executive Family Suite': {
        slug: 'h2-executive-family-suite',
        pricePerNight: 6200,
        maxGuests: 4,
        maxRooms: 4,
        totalInventory: 8,
        tagline: 'Spacious suite ideal for families & small groups',
        description: 'Generous suite featuring one king bed, two twin beds, and an en-suite lounge.',
        image: '/images/gallery-hallway.jpg',
      },
      'Cozy Studio Apartment': {
        slug: 'h2-cozy-studio',
        pricePerNight: 2900,
        maxGuests: 2,
        maxRooms: 5,
        totalInventory: 10,
        tagline: 'Compact self-contained studio with kitchenette',
        description: 'Ideal for extended stays with private entrance, double bed, and mini-fridge.',
        image: '/images/gallery-kitchen.jpg',
      },
    },
  },

  'homestay-3': {
    id: 'homestay-3',
    slug: 'homestay-3',
    name: 'Homestay 3',
    codePrefix: 'HS3',
    tagline: 'Tranquil Getaway (Details Updating Soon)',
    location: 'Pondicherry (Location details to be provided)',
    description:
      'Property details, high-resolution photography, and amenities for Homestay 3 are currently being prepared. Complete information and gallery will be published soon. Room inventory and booking reservations are open for preview.',
    heroImage: '/images/gallery-living.jpg',
    gallery: [
      '/images/gallery-living.jpg',
      '/images/gallery-kitchen.jpg',
      '/images/gallery-hallway.jpg',
      '/images/gallery-bedroom.jpg',
      '/images/vanity-mirror.jpg',
    ],
    amenities: [
      'Air-Conditioned Accommodation',
      'High Speed WiFi',
      'Lounge & Dining Area',
      'Dedicated Vehicle Parking',
      'On-Site Host Assistance',
    ],
    isPlaceholder: true,
    rooms: {
      'Heritage King Suite': {
        slug: 'h3-heritage-king',
        pricePerNight: 5200,
        maxGuests: 3,
        maxRooms: 4,
        totalInventory: 8,
        tagline: 'Classic colonial-inspired suite with high timber ceilings',
        description: 'Stately suite with authentic vintage charm, four-poster king bed, and lounge corner.',
        image: '/images/gallery-living.jpg',
      },
      'Classic Double Room': {
        slug: 'h3-classic-double',
        pricePerNight: 3500,
        maxGuests: 2,
        maxRooms: 5,
        totalInventory: 14,
        tagline: 'Comfortable double room with warm ambient lighting',
        description: 'Minimalist air-conditioned room with double bed, wardrobe, and modern bath.',
        image: '/images/gallery-bedroom.jpg',
      },
      'Terrace Garden Room': {
        slug: 'h3-terrace-garden',
        pricePerNight: 4100,
        maxGuests: 2,
        maxRooms: 5,
        totalInventory: 10,
        tagline: 'Upper-floor retreat with open terrace access',
        description: 'Sunlit bedroom opening onto a breezy shared terrace overlooking Pondicherry.',
        image: '/images/bedroom-olive.jpg',
      },
      'Grand Family Suite': {
        slug: 'h3-grand-family-suite',
        pricePerNight: 6500,
        maxGuests: 5,
        maxRooms: 3,
        totalInventory: 6,
        tagline: 'Expansive family residence with two private bedrooms',
        description: 'Two interconnected air-conditioned bedrooms with private en-suite baths.',
        image: '/images/gallery-kitchen.jpg',
      },
      'Standard Solo Retreat': {
        slug: 'h3-solo-retreat',
        pricePerNight: 2600,
        maxGuests: 2,
        maxRooms: 5,
        totalInventory: 10,
        tagline: 'Peaceful quiet room designed for solo travelers & couples',
        description: 'Cozy air-conditioned room with queen bed, high-speed WiFi, and en-suite shower.',
        image: '/images/vanity-mirror.jpg',
      },
    },
  },
};

/**
 * Returns property details by ID or slug
 */
export function getPropertyConfig(propertyIdOrSlug) {
  if (!propertyIdOrSlug) return PROPERTIES_CONFIG['red-roots-villa'];
  return (
    PROPERTIES_CONFIG[propertyIdOrSlug] ||
    Object.values(PROPERTIES_CONFIG).find((p) => p.slug === propertyIdOrSlug) ||
    PROPERTIES_CONFIG['red-roots-villa']
  );
}

/**
 * Returns array of all properties
 */
export function getAllPropertiesConfig() {
  return Object.values(PROPERTIES_CONFIG);
}
