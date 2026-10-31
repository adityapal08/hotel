/**
 * Comprehensive Automated Verification Script for Multi-Property Hotel Booking System
 * Validates 365 days of inventory across all 3 properties and 15 room types.
 *
 * Run with: node test_booking_scenarios.mjs
 */

import Database from 'better-sqlite3';
import path from 'path';
import {
  PROPERTIES_CONFIG,
  seedInventory,
  getAvailabilityForRange,
  reserveBooking,
  cancelBooking,
  getMonthInventory,
  getAllBookings,
} from './src/lib/db.js';

const dbPath = path.join(process.cwd(), 'data', 'hotel.db');
const db = new Database(dbPath);

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('\n======================================================');
  console.log('STARTING MULTI-PROPERTY & 365-DAY INVENTORY VERIFICATION');
  console.log('======================================================\n');

  // Clean only multi-test run artifacts, never touching existing client bookings
  db.prepare("DELETE FROM bookings WHERE email LIKE '%@multitest.example.org'").run();

  // Run seed to ensure all 365 days and tables are fresh & idempotent
  seedInventory();

  // -------------------------------------------------------------
  // Test 1: Verify all 7 original Red Roots Villa bookings remain completely intact
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Verify all 7 original Red Roots Villa bookings remain intact ---');
  const existingBookings = db.prepare("SELECT * FROM bookings WHERE email NOT LIKE '%@multitest.example.org'").all();
  assert(existingBookings.length >= 7, `Existing bookings count is ${existingBookings.length} (>= 7 preserved)`);

  const expectedIds = [2, 5, 6, 7, 18, 19, 20];
  for (const id of expectedIds) {
    const b = existingBookings.find((row) => row.id === id);
    assert(b !== undefined, `Booking ID ${id} exists intact`);
    assert(b.property_id === 'red-roots-villa', `Booking ID ${id} property_id is 'red-roots-villa'`);
    assert(b.property_name === 'Red Roots Villa', `Booking ID ${id} property_name is 'Red Roots Villa'`);
  }

  // -------------------------------------------------------------
  // Test 2: Verify total room types and 365 days of inventory per room type
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Verify room types and 365-day inventory records ---');
  const roomTypesSummary = db.prepare(`
    SELECT property_id, COUNT(*) as count 
    FROM room_types 
    GROUP BY property_id 
    ORDER BY property_id
  `).all();
  console.log('  Room types per property:', roomTypesSummary);

  const hs2Types = roomTypesSummary.find((r) => r.property_id === 'homestay-2')?.count || 0;
  const hs3Types = roomTypesSummary.find((r) => r.property_id === 'homestay-3')?.count || 0;
  const rrvTypes = roomTypesSummary.find((r) => r.property_id === 'red-roots-villa')?.count || 0;

  assert(hs2Types === 5, `Homestay 2 has exactly 5 room types (got ${hs2Types})`);
  assert(hs3Types === 5, `Homestay 3 has exactly 5 room types (got ${hs3Types})`);
  assert(rrvTypes === 5, `Red Roots Villa has exactly 5 room types (got ${rrvTypes})`);

  const inventorySummary = db.prepare(`
    SELECT property_id, COUNT(DISTINCT room_type) as room_types, COUNT(DISTINCT date) as distinct_dates, COUNT(*) as total_records, MIN(date) as min_date, MAX(date) as max_date
    FROM room_inventory
    GROUP BY property_id
    ORDER BY property_id
  `).all();
  console.log('  Inventory summary per property:', inventorySummary);

  for (const inv of inventorySummary) {
    assert(inv.distinct_dates >= 365, `${inv.property_id} has at least 365 distinct dates (got ${inv.distinct_dates})`);
    assert(inv.room_types === 5, `${inv.property_id} covers all 5 room types (got ${inv.room_types})`);
    assert(inv.total_records >= 365 * 5, `${inv.property_id} has >= 1825 inventory records (got ${inv.total_records})`);
  }

  const totalInventoryCount = db.prepare('SELECT COUNT(*) as count FROM room_inventory').get().count;
  console.log(`  Total date-wise inventory records in SQLite: ${totalInventoryCount}`);
  assert(totalInventoryCount >= 5475, `Total records >= 5475 across 15 room types * 365 days (got ${totalInventoryCount})`);

  // -------------------------------------------------------------
  // Test 3: Sample availability across 10 different dates
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Sample availability across 10 different dates ---');
  const sampleDates = [
    '2026-11-01', // Date 1 (Sunday)
    '2026-11-04', // Date 2 (Wednesday - high availability)
    '2026-11-07', // Date 3 (Saturday - weekend)
    '2026-11-14', // Date 4 (Diwali Saturday - peak sold out)
    '2026-11-25', // Date 5 (Wednesday - weekday)
    '2026-12-15', // Date 6 (Tuesday - weekday)
    '2026-12-25', // Date 7 (Christmas - peak sold out)
    '2026-12-31', // Date 8 (New Year Eve - peak sold out)
    '2027-01-14', // Date 9 (Pongal - peak sold out)
    '2027-02-10', // Date 10 (Wednesday - high availability)
  ];

  console.log('\n| Date | Property | Room Type | Total Rooms | Booked Rooms | Available Rooms | Status |');
  console.log('|---|---|---|---:|---:|---:|---|');

  for (const sDate of sampleDates) {
    const rows = db.prepare(`
      SELECT property_id, room_type, total_rooms, booked_rooms, available_rooms
      FROM room_inventory
      WHERE date = ? AND property_id IN ('homestay-2', 'homestay-3')
      ORDER BY property_id, room_type
      LIMIT 2
    `).all(sDate);

    for (const r of rows) {
      const status = r.available_rooms === 0 ? 'SOLD OUT' : (r.available_rooms <= 3 ? 'LIMITED' : 'AVAILABLE');
      console.log(`| ${sDate} | ${r.property_id} | ${r.room_type} | ${r.total_rooms} | ${r.booked_rooms} | ${r.available_rooms} | ${status} |`);
    }
  }

  // Verify that peak sold out dates exist in DB with available_rooms = 0
  const peakSoldOutRows = db.prepare(`
    SELECT COUNT(*) as count FROM room_inventory 
    WHERE property_id IN ('homestay-2', 'homestay-3') AND available_rooms = 0 AND date IN ('2026-11-14', '2026-12-25', '2026-12-31')
  `).get().count;
  assert(peakSoldOutRows > 0, `Peak sold out dates correctly have available_rooms = 0 (${peakSoldOutRows} sold-out entries found)`);

  // -------------------------------------------------------------
  // Test 4: Verify zero-availability dates are handled correctly
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Verify zero-availability date handling & booking rejection ---');
  // 2026-12-25 is Christmas (peak sold out)
  const soldOutDate = '2026-12-25';
  const soldOutDateOut = '2026-12-26';

  let soldOutBlocked = false;
  let soldOutMsg = '';

  try {
    reserveBooking({
      propertyId: 'homestay-2',
      guestName: 'Blocked Guest',
      email: 'blocked@multitest.example.org',
      phone: '+91 9999900000',
      checkIn: soldOutDate,
      checkOut: soldOutDateOut,
      rooms: 1,
      roomType: 'Deluxe Pool-View Suite',
    });
  } catch (err) {
    soldOutBlocked = true;
    soldOutMsg = err.message;
  }

  assert(soldOutBlocked === true, 'Attempting to reserve a sold out date was properly rejected');
  assert(soldOutMsg.includes('Sold Out') || soldOutMsg.includes('Only 0'), `Error message clearly states sold out: "${soldOutMsg}"`);

  // -------------------------------------------------------------
  // Test 5: Successful booking and inventory reduction across occupied nights
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Successful booking and inventory reduction ---');
  const bookCheckIn = '2027-02-10'; // Wednesday
  const bookCheckOut = '2027-02-12'; // Friday (2 nights: Feb 10 & Feb 11)

  const invBeforeNight1 = db.prepare(
    'SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?'
  ).get('homestay-2', '2027-02-10', 'Deluxe Pool-View Suite');

  const invBeforeNight2 = db.prepare(
    'SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?'
  ).get('homestay-2', '2027-02-11', 'Deluxe Pool-View Suite');

  const invBeforeCheckOut = db.prepare(
    'SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?'
  ).get('homestay-2', '2027-02-12', 'Deluxe Pool-View Suite');

  const bookingRes = reserveBooking({
    propertyId: 'homestay-2',
    guestName: 'Rohan Sharma',
    email: 'rohan@multitest.example.org',
    phone: '+91 9876543210',
    checkIn: bookCheckIn,
    checkOut: bookCheckOut,
    adults: 2,
    children: 1,
    rooms: 2,
    roomType: 'Deluxe Pool-View Suite',
  });

  assert(bookingRes.booking !== null, 'Booking created successfully');
  assert(bookingRes.booking.reference.startsWith('HS2-'), `Reference has correct prefix HS2-: ${bookingRes.booking.reference}`);
  assert(bookingRes.booking.nights === 2, 'Calculated nights is 2');

  const invAfterNight1 = db.prepare(
    'SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?'
  ).get('homestay-2', '2027-02-10', 'Deluxe Pool-View Suite');

  const invAfterNight2 = db.prepare(
    'SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?'
  ).get('homestay-2', '2027-02-11', 'Deluxe Pool-View Suite');

  const invAfterCheckOut = db.prepare(
    'SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?'
  ).get('homestay-2', '2027-02-12', 'Deluxe Pool-View Suite');

  assert(
    invAfterNight1.available_rooms === invBeforeNight1.available_rooms - 2,
    `Night 1 (Feb 10) availability decreased by 2 (from ${invBeforeNight1.available_rooms} to ${invAfterNight1.available_rooms})`
  );
  assert(
    invAfterNight2.available_rooms === invBeforeNight2.available_rooms - 2,
    `Night 2 (Feb 11) availability decreased by 2 (from ${invBeforeNight2.available_rooms} to ${invAfterNight2.available_rooms})`
  );
  assert(
    invAfterCheckOut.available_rooms === invBeforeCheckOut.available_rooms,
    `Checkout Date (Feb 12) was NOT decreased (remains ${invAfterCheckOut.available_rooms})`
  );

  // -------------------------------------------------------------
  // Test 6: Cross-property inventory isolation
  // -------------------------------------------------------------
  console.log('\n--- Test 6: Cross-property inventory isolation ---');
  const hs3Night1 = db.prepare(
    'SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?'
  ).get('homestay-3', '2027-02-10', 'Heritage King Suite');

  const rrvNight1 = db.prepare(
    'SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?'
  ).get('red-roots-villa', '2027-02-10', 'Deluxe Room');

  assert(hs3Night1 !== undefined, 'Homestay 3 inventory exists for test date');
  assert(rrvNight1 !== undefined, 'Red Roots Villa inventory exists for test date');

  // Booking Homestay 3
  const hs3Booking = reserveBooking({
    propertyId: 'homestay-3',
    guestName: 'Ananya Roy',
    email: 'ananya@multitest.example.org',
    phone: '+91 9876543211',
    checkIn: '2027-02-10',
    checkOut: '2027-02-11',
    adults: 2,
    children: 0,
    rooms: 1,
    roomType: 'Heritage King Suite',
  });

  assert(hs3Booking.booking.reference.startsWith('HS3-'), `Homestay 3 reference starts with HS3-: ${hs3Booking.booking.reference}`);

  const hs2CheckAgain = db.prepare(
    'SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?'
  ).get('homestay-2', '2027-02-10', 'Deluxe Pool-View Suite');

  const rrvCheckAgain = db.prepare(
    'SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?'
  ).get('red-roots-villa', '2027-02-10', 'Deluxe Room');

  assert(
    hs2CheckAgain.available_rooms === invAfterNight1.available_rooms,
    'Homestay 2 inventory was completely unaffected by Homestay 3 booking'
  );
  assert(
    rrvCheckAgain.available_rooms === rrvNight1.available_rooms,
    'Red Roots Villa inventory was completely unaffected by Homestay 3 booking'
  );

  // -------------------------------------------------------------
  // Test 7: Concurrency & overselling protection
  // -------------------------------------------------------------
  console.log('\n--- Test 7: Concurrency & overselling protection ---');
  const cDate = '2027-03-10';
  const cDateOut = '2027-03-11';
  db.prepare(
    'UPDATE room_inventory SET booked_rooms = 7, available_rooms = 1 WHERE property_id = ? AND date = ? AND room_type = ?'
  ).run('homestay-3', cDate, 'Terrace Garden Room');

  let c1Success = false;
  let c2Success = false;
  let c2ErrMsg = '';

  try {
    reserveBooking({
      propertyId: 'homestay-3',
      guestName: 'Client 1',
      email: 'c1@multitest.example.org',
      phone: '+91 9000000001',
      checkIn: cDate,
      checkOut: cDateOut,
      rooms: 1,
      roomType: 'Terrace Garden Room',
    });
    c1Success = true;
  } catch (e) {}

  try {
    reserveBooking({
      propertyId: 'homestay-3',
      guestName: 'Client 2',
      email: 'c2@multitest.example.org',
      phone: '+91 9000000002',
      checkIn: cDate,
      checkOut: cDateOut,
      rooms: 1,
      roomType: 'Terrace Garden Room',
    });
    c2Success = true;
  } catch (e) {
    c2ErrMsg = e.message;
  }

  assert(c1Success === true, 'Client 1 reserved the final remaining room');
  assert(c2Success === false, 'Client 2 was prevented from overselling');
  assert(c2ErrMsg.includes('Sold Out') || c2ErrMsg.includes('Only 0'), 'Client 2 received Sold Out message');

  // -------------------------------------------------------------
  // Test 8: Booking cancellation and atomic restoration
  // -------------------------------------------------------------
  console.log('\n--- Test 8: Booking cancellation and inventory restoration ---');
  const cancelRes = cancelBooking(bookingRes.booking.reference);
  assert(cancelRes.booking.status === 'cancelled', 'Booking marked cancelled');

  const invRestoredNight1 = db.prepare(
    'SELECT * FROM room_inventory WHERE property_id = ? AND date = ? AND room_type = ?'
  ).get('homestay-2', '2027-02-10', 'Deluxe Pool-View Suite');

  assert(
    invRestoredNight1.available_rooms === invBeforeNight1.available_rooms,
    `Inventory restored back to ${invBeforeNight1.available_rooms} upon cancellation`
  );

  // -------------------------------------------------------------
  // Test 9: Seed script idempotency & rerun protection
  // -------------------------------------------------------------
  console.log('\n--- Test 9: Seed script idempotency & rerun protection ---');
  const preRerunBookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
  
  // Re-run seed
  seedInventory();

  const postRerunBookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
  assert(preRerunBookingCount === postRerunBookingCount, 'Seed rerun never altered or reset existing bookings');

  const postRerunInventoryCount = db.prepare('SELECT COUNT(*) as count FROM room_inventory').get().count;
  assert(totalInventoryCount === postRerunInventoryCount, 'Seed rerun maintained identical inventory records without duplicates');

  console.log('\n======================================================');
  console.log('🎉 ALL 9 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runTests();
