/**
 * Dynamic Multi-Property Inventory Seed Script
 * Generates 365 days of realistic, date-wise room inventory in SQLite for all properties.
 *
 * Run with: node seed_multi_property_inventory.mjs
 *
 * Features:
 * 1. Safe to run multiple times (idempotent, no duplicate records).
 * 2. Never deletes or resets existing bookings.
 * 3. Never restores already-booked inventory to its original quantity when rerun.
 * 4. Generates realistic variations: high, medium, limited (1-3 rooms), and sold-out dates.
 * 5. Invariant: 0 <= booked_rooms <= total_rooms, available_rooms = total_rooms - booked_rooms.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { PROPERTIES_CONFIG } from './src/constants/propertiesConfig.js';

const dbPath = path.join(process.cwd(), 'data', 'hotel.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 10000');

// Simple deterministic hash to create repeatable pseudo-random numbers
function pseudoRandom(seedStr) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 1000 / 1000;
}

// Check if a date should be simulated as a peak holiday / sold-out date
function isSimulatedPeakDate(dateStr, dayOfWeek) {
  // Key festive / holiday dates in Pondicherry tourism
  const peakDates = [
    '2026-11-14', // Diwali weekend
    '2026-11-15',
    '2026-12-24', // Christmas Eve
    '2026-12-25', // Christmas
    '2026-12-30', // New Year festive period
    '2026-12-31', // New Year Eve
    '2027-01-01', // New Year Day
    '2027-01-02',
    '2027-01-14', // Pongal festival
    '2027-01-15',
    '2027-01-16',
    '2027-01-26', // Republic Day long weekend
    '2027-03-27', // Holi / Easter spring weekend
    '2027-04-14', // Tamil New Year
    '2027-05-01', // May Day holiday
    '2027-08-15', // Independence Day long weekend
    '2027-10-02', // Gandhi Jayanti
  ];

  if (peakDates.includes(dateStr)) return true;

  // Occasional sold-out Saturday (every ~4th weekend)
  const dayNum = parseInt(dateStr.slice(-2), 10);
  if (dayOfWeek === 6 && (dayNum === 14 || dayNum === 28)) {
    return true;
  }

  return false;
}

// Designated zero-availability dates and room types for Homestay 2 and Homestay 3
function isPropertyZeroAvailability(propId, roomName, totalRooms, dateStr) {
  // Homestay 2
  if (propId === 'homestay-2') {
    // Completely zero availability across all room types on 1-2 dates
    if (dateStr === '2026-11-10' || dateStr === '2026-12-18') {
      return totalRooms;
    }
    // Specific room types fully booked on selected dates
    if (dateStr === '2026-11-22' && (roomName === 'Deluxe Pool-View Suite' || roomName === 'Executive Family Suite')) {
      return totalRooms;
    }
    if (dateStr === '2026-12-08' && roomName === 'Cozy Studio Apartment') {
      return totalRooms;
    }
  }

  // Homestay 3
  if (propId === 'homestay-3') {
    // Completely zero availability across all room types on 1-2 dates
    if (dateStr === '2026-11-12' || dateStr === '2026-12-12') {
      return totalRooms;
    }
    // Specific room types fully booked on selected dates
    if (dateStr === '2026-11-24' && (roomName === 'Heritage King Suite' || roomName === 'Grand Family Suite')) {
      return totalRooms;
    }
    if (dateStr === '2026-12-16' && roomName === 'Terrace Garden Room') {
      return totalRooms;
    }
  }

  return null;
}

/**
 * Calculates realistic simulated booked rooms for a given date and room type
 */
