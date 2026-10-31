/**
 * Comprehensive Automated Test Suite for Price Negotiation & Bargaining Feature
 * Tests:
 * 1. Backend negotiation state engine with ₹30,000, ₹20,000, and ₹10,000 booking amounts.
 * 2. Exact gradual progression:
 *    - For ₹30,000: 30,000 -> 29,500 -> 29,000 -> 28,500 -> 28,000 -> 27,500 -> ... -> 25,500 (floor).
 *    - For ₹20,000: 20,000 -> 19,700 -> 19,400 -> ... -> 17,000 (floor).
 *    - For ₹10,000: 10,000 -> 9,800 -> 9,600 -> ... -> 8,500 (floor).
 * 3. Never offers minimum price immediately.
 * 4. Lowball offers (< 85%) strictly rejected and countered with next gradual offer, NEVER jumping to floor.
 * 5. Multi-turn /api/chat testing validating AI conversational flow and tool execution.
 * 6. Booking integration verifying that agreed negotiated price is saved in SQLite bookings table.
 * 7. Server-side tamper protection blocking any price below the 85% floor.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  processNegotiationStep,
  getNegotiationSession,
  getNegotiationStepAmount,
} from './src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data', 'hotel.db');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('===============================================================');
  console.log('   HOTEL BARGAINING SYSTEM VERIFICATION & AUDIT SUITE         ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const db = new Database(dbPath);

  // ------------------------------------------------------------------
  // SCENARIO 1: ₹30,000 Booking Amount Negotiation
  // ------------------------------------------------------------------
  console.log('--- SCENARIO 1: ₹30,000 Booking Amount Gradual Negotiation ---');
  const s30Id = `test_sess_30k_${Date.now()}`;

  // Initial Inquiry (Customer asks about price)
  const q30 = processNegotiationStep({
    sessionId: s30Id,
    originalPrice: 30000,
    isInitialInquiry: true,
  });
  assert(q30.currentOfferedPrice === 30000, `Initial price is exactly starting database price: ₹${q30.currentOfferedPrice}`);
  assert(q30.minAllowedPrice === 25500, `Backend strictly enforces minimum allowed price: ₹${q30.minAllowedPrice}`);
  assert(q30.attempts === 0, 'Initial inquiry starts at 0 negotiation attempts');

  // Attempt 1: First discount request
  const step30_1 = processNegotiationStep({ sessionId: s30Id, originalPrice: 30000 });
  assert(step30_1.currentOfferedPrice === 29500, `Attempt 1: First counteroffer is ₹29,500 (NOT ₹25,500): ₹${step30_1.currentOfferedPrice}`);
  assert(step30_1.attempts === 1, `Attempts incremented to 1`);
  assert(JSON.stringify(step30_1.previousOffers) === JSON.stringify([30000]), `Previous offers correctly recorded: ${JSON.stringify(step30_1.previousOffers)}`);

  // Attempt 2: Second negotiation
  const step30_2 = processNegotiationStep({ sessionId: s30Id, originalPrice: 30000 });
  assert(step30_2.currentOfferedPrice === 29000, `Attempt 2: Second counteroffer is ₹29,000: ₹${step30_2.currentOfferedPrice}`);
  assert(step30_2.attempts === 2, `Attempts incremented to 2`);

  // Attempt 3: Third negotiation
  const step30_3 = processNegotiationStep({ sessionId: s30Id, originalPrice: 30000 });
  assert(step30_3.currentOfferedPrice === 28500, `Attempt 3: Third counteroffer is ₹28,500: ₹${step30_3.currentOfferedPrice}`);

  // Attempt 4: Fourth negotiation
  const step30_4 = processNegotiationStep({ sessionId: s30Id, originalPrice: 30000 });
  assert(step30_4.currentOfferedPrice === 28000, `Attempt 4: Fourth counteroffer is ₹28,000: ₹${step30_4.currentOfferedPrice}`);

  // Attempt 5: Fifth negotiation
  const step30_5 = processNegotiationStep({ sessionId: s30Id, originalPrice: 30000 });
  assert(step30_5.currentOfferedPrice === 27500, `Attempt 5: Fifth counteroffer is ₹27,500: ₹${step30_5.currentOfferedPrice}`);

  // Attempt 6: Customer asks for an extreme lowball price (₹20,000 < ₹25,500 floor)
  const step30_low = processNegotiationStep({ sessionId: s30Id, originalPrice: 30000, customerOfferedPrice: 20000 });
  assert(step30_low.isOfferBelowFloor === true, `Backend flagged customer offer ₹20,000 as below floor`);
  assert(step30_low.currentOfferedPrice === 27000, `Customer asked for ₹20,000; backend made gradual counteroffer of ₹27,000 (DID NOT jump to ₹25,500): ₹${step30_low.currentOfferedPrice}`);

  // Continue to floor
  let step30_curr = step30_low;
  while (step30_curr.currentOfferedPrice > step30_curr.minAllowedPrice) {
    step30_curr = processNegotiationStep({ sessionId: s30Id, originalPrice: 30000 });
  }
  assert(step30_curr.currentOfferedPrice === 25500, `Floor reached gradually: ₹${step30_curr.currentOfferedPrice}`);

  // Attempt beyond floor
  const step30_beyond = processNegotiationStep({ sessionId: s30Id, originalPrice: 30000 });
  assert(step30_beyond.currentOfferedPrice === 25500, `Attempt beyond floor remains strictly protected at ₹25,500: ₹${step30_beyond.currentOfferedPrice}`);

  // Verify SQLite persisted session
  const savedSess30 = getNegotiationSession(s30Id);
  assert(savedSess30 != null, `Session ${s30Id} exists in SQLite negotiation_sessions table`);
  assert(savedSess30.original_price === 30000, `SQLite saved original_price = 30000`);
  assert(savedSess30.min_allowed_price === 25500, `SQLite saved min_allowed_price = 25500`);
  assert(savedSess30.attempts >= 9, `SQLite saved attempts count = ${savedSess30.attempts}`);

  // ------------------------------------------------------------------
  // SCENARIO 2: ₹20,000 Booking Amount Negotiation
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 2: ₹20,000 Booking Amount Gradual Negotiation ---');
  const s20Id = `test_sess_20k_${Date.now()}`;

  const q20 = processNegotiationStep({ sessionId: s20Id, originalPrice: 20000, isInitialInquiry: true });
  assert(q20.currentOfferedPrice === 20000, `Initial price is ₹20,000: ₹${q20.currentOfferedPrice}`);
  assert(q20.minAllowedPrice === 17000, `Floor price for ₹20,000 is ₹17,000: ₹${q20.minAllowedPrice}`);

  const step20_1 = processNegotiationStep({ sessionId: s20Id, originalPrice: 20000 });
  assert(step20_1.currentOfferedPrice === 19700, `20k Attempt 1 counteroffer is ₹19,700 (NOT ₹17,000): ₹${step20_1.currentOfferedPrice}`);

  const step20_2 = processNegotiationStep({ sessionId: s20Id, originalPrice: 20000 });
  assert(step20_2.currentOfferedPrice === 19400, `20k Attempt 2 counteroffer is ₹19,400: ₹${step20_2.currentOfferedPrice}`);

  // Customer offers lowball ₹12,000 (< ₹17,000 floor)
  const step20_low = processNegotiationStep({ sessionId: s20Id, originalPrice: 20000, customerOfferedPrice: 12000 });
  assert(step20_low.currentOfferedPrice === 19100, `Customer offered ₹12,000; backend countered gradually with ₹19,100: ₹${step20_low.currentOfferedPrice}`);

  let step20_curr = step20_low;
  while (step20_curr.currentOfferedPrice > step20_curr.minAllowedPrice) {
    step20_curr = processNegotiationStep({ sessionId: s20Id, originalPrice: 20000 });
  }
  assert(step20_curr.currentOfferedPrice === 17000, `20k Floor reached gradually at ₹17,000: ₹${step20_curr.currentOfferedPrice}`);

  // ------------------------------------------------------------------
  // SCENARIO 3: ₹10,000 Booking Amount Negotiation
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 3: ₹10,000 Booking Amount Gradual Negotiation ---');
  const s10Id = `test_sess_10k_${Date.now()}`;

  const q10 = processNegotiationStep({ sessionId: s10Id, originalPrice: 10000, isInitialInquiry: true });
  assert(q10.currentOfferedPrice === 10000, `Initial price is ₹10,000: ₹${q10.currentOfferedPrice}`);
  assert(q10.minAllowedPrice === 8500, `Floor price for ₹10,000 is ₹8,500: ₹${q10.minAllowedPrice}`);

  const step10_1 = processNegotiationStep({ sessionId: s10Id, originalPrice: 10000 });
  assert(step10_1.currentOfferedPrice === 9800, `10k Attempt 1 counteroffer is ₹9,800 (NOT ₹8,500): ₹${step10_1.currentOfferedPrice}`);

  const step10_2 = processNegotiationStep({ sessionId: s10Id, originalPrice: 10000 });
  assert(step10_2.currentOfferedPrice === 9600, `10k Attempt 2 counteroffer is ₹9,600: ₹${step10_2.currentOfferedPrice}`);

  // Customer offers lowball ₹5,000 (< ₹8,500 floor)
  const step10_low = processNegotiationStep({ sessionId: s10Id, originalPrice: 10000, customerOfferedPrice: 5000 });
  assert(step10_low.currentOfferedPrice === 9400, `Customer offered ₹5,000; backend countered gradually with ₹9,400: ₹${step10_low.currentOfferedPrice}`);

  let step10_curr = step10_low;
  while (step10_curr.currentOfferedPrice > step10_curr.minAllowedPrice) {
    step10_curr = processNegotiationStep({ sessionId: s10Id, originalPrice: 10000 });
  }
  assert(step10_curr.currentOfferedPrice === 8500, `10k Floor reached gradually at ₹8,500: ₹${step10_curr.currentOfferedPrice}`);

  // ------------------------------------------------------------------
  // SCENARIO 4: Multi-Turn Conversation API (/api/chat) for ₹30,000 Villa Stay
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 4: Multi-Turn /api/chat Conversation for ₹30,000 Booking ---');

  // Entire 3BHK Villa @ ₹15,000/night x 2 nights = ₹30,000.
  const chatSessionId = `chat_flow_30k_${Date.now()}`;
  const conversation = [];

  // Turn 1: Customer asks about rate for 2 nights
  conversation.push({
    role: 'user',
    content: 'What is the price for the Entire 3BHK Villa at Red Roots Villa for 2 nights from 2026-11-20 to 2026-11-22?',
  });

  const apiRes1 = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: chatSessionId, messages: conversation }),
  });
  const data1 = await apiRes1.json();
  const reply1 = data1.message?.content || '';
  conversation.push({ role: 'assistant', content: reply1 });
  assert(apiRes1.status === 200, 'Turn 1 API responded 200 OK');
  assert(reply1.includes('30,000') || reply1.includes('15,000'), `Chatbot quoted standard rate: "${reply1.slice(0, 100)}..."`);

  // Turn 2: Customer asks for a discount
  conversation.push({
    role: 'user',
    content: 'Can you give me a discount or a better deal on this ₹30,000 total?',
  });

  const apiRes2 = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: chatSessionId, messages: conversation }),
  });
  const data2 = await apiRes2.json();
  const reply2 = data2.message?.content || '';
  conversation.push({ role: 'assistant', content: reply2 });

  assert(
    !reply2.includes('25,500') && !reply2.includes('25500'),
    'Turn 2: Chatbot DID NOT immediately offer the minimum ₹25,500!'
  );
  assert(
    reply2.includes('29,500') || reply2.includes('29500') || data2.message?.action?.negotiatedTotalPrice === 29500,
    `Turn 2: Chatbot offered first gradual counteroffer of ₹29,500: "${reply2.slice(0, 120)}..."`
  );

  // Turn 3: Customer makes an unreasonable lowball offer (₹20,000)
  conversation.push({
    role: 'user',
    content: 'No, that is still high. Can you do ₹20,000?',
  });

  const apiRes3 = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: chatSessionId, messages: conversation }),
  });
  const data3 = await apiRes3.json();
  const reply3 = data3.message?.content || '';
  conversation.push({ role: 'assistant', content: reply3 });

  assert(
    !reply3.toLowerCase().includes('agree to 20,000') &&
    !reply3.toLowerCase().includes('deal for ₹20,000'),
    `Turn 3: Chatbot refused lowball ₹20,000: "${reply3.slice(0, 120)}..."`
  );
  assert(
    !reply3.includes('25,500') && !reply3.includes('25500'),
    'Turn 3: Chatbot DID NOT jump to minimum price ₹25,500 when lowballed!'
  );
  assert(
    reply3.includes('29,000') || reply3.includes('29000') || data3.message?.action?.negotiatedTotalPrice === 29000,
    `Turn 3: Chatbot countered with next gradual offer ₹29,000`
  );

  // Turn 4: Customer accepts the ₹29,000 offer
  conversation.push({
    role: 'user',
    content: 'Okay, ₹29,000 sounds fair. Deal! Let us book it at that rate.',
  });

  const apiRes4 = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: chatSessionId, messages: conversation }),
  });
  const data4 = await apiRes4.json();
  const reply4 = data4.message?.content || '';
  const action4 = data4.message?.action;

  assert(action4 != null && action4.type === 'open_booking_modal', 'Action open_booking_modal generated upon deal acceptance');
  assert(action4?.isNegotiated === true, 'Action action.isNegotiated is true');
  assert(action4?.negotiatedTotalPrice === 29000, `Action action.negotiatedTotalPrice is locked at agreed ₹29,000: ₹${action4?.negotiatedTotalPrice}`);
  assert(action4?.originalTotalPrice === 30000, `Action action.originalTotalPrice preserves original ₹30,000`);

  // ------------------------------------------------------------------
  // SCENARIO 5: Submit Agreed Booking to POST /api/bookings
  // ------------------------------------------------------------------
  console.log('\n--- SCENARIO 5: Confirm Booking in SQLite with Agreed Rate ---');

  const bookRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId: 'red-roots-villa',
      guestName: 'Bargaining Master Guest',
      email: 'bargain@example.com',
      phone: '+919876543210',
      checkIn: '2026-11-20',
      checkOut: '2026-11-22',
      roomType: 'Entire 3BHK Private Pool Villa',
      rooms: 1,
      adults: 6,
      isNegotiated: true,
      negotiatedTotalPrice: 29000,
    }),
  });

  const bookData = await bookRes.json();
  assert(bookRes.status === 201 && bookData.success === true, `Booking confirmed: ${bookData.booking?.reference}`);

  const row = db.prepare('SELECT * FROM bookings WHERE reference = ?').get(bookData.booking?.reference);
  assert(row.total_price === 29000, `SQLite bookings total_price = ₹${row.total_price}`);
  assert(row.original_total_price === 30000, `SQLite bookings original_total_price = ₹${row.original_total_price}`);
  assert(row.is_negotiated === 1, `SQLite bookings is_negotiated = 1`);
  assert(row.price_per_night === 14500, `SQLite bookings price_per_night = ₹${row.price_per_night}`);
  assert(row.original_price_per_night === 15000, `SQLite bookings original_price_per_night = ₹${row.original_price_per_night}`);

  // Tamper check: Try to submit below 85% floor for ₹30,000 (< ₹25,500)
  const tamperRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      propertyId: 'red-roots-villa',
      guestName: 'Tamper Attacker',
      email: 'tamper@example.com',
      phone: '+919876543210',
      checkIn: '2026-11-20',
      checkOut: '2026-11-22',
      roomType: 'Entire 3BHK Private Pool Villa',
      rooms: 1,
      adults: 6,
      isNegotiated: true,
      negotiatedTotalPrice: 24000, // VIOLATION: below ₹25,500 floor
    }),
  });
  const tamperData = await tamperRes.json();
  assert(tamperRes.status === 400 && tamperData.success === false, `Tamper attack of ₹24,000 on ₹30,000 strictly rejected with 400: "${tamperData.error}"`);

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`FINAL TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  db.close();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
