import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path statically scoped to data/ folder
const dbPath = path.join(dataDir, 'hotel.db');

// Singleton database instance across hot-reloading in development
let db;
if (process.env.NODE_ENV === 'production') {
  db = new Database(dbPath);
} else {
  if (!global._hotelDb) {
    global._hotelDb = new Database(dbPath);
  }
  db = global._hotelDb;
}

// Enable Write-Ahead Logging and busy timeout for high concurrency across Next.js workers
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 10000');

import {
  PROPERTIES_CONFIG,
  getPropertyConfig,
  getAllPropertiesConfig,
} from '../constants/propertiesConfig.js';

export { PROPERTIES_CONFIG, getPropertyConfig, getAllPropertiesConfig };

// Backward-compatible export of Red Roots Villa's rooms
export const ROOM_CONFIG = PROPERTIES_CONFIG['red-roots-villa'].rooms;

/**
 * Returns room config for a specific property (or default red-roots-villa)
 */
export function getRoomConfig(propertyId = 'red-roots-villa') {
  const prop = PROPERTIES_CONFIG[propertyId] || PROPERTIES_CONFIG['red-roots-villa'];
  return prop.rooms;
}

/**
 * Returns property details by ID or slug
 */
export function getProperty(propertyIdOrSlug) {
  return getPropertyConfig(propertyIdOrSlug);
}

/**
 * Returns array of all properties
 */
export function getAllProperties() {
  return getAllPropertiesConfig();
}

/**
 * Automated, safe, and non-destructive schema migrations.
 * Preserves all 7 existing bookings and backfills property_id = 'red-roots-villa'.
 * Fixes UNIQUE constraints on room_types and room_inventory to scope by property_id.
 */
export function runMigrations() {
  const migrationTx = db.transaction(() => {
    // 1. Create properties table
    db.exec(`
      CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        tagline TEXT,
        location TEXT NOT NULL,
        description TEXT,
        hero_image TEXT,
        is_placeholder INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // 2. Ensure bookings table exists and contains property_id & property_name
    db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT UNIQUE NOT NULL,
        property_id TEXT NOT NULL DEFAULT 'red-roots-villa',
        property_name TEXT NOT NULL DEFAULT 'Red Roots Villa',
        guest_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        check_in TEXT NOT NULL,
        check_out TEXT NOT NULL,
        nights INTEGER NOT NULL,
        adults INTEGER NOT NULL DEFAULT 1,
        children INTEGER NOT NULL DEFAULT 0,
        rooms INTEGER NOT NULL DEFAULT 1,
        room_type TEXT NOT NULL,
        price_per_night REAL NOT NULL,
        total_price REAL NOT NULL,
        original_price_per_night REAL,
        original_total_price REAL,
        is_negotiated INTEGER DEFAULT 0,
        special_requests TEXT,
        status TEXT NOT NULL DEFAULT 'confirmed',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings (check_in, check_out);
      CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings (reference);
    `);

    const bookingCols = db.prepare('PRAGMA table_info(bookings)').all().map((c) => c.name);
    if (!bookingCols.includes('property_id')) {
      db.exec("ALTER TABLE bookings ADD COLUMN property_id TEXT DEFAULT 'red-roots-villa';");
    }
    if (!bookingCols.includes('property_name')) {
      db.exec("ALTER TABLE bookings ADD COLUMN property_name TEXT DEFAULT 'Red Roots Villa';");
    }
    if (!bookingCols.includes('original_price_per_night')) {
      db.exec("ALTER TABLE bookings ADD COLUMN original_price_per_night REAL;");
    }
    if (!bookingCols.includes('original_total_price')) {
      db.exec("ALTER TABLE bookings ADD COLUMN original_total_price REAL;");
    }
    if (!bookingCols.includes('is_negotiated')) {
      db.exec("ALTER TABLE bookings ADD COLUMN is_negotiated INTEGER DEFAULT 0;");
    }
    db.exec("UPDATE bookings SET property_id = 'red-roots-villa' WHERE property_id IS NULL OR property_id = '';");
    db.exec("UPDATE bookings SET property_name = 'Red Roots Villa' WHERE property_name IS NULL OR property_name = '';");
    db.exec("UPDATE bookings SET original_price_per_night = price_per_night WHERE original_price_per_night IS NULL;");
    db.exec("UPDATE bookings SET original_total_price = total_price WHERE original_total_price IS NULL;");
    db.exec("UPDATE bookings SET is_negotiated = 0 WHERE is_negotiated IS NULL;");
    db.exec('CREATE INDEX IF NOT EXISTS idx_bookings_prop ON bookings (property_id);');

    // 3. Migrate room_types table to be scoped by property_id
    const rtInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='room_types'").get();
    const rtSql = rtInfo ? rtInfo.sql : '';
    if (!rtSql.includes('UNIQUE(property_id, slug)') && !rtSql.includes('UNIQUE (property_id, slug)')) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS room_types_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id TEXT NOT NULL DEFAULT 'red-roots-villa',
          slug TEXT NOT NULL,
          name TEXT NOT NULL,
          price_per_night REAL NOT NULL,
          total_inventory INTEGER NOT NULL,
          max_guests INTEGER NOT NULL DEFAULT 2,
          tagline TEXT,
          description TEXT,
          UNIQUE(property_id, slug),
          UNIQUE(property_id, name)
        );
      `);
      if (rtInfo) {
        db.exec(`
          INSERT OR IGNORE INTO room_types_new (id, property_id, slug, name, price_per_night, total_inventory, max_guests, tagline, description)
          SELECT id, 'red-roots-villa', slug, name, price_per_night, total_inventory, max_guests, tagline, description FROM room_types;
        `);
        db.exec('DROP TABLE room_types;');
      }
      db.exec('ALTER TABLE room_types_new RENAME TO room_types;');
      db.exec('CREATE INDEX IF NOT EXISTS idx_room_types_prop ON room_types (property_id);');
    }

    // 4. Migrate room_inventory table to have UNIQUE(property_id, date, room_type)
    const riInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='room_inventory'").get();
    const riSql = riInfo ? riInfo.sql : '';
    if (!riSql.includes('property_id')) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS room_inventory_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id TEXT NOT NULL DEFAULT 'red-roots-villa',
          date TEXT NOT NULL,
          room_type TEXT NOT NULL,
          total_rooms INTEGER NOT NULL,
          booked_rooms INTEGER NOT NULL DEFAULT 0,
          available_rooms INTEGER NOT NULL,
          UNIQUE(property_id, date, room_type)
        );
      `);
      if (riInfo) {
        db.exec(`
          INSERT OR IGNORE INTO room_inventory_new (id, property_id, date, room_type, total_rooms, booked_rooms, available_rooms)
          SELECT id, 'red-roots-villa', date, room_type, total_rooms, booked_rooms, available_rooms FROM room_inventory;
        `);
        db.exec('DROP TABLE room_inventory;');
      }
      db.exec('ALTER TABLE room_inventory_new RENAME TO room_inventory;');
      db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_prop_date_type ON room_inventory (property_id, date, room_type);');
    }

    // 4. Ensure negotiation_sessions table exists for persistent backend negotiation state
    db.exec(`
      CREATE TABLE IF NOT EXISTS negotiation_sessions (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL DEFAULT 'red-roots-villa',
        room_type TEXT NOT NULL,
        check_in TEXT,
        check_out TEXT,
        nights INTEGER NOT NULL DEFAULT 1,
        rooms INTEGER NOT NULL DEFAULT 1,
        original_price REAL NOT NULL,
        current_offered_price REAL NOT NULL,
        previous_offers TEXT NOT NULL DEFAULT '[]',
        attempts INTEGER NOT NULL DEFAULT 0,
        min_allowed_price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'negotiating',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_negotiation_sessions_prop ON negotiation_sessions (property_id, room_type);

      CREATE TABLE IF NOT EXISTS chat_booking_sessions (
        session_id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL DEFAULT 'red-roots-villa',
        property_name TEXT NOT NULL DEFAULT 'Red Roots Villa',
        check_in TEXT,
        check_out TEXT,
        nights INTEGER,
        stay_duration_known INTEGER NOT NULL DEFAULT 0,
        rooms INTEGER NOT NULL DEFAULT 1,
        adults INTEGER NOT NULL DEFAULT 2,
        room_type TEXT,
        is_available INTEGER DEFAULT NULL,
        availability_status TEXT DEFAULT 'not_checked',
        requested_room_unavailable INTEGER DEFAULT 0,
        available_room_types TEXT DEFAULT '[]',
        sold_out_room_types TEXT DEFAULT '[]',
        alternative_dates TEXT DEFAULT '[]',
        alternative_properties TEXT DEFAULT '[]',
        last_suggested_dates TEXT DEFAULT '[]',
        last_customer_intent TEXT,
        original_total_price REAL,
        current_negotiated_price REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_chat_booking_sessions_prop ON chat_booking_sessions (property_id);
    `);
  });

  migrationTx();
}

// Automatically invoke migrations once safely on initialization
if (!global._hotelMigrated) {
  try {
    runMigrations();
    global._hotelMigrated = true;
  } catch (e) {
    // Ignore concurrency during build or parallel workers
  }
}