function calculateSimulatedOccupancy(propertyId, roomName, totalRooms, dateStr, dObj) {
  // Red Roots Villa peak sold-out dates (Nov 10 test date, Diwali Nov 14-15, Christmas Dec 24-25, private booking Dec 5-6)
  if (propertyId === 'red-roots-villa') {
    if (['2026-11-10', '2026-11-14', '2026-11-15', '2026-12-05', '2026-12-06', '2026-12-24', '2026-12-25', '2026-12-31'].includes(dateStr)) {
      return totalRooms;
    }
    return 0;
  }

  // Check specific zero-availability dates and room types for Homestay 2 and Homestay 3
  const zeroCheck = isPropertyZeroAvailability(propertyId, roomName, totalRooms, dateStr);
  if (zeroCheck !== null) {
    return zeroCheck;
  }

  const dayOfWeek = dObj.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const isPeak = isSimulatedPeakDate(dateStr, dayOfWeek);

  // 1. Sold Out Peak Dates (0 available)
  if (isPeak) {
    return totalRooms; // 100% booked -> 0 available
  }

  const rand = pseudoRandom(`${propertyId}-${roomName}-${dateStr}`);

  // 2. Weekend High Occupancy (Fridays & Saturdays)
  if (dayOfWeek === 5 || dayOfWeek === 6) {
    if (rand < 0.25) {
      // Sold out weekend
      return totalRooms;
    } else if (rand < 0.65) {
      // Limited availability (1 to 2 rooms left)
      const remaining = Math.max(1, Math.min(2, Math.floor(rand * 3) + 1));
      return Math.max(0, totalRooms - remaining);
    } else {
      // Medium-high occupancy (60% to 75% booked)
      const booked = Math.round(totalRooms * (0.6 + rand * 0.15));
      return Math.min(totalRooms, booked);
    }
  }

  // 3. Sunday & Thursday (shoulder nights)
  if (dayOfWeek === 0 || dayOfWeek === 4) {
    if (rand < 0.15) {
      // Limited (2 to 3 rooms left)
      return Math.max(0, totalRooms - 2);
    } else {
      // Medium occupancy (35% to 60% booked)
      const booked = Math.round(totalRooms * (0.35 + rand * 0.25));
      return Math.min(totalRooms, booked);
    }
  }

  // 4. Weekdays (Mon - Wed: high availability)
  if (rand < 0.1) {
    // 0 booked (full availability)
    return 0;
  } else {
    // Light occupancy (15% to 35% booked)
    const booked = Math.round(totalRooms * (0.15 + rand * 0.2));
    return Math.min(totalRooms, booked);
  }
}

