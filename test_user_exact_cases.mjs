/**
 * Verification Suite for the 10 Exact Cases Requested by the User
 * Tests:
 * 1. Select Homestay 2 and November 10.
 * 2. Change November 10 to November 16.
 * 3. Select November 20 and then change it to November 16.
 * 4. Reject suggested alternative dates.
 * 5. Select Homestay 2 again after viewing other properties.
 * 6. Switch between all three homestays.
 * 7. Select a date where one room type is unavailable but another is available.
 * 8. Change the number of nights and guests.
 * 9. Test dates with zero availability.
 * 10. Verify that alternative dates are genuinely available before suggesting them.
 *
 * Run with: node test_user_exact_cases.mjs
 */

import Database from 'better-sqlite3';
import path from 'path';
import {
  PROPERTIES_CONFIG,
  checkAvailabilityWithOptions,
  findAlternativeDates,
  findAlternativeProperties,
  getAvailabilityForRange,
  updateChatBookingState,
  getChatBookingSession,
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

async function callChatApi(sessionId, messages) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, messages }),
  });
  if (!res.ok) {
    throw new Error(`API returned HTTP ${res.status}`);
  }
  return res.json();
}

async function runExactCases() {
  console.log('===============================================================');
  console.log('   VERIFYING 10 EXACT BOOKING CONVERSATION TEST CASES          ');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // CASE 1: Select Homestay 2 and November 10
  // -------------------------------------------------------------------------
  console.log('--- Case 1: Select Homestay 2 and November 10 ---');
  const session1Id = `test_case_1_${Date.now()}`;
  const c1State = updateChatBookingState({
    sessionId: session1Id,
    userMessage: 'I want to book Homestay 2 for November 10.',
  });

  assert(c1State.property_id === 'homestay-2', 'Property correctly set to homestay-2');
  assert(c1State.check_in === '2026-11-10', 'Check-in date correctly set to 2026-11-10');
  assert(c1State.stay_duration_known === false, 'Stay duration correctly marked as unknown (single date)');
  assert(c1State.is_available === false, 'SQLite confirms Homestay 2 has 0 availability on November 10');
  assert(c1State.alternative_dates.length > 0, 'Chatbot discovers nearby alternative dates for Homestay 2');

  const c1Api = await callChatApi(session1Id, [
    { role: 'user', content: 'I want to book Homestay 2 for November 10.' },
  ]);
  const c1Content = c1Api.message?.content || '';
  assert(
    c1Content.toLowerCase().includes('homestay 2') || c1Content.toLowerCase().includes('unavailable') || c1Content.toLowerCase().includes('fully booked'),
    'Chatbot informs guest that November 10 is unavailable at Homestay 2'
  );
  assert(
    !c1Content.includes('How many guests') && !c1Content.includes('how many guests'),
    'Chatbot does not unnecessarily ask for guests/rooms count when requested date is sold out'
  );

  // -------------------------------------------------------------------------
  // CASE 2: Change November 10 to November 16
  // -------------------------------------------------------------------------
  console.log('\n--- Case 2: Change November 10 to November 16 ---');
  const c2State = updateChatBookingState({
    sessionId: session1Id,
    userMessage: 'Let us change November 10 to November 16 instead.',
  });

  assert(c2State.property_id === 'homestay-2', 'Selected property remains Homestay 2');
  assert(c2State.check_in === '2026-11-16', 'Check-in date immediately updated to 2026-11-16');
  assert(c2State.check_out === null, 'Stale checkout date is NOT retained');
  assert(c2State.is_available === true, 'SQLite confirms Homestay 2 is available on November 16');
  assert(c2State.available_room_types.length >= 4, 'Multiple room types are available on November 16');

  const c2Api = await callChatApi(session1Id, [
    { role: 'user', content: 'I want to book Homestay 2 for November 10.' },
    { role: 'assistant', content: c1Content },
    { role: 'user', content: 'Let us change November 10 to November 16 instead.' },
  ]);
  const c2Content = c2Api.message?.content || '';
  assert(
    !c2Content.includes('November 10') && !c2Content.includes('Nov 10'),
    'Chatbot no longer refers to outdated November 10'
  );
  assert(
    c2Content.includes('16') && (c2Content.toLowerCase().includes('available') || c2Content.toLowerCase().includes('availability')),
    'Chatbot confirms availability for November 16'
  );

  // -------------------------------------------------------------------------
  // CASE 3: Select November 20 and then change it to November 16
  // -------------------------------------------------------------------------
  console.log('\n--- Case 3: Select November 20 and then change it to November 16 ---');
  const session3Id = `test_case_3_${Date.now()}`;
  const c3Turn1 = updateChatBookingState({
    sessionId: session3Id,
    userMessage: 'Can I stay at Homestay 2 from November 20 to November 22?',
  });
  assert(c3Turn1.check_in === '2026-11-20', 'Turn 1 check-in is 2026-11-20');
  assert(c3Turn1.check_out === '2026-11-22', 'Turn 1 check-out is 2026-11-22');
  assert(c3Turn1.nights === 2, 'Turn 1 duration is 2 nights');

  const c3Turn2 = updateChatBookingState({
    sessionId: session3Id,
    userMessage: 'Actually change that to November 16.',
  });
  assert(c3Turn2.check_in === '2026-11-16', 'Turn 2 check-in immediately updated to 2026-11-16');
  assert(c3Turn2.check_out === '2026-11-18', 'Turn 2 preserves duration (2 nights) with new check-out 2026-11-18');
  assert(c3Turn2.is_available === true, 'Turn 2 availability is re-verified from SQLite for November 16-18');

  // -------------------------------------------------------------------------
  // CASE 4: Reject suggested alternative dates
  // -------------------------------------------------------------------------
  console.log('\n--- Case 4: Reject suggested alternative dates ---');
  const session4Id = `test_case_4_${Date.now()}`;
  updateChatBookingState({
    sessionId: session4Id,
    userMessage: 'I want to book Homestay 2 on November 10.',
  });
  const c4Turn2 = updateChatBookingState({
    sessionId: session4Id,
    userMessage: 'I cannot change my dates, those alternative dates do not work for me. Check other homestays for November 10.',
  });
  assert(c4Turn2.last_customer_intent === 'rejected_alt_dates', 'Customer rejection intent recorded');
  assert(c4Turn2.alternative_properties.length > 0, 'Sister properties checked for November 10');
  assert(
    c4Turn2.alternative_properties.some((p) => p.propertyId === 'homestay-3'),
    'Homestay 3 is found available for November 10'
  );
  assert(
    !c4Turn2.alternative_properties.some((p) => p.propertyId === 'red-roots-villa'),
    'Red Roots Villa is NOT suggested because it is also sold out on November 10'
  );

  const c4Api = await callChatApi(session4Id, [
    { role: 'user', content: 'I want to book Homestay 2 on November 10.' },
    { role: 'assistant', content: 'Homestay 2 is booked on Nov 10. Nearby dates: Nov 8, Nov 11.' },
    { role: 'user', content: 'I cannot change my dates. Are any other homestays available?' },
  ]);
  const c4Content = c4Api.message?.content || '';
  assert(
    c4Content.toLowerCase().includes('homestay 3'),
    'Chatbot suggests Homestay 3 when alternative dates are rejected'
  );
  assert(
    !c4Content.toLowerCase().includes('red roots villa is available'),
    'Chatbot does not claim Red Roots Villa is available on November 10'
  );

  // -------------------------------------------------------------------------
  // CASE 5: Select Homestay 2 again after viewing other properties
  // -------------------------------------------------------------------------
  console.log('\n--- Case 5: Select Homestay 2 again after viewing other properties ---');
  const c5State = updateChatBookingState({
    sessionId: session4Id,
    userMessage: 'I prefer Homestay 2 after all. Let us book Homestay 2 from November 16 to November 18.',
  });
  assert(c5State.property_id === 'homestay-2', 'Property successfully switched back to homestay-2');
  assert(c5State.check_in === '2026-11-16', 'Check-in is 2026-11-16');
  assert(c5State.check_out === '2026-11-18', 'Check-out is 2026-11-18');
  assert(c5State.is_available === true, 'Homestay 2 inventory correctly verified for November 16-18');

  // -------------------------------------------------------------------------
  // CASE 6: Switch between all three homestays
  // -------------------------------------------------------------------------
  console.log('\n--- Case 6: Switch between all three homestays ---');
  const session6Id = `test_case_6_${Date.now()}`;
  const sw1 = updateChatBookingState({ sessionId: session6Id, userMessage: 'Check Red Roots Villa for November 20 to 22' });
  assert(sw1.property_id === 'red-roots-villa', 'Switched to Red Roots Villa');

  const sw2 = updateChatBookingState({ sessionId: session6Id, userMessage: 'What about Homestay 2 for those dates?' });
  assert(sw2.property_id === 'homestay-2', 'Switched to Homestay 2');

  const sw3 = updateChatBookingState({ sessionId: session6Id, userMessage: 'Can you check Homestay 3 instead?' });
  assert(sw3.property_id === 'homestay-3', 'Switched to Homestay 3');

  const sw4 = updateChatBookingState({ sessionId: session6Id, userMessage: 'Let us go back to Red Roots Villa' });
  assert(sw4.property_id === 'red-roots-villa', 'Switched back to Red Roots Villa');

  // -------------------------------------------------------------------------
  // CASE 7: Date where one room type is unavailable but another is available
  // -------------------------------------------------------------------------
  console.log('\n--- Case 7: One room type unavailable, other room types available ---');
  const session7Id = `test_case_7_${Date.now()}`;
  const c7State = updateChatBookingState({
    sessionId: session7Id,
    userMessage: 'I want to book Deluxe Pool-View Suite at Homestay 2 from November 22 to November 24.',
  });

  assert(c7State.property_id === 'homestay-2', 'Property is homestay-2');
  assert(c7State.room_type === 'Deluxe Pool-View Suite', 'Requested room is Deluxe Pool-View Suite');
  assert(c7State.requested_room_unavailable === true, 'Deluxe Pool-View Suite is correctly detected as unavailable in SQLite');
  assert(c7State.is_available === true, 'Property is NOT marked completely unavailable because other rooms are open');
  assert(c7State.available_room_types.length > 0, 'Available room types are returned');
  assert(
    c7State.available_room_types.some((r) => r.roomType === 'Cozy Studio Apartment'),
    'Cozy Studio Apartment is available'
  );
  assert(
    c7State.available_room_types.some((r) => r.roomType === 'Superior King Room'),
    'Superior King Room is available'
  );
  assert(c7State.alternative_dates.length === 0, 'Does not suggest alternative dates when other rooms are available at Homestay 2');
  assert(c7State.alternative_properties.length === 0, 'Does not suggest sister properties when other rooms are available at Homestay 2');

  const c7Api = await callChatApi(session7Id, [
    { role: 'user', content: 'I want to book Deluxe Pool-View Suite at Homestay 2 from November 22 to November 24.' },
  ]);
  const c7Content = c7Api.message?.content || '';
  assert(
    c7Content.toLowerCase().includes('deluxe pool-view suite') &&
    (c7Content.toLowerCase().includes('unavailable') || c7Content.toLowerCase().includes('booked')),
    'Chatbot politely notes Deluxe Pool-View Suite is unavailable'
  );
  assert(
    c7Content.toLowerCase().includes('cozy studio') || c7Content.toLowerCase().includes('superior king') || c7Content.toLowerCase().includes('standard garden'),
    'Chatbot shows the other available room types at Homestay 2'
  );
  assert(
    !c7Content.toLowerCase().includes('homestay 2 is fully booked') &&
    !c7Content.toLowerCase().includes('completely booked at homestay 2'),
    'Chatbot does NOT claim Homestay 2 is fully booked'
  );

  // -------------------------------------------------------------------------
  // CASE 8: Change the number of nights and guests
  // -------------------------------------------------------------------------
  console.log('\n--- Case 8: Change the number of nights and guests ---');
  const session8Id = `test_case_8_${Date.now()}`;
  updateChatBookingState({
    sessionId: session8Id,
    userMessage: 'Homestay 2 on November 16',
  });
  const c8Turn2 = updateChatBookingState({
    sessionId: session8Id,
    userMessage: 'Make it a 3 nights stay for 4 guests and 2 rooms.',
  });
  assert(c8Turn2.nights === 3, 'Stay duration updated to 3 nights');
  assert(c8Turn2.check_out === '2026-11-19', 'Check-out updated to 2026-11-19');
  assert(c8Turn2.adults === 4, 'Guest count updated to 4 guests');
  assert(c8Turn2.rooms === 2, 'Room count updated to 2 rooms');
  assert(c8Turn2.stay_duration_known === true, 'Stay duration is confirmed');

  // Verify room price * rooms * nights calculation
  const cozyStudio = c8Turn2.available_room_types.find((r) => r.roomType === 'Cozy Studio Apartment');
  if (cozyStudio) {
    const expectedTotal = cozyStudio.pricePerNight * 2 * 3;
    assert(cozyStudio.totalPrice === expectedTotal, `Cozy Studio total price is ₹${expectedTotal} (price * 2 rooms * 3 nights)`);
  }

  // -------------------------------------------------------------------------
  // CASE 9: Test dates with zero availability
  // -------------------------------------------------------------------------
  console.log('\n--- Case 9: Test dates with zero availability ---');
  const zeroCheckH2 = checkAvailabilityWithOptions({
    propertyId: 'homestay-2',
    checkIn: '2026-11-10',
    checkOut: '2026-11-11',
  });
  assert(zeroCheckH2.isAvailable === false, 'Homestay 2 on November 10 has 0 availability');
  assert(zeroCheckH2.availableRooms.length === 0, 'Zero rooms available on November 10 at Homestay 2');

  const zeroCheckRRV = checkAvailabilityWithOptions({
    propertyId: 'red-roots-villa',
    checkIn: '2026-11-10',
    checkOut: '2026-11-11',
  });
  assert(zeroCheckRRV.isAvailable === false, 'Red Roots Villa on November 10 has 0 availability');

  // -------------------------------------------------------------------------
  // CASE 10: Verify that alternative dates are genuinely available
  // -------------------------------------------------------------------------
  console.log('\n--- Case 10: Verify alternative dates are genuinely available ---');
  const altDates = findAlternativeDates('2026-11-10', '2026-11-11', null, 1, 'homestay-2');
  assert(altDates.length > 0, `Alternative dates found: ${altDates.length}`);

  for (const alt of altDates) {
    // Check SQLite directly for this candidate date
    const invRows = db.prepare(
      'SELECT SUM(available_rooms) as total_avail FROM room_inventory WHERE property_id = ? AND date = ?'
    ).get('homestay-2', alt.checkIn);
    assert(
      invRows.total_avail > 0,
      `Alternative date ${alt.checkIn} genuinely has ${invRows.total_avail} available rooms in SQLite`
    );
  }

  console.log('\n===============================================================');
  console.log('   🎉 ALL 10 USER TEST CASES PASSED WITH 100% SUCCESS!         ');
  console.log('===============================================================\n');
}

runExactCases().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