/**
 * Returns an array of date strings ['YYYY-MM-DD', ...]
 * From checkIn inclusive to checkOut exclusive.
 */
export function getDatesList(checkIn, checkOut) {
  if (!checkIn) return [];
  if (!checkOut || checkOut <= checkIn) {
    return [checkIn];
  }
  const dates = [];
  const current = new Date(checkIn + 'T00:00:00Z');
  const end = new Date(checkOut + 'T00:00:00Z');

  while (current < end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Seeds initial properties, room types, and daily room inventory for all 3 homestays.
 * Reconciles inventory atomically with all active confirmed bookings.
 */
export function seedInventory() {
  const seedTx = db.transaction(() => {
    // 1. Seed or update properties table
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

    // 2. Seed or update room_types table for all properties
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

    for (const [propId, prop] of Object.entries(PROPERTIES_CONFIG)) {
      for (const [roomName, cfg] of Object.entries(prop.rooms)) {
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

    // Helper functions for realistic simulated occupancy
    function pseudoRandom(seedStr) {
      let hash = 0;
      for (let i = 0; i < seedStr.length; i++) {
        hash = (hash << 5) - hash + seedStr.charCodeAt(i);
        hash |= 0;
      }
      return (Math.abs(hash) % 1000) / 1000;
    }

    function isSimulatedPeakDate(dateStr, dayOfWeek) {
      const peakDates = [
        '2026-11-14', '2026-11-15', '2026-12-24', '2026-12-25',
        '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02',
        '2027-01-14', '2027-01-15', '2027-01-16', '2027-01-26',
        '2027-03-27', '2027-04-14', '2027-05-01', '2027-08-15', '2027-10-02'
      ];
      if (peakDates.includes(dateStr)) return true;
      const dayNum = parseInt(dateStr.slice(-2), 10);
      if (dayOfWeek === 6 && (dayNum === 14 || dayNum === 28)) return true;
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

    function calculateOccupancy(propId, roomName, totalRooms, dateStr, dObj) {
      if (propId === 'red-roots-villa') {
        // Red Roots Villa peak sold-out dates (Nov 10 test date, Diwali Nov 14-15, Christmas Dec 24-25, private booking Dec 5-6)
        if (['2026-11-10', '2026-11-14', '2026-11-15', '2026-12-05', '2026-12-06', '2026-12-24', '2026-12-25', '2026-12-31'].includes(dateStr)) {
          return totalRooms;
        }
        return 0;
      }

      // Check specific zero-availability dates and room types for Homestay 2 and Homestay 3
      const zeroCheck = isPropertyZeroAvailability(propId, roomName, totalRooms, dateStr);
      if (zeroCheck !== null) {
        return zeroCheck;
      }

      const dayOfWeek = dObj.getUTCDay();
      if (isSimulatedPeakDate(dateStr, dayOfWeek)) return totalRooms;

      const rand = pseudoRandom(`${propId}-${roomName}-${dateStr}`);
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        if (rand < 0.25) return totalRooms;
        if (rand < 0.65) {
          const remaining = Math.max(1, Math.min(2, Math.floor(rand * 3) + 1));
          return Math.max(0, totalRooms - remaining);
        }
        return Math.min(totalRooms, Math.round(totalRooms * (0.6 + rand * 0.15)));
      }

      if (dayOfWeek === 0 || dayOfWeek === 4) {
        if (rand < 0.15) return Math.max(0, totalRooms - 2);
        return Math.min(totalRooms, Math.round(totalRooms * (0.35 + rand * 0.25)));
      }

      if (rand < 0.1) return 0;
      return Math.min(totalRooms, Math.round(totalRooms * (0.15 + rand * 0.2)));
    }

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
          const existingRow = selectInventoryStmt.get(propId, dateStr, roomName);

          const simulatedBooked = calculateOccupancy(
            propId,
            roomName,
            totalCapacity,
            dateStr,
            d
          );

          const actualKey = `${propId}___${dateStr}___${roomName}`;
          const actualBooked = actualBookingsMap[actualKey] || 0;
          const finalBooked = Math.min(
            totalCapacity,
            Math.max(simulatedBooked, actualBooked)
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
        }
      }
    }
  });

  seedTx();
}

// Auto-run migration and seed only if database is not yet initialized
try {
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='properties'").get();
  const count = tableCheck ? db.prepare('SELECT COUNT(*) as c FROM properties').get().c : 0;
  if (!tableCheck || count === 0) {
    runMigrations();
    seedInventory();
  }
} catch (e) {
  // SQLite may be busy if another worker is initializing; safely ignore
}

/**
 * Returns month inventory breakdown for a given month ('YYYY-MM') and property.
 * Used by compact calendar to render availability and disable sold-out dates.
 */
export function getMonthInventory(monthStr, roomType = null, propertyId = 'red-roots-villa') {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);
  const startDate = `${monthStr}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const propConfig = PROPERTIES_CONFIG[propertyId] || PROPERTIES_CONFIG['red-roots-villa'];
  const actualPropId = propConfig.id;
  const propRooms = propConfig.rooms;

  const roomTypesToQuery = roomType && propRooms[roomType]
    ? [roomType]
    : Object.keys(propRooms);

  // Auto-seed missing dates in this month
  const insertMissing = db.prepare(`
    INSERT OR IGNORE INTO room_inventory (property_id, date, room_type, total_rooms, booked_rooms, available_rooms)
    VALUES (?, ?, ?, ?, 0, ?)
  `);

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    for (const rType of roomTypesToQuery) {
      const total = propRooms[rType]?.totalInventory || 20;
      insertMissing.run(actualPropId, dateStr, rType, total, total);
    }
  }

  const query = roomType
    ? db.prepare('SELECT * FROM room_inventory WHERE property_id = ? AND date >= ? AND date <= ? AND room_type = ? ORDER BY date ASC')
    : db.prepare('SELECT * FROM room_inventory WHERE property_id = ? AND date >= ? AND date <= ? ORDER BY date ASC');

  const rows = roomType
    ? query.all(actualPropId, startDate, endDate, roomType)
    : query.all(actualPropId, startDate, endDate);

  const daysMap = {};
  for (const row of rows) {
    if (!daysMap[row.date]) {
      daysMap[row.date] = {
        date: row.date,
        totalRooms: row.total_rooms,
        bookedRooms: row.booked_rooms,
        availableRooms: row.available_rooms,
        isSoldOut: row.available_rooms === 0,
        status: row.available_rooms === 0 ? 'sold_out' : (row.available_rooms <= 3 ? 'limited' : 'available'),
      };
    } else {
      if (row.available_rooms < daysMap[row.date].availableRooms) {
        daysMap[row.date].availableRooms = row.available_rooms;
        daysMap[row.date].isSoldOut = row.available_rooms === 0;
        daysMap[row.date].status = row.available_rooms === 0 ? 'sold_out' : (row.available_rooms <= 3 ? 'limited' : 'available');
      }
    }
  }

  return {
    propertyId: actualPropId,
    propertyName: propConfig.name,
    month: monthStr,
    startDate,
    endDate,
    roomType: roomType || 'all',
    days: daysMap,
  };
}

/**
 * Checks inventory for every night in the date range for a specific property.
 * Returns availability, minimum available rooms across all nights, and daily breakdown.
 */
export function getAvailabilityForRange(checkIn, checkOut, roomType = null, requestedRooms = 1, propertyId = 'red-roots-villa') {
  const dates = getDatesList(checkIn, checkOut);
  if (dates.length === 0) {
    throw new Error('Check-out date must be after check-in date.');
  }

  const propConfig = PROPERTIES_CONFIG[propertyId] || PROPERTIES_CONFIG['red-roots-villa'];
  const actualPropId = propConfig.id;
  const propRooms = propConfig.rooms;

  const roomTypesToQuery = roomType && propRooms[roomType]
    ? [roomType]
    : Object.keys(propRooms);

  const results = [];

  for (const rType of roomTypesToQuery) {
    const config = propRooms[rType];
    const dailyBreakdown = [];
    let minAvailable = Infinity;

    for (const date of dates) {
      let inv = db.prepare('SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?').get(actualPropId, date, rType);

      if (!inv) {
        const total = config.totalInventory || 20;
        db.prepare(`
          INSERT OR IGNORE INTO room_inventory (property_id, date, room_type, total_rooms, booked_rooms, available_rooms)
          VALUES (?, ?, ?, ?, 0, ?)
        `).run(actualPropId, date, rType, total, total);
        inv = db.prepare('SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?').get(actualPropId, date, rType);
      }

      dailyBreakdown.push({
        date,
        propertyId: actualPropId,
        roomType: rType,
        totalRooms: inv.total_rooms,
        bookedRooms: inv.booked_rooms,
        availableRooms: inv.available_rooms,
      });

      if (inv.available_rooms < minAvailable) {
        minAvailable = inv.available_rooms;
      }
    }

    if (minAvailable === Infinity) minAvailable = 0;

    const parsedRequested = Math.max(1, parseInt(requestedRooms || 1, 10));
    let status = 'available';
    if (minAvailable === 0) {
      status = 'sold_out';
    } else if (minAvailable < parsedRequested) {
      status = 'insufficient';
    } else if (minAvailable <= 3) {
      status = 'limited';
    }

    const pricePerNight = config.pricePerNight;
    const totalPrice = dates.length * pricePerNight * parsedRequested;

    results.push({
      propertyId: actualPropId,
      propertyName: propConfig.name,
      roomType: rType,
      config,
      pricePerNight,
      totalPrice,
      nights: dates.length,
      requestedRooms: parsedRequested,
      minAvailableRooms: minAvailable,
      isAvailable: minAvailable >= parsedRequested,
      status, // 'available' | 'limited' | 'insufficient' | 'sold_out'
      dailyBreakdown,
    });
  }

  return results;
}

/**
 * Backward-compatible single check.
 */
export function checkAvailability(roomType, checkIn, checkOut, rooms = 1, propertyId = 'red-roots-villa') {
  try {
    const results = getAvailabilityForRange(checkIn, checkOut, roomType, rooms, propertyId);
    if (!results || results.length === 0) return false;
    return results[0].isAvailable;
  } catch (err) {
    return false;
  }
}

/**
 * Searches for nearby available date ranges for the same property.
 * Checks date offsets [-2, -1, 1, 2, 3, -3, 4, 5, -4, 6] preserving the stay length (nights).
 * Ensures candidate check-in is not before today (or 2026-10-31).
 * Returns only dates that have sufficient availability for the requested room type & quantity for EVERY night.
 */
export function findAlternativeDates(checkIn, checkOut, roomType = null, requestedRooms = 1, propertyId = 'red-roots-villa', maxSuggestions = 3) {
  if (!checkIn) return [];
  let effectiveCheckOut = checkOut;
  if (!effectiveCheckOut && checkIn) {
    const inD = new Date(checkIn + 'T00:00:00Z');
    inD.setUTCDate(inD.getUTCDate() + 1);
    effectiveCheckOut = inD.toISOString().split('T')[0];
  }
  const inDate = new Date(checkIn + 'T00:00:00Z');
  const outDate = new Date(effectiveCheckOut + 'T00:00:00Z');
  const nights = Math.max(1, Math.round((outDate - inDate) / (1000 * 60 * 60 * 24)));
  if (nights <= 0 || isNaN(nights)) return [];

  const offsets = [-2, -1, 1, 2, 3, -3, 4, 5, -4, 6];
  const suggestions = [];
  const seenRanges = new Set();
  const todayStr = '2026-10-31';

  for (const offset of offsets) {
    if (suggestions.length >= maxSuggestions) break;

    const candInDate = new Date(inDate);
    candInDate.setUTCDate(candInDate.getUTCDate() + offset);
    const candOutDate = new Date(candInDate);
    candOutDate.setUTCDate(candOutDate.getUTCDate() + nights);

    const candIn = candInDate.toISOString().split('T')[0];
    const candOut = candOutDate.toISOString().split('T')[0];

    if (candIn < todayStr || candIn === checkIn) continue;

    const key = `${candIn}_${candOut}`;
    if (seenRanges.has(key)) continue;
    seenRanges.add(key);

    try {
      const results = getAvailabilityForRange(candIn, candOut, roomType, requestedRooms, propertyId);
      const availableRooms = results.filter((r) => r.isAvailable);

      const isValid = roomType
        ? availableRooms.some((r) => r.roomType.toLowerCase() === roomType.toLowerCase())
        : availableRooms.length > 0;

      if (isValid) {
        suggestions.push({
          checkIn: candIn,
          checkOut: candOut,
          tentativeCheckInDate: candIn,
          nights: !checkOut ? null : nights,
          requestedRooms,
          propertyId,
          availableRooms: availableRooms.map((r) => ({
            roomType: r.roomType,
            pricePerNight: r.pricePerNight,
            totalPrice: !checkOut ? null : r.totalPrice,
            minAvailableRooms: r.minAvailableRooms,
            status: r.status,
          })),
        });
      }
    } catch (e) {
      // Skip invalid dates
    }
  }

  return suggestions;
}

/**
 * Searches other sister homestays for availability on the customer's exact check-in and check-out dates.
 * Returns only properties with sufficient room capacity for EVERY night.
 */
export function findAlternativeProperties(checkIn, checkOut, currentPropertyId = 'red-roots-villa', roomType = null, requestedRooms = 1) {
  if (!checkIn) return [];
  let effectiveCheckOut = checkOut;
  if (!effectiveCheckOut && checkIn) {
    const inD = new Date(checkIn + 'T00:00:00Z');
    inD.setUTCDate(inD.getUTCDate() + 1);
    effectiveCheckOut = inD.toISOString().split('T')[0];
  }
  const alternativeProps = [];

  for (const [propId, propConfig] of Object.entries(PROPERTIES_CONFIG)) {
    if (propId === currentPropertyId) continue;

    try {
      const results = getAvailabilityForRange(checkIn, effectiveCheckOut, null, requestedRooms, propId);
      const availableRooms = results.filter((r) => r.isAvailable);

      if (availableRooms.length > 0) {
        alternativeProps.push({
          propertyId: propId,
          propertyName: propConfig.name,
          location: propConfig.location,
          tagline: propConfig.tagline,
          amenities: propConfig.amenities || [],
          availableRoomsCount: availableRooms.length,
          availableRooms: availableRooms.map((r) => ({
            roomType: r.roomType,
            pricePerNight: r.pricePerNight,
            totalPrice: !checkOut ? null : r.totalPrice,
            minAvailableRooms: r.minAvailableRooms,
            maxGuests: r.config?.maxGuests || 2,
            tagline: r.config?.tagline || '',
            image: r.config?.image || propConfig.heroImage,
          })),
        });
      }
    } catch (e) {
      // Skip error
    }
  }

  return alternativeProps;
}

/**
 * Master availability checker with intelligent options fallback:
 * 1. Checks requested property & dates across ALL room types in SQLite.
 * 2. If one room type is unavailable but other room types are available,
 *    keeps the property selected and returns the available room types.
 * 3. Only if the entire property has 0 available rooms does it search
 *    for nearby alternative dates at the SAME homestay first.
 * 4. Only if nearby dates are rejected or unavailable does it check sister homestays.
 * 5. Does not calculate total price if stay duration (nights) is unknown.
 */
export function checkAvailabilityWithOptions({
  propertyId = 'red-roots-villa',
  checkIn,
  checkOut,
  roomType = null,
  requestedRooms = 1,
  adults = 2,
}) {
  const isStayDurationMissing = !checkOut;
  let effectiveCheckOut = checkOut;
  if (!effectiveCheckOut && checkIn) {
    const inD = new Date(checkIn + 'T00:00:00Z');
    inD.setUTCDate(inD.getUTCDate() + 1);
    effectiveCheckOut = inD.toISOString().split('T')[0];
  }

  const propConfig = PROPERTIES_CONFIG[propertyId] || PROPERTIES_CONFIG['red-roots-villa'];
  const actualPropId = propConfig.id;

  const dates = getDatesList(checkIn, effectiveCheckOut);
  const parsedRooms = Math.max(1, parseInt(requestedRooms || 1, 10));
  const parsedAdults = Math.max(1, parseInt(adults || 2, 10));

  // Query ALL room types for the property to get a complete, accurate inventory status
  const allResults = getAvailabilityForRange(checkIn, effectiveCheckOut, null, parsedRooms, actualPropId);

  // If stay duration is missing, do not calculate total booking prices!
  const results = allResults.map((r) => ({
    roomType: r.roomType,
    pricePerNight: r.pricePerNight,
    totalPrice: isStayDurationMissing ? null : r.totalPrice,
    nights: isStayDurationMissing ? null : r.nights,
    minAvailableRooms: r.minAvailableRooms,
    isAvailable: r.isAvailable,
    status: r.status,
  }));

  const availableRooms = results.filter((r) => r.isAvailable);
  const soldOutRooms = results.filter((r) => !r.isAvailable);

  let isAvailable = false;
  let requestedRoomUnavailable = false;
  let status = 'available';

  if (roomType) {
    const matched = results.find(
      (r) =>
        r.roomType.toLowerCase() === roomType.toLowerCase() ||
        r.roomType.toLowerCase().includes(roomType.toLowerCase()) ||
        roomType.toLowerCase().includes(r.roomType.toLowerCase())
    );

    if (matched && matched.isAvailable) {
      isAvailable = true;
      requestedRoomUnavailable = false;
      status = isStayDurationMissing ? 'tentatively_available_duration_needed' : 'available';
    } else if (availableRooms.length > 0) {
      // Key Fix: The specific room requested is sold out, BUT other room types at this property ARE available!
      // Do NOT claim the property is fully booked!
      // Do NOT trigger alternative dates or sister properties!
      isAvailable = true;
      requestedRoomUnavailable = true;
      status = isStayDurationMissing
        ? 'requested_room_unavailable_other_rooms_available_duration_needed'
        : 'requested_room_unavailable_other_rooms_available';
    } else {
      // Entire property has 0 available rooms
      isAvailable = false;
      requestedRoomUnavailable = true;
    }
  } else {
    isAvailable = availableRooms.length > 0;
    if (isAvailable) {
      status = isStayDurationMissing ? 'tentatively_available_duration_needed' : 'available';
    }
  }

  let alternativeDates = [];
  let alternativeProperties = [];

  // ONLY search alternative dates or sister properties if the property has ZERO available rooms for the requested dates!
  if (!isAvailable) {
    alternativeDates = findAlternativeDates(checkIn, effectiveCheckOut, null, parsedRooms, actualPropId);
    alternativeProperties = findAlternativeProperties(checkIn, effectiveCheckOut, actualPropId, null, parsedRooms);

    if (alternativeDates.length > 0 && alternativeProperties.length > 0) {
      status = 'unavailable_with_alternative_dates_and_properties';
    } else if (alternativeDates.length > 0) {
      status = 'unavailable_with_alternative_dates';
    } else if (alternativeProperties.length > 0) {
      status = 'unavailable_with_alternative_properties';
    } else {
      status = 'all_unavailable';
    }
  }

  const guidanceForAssistant =
    isAvailable && requestedRoomUnavailable
      ? `IMPORTANT: The property ${propConfig.name} IS AVAILABLE! Only the requested room type "${roomType}" is sold out. We have ${availableRooms.length} OTHER room types available: ${availableRooms.map((r) => r.roomType).join(', ')}. Do NOT claim the property is fully booked! Politely inform the guest that their requested room is booked and present these available rooms with nightly rates.`
      : isAvailable && isStayDurationMissing
      ? `IMPORTANT: Tentative availability confirmed for check-in on ${checkIn} at ${propConfig.name}. Stay duration (nights) is NOT YET KNOWN. DO NOT calculate or quote total booking prices! Only quote nightly rates (₹X/night) and politely ask how many nights they will stay and how many guests/rooms.`
      : isAvailable
      ? `Confirmed availability at ${propConfig.name} from ${checkIn} to ${checkOut} (${dates.length} nights). Present available room types and total prices.`
      : alternativeDates.length > 0 && alternativeProperties.length > 0
      ? `The property ${propConfig.name} has 0 available rooms on ${checkIn}. Genuinely verified nearby alternative dates at ${propConfig.name}: ${alternativeDates.map((d) => d.checkIn).join(', ')}. Also, sister homestays available on ${checkIn}: ${alternativeProperties.map((p) => p.propertyName).join(', ')}. Present these genuine alternatives.`
      : alternativeDates.length > 0
      ? `The property ${propConfig.name} has 0 available rooms on ${checkIn}. Genuinely verified nearby alternative dates at ${propConfig.name}: ${alternativeDates.map((d) => d.checkIn).join(', ')}. Present these genuine alternatives.`
      : alternativeProperties.length > 0
      ? `The property ${propConfig.name} has 0 available rooms on ${checkIn}. Sister homestays available on ${checkIn}: ${alternativeProperties.map((p) => p.propertyName).join(', ')}. Present these genuine alternatives.`
      : `All three homestays are fully booked on ${checkIn}. Politely inform the guest and ask if they can check different dates.`;

  return {
    success: true,
    isAvailable,
    status,
    requestedRoomUnavailable,
    propertyId: actualPropId,
    propertyName: propConfig.name,
    checkIn,
    checkOut: checkOut || null,
    effectiveCheckOut,
    isStayDurationMissing,
    isSingleDateInquiry: isStayDurationMissing,
    nights: isStayDurationMissing ? null : dates.length,
    requestedRooms: parsedRooms,
    adults: parsedAdults,
    roomType,
    results,
    availableRooms,
    soldOutRooms,
    alternativeDates,
    alternativeProperties,
    guidanceForAssistant,
  };
}

/**
 * Generates a unique luxury booking reference with property prefix.
 * e.g., RRV-2026-F9A2, HS2-2026-X8B1, HS3-2026-K9P4
 */
export function generateReference(propertyId = 'red-roots-villa') {
  const prop = PROPERTIES_CONFIG[propertyId] || PROPERTIES_CONFIG['red-roots-villa'];
  const prefix = prop.codePrefix || 'RRV';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomCode = '';
  for (let i = 0; i < 4; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${randomCode}`;
}

/**
 * Atomically reserves rooms, validates inventory for every night,
 * decrements available inventory for the specific property, and inserts the confirmed booking record.
 */
export function reserveBooking(bookingData) {
  const reserveTx = db.transaction(() => {
    const dates = getDatesList(bookingData.checkIn, bookingData.checkOut);
    if (dates.length === 0) {
      throw new Error('Check-out date must be at least one day after check-in date.');
    }

    const propId = bookingData.propertyId || 'red-roots-villa';
    const propConfig = PROPERTIES_CONFIG[propId];
    if (!propConfig) {
      throw new Error(`Unrecognized homestay property: ${propId}`);
    }

    const roomsRequested = Math.max(1, parseInt(bookingData.rooms || 1, 10));
    const rType = bookingData.roomType;
    const config = propConfig.rooms[rType];
    if (!config) {
      throw new Error(`Unrecognized accommodation type "${rType}" for ${propConfig.name}.`);
    }

    // 1. Re-validate inventory under immediate transaction lock for EVERY night
    for (const date of dates) {
      let inv = db.prepare('SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?').get(propId, date, rType);
      if (!inv) {
        const total = config.totalInventory || 20;
        db.prepare(`
          INSERT OR IGNORE INTO room_inventory (property_id, date, room_type, total_rooms, booked_rooms, available_rooms)
          VALUES (?, ?, ?, ?, 0, ?)
        `).run(propId, date, rType, total, total);
        inv = db.prepare('SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?').get(propId, date, rType);
      }

      if (inv.available_rooms < roomsRequested) {
        if (inv.available_rooms === 0) {
          throw new Error(`"${rType}" at ${propConfig.name} is completely Sold Out for ${date}. Please choose another date or suite.`);
        } else {
          throw new Error(
            `Only ${inv.available_rooms} room(s) available for "${rType}" at ${propConfig.name} on ${date}, but you requested ${roomsRequested}.`
          );
        }
      }
    }

    // 2. Decrement available inventory atomically (optimistic lock prevents race conditions)
    const updateStmt = db.prepare(`
      UPDATE room_inventory
      SET booked_rooms = booked_rooms + ?,
          available_rooms = available_rooms - ?
      WHERE property_id = ? AND date = ? AND room_type = ? AND available_rooms >= ?
    `);

    for (const date of dates) {
      const res = updateStmt.run(roomsRequested, roomsRequested, propId, date, rType, roomsRequested);
      if (res.changes === 0) {
        throw new Error(`Inventory conflict: rooms on ${date} were just reserved by another guest. Please try again.`);
      }
    }

    // 3. Insert verified booking record with property_id and property_name
    const reference = generateReference(propId);
    const originalPricePerNight = config.pricePerNight;
    const originalTotalPrice = dates.length * originalPricePerNight * roomsRequested;
    // Strict maximum discount allowed is 15% (floor is 85% of original total)
    const floorPrice = Math.round(originalTotalPrice * 0.85);

    let finalTotalPrice = originalTotalPrice;
    let finalPricePerNight = originalPricePerNight;
    let isNegotiated = 0;

    if (bookingData.isNegotiated || (bookingData.negotiatedTotalPrice != null && bookingData.negotiatedTotalPrice !== '')) {
      const parsedNegotiated = Math.round(Number(bookingData.negotiatedTotalPrice));
      if (isNaN(parsedNegotiated) || parsedNegotiated < floorPrice) {
        throw new Error(
          `The requested rate (₹${parsedNegotiated}) is below our authorized minimum rate. The hotel cannot accept rates below this threshold.`
        );
      }
      if (parsedNegotiated > originalTotalPrice) {
        finalTotalPrice = originalTotalPrice;
        finalPricePerNight = originalPricePerNight;
        isNegotiated = 0;
      } else {
        finalTotalPrice = parsedNegotiated;
        finalPricePerNight = Math.round(finalTotalPrice / (dates.length * roomsRequested));
        isNegotiated = 1;
      }
    }

    const stmt = db.prepare(`
      INSERT INTO bookings (
        reference,
        property_id,
        property_name,
        guest_name,
        email,
        phone,
        check_in,
        check_out,
        nights,
        adults,
        children,
        rooms,
        room_type,
        price_per_night,
        total_price,
        original_price_per_night,
        original_total_price,
        is_negotiated,
        special_requests,
        status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed'
      )
    `);

    stmt.run(
      reference,
      propId,
      propConfig.name,
      bookingData.guestName.trim(),
      bookingData.email.trim().toLowerCase(),
      bookingData.phone.trim(),
      bookingData.checkIn,
      bookingData.checkOut,
      dates.length,
      parseInt(bookingData.adults || 1, 10),
      parseInt(bookingData.children || 0, 10),
      roomsRequested,
      rType,
      finalPricePerNight,
      finalTotalPrice,
      originalPricePerNight,
      originalTotalPrice,
      isNegotiated,
      bookingData.specialRequests ? bookingData.specialRequests.trim() : null
    );

    const booking = db.prepare('SELECT * FROM bookings WHERE reference = ?').get(reference);

    // Return the updated inventory state for these dates
    const updatedInventory = dates.map((d) =>
      db.prepare('SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?').get(propId, d, rType)
    );

    return { booking, updatedInventory };
  });

  return reserveTx();
}

/**
 * Cancels a booking and restores inventory back to the correct property in SQLite.
 */
export function cancelBooking(reference) {
  const cancelTx = db.transaction(() => {
    const booking = db.prepare('SELECT * FROM bookings WHERE reference = ?').get(reference);
    if (!booking) {
      throw new Error(`Booking reference "${reference}" not found.`);
    }

    if (booking.status === 'cancelled') {
      throw new Error(`Booking "${reference}" has already been cancelled.`);
    }

    const propId = booking.property_id || 'red-roots-villa';

    // 1. Mark booking as cancelled
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE reference = ?").run(reference);

    // 2. Restore inventory for all reserved dates to the exact property
    const dates = getDatesList(booking.check_in, booking.check_out);
    const restoreStmt = db.prepare(`
      UPDATE room_inventory
      SET booked_rooms = MAX(0, booked_rooms - ?),
          available_rooms = MIN(total_rooms, available_rooms + ?)
      WHERE property_id = ? AND date = ? AND room_type = ?
    `);

    for (const date of dates) {
      restoreStmt.run(booking.rooms, booking.rooms, propId, date, booking.room_type);
    }

    const updatedBooking = db.prepare('SELECT * FROM bookings WHERE reference = ?').get(reference);
    const restoredInventory = dates.map((d) =>
      db.prepare('SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?').get(propId, d, booking.room_type)
    );

    return { booking: updatedBooking, restoredInventory };
  });

  return cancelTx();
}

/**
 * Backward compatibility alias for createBooking.
 */
export function createBooking(data) {
  const result = reserveBooking(data);
  return result.booking;
}

/**
 * Retrieves a booking by its reference code.
 */
export function getBookingByReference(reference) {
  return db.prepare('SELECT * FROM bookings WHERE reference = ?').get(reference);
}

/**
 * Retrieves bookings filtered by property or all bookings (for management/admin).
 */
export function getAllBookings(limit = 100, propertyId = null) {
  if (propertyId && propertyId !== 'all') {
    return db.prepare('SELECT * FROM bookings WHERE property_id = ? ORDER BY id DESC LIMIT ?').all(propertyId, limit);
  }
  return db.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT ?').all(limit);
}

/**
 * Retrieves the raw room inventory for a given date range and property.
 */
export function getRawInventory(startDate, endDate, roomType = null, propertyId = 'red-roots-villa') {
  const actualPropId = propertyId || 'red-roots-villa';
  if (roomType) {
    return db
      .prepare(
        'SELECT * FROM room_inventory WHERE property_id = ? AND date >= ? AND date <= ? AND room_type = ? ORDER BY date ASC'
      )
      .all(actualPropId, startDate, endDate, roomType);
  }
  return db
    .prepare(
      'SELECT * FROM room_inventory WHERE property_id = ? AND date >= ? AND date <= ? ORDER BY date ASC, room_type ASC'
    )
    .all(actualPropId, startDate, endDate);
}

/**
 * Detects whether a customer message represents clear acceptance of a negotiated price.
 * Matches phrases like:
 * - "Okay, let's book."
 * - "I agree with ₹9,000."
 * - "That works for me."
 * - "Yes, confirm the booking."
 * - "Let's proceed."
 * - "I'll take it."
 * - "Okay, ₹9,000. Let's proceed with the booking."
 * - "Deal", "Sounds good", "Lock it in", "Book it", etc.
 */
export function isPriceAcceptanceMessage(text) {
  if (!text || typeof text !== 'string') return false;
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // Guard: if customer is explicitly asking for a lower price / discount without acceptance context
  const hasStrongAcceptance =
    /\b(let'?s\s+proceed|let'?s\s+book|proceed\s+with|confirm\s+(?:the\s+)?booking|works\s+for\s+me|i\s+agree|agreed|accepted?|i'?ll\s+take\s+it|i\s+will\s+take\s+it)\b/i.test(lower);

  const isAskingFurtherDiscount =
    (/\b(can|could|would)\s+(?:you\s+)?(?:do|give|offer|make|drop|reduce|provide)\b/i.test(lower) && !hasStrongAcceptance) ||
    (/\b(cheaper|less|discount|better\s+deal|better\s+price|still\s+(?:too\s+)?(?:high|expensive)|too\s+(?:high|expensive))\b/i.test(lower) && !hasStrongAcceptance);

  if (isAskingFurtherDiscount) {
    return false;
  }

  // 1. Explicit acceptance & booking confirmation phrases
  if (
    /\b(let'?s\s+proceed|proceed\s+with\s+(?:the\s+)?booking|proceed\s+to\s+book|proceed|let'?s\s+book(?:\s+it|\s+this)?|book\s+(?:the\s+room|a\s+room|it|this|now)|confirm\s+(?:the\s+)?booking|confirm\s+reservation|confirm\s+it)\b/i.test(lower)
  ) {
    return true;
  }

  // 2. Agreement & satisfaction phrases
  if (
    /\b(that\s+works(?:\s+for\s+me)?|works\s+for\s+me|that\s+is\s+fine|that'?s\s+fine|sounds\s+(?:good|great|fair|fine|perfect|wonderful)|it'?s\s+a\s+deal|done\s+deal|\bdeal[!.]?$|locked?\s+in|lock\s+it)\b/i.test(lower)
  ) {
    return true;
  }

  if (
    /\b(i\s+agree|agreed|agree\s+with|agreed\s+to|i\s+accept|accepted|i'?ll\s+take\s+it|i\s+will\s+take\s+it|take\s+it|go\s+ahead)\b/i.test(lower)
  ) {
    return true;
  }

  // 3. Affirmation + Price combination (e.g. "Okay, ₹9,000", "Ok 9000 is fine", "yes, 9000 works", "agree with ₹9,000")
  if (
    /\b(ok|okay|yes|yeah|yep|sure|fine|agreed?)\b.*(?:₹|rs\.?|inr)?\s*(?:\d{1,3}(?:,\d{3})+|\d{4,6})/i.test(lower)
  ) {
    return true;
  }

  // 4. Exact short affirmative responses (e.g. "Okay", "Ok", "Yes", "Sure", "Agreed", "Deal", "Proceed")
  if (/^(?:ok|okay|yes|yeah|yep|sure|agreed?|deal|done|perfect|proceed|confirm)[.!]?$/i.test(raw)) {
    return true;
  }

  return false;
}

/**
 * Calculates gradual concession step amount based on booking price.
 * For ₹30,000 -> ₹500 (gives 29500, 29000, 28500, 28000, 27500...)
 * For ₹20,000 -> ₹300 (gives 19700, 19400, 19100, 18800...)
 * For ₹10,000 -> ₹200 (gives 9800, 9600, 9400, 9200...)
 */
export function getNegotiationStepAmount(originalPrice) {
  if (originalPrice >= 25000) return 500;
  if (originalPrice >= 15000) return 300;
  if (originalPrice >= 7000) return 200;
  return 100;
}

/**
 * Retrieves a negotiation session from SQLite.
 */
export function getNegotiationSession(sessionId) {
  if (!sessionId) return null;
  const row = db.prepare('SELECT * FROM negotiation_sessions WHERE id = ?').get(sessionId);
  if (!row) return null;
  return {
    ...row,
    previous_offers: JSON.parse(row.previous_offers || '[]'),
  };
}

/**
 * Creates or updates a negotiation session in SQLite.
 */
export function saveNegotiationSession(session) {
  const stmt = db.prepare(`
    INSERT INTO negotiation_sessions (
      id, property_id, room_type, check_in, check_out, nights, rooms,
      original_price, current_offered_price, previous_offers, attempts, min_allowed_price, status, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      property_id = excluded.property_id,
      room_type = excluded.room_type,
      check_in = excluded.check_in,
      check_out = excluded.check_out,
      nights = excluded.nights,
      rooms = excluded.rooms,
      original_price = excluded.original_price,
      current_offered_price = excluded.current_offered_price,
      previous_offers = excluded.previous_offers,
      attempts = excluded.attempts,
      min_allowed_price = excluded.min_allowed_price,
      status = excluded.status,
      updated_at = datetime('now')
  `);

  stmt.run(
    session.id,
    session.property_id || 'red-roots-villa',
    session.room_type,
    session.check_in || '',
    session.check_out || '',
    session.nights || 1,
    session.rooms || 1,
    session.original_price,
    session.current_offered_price,
    JSON.stringify(session.previous_offers || []),
    session.attempts || 0,
    session.min_allowed_price,
    session.status || 'negotiating'
  );

  return getNegotiationSession(session.id);
}

/**
 * Process a negotiation step with persistent backend state and gradual price reduction.
 * Strictly guarantees:
 * 1. Starts with original booking price.
 * 2. Never offers minimum allowed price immediately.
 * 3. Never agrees or counters below min_allowed_price (85% of original_price).
 * 4. Reduces price gradually by stepAmount on each attempt.
 * 5. If customer agrees, stops and confirms deal at that price.
 */
export function processNegotiationStep({
  sessionId,
  propertyId = 'red-roots-villa',
  roomType = 'Deluxe Room',
  checkIn = '',
  checkOut = '',
  nights = 1,
  rooms = 1,
  originalPrice = null,
  customerOfferedPrice = null,
  customerAccepted = false,
  isInitialInquiry = false,
  isNegotiateAgain = false,
}) {
  const sId = sessionId || `session_${propertyId}_${roomType.replace(/\s+/g, '_')}`;
  let session = getNegotiationSession(sId);

  const calculatedOriginal = Math.round(Number(originalPrice));
  const floorPrice = Math.round(calculatedOriginal * 0.85);

  const isDifferentProperty = session && propertyId && session.property_id !== propertyId;
  const isDifferentRoom = session && roomType && session.room_type !== roomType;
  const isDifferentPrice = session && originalPrice && Math.abs(session.original_price - calculatedOriginal) > 0;

  if (!session || isDifferentProperty || isDifferentRoom || isDifferentPrice) {
    session = {
      id: sId,
      property_id: propertyId,
      room_type: roomType,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      rooms,
      original_price: calculatedOriginal,
      current_offered_price: calculatedOriginal,
      previous_offers: [],
      attempts: 0,
      min_allowed_price: floorPrice,
      status: 'active',
    };
    saveNegotiationSession(session);
  }

  // If customer is just asking about the room/price for the first time
  if (isInitialInquiry && session.attempts === 0) {
    return {
      success: true,
      status: 'initial_quote',
      sessionId: session.id,
      originalPrice: session.original_price,
      currentOfferedPrice: session.original_price,
      previousOffers: session.previous_offers,
      attempts: session.attempts,
      minAllowedPrice: session.min_allowed_price,
      savings: 0,
      salesGuidance: `Present the standard rate of ₹${session.original_price.toLocaleString('en-IN')}. Highlight our luxury amenities, private pool, and zero advance payment policy.`,
    };
  }

  const copParsed = customerOfferedPrice != null && !isNaN(Number(customerOfferedPrice)) ? Math.round(Number(customerOfferedPrice)) : null;
  const isCustomerAskingLowerPrice = (copParsed != null && copParsed < session.current_offered_price) || Boolean(isNegotiateAgain);

  // If deal was already agreed and locked, keep the price strictly locked unless customer explicitly asks to renegotiate lower
  if (session.status === 'deal_agreed') {
    if (!isCustomerAskingLowerPrice) {
      return {
        success: true,
        status: 'deal_agreed',
        sessionId: session.id,
        originalPrice: session.original_price,
        currentOfferedPrice: session.current_offered_price,
        previousOffers: session.previous_offers,
        attempts: session.attempts,
        minAllowedPrice: session.min_allowed_price,
        agreedPrice: session.current_offered_price,
        savings: session.original_price - session.current_offered_price,
        salesGuidance: `The rate of ₹${session.current_offered_price.toLocaleString('en-IN')} has been locked in and agreed upon! Warmly confirm this agreed rate and guide them to click "Continue to Booking" below.`,
      };
    } else {
      // Customer explicitly requested to negotiate lower after previous agreement; resume negotiation
      session.status = 'active';
      saveNegotiationSession(session);
    }
  }

  // Rule 5: If customer accepts our current offer (e.g. "deal", "yes", "sounds good", "book it", "let's proceed", "that works for me", "I agree with ₹9,000")
  if (customerAccepted && !isCustomerAskingLowerPrice) {
    let agreedPrice = session.current_offered_price;
    if (copParsed != null) {
      if (copParsed >= session.min_allowed_price && (copParsed === session.current_offered_price || copParsed >= session.current_offered_price)) {
        agreedPrice = copParsed;
      }
    }
    session.current_offered_price = agreedPrice;
    session.status = 'deal_agreed';
    saveNegotiationSession(session);

    return {
      success: true,
      status: 'deal_agreed',
      sessionId: session.id,
      originalPrice: session.original_price,
      currentOfferedPrice: agreedPrice,
      previousOffers: session.previous_offers,
      attempts: session.attempts,
      minAllowedPrice: session.min_allowed_price,
      agreedPrice,
      savings: session.original_price - agreedPrice,
      salesGuidance: `The guest agreed to ₹${agreedPrice.toLocaleString('en-IN')}. Warmly confirm the agreed rate! Remind them no advance payment is needed (pay at check-in) and ask them to click "Continue to Booking" below to finalize.`,
    };
  }

  const stepAmount = getNegotiationStepAmount(session.original_price);
  const nextGradualOffer = Math.max(session.min_allowed_price, session.current_offered_price - stepAmount);

  // If customer suggested a specific price
  if (customerOfferedPrice != null && !isNaN(Number(customerOfferedPrice))) {
    const cop = Math.round(Number(customerOfferedPrice));

    // Case A: Customer asks below the 85% floor (e.g. ₹20,000 on ₹30,000, or ₹25,000 on ₹30,000)
    // Rule 1: Never offer ₹25,500 immediately.
    // Rule 6: If customer asks for a very low price, politely make a better counteroffer instead of accepting immediately.
    // Rule 7: Never go below minimum.
    if (cop < session.min_allowed_price) {
      session.previous_offers.push(session.current_offered_price);
      session.current_offered_price = nextGradualOffer;
      session.attempts += 1;
      saveNegotiationSession(session);

      return {
        success: true,
        status: 'counter_offer',
        isOfferBelowFloor: true,
        sessionId: session.id,
        customerOfferedPrice: cop,
        originalPrice: session.original_price,
        currentOfferedPrice: nextGradualOffer,
        previousOffers: session.previous_offers,
        attempts: session.attempts,
        minAllowedPrice: session.min_allowed_price,
        savings: session.original_price - nextGradualOffer,
        salesGuidance: `The guest requested ₹${cop.toLocaleString('en-IN')}, which is below our allowable limit. You MUST NOT accept ₹${cop.toLocaleString('en-IN')}. Do NOT mention minimum limits or 15%. Politely explain that ₹${cop.toLocaleString('en-IN')} would be difficult for this room, highlight the private pool and amenities, and counter with ₹${nextGradualOffer.toLocaleString('en-IN')}.`,
      };
    }

    // Case B: Customer offered equal to or higher than our current offer
    if (cop >= session.current_offered_price) {
      session.status = 'deal_agreed';
      session.current_offered_price = cop;
      saveNegotiationSession(session);

      return {
        success: true,
        status: 'deal_agreed',
        sessionId: session.id,
        originalPrice: session.original_price,
        currentOfferedPrice: cop,
        previousOffers: session.previous_offers,
        attempts: session.attempts,
        minAllowedPrice: session.min_allowed_price,
        agreedPrice: cop,
        savings: session.original_price - cop,
        salesGuidance: `The guest offered ₹${cop.toLocaleString('en-IN')}, which meets our current rate! Enthusiastically accept and guide them to click "Continue to Booking".`,
      };
    }

    // Case C: Customer offered between min_allowed_price and current_offered_price
    // In early attempts (attempts < 3), make a gradual concession towards them rather than jumping
    if (session.attempts < 3) {
      session.previous_offers.push(session.current_offered_price);
      session.current_offered_price = nextGradualOffer;
      session.attempts += 1;
      saveNegotiationSession(session);

      return {
        success: true,
        status: 'counter_offer',
        sessionId: session.id,
        customerOfferedPrice: cop,
        originalPrice: session.original_price,
        currentOfferedPrice: nextGradualOffer,
        previousOffers: session.previous_offers,
        attempts: session.attempts,
        minAllowedPrice: session.min_allowed_price,
        savings: session.original_price - nextGradualOffer,
        salesGuidance: `The guest asked for ₹${cop.toLocaleString('en-IN')}. Concede slightly to meet them partway at ₹${nextGradualOffer.toLocaleString('en-IN')}. Try to close the booking at this rate.`,
      };
    } else {
      // Late attempt: accept their offer since it is >= min_allowed_price
      session.status = 'deal_agreed';
      session.current_offered_price = cop;
      saveNegotiationSession(session);

      return {
        success: true,
        status: 'deal_agreed',
        sessionId: session.id,
        originalPrice: session.original_price,
        currentOfferedPrice: cop,
        previousOffers: session.previous_offers,
        attempts: session.attempts,
        minAllowedPrice: session.min_allowed_price,
        agreedPrice: cop,
        savings: session.original_price - cop,
        salesGuidance: `The guest held out for ₹${cop.toLocaleString('en-IN')}. Since it is within our authorized range, accept it as our special courtesy for them. Celebrate the deal and invite them to click "Continue to Booking".`,
      };
    }
  }

  // Case D: Customer asked for discount generally without specifying an amount
  session.previous_offers.push(session.current_offered_price);
  session.current_offered_price = nextGradualOffer;
  session.attempts += 1;
  saveNegotiationSession(session);

  return {
    success: true,
    status: 'counter_offer',
    sessionId: session.id,
    originalPrice: session.original_price,
    currentOfferedPrice: nextGradualOffer,
    previousOffers: session.previous_offers,
    attempts: session.attempts,
    minAllowedPrice: session.min_allowed_price,
    savings: session.original_price - nextGradualOffer,
    salesGuidance:
      nextGradualOffer <= session.min_allowed_price
        ? `Offer ₹${nextGradualOffer.toLocaleString('en-IN')} as our absolute best courtesy rate for this stay. Explain that this is the best rate we can extend, and invite them to confirm.`
        : `Offer ₹${nextGradualOffer.toLocaleString('en-IN')} as a courtesy discount for their stay. Ask if that rate works for them.`,
  };
}

/**
 * Retrieves persistent booking session from SQLite chat_booking_sessions table.
 */
export function getChatBookingSession(sessionId) {
  if (!sessionId) return null;
  const row = db.prepare('SELECT * FROM chat_booking_sessions WHERE session_id = ?').get(sessionId);
  if (!row) return null;
  return {
    ...row,
    is_available: row.is_available === null ? null : Boolean(row.is_available),
    stay_duration_known: Boolean(row.stay_duration_known),
    requested_room_unavailable: Boolean(row.requested_room_unavailable),
    available_room_types: JSON.parse(row.available_room_types || '[]'),
    sold_out_room_types: JSON.parse(row.sold_out_room_types || '[]'),
    alternative_dates: JSON.parse(row.alternative_dates || '[]'),
    alternative_properties: JSON.parse(row.alternative_properties || '[]'),
    last_suggested_dates: JSON.parse(row.last_suggested_dates || '[]'),
  };
}

/**
 * Saves persistent booking session to SQLite chat_booking_sessions table.
 */
export function saveChatBookingSession(session) {
  if (!session || !session.session_id) return;
  const stmt = db.prepare(`
    INSERT INTO chat_booking_sessions (
      session_id, property_id, property_name, check_in, check_out,
      nights, stay_duration_known, rooms, adults, room_type,
      is_available, availability_status, requested_room_unavailable,
      available_room_types, sold_out_room_types, alternative_dates,
      alternative_properties, last_suggested_dates, last_customer_intent,
      original_total_price, current_negotiated_price, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?, ?, datetime('now')
    )
    ON CONFLICT(session_id) DO UPDATE SET
      property_id = excluded.property_id,
      property_name = excluded.property_name,
      check_in = excluded.check_in,
      check_out = excluded.check_out,
      nights = excluded.nights,
      stay_duration_known = excluded.stay_duration_known,
      rooms = excluded.rooms,
      adults = excluded.adults,
      room_type = excluded.room_type,
      is_available = excluded.is_available,
      availability_status = excluded.availability_status,
      requested_room_unavailable = excluded.requested_room_unavailable,
      available_room_types = excluded.available_room_types,
      sold_out_room_types = excluded.sold_out_room_types,
      alternative_dates = excluded.alternative_dates,
      alternative_properties = excluded.alternative_properties,
      last_suggested_dates = excluded.last_suggested_dates,
      last_customer_intent = excluded.last_customer_intent,
      original_total_price = excluded.original_total_price,
      current_negotiated_price = excluded.current_negotiated_price,
      updated_at = datetime('now');
  `);

  stmt.run(
    session.session_id,
    session.property_id || 'red-roots-villa',
    session.property_name || 'Red Roots Villa',
    session.check_in || null,
    session.check_out || null,
    session.nights != null ? session.nights : null,
    session.stay_duration_known ? 1 : 0,
    session.rooms || 1,
    session.adults || 2,
    session.room_type || null,
    session.is_available === null || session.is_available === undefined ? null : (session.is_available ? 1 : 0),
    session.availability_status || 'not_checked',
    session.requested_room_unavailable ? 1 : 0,
    JSON.stringify(session.available_room_types || []),
    JSON.stringify(session.sold_out_room_types || []),
    JSON.stringify(session.alternative_dates || []),
    JSON.stringify(session.alternative_properties || []),
    JSON.stringify(session.last_suggested_dates || []),
    session.last_customer_intent || null,
    session.original_total_price != null ? session.original_total_price : null,
    session.current_negotiated_price != null ? session.current_negotiated_price : null
  );
}

/**
 * Updates chat booking state strictly from user messages.
 * Never pollutes state with assistant messages or previous stale dates.
 * Invalids outdated availability when any booking parameter changes,
 * and automatically verifies live availability against SQLite inventory.
 */
export function updateChatBookingState({ sessionId, userMessage = '', messages = [] }) {
  const effectiveSessionId = sessionId || `session_${Date.now()}`;
  let session = getChatBookingSession(effectiveSessionId);

  if (!session) {
    session = {
      session_id: effectiveSessionId,
      property_id: 'red-roots-villa',
      property_name: 'Red Roots Villa',
      check_in: null,
      check_out: null,
      nights: null,
      stay_duration_known: false,
      rooms: 1,
      adults: 2,
      room_type: null,
      is_available: null,
      availability_status: 'not_checked',
      requested_room_unavailable: false,
      available_room_types: [],
      sold_out_room_types: [],
      alternative_dates: [],
      alternative_properties: [],
      last_suggested_dates: [],
      last_customer_intent: null,
      original_total_price: null,
      current_negotiated_price: null,
    };
  }

  // Parse only user messages (strictly ignore assistant messages!)
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessage && (!userMessages.length || userMessages[userMessages.length - 1].content !== userMessage)) {
    userMessages.push({ role: 'user', content: userMessage });
  }

  const latestUserText = (userMessage || userMessages[userMessages.length - 1]?.content || '').trim();
  const lowerText = latestUserText.toLowerCase();

  // 1. Property detection from user message
  let detectedPropId = null;
  if (/homestay\s*2\b|\bhs2\b/i.test(latestUserText)) {
    detectedPropId = 'homestay-2';
  } else if (/homestay\s*3\b|\bhs3\b/i.test(latestUserText)) {
    detectedPropId = 'homestay-3';
  } else if (/red\s*roots\b|\brrv\b|\bvilla\s*1\b/i.test(latestUserText)) {
    detectedPropId = 'red-roots-villa';
  }

  if (detectedPropId && detectedPropId !== session.property_id) {
    session.property_id = detectedPropId;
    session.property_name = PROPERTIES_CONFIG[detectedPropId]?.name || detectedPropId;
    session.is_available = null;
    session.availability_status = 'not_checked';
    session.available_room_types = [];
    session.sold_out_room_types = [];
    session.alternative_dates = [];
    session.alternative_properties = [];
    session.original_total_price = null;
    session.current_negotiated_price = null;
    // Clear room_type on property switch so that a room from another property doesn't falsely block availability
    session.room_type = null;
  }

  // 2. Room detection for current property
  const currentPropConfig = PROPERTIES_CONFIG[session.property_id] || PROPERTIES_CONFIG['red-roots-villa'];
  let detectedRoomInMessage = null;
  for (const rType of Object.keys(currentPropConfig.rooms)) {
    const escaped = rType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(escaped, 'i').test(latestUserText)) {
      detectedRoomInMessage = rType;
      break;
    }
  }

  // Common room keywords
  if (!detectedRoomInMessage) {
    if (/deluxe\s*(?:pool-view\s*)?suite/i.test(latestUserText) && session.property_id === 'homestay-2') {
      detectedRoomInMessage = 'Deluxe Pool-View Suite';
    } else if (/executive\s*family/i.test(latestUserText) && session.property_id === 'homestay-2') {
      detectedRoomInMessage = 'Executive Family Suite';
    } else if (/entire\s*(?:3bhk)?\s*(?:private\s*pool\s*)?villa/i.test(latestUserText) && session.property_id === 'red-roots-villa') {
      detectedRoomInMessage = 'Entire 3BHK Private Pool Villa';
    } else if (/master\s*(?:king\s*)?suite/i.test(latestUserText) && session.property_id === 'red-roots-villa') {
      detectedRoomInMessage = 'The Master King Suite';
    } else if (/garden\s*(?:deluxe\s*)?suite/i.test(latestUserText) && session.property_id === 'red-roots-villa') {
      detectedRoomInMessage = 'The Garden Deluxe Suite';
    } else if (/cozy\s*studio/i.test(latestUserText) && session.property_id === 'homestay-2') {
      detectedRoomInMessage = 'Cozy Studio Apartment';
    } else if (/heritage\s*king/i.test(latestUserText) && session.property_id === 'homestay-3') {
      detectedRoomInMessage = 'Heritage King Suite';
    }
  }

  if (detectedRoomInMessage) {
    if (session.room_type !== detectedRoomInMessage) {
      session.room_type = detectedRoomInMessage;
      session.is_available = null;
    }
  }

  // 3. Room count and Guest count
  const roomsMatch = latestUserText.match(/(\d+)\s*(?:room|rooms)\b/i);
  if (roomsMatch) {
    const rCount = Math.max(1, parseInt(roomsMatch[1], 10));
    if (session.rooms !== rCount) {
      session.rooms = rCount;
      session.is_available = null;
    }
  }

  const guestsMatch = latestUserText.match(/(\d+)\s*(?:guest|guests|adult|adults|people|person)\b/i);
  if (guestsMatch) {
    const gCount = Math.max(1, parseInt(guestsMatch[1], 10));
    if (session.adults !== gCount) {
      session.adults = gCount;
    }
  }

  // 4. Date extraction
  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };
  const mNames = Object.keys(months).sort((a, b) => b.length - a.length).join('|');

  const rangeRegex = new RegExp(
    `(?:from\\s+)?\\b(${mNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(202\\d))?\\s*(?:to|until|-|–|&|and)\\s*(?:(${mNames})\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(202\\d))?\\b`,
    'i'
  );

  // Pattern: explicitly changing/switching from one single date to another single date
  // e.g. "change November 10 to November 16", "switch from November 10 to November 16", "change Nov 20 to Nov 16"
  const changeFromToRegex = new RegExp(
    `\\b(?:change|switch|replace|move|update)\\b(?:(?!\\bto\\b).)*?(?:from\\s+)?(?:the\\s+)?\\b(${mNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(202\\d))?\\s+(?:to|with)\\s+(?:the\\s+)?\\b(${mNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(202\\d))?\\b`,
    'i'
  );

  let newCheckIn = null;
  let newCheckOut = null;
  let hasExplicitRange = false;

  // 1. ISO range check: e.g. "from 2026-12-24 to 2026-12-26" or "2026-12-24 to 2026-12-26"
  const isoMatches = latestUserText.match(/\b(202\d-\d{2}-\d{2})\b/g);
  if (isoMatches && isoMatches.length >= 2) {
    const isChange = /\b(change|switch|replace|move|update)\b/i.test(latestUserText) && !/\b(?:to|for)\s+202/i.test(latestUserText);
    if (isChange) {
      newCheckIn = isoMatches[1];
    } else {
      newCheckIn = isoMatches[0];
      newCheckOut = isoMatches[1];
      hasExplicitRange = true;
    }
  } else {
    const changeMatch = latestUserText.match(changeFromToRegex);
    if (changeMatch) {
      const mStr2 = changeMatch[4].toLowerCase();
      const d2 = parseInt(changeMatch[5], 10);
      const y2 = changeMatch[6] ? parseInt(changeMatch[6], 10) : 2026;
      newCheckIn = `${y2}-${String(months[mStr2]).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
    } else {
      // Check explicit range: "November 20 to November 22" or "from November 20 to 22"
      const rangeMatch = latestUserText.match(rangeRegex);
      if (rangeMatch) {
        const mStr1 = rangeMatch[1].toLowerCase();
        const d1 = parseInt(rangeMatch[2], 10);
        const y1 = rangeMatch[3] ? parseInt(rangeMatch[3], 10) : 2026;
        const mStr2 = (rangeMatch[4] || rangeMatch[1]).toLowerCase();
        const d2 = parseInt(rangeMatch[5], 10);
        const y2 = rangeMatch[6] ? parseInt(rangeMatch[6], 10) : y1;
        newCheckIn = `${y1}-${String(months[mStr1]).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
        newCheckOut = `${y2}-${String(months[mStr2]).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
        hasExplicitRange = true;
      } else {
      // Collect all ISO and natural language dates mentioned in the message
      const allDates = [];
      const isoRegex = /\b(202\d-\d{2}-\d{2})\b/g;
      let match;
      while ((match = isoRegex.exec(latestUserText)) !== null) {
        allDates.push({ date: match[1], index: match.index });
      }

      const mfRegex = new RegExp(`\\b(${mNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(202\\d))?\\b`, 'gi');
      while ((match = mfRegex.exec(latestUserText)) !== null) {
        const m = months[match[1].toLowerCase()];
        const d = parseInt(match[2], 10);
        const y = match[3] ? parseInt(match[3], 10) : 2026;
        allDates.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, index: match.index });
      }

      const dfRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s*)?(${mNames})(?:,?\\s*(202\\d))?\\b`, 'gi');
      while ((match = dfRegex.exec(latestUserText)) !== null) {
        const d = parseInt(match[1], 10);
        const m = months[match[2].toLowerCase()];
        const y = match[3] ? parseInt(match[3], 10) : 2026;
        allDates.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, index: match.index });
      }

      allDates.sort((a, b) => a.index - b.index);

      if (allDates.length > 0) {
        // In change or single-date statements, the latest/target date is the desired check-in
        newCheckIn = allDates[allDates.length - 1].date;
      }
    }
  }
}

  // Duration in nights (e.g. "for 2 nights", "3 nights")
  const nightsMatch = latestUserText.match(/(\d+)\s*(?:night|nights)\b/i);

  const isDateChanged = Boolean(newCheckIn && session.check_in !== newCheckIn);
  if (isDateChanged && !detectedRoomInMessage) {
    session.room_type = null;
  }

  if (hasExplicitRange && newCheckIn && newCheckOut) {
    if (session.check_in !== newCheckIn || session.check_out !== newCheckOut) {
      session.check_in = newCheckIn;
      session.check_out = newCheckOut;
      const inD = new Date(newCheckIn + 'T00:00:00Z');
      const outD = new Date(newCheckOut + 'T00:00:00Z');
      session.nights = Math.max(1, Math.round((outD - inD) / (1000 * 60 * 60 * 24)));
      session.stay_duration_known = true;
      session.is_available = null;
    }
  } else if (newCheckIn) {
    if (session.check_in !== newCheckIn) {
      session.check_in = newCheckIn;
      if (nightsMatch) {
        const n = Math.max(1, parseInt(nightsMatch[1], 10));
        session.nights = n;
        session.stay_duration_known = true;
        const inD = new Date(newCheckIn + 'T00:00:00Z');
        inD.setUTCDate(inD.getUTCDate() + n);
        session.check_out = inD.toISOString().split('T')[0];
      } else if (session.stay_duration_known && session.nights && session.nights > 0) {
        // Preserve established duration when updating check-in date
        const inD = new Date(newCheckIn + 'T00:00:00Z');
        inD.setUTCDate(inD.getUTCDate() + session.nights);
        session.check_out = inD.toISOString().split('T')[0];
      } else {
        // Single date with unknown stay duration
        session.check_out = null;
        session.nights = null;
        session.stay_duration_known = false;
      }
      session.is_available = null;
    }
  } else if (nightsMatch && session.check_in) {
    const n = Math.max(1, parseInt(nightsMatch[1], 10));
    if (session.nights !== n || !session.stay_duration_known) {
      session.nights = n;
      session.stay_duration_known = true;
      const inD = new Date(session.check_in + 'T00:00:00Z');
      inD.setUTCDate(inD.getUTCDate() + n);
      session.check_out = inD.toISOString().split('T')[0];
      session.is_available = null;
    }
  }

  // 5. Intent detection: rejected alternative dates, asking sister properties, or negotiating
  const rejectsAltDates =
    lowerText.includes('cannot change') ||
    lowerText.includes("can't change") ||
    lowerText.includes('other options') ||
    lowerText.includes('other homestay') ||
    lowerText.includes('other homestays') ||
    lowerText.includes('other property') ||
    lowerText.includes('other properties') ||
    lowerText.includes('sister homestay') ||
    lowerText.includes('sister homestays') ||
    lowerText.includes('sister property') ||
    lowerText.includes('different villa') ||
    lowerText.includes('different homestay') ||
    lowerText.includes('another homestay') ||
    lowerText.includes('another property') ||
    lowerText.includes('need those dates') ||
    lowerText.includes('only those dates') ||
    lowerText.includes('check other') ||
    lowerText.includes('check sister');

  if (rejectsAltDates) {
    session.last_customer_intent = 'rejected_alt_dates';
  } else if (isPriceAcceptanceMessage(latestUserText)) {
    session.last_customer_intent = 'deal_accepted';
  } else if (lowerText.includes('discount') || lowerText.includes('cheaper') || lowerText.includes('bargain')) {
    session.last_customer_intent = 'negotiating';
  }

  // 6. Automatically verify availability against SQLite database if check_in is known and status is invalidated
  if (session.check_in && (session.is_available === null || session.availability_status === 'not_checked')) {
    const fullCheck = checkAvailabilityWithOptions({
      propertyId: session.property_id,
      checkIn: session.check_in,
      checkOut: session.check_out,
      roomType: session.room_type,
      requestedRooms: session.rooms,
      adults: session.adults,
    });

    session.is_available = fullCheck.isAvailable;
    session.availability_status = fullCheck.status;
    session.requested_room_unavailable = fullCheck.requestedRoomUnavailable;
    session.available_room_types = fullCheck.availableRooms;
    session.sold_out_room_types = fullCheck.soldOutRooms;
    session.alternative_dates = fullCheck.alternativeDates;
    session.alternative_properties = fullCheck.alternativeProperties;
    session.last_suggested_dates = fullCheck.alternativeDates.map((d) => d.checkIn);

    if (session.stay_duration_known && session.nights && fullCheck.availableRooms.length > 0) {
      const primaryRoom = session.room_type
        ? fullCheck.availableRooms.find((r) => r.roomType.toLowerCase() === session.room_type.toLowerCase())
        : fullCheck.availableRooms[0];
      if (primaryRoom) {
        session.original_total_price = primaryRoom.pricePerNight * session.rooms * session.nights;
      }
    } else {
      session.original_total_price = null;
    }
  }

  saveChatBookingSession(session);
  return session;
}

export { db };
export default db;
