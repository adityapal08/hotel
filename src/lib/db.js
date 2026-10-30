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

// Enable Write-Ahead Logging for speed and concurrency
db.pragma('journal_mode = WAL');

// Initialize Bookings Table
db.exec(`
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
`);

export const ROOM_CONFIG = {
  'Entire 3BHK Private Pool Villa': {
    pricePerNight: 15000,
    maxGuests: 8,
    maxRooms: 1,
    description: 'Exclusive 3BHK Villa with private pool, kitchen, and grounds.',
  },
  'The Master King Suite': {
    pricePerNight: 6500,
    maxGuests: 3,
    maxRooms: 1,
    description: 'Ground floor master bedroom with king bed and en-suite bath.',
  },
  'The Garden Deluxe Suite': {
    pricePerNight: 5500,
    maxGuests: 2,
    maxRooms: 1,
    description: 'Upper floor suite with garden views and queen bed.',
  },
};

/**
 * Checks if a room type is available for the given date range.
 */
export function checkAvailability(roomType, checkIn, checkOut) {
  let query;
  let params;

  if (roomType === 'Entire 3BHK Private Pool Villa') {
    query = `
      SELECT COUNT(*) as count FROM bookings
      WHERE status = 'confirmed'
        AND check_in < ?
        AND check_out > ?
    `;
    params = [checkOut, checkIn];
  } else {
    query = `
      SELECT COUNT(*) as count FROM bookings
      WHERE status = 'confirmed'
        AND (room_type = ? OR room_type = 'Entire 3BHK Private Pool Villa')
        AND check_in < ?
        AND check_out > ?
    `;
    params = [roomType, checkOut, checkIn];
  }

  const row = db.prepare(query).get(...params);
  return row.count === 0;
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
 * Inserts a new booking into the database.
 */
export function createBooking(data) {
  const reference = generateReference();

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
    data.guestName.trim(),
    data.email.trim().toLowerCase(),
    data.phone.trim(),
    data.checkIn,
    data.checkOut,
    data.nights,
    data.adults,
    data.children,
    data.rooms,
    data.roomType,
    data.pricePerNight,
    data.totalPrice,
    data.specialRequests ? data.specialRequests.trim() : null
  );

  return getBookingByReference(reference);
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

export default db;
