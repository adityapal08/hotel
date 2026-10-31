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

    function calculateOccupancy(propId, roomName, totalRooms, dateStr, dObj) {
      if (propId === 'red-roots-villa') return 0;
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
}) {
  const sId = sessionId || `session_${propertyId}_${roomType.replace(/\s+/g, '_')}`;
  let session = getNegotiationSession(sId);

  const calculatedOriginal = Math.round(Number(originalPrice));
  const floorPrice = Math.round(calculatedOriginal * 0.85);

  if (!session) {
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

  // Rule 5: If customer accepts our current offer (e.g. "deal", "yes", "sounds good", "book it")
  if (customerAccepted) {
    const agreedPrice = session.current_offered_price;
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

export { db };
export default db;
