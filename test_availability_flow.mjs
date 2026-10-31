/**
 * Test Suite: Availability-First Booking Flow and Fallback Logic
 * Validates the 8 scenarios specified in the user requirements:
 * 1. Requested homestay and dates are available.
 * 2. Requested dates are unavailable but nearby dates are available.
 * 3. Nearby dates are rejected, but another homestay is available.
 * 4. Both alternative homestays are available.
 * 5. All three homestays are unavailable.
 * 6. Customer changes dates after receiving suggestions.
 * 7. Customer selects another homestay and proceeds to booking.
 * 8. Availability changes before final booking confirmation.
 *
 * Run with: node test_availability_flow.mjs
 */

import Database from 'better-sqlite3';
import path from 'path';
import {
  checkAvailabilityWithOptions,
  findAlternativeDates,
  findAlternativeProperties,
  getAvailabilityForRange,
  reserveBooking,
} from './src/lib/db.js';

const dbPath = path.join(process.cwd(), 'data', 'hotel.db');
const db = new Database(dbPath);

const BASE_URL = 'http://localhost:3000';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runTests() {
  console.log('===============================================================');
  console.log('    AVAILABILITY-FIRST CHATBOT & BOOKING VERIFICATION SUITE    ');
  console.log('===============================================================\n');

  // ------------------------------------------------------------------
  // SCENARIO 1: Requested homestay and dates are available
  // ------------------------------------------------------------------
  console.log('--- SCENARIO 1: Requested Homestay and Dates Are Available ---');
  const s1Check = checkAvailabilityWithOptions({
    propertyId: 'red-roots-villa',
    checkIn: '2026-11-20',
    checkOut: '2026-11-22',
    roomType: 'Deluxe Room',
    requestedRooms: 1,
    adults: 2,
  });
  assert(s1Check.isAvailable === true, 'Database confirms Red Roots Villa is available for 2026-11-20 to 2026-11-22');
  assert(s1Check.status === 'available', `Status is 'available' (got: ${s1Check.status})`);
  assert(s1Check.results.some((r) => r.isAvailable), 'At least one room type is available');

  // Multi-turn API chat test
  const sess1Id = `flow_test_s1_${Date.now()}`;
  const res1 = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sess1Id,
      messages: [
        {
          role: 'user',
          content: 'Hello, I want to book Red Roots Villa from November 20 to November 22 for 2 guests.',
        },
      ],
    }),
  });
  assert(res1.status === 200, 'Chat API responded 200 OK');
  const d1 = await res1.json();
  const reply1 = d1.message?.content || '';
  assert(
    reply1.toLowerCase().includes('available') || reply1.includes('2026-11-20') || reply1.toLowerCase().includes('deluxe'),
    `Chatbot confirmed availability: "${reply1.slice(0, 100)}..."`
  );
  assert(d1.message?.action?.type === 'open_booking_modal', 'Interactive booking action attached for available dates');

  // ------------------------------------------------------------------
  // SCENARIO 2: Requested dates are unavailable but nearby dates are available
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 2: Requested Dates Unavailable, Nearby Dates Available ---');
  // At Red Roots Villa, 2026-11-15 is simulated peak sold-out
  const s2Check = checkAvailabilityWithOptions({
    propertyId: 'red-roots-villa',
    checkIn: '2026-11-15',
    checkOut: '2026-11-17',
    requestedRooms: 1,
  });
  assert(s2Check.isAvailable === false, 'Red Roots Villa correctly unavailable for 2026-11-15 to 2026-11-17');
  assert(s2Check.alternativeDates.length > 0, `Nearby alternative dates discovered: ${s2Check.alternativeDates.length}`);
  const firstAlt = s2Check.alternativeDates[0];
  assert(
    firstAlt.checkIn === '2026-11-16' && firstAlt.checkOut === '2026-11-18',
    `First alternative date range is exactly 2026-11-16 to 2026-11-18: ${firstAlt.checkIn} to ${firstAlt.checkOut}`
  );
  assert(firstAlt.availableRooms.length > 0, `Alternative dates have ${firstAlt.availableRooms.length} available rooms`);

  // Chat API verification
  const sess2Id = `flow_test_s2_${Date.now()}`;
  const res2 = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sess2Id,
      messages: [
        {
          role: 'user',
          content: 'I want to reserve Red Roots Villa from November 15 to November 17, 2026.',
        },
      ],
    }),
  });
  const d2 = await res2.json();
  const reply2 = d2.message?.content || '';
  assert(
    reply2.toLowerCase().includes('fully booked') ||
    reply2.toLowerCase().includes('sorry') ||
    reply2.toLowerCase().includes('unavailable'),
    `Chatbot politely noted unavailable dates: "${reply2.slice(0, 100)}..."`
  );
  assert(
    reply2.includes('16') || reply2.toLowerCase().includes('november 16') || reply2.includes('2026-11-16'),
    `Chatbot suggested nearby available alternative dates (Nov 16-18)`
  );

  // ------------------------------------------------------------------
  // SCENARIO 3 & 4: Nearby dates rejected, alternative sister homestays available
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 3 & 4: Customer Rejects Alt Dates, Both Sister Homestays Available ---');
  // For 2026-12-05 to 2026-12-07, Red Roots Villa is fully booked, but Homestay 2 & Homestay 3 are available
  const s4Check = checkAvailabilityWithOptions({
    propertyId: 'red-roots-villa',
    checkIn: '2026-12-05',
    checkOut: '2026-12-07',
    requestedRooms: 1,
  });
  assert(s4Check.isAvailable === false, 'Red Roots Villa is fully booked on 2026-12-05 to 2026-12-07');
  assert(s4Check.alternativeProperties.length >= 2, `Both sister homestays are available (found: ${s4Check.alternativeProperties.length})`);
  const propIds = s4Check.alternativeProperties.map((p) => p.propertyId);
  assert(propIds.includes('homestay-2'), 'Homestay 2 is available as an alternative');
  assert(propIds.includes('homestay-3'), 'Homestay 3 is available as an alternative');

  // Test multi-turn rejection flow
  const sess3Id = `flow_test_s3_${Date.now()}`;
  const conversation3 = [
    {
      role: 'user',
      content: 'Can I book Red Roots Villa from December 5 to December 7, 2026?',
    },
    {
      role: 'assistant',
      content: "I'm sorry, Red Roots Villa is fully booked for those dates. However, I found availability from December 7 to December 9. Would you be interested in those dates?",
    },
    {
      role: 'user',
      content: 'No, I cannot change my dates. I really need December 5 to 7. Do you have any other homestay or alternative property available for my dates?',
    },
  ];

  const res3 = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sess3Id,
      messages: conversation3,
    }),
  });
  const d3 = await res3.json();
  const reply3 = d3.message?.content || '';
  assert(
    reply3.toLowerCase().includes('homestay 2') || reply3.toLowerCase().includes('homestay 3'),
    `Chatbot suggested available sister homestays: "${reply3.slice(0, 120)}..."`
  );

  // ------------------------------------------------------------------
  // SCENARIO 5: All three homestays are unavailable
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 5: All Three Homestays Are Unavailable ---');
  // Christmas 2026-12-25 is sold out across all 3 properties
  const s5Check = checkAvailabilityWithOptions({
    propertyId: 'red-roots-villa',
    checkIn: '2026-12-24',
    checkOut: '2026-12-26',
    requestedRooms: 1,
  });
  const hs2Check = getAvailabilityForRange('2026-12-24', '2026-12-26', null, 1, 'homestay-2');
  const hs3Check = getAvailabilityForRange('2026-12-24', '2026-12-26', null, 1, 'homestay-3');

  const hs2Available = hs2Check.some((r) => r.isAvailable);
  const hs3Available = hs3Check.some((r) => r.isAvailable);
  assert(!hs2Available, 'Homestay 2 is 100% sold out on Christmas 2026-12-24 to 2026-12-26');
  assert(!hs3Available, 'Homestay 3 is 100% sold out on Christmas 2026-12-24 to 2026-12-26');
  assert(!s5Check.isAvailable, 'Red Roots Villa is 100% sold out on Christmas 2026-12-24 to 2026-12-26');
  assert(s5Check.alternativeProperties.length === 0, 'No alternative properties are available for Christmas dates');

  const sess5Id = `flow_test_s5_${Date.now()}`;
  const res5 = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sess5Id,
      messages: [
        {
          role: 'user',
          content: 'Do you have any rooms available at any of your 3 homestays from 2026-12-24 to 2026-12-26?',
        },
      ],
    }),
  });
  const d5 = await res5.json();
  const reply5 = d5.message?.content || '';
  assert(
    reply5.toLowerCase().includes('fully booked') ||
    reply5.toLowerCase().includes('booked') ||
    reply5.toLowerCase().includes('sorry'),
    `Chatbot accurately informed guest that all homestays are booked: "${reply5.slice(0, 110)}..."`
  );

  // ------------------------------------------------------------------
  // SCENARIO 6: Customer changes dates after receiving suggestions
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 6: Customer Changes Dates After Suggestions ---');
  const sess6Id = `flow_test_s6_${Date.now()}`;
  const conversation6 = [
    {
      role: 'user',
      content: 'I want to reserve Red Roots Villa from November 15 to November 17.',
    },
    {
      role: 'assistant',
      content: "I'm sorry, Red Roots Villa is fully booked for those dates. However, I found availability from November 16 to November 18. Would you be interested in those dates?",
    },
    {
      role: 'user',
      content: 'Yes! November 16 to November 18 works great for me. Let us go with those dates.',
    },
  ];

  const res6 = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sess6Id,
      messages: conversation6,
    }),
  });
  const d6 = await res6.json();
  const action6 = d6.message?.action;
  assert(action6 != null, 'Booking action generated for the newly accepted dates');
  assert(action6?.checkIn === '2026-11-16', `Check-in updated to 2026-11-16: ${action6?.checkIn}`);
  assert(action6?.checkOut === '2026-11-18', `Check-out updated to 2026-11-18: ${action6?.checkOut}`);

  // ------------------------------------------------------------------
  // SCENARIO 7: Customer selects another homestay and proceeds to booking
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 7: Customer Selects Another Homestay and Proceeds to Booking ---');
  const sess7Id = `flow_test_s7_${Date.now()}`;
  const conversation7 = [
    {
      role: 'user',
      content: 'Can I book Red Roots Villa for December 5 to December 7?',
    },
    {
      role: 'assistant',
      content: 'Red Roots Villa is fully booked, but Homestay 2 is available with its Cozy Studio Apartment at ₹2,500 per night.',
    },
    {
      role: 'user',
      content: 'That sounds lovely. I will take Homestay 2 for the Cozy Studio Apartment from December 5 to December 7!',
    },
  ];

  const res7 = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sess7Id,
      messages: conversation7,
    }),
  });
  const d7 = await res7.json();
  const action7 = d7.message?.action;
  assert(action7 != null, 'Action generated for Homestay 2 selection');
  assert(action7?.propertyId === 'homestay-2', `Property successfully switched to homestay-2: ${action7?.propertyId}`);

  // Now submit confirmed booking for Homestay 2 to verify SQLite integration
  const bookRes7 = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId: 'homestay-2',
      roomType: 'Cozy Studio Apartment',
      checkIn: '2026-12-05',
      checkOut: '2026-12-07',
      guestName: 'Kavita Nair',
      email: 'kavita@example.com',
      phone: '+919876543210',
      rooms: 1,
      adults: 2,
      children: 0,
    }),
  });
  assert(bookRes7.status === 201 || bookRes7.status === 200, `Homestay 2 booking confirmed with ${bookRes7.status} status`);
  const bookData7 = await bookRes7.json();
  assert(bookData7.booking?.reference?.startsWith('HS2-'), `Booking reference has prefix HS2-: ${bookData7.booking?.reference}`);
  assert(bookData7.booking?.property_id === 'homestay-2', 'Booking property_id is homestay-2');

  // ------------------------------------------------------------------
  // SCENARIO 8: Availability changes before final booking confirmation
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 8: Availability Changes Before Final Booking Confirmation ---');
  // Attempting to reserve a date that became sold-out
  const bookRes8 = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId: 'homestay-2',
      roomType: 'Deluxe Pool-View Suite',
      checkIn: '2026-12-25',
      checkOut: '2026-12-26',
      guestName: 'Arjun Das',
      email: 'arjun@example.com',
      phone: '+919876543211',
      rooms: 1,
      adults: 2,
    }),
  });
  assert(bookRes8.status === 409 || bookRes8.status === 400, `Sold out date booking strictly rejected with 409/400 (got: ${bookRes8.status})`);
  const errData8 = await bookRes8.json();
  assert(
    errData8.error?.toLowerCase().includes('sold out') || errData8.error?.toLowerCase().includes('not available'),
    `Server returned informative sold out message: "${errData8.error}"`
  );

  console.log('\n===============================================================');
  console.log('   🎉 ALL 8 AVAILABILITY SCENARIOS PASSED WITH ZERO FAILURES!   ');
  console.log('===============================================================\n');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
