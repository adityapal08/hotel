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

// Enable Write-Ahead Logging for high concurrency and speed
db.pragma('journal_mode = WAL');

// 1. Initialize Tables
db.exec(`
  -- Existing Bookings Table
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT UNIQUE NOT NULL,
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
    special_requests TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings (check_in, check_out);
  CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings (reference);

  -- Room Types Table
  CREATE TABLE IF NOT EXISTS room_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT UNIQUE NOT NULL,
    price_per_night REAL NOT NULL,
    total_inventory INTEGER NOT NULL,
    max_guests INTEGER NOT NULL DEFAULT 2,
    tagline TEXT,
    description TEXT
  );

  -- Daily Room Inventory Table
  CREATE TABLE IF NOT EXISTS room_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    room_type TEXT NOT NULL,
    total_rooms INTEGER NOT NULL,
    booked_rooms INTEGER NOT NULL DEFAULT 0,
    available_rooms INTEGER NOT NULL,
    UNIQUE(date, room_type)
  );

  CREATE INDEX IF NOT EXISTS idx_inventory_date_type ON room_inventory (date, room_type);
`);

// Room Configuration supporting existing suites + dummy test inventory
export const ROOM_CONFIG = {
  'Entire 3BHK Private Pool Villa': {
    slug: 'entire-villa',
    pricePerNight: 15000,
    maxGuests: 8,
    maxRooms: 1,
    totalInventory: 2,
    tagline: 'Exclusive 3BHK individual villa with private pool',
    description: 'Exclusive 3BHK Villa with private pool, kitchen, and grounds.',
  },
  'The Master King Suite': {
    slug: 'master-suite',
    pricePerNight: 6500,
    maxGuests: 3,
    maxRooms: 4,
    totalInventory: 4,
    tagline: 'Ground-floor master suite with private en-suite',
    description: 'Ground floor master bedroom with king bed and en-suite bath.',
  },
  'The Garden Deluxe Suite': {
    slug: 'garden-suite',
    pricePerNight: 5500,
    maxGuests: 2,
    maxRooms: 6,
    totalInventory: 6,
    tagline: 'Upper floor suite with garden views & balcony',
    description: 'Upper floor suite with garden views and queen bed.',
  },
  'Deluxe Room': {
    slug: 'deluxe-room',
    pricePerNight: 4500,
    maxGuests: 2,
    maxRooms: 10,
    totalInventory: 10,
    tagline: 'Spacious air-conditioned room with king bed',
    description: 'Minimalist air-conditioned room with en-suite shower and workspace.',
  },
  'Premium Room': {
    slug: 'premium-room',
    pricePerNight: 5500,
    maxGuests: 3,
    maxRooms: 5,
    totalInventory: 5,
    tagline: 'Luxury pool-view room with premium amenities',
    description: 'Premium suite with private balcony, pool view, and luxury linens.',
  },
};

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
 * Seeds initial room types and daily inventory if not already populated.
 */