export function seedOneYearInventory() {
  console.log('\n======================================================');
  console.log('SEEDING 365 DAYS OF MULTI-PROPERTY INVENTORY IN SQLITE');
  console.log('======================================================\n');

  const seedTx = db.transaction(() => {
    // 0. Update any legacy booking room types and clean up deprecated room types
    db.prepare(`
      UPDATE bookings 
      SET room_type = 'Deluxe Pool-View Suite' 
      WHERE property_id = 'homestay-2' AND room_type = 'Deluxe Suite'
    `).run();
    db.prepare(`
      UPDATE bookings 
      SET room_type = 'Grand Family Suite' 
      WHERE property_id = 'homestay-3' AND room_type = 'Family Suite'
    `).run();

    // Remove old room types not present in PROPERTIES_CONFIG
    for (const [propId, prop] of Object.entries(PROPERTIES_CONFIG)) {
      const activeRoomNames = Object.keys(prop.rooms);
      const placeholders = activeRoomNames.map(() => '?').join(',');
      db.prepare(`
        DELETE FROM room_types 
        WHERE property_id = ? AND name NOT IN (${placeholders})
      `).run(propId, ...activeRoomNames);

      db.prepare(`
        DELETE FROM room_inventory 
        WHERE property_id = ? AND room_type NOT IN (${placeholders})
      `).run(propId, ...activeRoomNames);
    }

    // 1. Upsert Properties
    const upsertProperty = db.prepare(`
      INSERT INTO properties (id, slug, name, tagline, location, description, hero_image, is_placeholder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        name = excluded.name,
        tagline = excluded.tagline,
        location = excluded.location,
        description = excluded.description,
        hero_image = excluded.hero_image,
        is_placeholder = excluded.is_placeholder
    `);

    for (const [propId, prop] of Object.entries(PROPERTIES_CONFIG)) {
      upsertProperty.run(
        prop.id,
        prop.slug,
        prop.name,
        prop.tagline,
        prop.location,
        prop.description,
        prop.heroImage,
        prop.isPlaceholder ? 1 : 0
      );
    }

    // 2. Upsert Room Types
    const upsertType = db.prepare(`
      INSERT INTO room_types (property_id, slug, name, price_per_night, total_inventory, max_guests, tagline, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(property_id, name) DO UPDATE SET
        slug = excluded.slug,
        price_per_night = excluded.price_per_night,
        total_inventory = excluded.total_inventory,
        max_guests = excluded.max_guests,
        tagline = excluded.tagline,
        description = excluded.description
    `);

    let totalRoomTypes = 0;
    for (const [propId, prop] of Object.entries(PROPERTIES_CONFIG)) {
      for (const [roomName, cfg] of Object.entries(prop.rooms)) {
        totalRoomTypes++;
        upsertType.run(
          propId,
          cfg.slug,
          roomName,
          cfg.pricePerNight,
          cfg.totalInventory,
          cfg.maxGuests,
          cfg.tagline,
          cfg.description
        );
      }
    }

    // 3. Map all actual confirmed bookings by (property_id, date, room_type)
    const confirmedBookings = db.prepare("SELECT * FROM bookings WHERE status = 'confirmed'").all();
    const actualBookingsMap = {};

    for (const b of confirmedBookings) {
      const propId = b.property_id || 'red-roots-villa';
      const checkInDate = new Date(b.check_in + 'T00:00:00Z');
      const checkOutDate = new Date(b.check_out + 'T00:00:00Z');

      const cur = new Date(checkInDate);
      while (cur < checkOutDate) {
        const y = cur.getUTCFullYear();
        const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
        const d = String(cur.getUTCDate()).padStart(2, '0');
        const dStr = `${y}-${m}-${d}`;

        const key = `${propId}___${dStr}___${b.room_type}`;
        actualBookingsMap[key] = (actualBookingsMap[key] || 0) + b.rooms;

        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }

    // 4. Generate 365 Days of Inventory starting from current date
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // Get current inventory row helper
    const selectInventoryStmt = db.prepare(`
      SELECT booked_rooms, available_rooms, total_rooms 
      FROM room_inventory 
      WHERE property_id = ? AND date = ? AND room_type = ?
    `);

    const upsertInventoryStmt = db.prepare(`
      INSERT INTO room_inventory (property_id, date, room_type, total_rooms, booked_rooms, available_rooms)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(property_id, date, room_type) DO UPDATE SET
        total_rooms = excluded.total_rooms,
        booked_rooms = excluded.booked_rooms,
        available_rooms = excluded.available_rooms
    `);

    let recordsProcessed = 0;

    for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + dayOffset);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      for (const [propId, prop] of Object.entries(PROPERTIES_CONFIG)) {
        for (const [roomName, cfg] of Object.entries(prop.rooms)) {
          const totalCapacity = cfg.totalInventory || 10;

          // Check if an existing inventory row already exists
          const existingRow = selectInventoryStmt.get(propId, dateStr, roomName);

          // Simulated occupancy with realistic weekend/weekday/sold-out variations
          const simulatedBooked = calculateSimulatedOccupancy(
            propId,
            roomName,
            totalCapacity,
            dateStr,
            d
          );

          // Real confirmed bookings for this exact date
          const actualKey = `${propId}___${dateStr}___${roomName}`;
          const actualBooked = actualBookingsMap[actualKey] || 0;

          // Booked rooms must preserve already-booked inventory and confirmed bookings:
          // Invariant: booked rooms cannot be rolled back to a lower value on rerun
          const existingBooked = existingRow ? existingRow.booked_rooms : 0;
          const finalBooked = Math.min(
            totalCapacity,
            Math.max(simulatedBooked, actualBooked, existingBooked)
          );
          const finalAvailable = Math.max(0, totalCapacity - finalBooked);

          upsertInventoryStmt.run(
            propId,
            dateStr,
            roomName,
            totalCapacity,
            finalBooked,
            finalAvailable
          );

          recordsProcessed++;
        }
      }
    }

    return { totalRoomTypes, recordsProcessed };
  });

  const { totalRoomTypes, recordsProcessed } = seedTx();

  console.log(`✓ Cleaned up deprecated room types.`);
  console.log(`✓ Upserted ${totalRoomTypes} distinct room types across 3 homestays.`);
  console.log(`✓ Processed ${recordsProcessed} date-wise inventory records for 365 days.`);
  console.log(`✓ All existing confirmed bookings were preserved.`);
  console.log('======================================================\n');
}

// Run if called directly from CLI
if (process.argv[1]?.endsWith('seed_multi_property_inventory.mjs')) {
  seedOneYearInventory();
}