export function seedInventory() {
  const seedTx = db.transaction(() => {
    // 1. Seed room_types
    const insertType = db.prepare(`
      INSERT OR IGNORE INTO room_types (slug, name, price_per_night, total_inventory, max_guests, tagline, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const [name, cfg] of Object.entries(ROOM_CONFIG)) {
      insertType.run(
        cfg.slug,
        name,
        cfg.pricePerNight,
        cfg.totalInventory,
        cfg.maxGuests,
        cfg.tagline,
        cfg.description
      );
    }

    // 2. Generate 60 days of dynamic inventory starting from today
    const insertInventory = db.prepare(`
      INSERT OR IGNORE INTO room_inventory (date, room_type, total_rooms, booked_rooms, available_rooms)
      VALUES (?, ?, ?, ?, ?)
    `);

    const now = new Date();
    const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    for (let dayOffset = 0; dayOffset <= 60; dayOffset++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + dayOffset);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      for (const [name, cfg] of Object.entries(ROOM_CONFIG)) {
        insertInventory.run(dateStr, name, cfg.totalInventory, 0, cfg.totalInventory);
      }
    }

    // 3. Explicit dummy test values for November 1 - 4 (User Specification Example)
    const updateInventory = db.prepare(`
      INSERT INTO room_inventory (date, room_type, total_rooms, booked_rooms, available_rooms)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(date, room_type) DO UPDATE SET
        total_rooms = excluded.total_rooms,
        booked_rooms = excluded.booked_rooms,
        available_rooms = excluded.available_rooms
    `);

    // November 1: Deluxe (10 total, 0 booked, 10 avail), Premium (5 total, 1 booked, 4 avail)
    updateInventory.run('2026-11-01', 'Deluxe Room', 10, 0, 10);
    updateInventory.run('2026-11-01', 'Premium Room', 5, 1, 4);

    // November 2: Deluxe (10 total, 3 booked, 7 avail), Premium (5 total, 2 booked, 3 avail)
    updateInventory.run('2026-11-02', 'Deluxe Room', 10, 3, 7);
    updateInventory.run('2026-11-02', 'Premium Room', 5, 2, 3);

    // November 3: Deluxe (10 total, 5 booked, 5 avail), Premium (5 total, 1 booked, 4 avail)
    updateInventory.run('2026-11-03', 'Deluxe Room', 10, 5, 5);
    updateInventory.run('2026-11-03', 'Premium Room', 5, 1, 4);

    // November 4: Deluxe (10 total, 10 booked, 0 avail - Sold Out!), Premium (5 total, 5 booked, 0 avail - Sold Out!)
    updateInventory.run('2026-11-04', 'Deluxe Room', 10, 10, 0);
    updateInventory.run('2026-11-04', 'Premium Room', 5, 5, 0);

    // Synchronize inventory with any confirmed bookings in the database
    const confirmedBookings = db.prepare("SELECT * FROM bookings WHERE status = 'confirmed'").all();
    for (const b of confirmedBookings) {
      const dates = getDatesList(b.check_in, b.check_out);
      for (const date of dates) {
        const inv = db.prepare('SELECT * FROM room_inventory WHERE date = ? AND room_type = ?').get(date, b.room_type);
        if (inv) {
          // If unreserved in this row, allocate
          if (inv.booked_rooms === 0) {
            const booked = Math.min(inv.total_rooms, b.rooms);
            db.prepare(`
              UPDATE room_inventory
              SET booked_rooms = ?, available_rooms = total_rooms - ?
              WHERE date = ? AND room_type = ?
            `).run(booked, booked, date, b.room_type);
          }
        }
      }
    }
  });

  seedTx();
}

// Auto-seed on initialization
try {
  seedInventory();
} catch (e) {
  console.error('Error auto-seeding inventory:', e);
}

/**
 * Checks inventory for every night in the date range.
 * Returns availability, minimum available rooms across all nights, and daily breakdown.
 */
export function getAvailabilityForRange(checkIn, checkOut, roomType = null, requestedRooms = 1) {
  const dates = getDatesList(checkIn, checkOut);
  if (dates.length === 0) {
    throw new Error('Check-out date must be after check-in date.');
  }

  const roomTypesToQuery = roomType && ROOM_CONFIG[roomType]
    ? [roomType]
    : Object.keys(ROOM_CONFIG);

  const results = [];

  for (const rType of roomTypesToQuery) {
    const config = ROOM_CONFIG[rType];
    const dailyBreakdown = [];
    let minAvailable = Infinity;

    for (const date of dates) {
      let inv = db.prepare('SELECT * FROM room_inventory WHERE date = ? AND room_type = ?').get(date, rType);
      
      if (!inv) {
        // Auto-seed missing future date
        const total = config.totalInventory || 5;
        db.prepare(`
          INSERT OR IGNORE INTO room_inventory (date, room_type, total_rooms, booked_rooms, available_rooms)
          VALUES (?, ?, ?, 0, ?)
        `).run(date, rType, total, total);
        inv = db.prepare('SELECT * FROM room_inventory WHERE date = ? AND room_type = ?').get(date, rType);
      }

      dailyBreakdown.push({
        date,
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
export function checkAvailability(roomType, checkIn, checkOut, rooms = 1) {
  try {
    const results = getAvailabilityForRange(checkIn, checkOut, roomType, rooms);
    if (!results || results.length === 0) return false;
    return results[0].isAvailable;
  } catch (err) {
    return false;
  }
}

/**
 * Generates a unique luxury booking reference. Example: RRV-2026-F9A2
 */
export function generateReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomCode = '';
  for (let i = 0; i < 4; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `RRV-${year}-${randomCode}`;
}

/**
 * Atomically reserves rooms, validates inventory for every night,
 * decrements available inventory, and inserts the confirmed booking record.
 */
export function reserveBooking(bookingData) {
  const reserveTx = db.transaction(() => {
    const dates = getDatesList(bookingData.checkIn, bookingData.checkOut);
    if (dates.length === 0) {
      throw new Error('Check-out date must be at least one day after check-in date.');
    }

    const roomsRequested = Math.max(1, parseInt(bookingData.rooms || 1, 10));
    const rType = bookingData.roomType;
    const config = ROOM_CONFIG[rType];
    if (!config) {
      throw new Error(`Unrecognized accommodation type: ${rType}`);
    }

    // 1. Re-validate inventory under immediate transaction lock for EVERY night
    for (const date of dates) {
      let inv = db.prepare('SELECT * FROM room_inventory WHERE date = ? AND room_type = ?').get(date, rType);
      if (!inv) {
        const total = config.totalInventory || 5;
        db.prepare(`
          INSERT OR IGNORE INTO room_inventory (date, room_type, total_rooms, booked_rooms, available_rooms)
          VALUES (?, ?, ?, 0, ?)
        `).run(date, rType, total, total);
        inv = db.prepare('SELECT * FROM room_inventory WHERE date = ? AND room_type = ?').get(date, rType);
      }

      if (inv.available_rooms < roomsRequested) {
        if (inv.available_rooms === 0) {
          throw new Error(`"${rType}" is completely Sold Out for ${date}. Please choose another date or suite.`);
        } else {
          throw new Error(
            `Only ${inv.available_rooms} room(s) available for "${rType}" on ${date}, but you requested ${roomsRequested}.`
          );
        }
      }
    }

    // 2. Decrement available inventory atomically (optimistic lock prevents race conditions)
    const updateStmt = db.prepare(`
      UPDATE room_inventory
      SET booked_rooms = booked_rooms + ?,
          available_rooms = available_rooms - ?
      WHERE date = ? AND room_type = ? AND available_rooms >= ?
    `);

    for (const date of dates) {
      const res = updateStmt.run(roomsRequested, roomsRequested, date, rType, roomsRequested);
      if (res.changes === 0) {
        throw new Error(`Inventory conflict: rooms on ${date} were just reserved by another guest. Please try again.`);
      }
    }

    // 3. Insert verified booking record
    const reference = generateReference();
    const pricePerNight = config.pricePerNight;
    const totalPrice = dates.length * pricePerNight * roomsRequested;

    const stmt = db.prepare(`
      INSERT INTO bookings (
        reference,
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
        special_requests,
        status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed'
      )
    `);

    stmt.run(
      reference,
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
      pricePerNight,
      totalPrice,
      bookingData.specialRequests ? bookingData.specialRequests.trim() : null
    );

    const booking = db.prepare('SELECT * FROM bookings WHERE reference = ?').get(reference);

    // Return the updated inventory state for these dates
    const updatedInventory = dates.map((d) =>
      db.prepare('SELECT * FROM room_inventory WHERE date = ? AND room_type = ?').get(d, rType)
    );

    return { booking, updatedInventory };
  });

  return reserveTx();
}

/**
 * Cancels a booking and restores inventory back to SQLite.
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

    // 1. Mark booking as cancelled
    db.prepare("UPDATE bookings SET status = 'cancelled' WHERE reference = ?").run(reference);

    // 2. Restore inventory for all reserved dates
    const dates = getDatesList(booking.check_in, booking.check_out);
    const restoreStmt = db.prepare(`
      UPDATE room_inventory
      SET booked_rooms = MAX(0, booked_rooms - ?),
          available_rooms = MIN(total_rooms, available_rooms + ?)
      WHERE date = ? AND room_type = ?
    `);

    for (const date of dates) {
      restoreStmt.run(booking.rooms, booking.rooms, date, booking.room_type);
    }

    const updatedBooking = db.prepare('SELECT * FROM bookings WHERE reference = ?').get(reference);
    const restoredInventory = dates.map((d) =>
      db.prepare('SELECT * FROM room_inventory WHERE date = ? AND room_type = ?').get(d, booking.room_type)
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
 * Retrieves all bookings (for management or verification).
 */
export function getAllBookings(limit = 50) {
  return db.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT ?').all(limit);
}

/**
 * Retrieves the raw room inventory for a given date range.
 */
export function getRawInventory(startDate, endDate, roomType = null) {
  if (roomType) {
    return db
      .prepare(
        'SELECT * FROM room_inventory WHERE date >= ? AND date <= ? AND room_type = ? ORDER BY date ASC'
      )
      .all(startDate, endDate, roomType);
  }
  return db
    .prepare(
      'SELECT * FROM room_inventory WHERE date >= ? AND date <= ? ORDER BY date ASC, room_type ASC'
    )
    .all(startDate, endDate);
}

export default db;
