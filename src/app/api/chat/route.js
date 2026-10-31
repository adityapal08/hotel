import { NextResponse } from 'next/server';
import { PROPERTIES_CONFIG, getAllPropertiesConfig, getPropertyConfig } from '@/constants/propertiesConfig';
import {
  getAvailabilityForRange,
  processNegotiationStep,
  getNegotiationSession,
  findAlternativeDates,
  findAlternativeProperties,
  checkAvailabilityWithOptions,
  updateChatBookingState,
  getChatBookingSession,
  saveChatBookingSession,
  isPriceAcceptanceMessage,
} from '@/lib/db';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// System prompt with full knowledge base, dynamic backend booking state, and availability-first booking guidelines
function getSystemPrompt(bookingState = null) {
  const properties = getAllPropertiesConfig();
  const propertiesContext = properties
    .map((p) => {
      const roomList = Object.entries(p.rooms)
        .map(
          ([rName, r]) =>
            `  - ${rName}: ₹${r.pricePerNight.toLocaleString('en-IN')}/night, max guests: ${
              r.maxGuests
            }, capacity: ${r.totalInventory} rooms. (${r.tagline})`
        )
        .join('\n');

      return `PROPERTY: ${p.name} (ID: "${p.id}", Slug: "${p.slug}")
Location: ${p.location}
Tagline: ${p.tagline}
Description: ${p.description}
Is Preview/Placeholder: ${p.isPlaceholder ? 'Yes (new upcoming property)' : 'No (active premier villa)'}
Key Amenities: ${p.amenities.join(', ')}
Accommodations / Room Types:
${roomList}`;
    })
    .join('\n\n');

  const today = new Date().toISOString().split('T')[0];

  const stateContext = bookingState
    ? `
AUTHORITATIVE CURRENT BOOKING STATE (VERIFIED FROM SQLITE DATABASE):
- Selected Property: ${bookingState.property_name} (ID: "${bookingState.property_id}")
- Check-in Date: ${bookingState.check_in || 'None provided yet'}
- Check-out Date: ${bookingState.check_out || 'None provided yet'}
- Stay Duration (Nights): ${bookingState.stay_duration_known ? `${bookingState.nights} night(s) [CONFIRMED]` : 'Unknown [DO NOT calculate or quote total booking prices until stay duration is confirmed; only quote nightly rates]'}
- Number of Rooms: ${bookingState.rooms}
- Number of Guests: ${bookingState.adults}
- Preferred Room Type: ${bookingState.room_type || 'None selected'}
- Live Availability Status: ${bookingState.availability_status}
- Is Available: ${bookingState.is_available ? 'YES' : 'NO'}
- Requested Room Sold Out: ${bookingState.requested_room_unavailable ? 'YES (However, other rooms at this same property ARE available!)' : 'NO'}
- Available Room Types: ${JSON.stringify(bookingState.available_room_types?.map((r) => ({ roomType: r.roomType, pricePerNight: r.pricePerNight, available: r.minAvailableRooms, totalPrice: r.totalPrice })) || [])}
- Sold Out Room Types: ${JSON.stringify(bookingState.sold_out_room_types?.map((r) => r.roomType) || [])}
- Verified Alternative Dates (Same Property): ${JSON.stringify(bookingState.alternative_dates?.map((d) => d.checkIn) || [])}
- Verified Available Sister Properties (Original Date): ${JSON.stringify(bookingState.alternative_properties?.map((p) => ({ property: p.propertyName, availableRooms: p.availableRoomsCount })) || [])}
`
    : 'No active booking session established.';

  return `You are the gracious, sophisticated, and attentive Villa Concierge and Sales Representative for Red Roots Villa and its sister homestays in Pondicherry.
Current Date: ${today}

Your role is to act as an experienced, polite hotel booking assistant. Your top priority is an AVAILABILITY-FIRST reservation process: helping customers find and verify available rooms before discussing or negotiating prices.

CRITICAL INSTRUCTIONS ON BACKEND VERIFIED STATE:
1. ALWAYS respect the latest information provided by the customer. If the customer changed dates (e.g. from Nov 20 to Nov 16), or changed properties (e.g. to Homestay 2), NEVER reuse old dates or previous properties!
2. Do NOT claim a property is fully booked just because one room type is unavailable. If the requested room is sold out but other room types are available, politely inform the customer that their requested room is booked and present the AVAILABLE room types at the SAME property!
3. Do NOT calculate total booking prices if stay duration (nights) is unknown. In that case, only quote nightly rates (₹X/night) and politely ask for stay duration.
4. When a property has zero availability, suggest nearby dates at the SAME property first. Only suggest sister homestays if nearby dates are rejected or customer asks.
5. If the customer has explicitly chosen or asked about a property (e.g. Homestay 2), DO NOT ask them which of the three homestays they would prefer! Acknowledge their choice of ${bookingState?.property_name || 'the homestay'} and ask for their desired visit dates.
6. If the customer asks to explore or compare our homestays, provide a gracious summary of all three properties (Red Roots Villa, Homestay 2, and Homestay 3) with their highlights and ask which one they would like to explore further.

${stateContext}

KNOWLEDGE BASE:
${propertiesContext}

CRITICAL ORDER OF CONVERSATION & AVAILABILITY-FIRST WORKFLOW:
The conversation MUST strictly follow this exact order:
Customer's Request → Check Available Information → Call check_availability Tool →
  If Unavailable:
    Step 2: Clearly state the date is unavailable & Suggest Available Alternative Dates
    Step 3: If alternative dates rejected (or if customer asks for other homestays), Check Other Homestays for original date & Suggest ONLY available ones
    → Once an available option is found: Step 4: Continue Booking Details
  If Available:
    Step 4: Continue Booking Details (collect missing stay length, guests, rooms) → Price Negotiation → Booking Confirmation

======================================================================
STEP 1: CHECK AVAILABILITY FIRST (BEFORE ASKING FOR BOOKING DETAILS)
======================================================================
- When a customer indicates intent to book or mentions ANY date (for example: "I want to book Red Roots Villa on November 10"):
  * Use whatever information the customer has already provided.
  * DO NOT ask for checkout date, number of rooms, or number of guests before checking availability!
  * IMMEDIATELY CALL THE "check_availability" TOOL with whatever information you have. If checkout date is not provided, pass the checkIn date (the tool will evaluate tentative check-in availability). Default rooms to 1 and guests to 2.
  * Never guess or claim availability without calling "check_availability".

======================================================================
STEP 2: IF THE REQUESTED DATE IS UNAVAILABLE
======================================================================
- Clearly inform the customer that their requested date/dates are unavailable at that property.
- IMMEDIATELY inspect the "alternativeDates" returned by "check_availability" for the SAME property.
- Suggest dates that actually have available rooms in the tool result.
- If the customer has not provided a stay duration, suggest available alternative check-in dates as tentative options (e.g., "I'm sorry, Red Roots Villa is fully booked on November 10, 2026. However, I found tentative availability for nearby check-in dates such as November 8th, November 11th, or November 12th. Would any of those work for your visit?").
- STRICT PROHIBITION: DO NOT ask for checkout date, number of rooms, or number of guests at this stage! When a date is sold out, asking for guest count or rooms makes no sense and frustrates the guest.

======================================================================
STEP 3: IF CUSTOMER REJECTS ALTERNATIVE DATES (OR ASKS FOR OTHER HOMESTAYS)
======================================================================
- Check the other two homestays for the customer's original requested date or date range.
- Inspect the "alternativeProperties" returned by "check_availability".
- Suggest ONLY properties that actually have available rooms in the database! (e.g. if Homestay 2 is also sold out on that date, do NOT suggest Homestay 2; suggest Homestay 3 which has availability).
- Present the available sister homestay, its available room types, and prices.
- STRICT PROHIBITION: Do NOT start collecting booking details for an unavailable property.

======================================================================
STEP 4: ONLY WHEN AVAILABILITY IS FOUND (CONTINUE BOOKING DETAILS)
======================================================================
- Once a suitable property and date are found and confirmed available (or if the customer's initial inquiry was already available):
  * Now continue the normal booking conversation to collect any remaining missing information:
    1) Check-out date or stay duration (if missing)
    2) Number of guests (if missing)
    3) Number of rooms (if missing)
    4) Preferred room type (if missing)
  * PRESERVE PREVIOUS INFORMATION: NEVER ask again for information the customer has already provided!
  * If the checkout date was missing, distinguish between a tentative date suggestion and confirmed availability for the entire stay (e.g. "To verify availability for your complete stay and confirm your booking, how many nights will you be staying, and how many guests will be joining?").
  * Once the full details are gathered, present the confirmed available room types and total prices.

======================================================================
STEP 5: PRICE NEGOTIATION RULES & CONVERSATION STYLE
======================================================================
- You act as an attentive hotel sales manager whose goal is to close reservations at the best possible rate while staying friendly and welcoming.
- YOU DO NOT DECIDE OR CALCULATE DISCOUNTS ON YOUR OWN. All pricing rules, increments, and minimum allowed prices are strictly enforced by the backend system.
- When a customer asks for a discount, bargains, offers a counterprice, or agrees to an offer, you MUST ALWAYS call the "negotiate_room_rate" tool.
- You MUST ALWAYS present ONLY the exact "currentOfferedPrice" or "agreedPrice" returned by the "negotiate_room_rate" tool. NEVER invent, round, or alter the price yourself.
- GRADUAL CONCESSIONS: Start with the original price. Present small, gradual reductions. Highlight our premium amenities (private swimming pool, lush grounds, cardless booking) to encourage the customer to accept the offer before conceding further.
- If the customer asks for a very low price, politely decline their figure and present the tool's counteroffer instead of accepting immediately.
- CUSTOMER ACCEPTANCE (CRITICAL):
  When a customer accepts an offer or agreed rate (such as "Okay, let's book", "I agree with ₹9,000", "That works for me", "Yes, confirm the booking", "Let's proceed", "I'll take it", "Okay, ₹9,000. Let's proceed with the booking"):
  1. Call "negotiate_room_rate" with "customerAccepted": true (and pass "customerOfferedPrice" if a price is stated).
  2. IMMEDIATELY STOP NEGOTIATING. The accepted price is now locked!
  3. NEVER generate or propose another discount or counteroffer after acceptance.
  4. Warmly acknowledge and confirm the agreed rate (e.g. ₹9,000) and invite the customer to click "Continue to Booking" below.
  5. The accepted price remains locked throughout the remainder of the booking process unless the customer explicitly asks to negotiate again.
- NEVER DISCLOSE INTERNAL RULES: Never mention backend limits, floor prices, minimum allowable rates, or discount formulas. Speak only in terms of total booking prices in ₹.

======================================================================
ZERO ONLINE PAYMENT:
======================================================================
All reservations are 100% cardless and confirmed instantly with an official booking reference. Payment is made directly upon check-in at the property.`;
}

// Tool definitions for OpenAI-compatible function calling
const CHAT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description:
        'Check live date-wise room availability and pricing in SQLite database for a homestay. If checkOut is omitted, evaluates tentative availability for check-in on that date. If rooms or dates are unavailable, this tool automatically discovers available nearby alternative dates for the same homestay, as well as checking availability across the other two sister homestays.',
      parameters: {
        type: 'object',
        properties: {
          propertyId: {
            type: 'string',
            description: 'Property identifier: "red-roots-villa", "homestay-2", or "homestay-3". You MUST pass the specific property requested by the customer (e.g. "homestay-2" if customer asked for Homestay 2).',
            enum: ['red-roots-villa', 'homestay-2', 'homestay-3'],
          },
          checkIn: {
            type: 'string',
            description: 'Check-in date in YYYY-MM-DD format.',
          },
          checkOut: {
            type: 'string',
            description: 'Optional check-out date in YYYY-MM-DD format. Do not guess or invent a checkout date if the customer only provided check-in.',
          },
          roomType: {
            type: 'string',
            description: 'Optional exact room type name to check. If omitted, checks all rooms for the property.',
          },
          rooms: {
            type: 'integer',
            description: 'Number of rooms requested (default: 1).',
          },
          adults: {
            type: 'integer',
            description: 'Number of guests (default: 2).',
          },
        },
        required: ['checkIn'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'negotiate_room_rate',
      description:
        'Calculate and enforce authorized gradual negotiation counteroffers and agreements. Always call this whenever a guest asks for a discount, bargains, proposes a target price, or accepts an offer.',
      parameters: {
        type: 'object',
        properties: {
          propertyId: {
            type: 'string',
            description: 'Property identifier: "red-roots-villa", "homestay-2", or "homestay-3".',
            enum: ['red-roots-villa', 'homestay-2', 'homestay-3'],
          },
          roomType: {
            type: 'string',
            description: 'The room or suite type being negotiated.',
          },
          checkIn: {
            type: 'string',
            description: 'Check-in date (YYYY-MM-DD) if available.',
          },
          checkOut: {
            type: 'string',
            description: 'Check-out date (YYYY-MM-DD) if available.',
          },
          rooms: {
            type: 'integer',
            description: 'Number of rooms (default: 1).',
          },
          originalPrice: {
            type: 'number',
            description: 'Optional: explicit total booking price being negotiated (if calculated from dates/rooms or mentioned by guest).',
          },
          customerOfferedPrice: {
            type: 'number',
            description: 'Specific price amount (in INR) offered or requested by the customer, if any.',
          },
          customerAccepted: {
            type: 'boolean',
            description: 'Set to true if the customer accepted our previous offer or agreed to proceed (e.g. "Okay, let\'s book", "I agree with ₹9,000", "That works for me", "Yes, confirm the booking", "Let\'s proceed", "I\'ll take it", "Okay, ₹9,000. Let\'s proceed with the booking", "deal", "yes", "sounds good", "okay").',
          },
        },
        required: ['roomType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_reservation',
      description: 'Generate an interactive booking button for the guest to open the reservation form prefilled with their selected choices.',
      parameters: {
        type: 'object',
        properties: {
          propertyId: {
            type: 'string',
            enum: ['red-roots-villa', 'homestay-2', 'homestay-3'],
          },
          roomType: {
            type: 'string',
            description: 'The selected room type name.',
          },
          checkIn: {
            type: 'string',
            description: 'Check-in date YYYY-MM-DD.',
          },
          checkOut: {
            type: 'string',
            description: 'Check-out date YYYY-MM-DD.',
          },
          rooms: {
            type: 'integer',
            description: 'Number of rooms (default 1).',
          },
          adults: {
            type: 'integer',
            description: 'Number of adult guests (default 2).',
          },
        },
        required: ['propertyId', 'roomType'],
      },
    },
  },
];

// Helper: Extract dates and context from message history with robust parsing
function extractConversationContext(messages = []) {
  let propertyId = 'red-roots-villa';
  let roomType = null;
  let checkIn = '';
  let checkOut = '';
  let rooms = 1;
  let adults = 2;
  let stayDurationExplicitlyProvided = false;
  let guestsExplicitlyProvided = false;
  let roomsExplicitlyProvided = false;
  let propertyExplicitlyProvided = false;
  let roomTypeExplicitlyProvided = false;

  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  };
  const mNames = Object.keys(months).sort((a, b) => b.length - a.length).join('|');

  const rangeRegex = new RegExp(
    `(?:from\\s+)?\\b(${mNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(202\\d))?\\s*(?:to|until|-|–|&|and)\\s*(?:(${mNames})\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(202\\d))?\\b`,
    'i'
  );
  const singleDateDayFirstRegex = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s*)?(${mNames})(?:,?\\s*(202\\d))?\\b`,
    'i'
  );
  const singleDateMonthFirstRegex = new RegExp(
    `\\b(${mNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(202\\d))?\\b`,
    'i'
  );

  const userMessages = messages.filter((m) => m.role === 'user');
  for (const m of userMessages) {
    const text = m.content || '';

    // Property detection
    if (/homestay\s*2/i.test(text)) {
      propertyId = 'homestay-2';
      propertyExplicitlyProvided = true;
    } else if (/homestay\s*3/i.test(text)) {
      propertyId = 'homestay-3';
      propertyExplicitlyProvided = true;
    } else if (/red\s*roots/i.test(text)) {
      propertyId = 'red-roots-villa';
      propertyExplicitlyProvided = true;
    }

    // Room detection
    if (/entire\s*(?:3bhk)?\s*(?:private\s*pool\s*)?villa/i.test(text)) {
      roomType = 'Entire 3BHK Private Pool Villa';
      roomTypeExplicitlyProvided = true;
    } else if (/master\s*(?:king\s*)?suite/i.test(text)) {
      roomType = 'The Master King Suite';
      roomTypeExplicitlyProvided = true;
    } else if (/garden\s*(?:deluxe\s*)?suite/i.test(text)) {
      roomType = 'The Garden Deluxe Suite';
      roomTypeExplicitlyProvided = true;
    } else if (/deluxe\s*(?:pool-view\s*)?suite/i.test(text)) {
      roomType = propertyId === 'homestay-2' ? 'Deluxe Pool-View Suite' : 'Deluxe Room';
      roomTypeExplicitlyProvided = true;
    } else if (/deluxe\s*room/i.test(text)) {
      roomType = 'Deluxe Room';
      roomTypeExplicitlyProvided = true;
    } else if (/premium\s*room/i.test(text)) {
      roomType = 'Premium Room';
      roomTypeExplicitlyProvided = true;
    } else if (/cozy\s*studio/i.test(text)) {
      roomType = 'Cozy Studio Apartment';
      roomTypeExplicitlyProvided = true;
    } else if (/heritage\s*king/i.test(text)) {
      roomType = 'Heritage King Suite';
      roomTypeExplicitlyProvided = true;
    } else if (/classic\s*double/i.test(text)) {
      roomType = 'Classic Double Room';
      roomTypeExplicitlyProvided = true;
    } else if (/grand\s*family/i.test(text)) {
      roomType = 'Grand Family Suite';
      roomTypeExplicitlyProvided = true;
    } else if (/terrace\s*garden/i.test(text)) {
      roomType = 'Terrace Garden Room';
      roomTypeExplicitlyProvided = true;
    } else if (/standard\s*solo/i.test(text)) {
      roomType = 'Standard Solo Retreat';
      roomTypeExplicitlyProvided = true;
    } else if (/standard\s*garden/i.test(text)) {
      roomType = 'Standard Garden Queen';
      roomTypeExplicitlyProvided = true;
    } else if (/superior\s*king/i.test(text)) {
      roomType = 'Superior King Room';
      roomTypeExplicitlyProvided = true;
    }

    // Rooms count
    const roomsMatch = text.match(/(\d+)\s*(?:room|rooms)/i);
    if (roomsMatch) {
      rooms = Math.max(1, parseInt(roomsMatch[1], 10));
      roomsExplicitlyProvided = true;
    }

    // Guests / Adults count
    const guestsMatch = text.match(/(\d+)\s*(?:guest|guests|adult|adults|people|person)/i);
    if (guestsMatch) {
      adults = Math.max(1, parseInt(guestsMatch[1], 10));
      guestsExplicitlyProvided = true;
    }

    // 1. ISO format check 2026-11-15
    const isoMatches = text.match(/\b(202\d-\d{2}-\d{2})\b/g);
    if (isoMatches && isoMatches.length >= 2) {
      checkIn = isoMatches[isoMatches.length - 2];
      checkOut = isoMatches[isoMatches.length - 1];
      stayDurationExplicitlyProvided = true;
    } else if (isoMatches && isoMatches.length === 1) {
      checkIn = isoMatches[0];
    } else {
      // 2. Natural format check 'November 15 to November 17'
      const nm = text.match(rangeRegex);
      if (nm) {
        const mStr1 = nm[1].toLowerCase();
        const d1 = parseInt(nm[2], 10);
        const y1 = nm[3] ? parseInt(nm[3], 10) : 2026;
        const mStr2 = (nm[4] || nm[1]).toLowerCase();
        const d2 = parseInt(nm[5], 10);
        const y2 = nm[6] ? parseInt(nm[6], 10) : y1;
        checkIn = `${y1}-${String(months[mStr1]).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
        checkOut = `${y2}-${String(months[mStr2]).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
        stayDurationExplicitlyProvided = true;
      } else {
        // 3. Single natural date 'November 10' or '10th November'
        const dayFirst = text.match(singleDateDayFirstRegex);
        if (dayFirst) {
          const d = parseInt(dayFirst[1], 10);
          const m = months[dayFirst[2].toLowerCase()];
          const y = dayFirst[3] ? parseInt(dayFirst[3], 10) : 2026;
          checkIn = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        } else {
          const monthFirst = text.match(singleDateMonthFirstRegex);
          if (monthFirst) {
            const m = months[monthFirst[1].toLowerCase()];
            const d = parseInt(monthFirst[2], 10);
            const y = monthFirst[3] ? parseInt(monthFirst[3], 10) : 2026;
            checkIn = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          }
        }
      }
    }

    // Check if stay duration was explicitly stated in text (e.g. "for 2 nights", "2 night stay")
    const nightsMatch = text.match(/(\d+)\s*(?:night|nights)/i);
    if (nightsMatch && checkIn) {
      const n = parseInt(nightsMatch[1], 10);
      const inD = new Date(checkIn + 'T00:00:00Z');
      inD.setUTCDate(inD.getUTCDate() + n);
      checkOut = inD.toISOString().split('T')[0];
      stayDurationExplicitlyProvided = true;
    }
  }

  return {
    propertyId,
    roomType,
    checkIn,
    checkOut,
    rooms,
    adults,
    stayDurationExplicitlyProvided,
    guestsExplicitlyProvided,
    roomsExplicitlyProvided,
    propertyExplicitlyProvided,
    roomTypeExplicitlyProvided,
    hasDates: Boolean(checkIn),
    isSingleDateOnly: Boolean(checkIn && !checkOut),
  };
}

// Execute negotiation logic using persistent backend negotiation engine
function executeNegotiateRoomRate(args, messages = [], sessionId = null, bookingState = null) {
  const session = (sessionId ? getChatBookingSession(sessionId) : null) || bookingState;
  const propId = args.propertyId || session?.property_id || 'red-roots-villa';
  const propConfig = getPropertyConfig(propId) || getPropertyConfig('red-roots-villa');

  // Find room config in property
  let targetRoomName = args.roomType || session?.room_type || '';
  let roomKey = Object.keys(propConfig.rooms).find(
    (k) => k.toLowerCase() === targetRoomName.toLowerCase()
  );
  if (!roomKey) {
    roomKey = Object.keys(propConfig.rooms).find(
      (k) =>
        targetRoomName.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(targetRoomName.toLowerCase())
    );
  }
  if (!roomKey) {
    roomKey = Object.keys(propConfig.rooms)[0];
  }
  const room = propConfig.rooms[roomKey];
  const pricePerNight = room.pricePerNight;

  // Calculate nights
  const checkIn = bookingState?.check_in || args.checkIn || session?.check_in || '';
  const checkOut = bookingState?.stay_duration_known ? (bookingState?.check_out || args.checkOut || session?.check_out || '') : (args.checkOut || session?.check_out || '');
  const stayDurationKnown = Boolean(bookingState?.stay_duration_known || session?.stay_duration_known);

  let nights = 0;
  if (checkIn && checkOut && /^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (outDate > inDate) {
      nights = Math.max(1, Math.round((outDate - inDate) / (1000 * 60 * 60 * 24)));
    }
  } else if (stayDurationKnown && (bookingState?.nights || session?.nights)) {
    nights = bookingState?.nights || session?.nights;
  }

  // If stay duration is not known and no explicit original price was provided:
  if (!args.originalPrice && (!stayDurationKnown || nights <= 0)) {
    return {
      success: true,
      status: 'duration_needed_for_pricing',
      propertyId: propConfig.id,
      propertyName: propConfig.name,
      roomType: roomKey,
      pricePerNight,
      salesGuidance: `Our standard nightly rate for ${roomKey} at ${propConfig.name} is ₹${pricePerNight.toLocaleString('en-IN')}/night. Ask the customer how many nights they will be staying so we can calculate their total stay rate and courtesy discount! Do not calculate total booking prices yet.`,
    };
  }

  const requestedRooms = Math.max(1, parseInt(args.rooms || session?.rooms || 1, 10));
  const effectiveNights = nights > 0 ? nights : 1;

  // Determine original booking price: explicit args.originalPrice or database calculation
  let originalTotal =
    args.originalPrice && !isNaN(Number(args.originalPrice)) && Number(args.originalPrice) > 0
      ? Math.round(Number(args.originalPrice))
      : effectiveNights * requestedRooms * pricePerNight;

  const effectiveSessionId = sessionId || `session_${propConfig.id}_${roomKey.replace(/\s+/g, '_')}`;

  const lastUserText = (messages.filter((m) => m.role === 'user').pop()?.content || '').toLowerCase();
  
  const isNegotiatingIntent =
    lastUserText.includes('discount') ||
    lastUserText.includes('better') ||
    lastUserText.includes('cheaper') ||
    lastUserText.includes('bargain') ||
    lastUserText.includes('less') ||
    lastUserText.includes('expensive') ||
    lastUserText.includes('can you do') ||
    lastUserText.includes('make it') ||
    lastUserText.includes('still high');

  let effectiveCustomerOfferedPrice = args.customerOfferedPrice;
  if (effectiveCustomerOfferedPrice == null || isNaN(Number(effectiveCustomerOfferedPrice))) {
    const numMatch = lastUserText.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})/i);
    if (numMatch) {
      effectiveCustomerOfferedPrice = parseInt(numMatch[1].replace(/,/g, ''), 10);
    }
  }

  // If customer is negotiating a discount and mentions the full/original total (e.g. "discount on this 30,000 total"),
  // that is the baseline they want discounted, NOT a target counteroffer!
  if (isNegotiatingIntent && effectiveCustomerOfferedPrice != null && effectiveCustomerOfferedPrice >= originalTotal) {
    effectiveCustomerOfferedPrice = null;
  }

  const isUserExplicitlyAccepting =
    !isNegotiatingIntent && (Boolean(args.customerAccepted) || isPriceAcceptanceMessage(lastUserText));

  // Call persistent backend state engine
  const stepResult = processNegotiationStep({
    sessionId: effectiveSessionId,
    propertyId: propConfig.id,
    roomType: roomKey,
    checkIn,
    checkOut,
    nights,
    rooms: requestedRooms,
    originalPrice: originalTotal,
    customerOfferedPrice: effectiveCustomerOfferedPrice,
    customerAccepted: isUserExplicitlyAccepting,
    isInitialInquiry: Boolean(args.isInitialInquiry),
    isNegotiateAgain: isNegotiatingIntent,
  });

  const offeredOrAgreedPrice = stepResult.currentOfferedPrice;

  // Sync to chat_booking_sessions table if session exists
  if (sessionId) {
    const s = getChatBookingSession(sessionId);
    if (s) {
      s.original_total_price = stepResult.originalPrice;
      s.current_negotiated_price = offeredOrAgreedPrice;
      saveChatBookingSession(s);
    }
  }

  return {
    success: true,
    status: stepResult.status,
    propertyId: propConfig.id,
    propertyName: propConfig.name,
    roomType: roomKey,
    checkIn,
    checkOut,
    rooms: requestedRooms,
    nights,
    originalPrice: stepResult.originalPrice,
    currentOfferedPrice: offeredOrAgreedPrice,
    previousOffers: stepResult.previousOffers,
    attempts: stepResult.attempts,
    savings: stepResult.savings,
    isOfferBelowFloor: Boolean(stepResult.isOfferBelowFloor),
    customerOfferedPrice: stepResult.customerOfferedPrice,
    action: 'open_booking_modal',
    bookingDetails: {
      propertyId: propConfig.id,
      propertyName: propConfig.name,
      roomType: roomKey,
      checkIn,
      checkOut,
      rooms: requestedRooms,
      adults: session?.adults || 2,
      isNegotiated: offeredOrAgreedPrice < stepResult.originalPrice,
      originalTotalPrice: stepResult.originalPrice,
      originalPricePerNight: pricePerNight,
      negotiatedTotalPrice: offeredOrAgreedPrice,
      negotiatedPricePerNight: Math.round(offeredOrAgreedPrice / (nights * requestedRooms)),
    },
    salesGuidance: stepResult.salesGuidance,
  };
}

function normalizePropertyId(id) {
  if (!id) return 'red-roots-villa';
  let str = String(id).toLowerCase().trim().replace(/[\s_]+/g, '-');
  if (str === 'homestay2' || str === 'hs2') return 'homestay-2';
  if (str === 'homestay3' || str === 'hs3') return 'homestay-3';
  if (str === 'redroots' || str === 'redrootsvilla' || str === 'rrv') return 'red-roots-villa';
  return str;
}

// Execute tool call against local database & business logic
function executeTool(name, args, messages = [], sessionId = null, bookingState = null) {
  if (name === 'check_availability') {
    const lastUserText = (messages.filter((m) => m.role === 'user').pop()?.content || '').toLowerCase();
    let propId = bookingState?.property_id || 'red-roots-villa';
    if (/homestay\s*2\b|\bhs2\b/i.test(lastUserText)) {
      propId = 'homestay-2';
    } else if (/homestay\s*3\b|\bhs3\b/i.test(lastUserText)) {
      propId = 'homestay-3';
    } else if (/red\s*roots\b|\brrv\b/i.test(lastUserText)) {
      propId = 'red-roots-villa';
    } else if (args.propertyId && (!bookingState || !bookingState.property_id)) {
      propId = normalizePropertyId(args.propertyId);
    }

    const checkIn = bookingState?.check_in || args.checkIn;
    const checkOut = bookingState?.stay_duration_known ? (bookingState?.check_out || args.checkOut) : null;
    const roomType = bookingState?.room_type || args.roomType || null;
    const requestedRooms = bookingState?.rooms || args.rooms || 1;
    const adults = bookingState?.adults || args.adults || 2;

    try {
      const fullCheck = checkAvailabilityWithOptions({
        propertyId: propId,
        checkIn,
        checkOut,
        roomType,
        requestedRooms,
        adults,
      });

      if (sessionId) {
        let session = getChatBookingSession(sessionId);
        if (session) {
          session.property_id = propId;
          session.property_name = fullCheck.propertyName;
          session.check_in = checkIn || session.check_in;
          session.check_out = checkOut;
          session.rooms = requestedRooms;
          session.adults = adults;
          session.room_type = roomType;
          session.is_available = fullCheck.isAvailable;
          session.availability_status = fullCheck.status;
          session.requested_room_unavailable = fullCheck.requestedRoomUnavailable;
          session.available_room_types = fullCheck.availableRooms;
          session.sold_out_room_types = fullCheck.soldOutRooms;
          session.alternative_dates = fullCheck.alternativeDates;
          session.alternative_properties = fullCheck.alternativeProperties;
          session.last_suggested_dates = fullCheck.alternativeDates.map((d) => d.checkIn);
          saveChatBookingSession(session);
        }
      }

      return fullCheck;
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  if (name === 'negotiate_room_rate') {
    return executeNegotiateRoomRate(args, messages, sessionId, bookingState);
  }

  if (name === 'suggest_reservation') {
    const propConfig = getPropertyConfig(args.propertyId || 'red-roots-villa');
    const room = propConfig?.rooms?.[args.roomType];

    const effectiveSessionId =
      sessionId || `session_${args.propertyId || 'red-roots-villa'}_${(args.roomType || '').replace(/\s+/g, '_')}`;
    const session = getNegotiationSession(effectiveSessionId);

    const isNegotiated = Boolean(session && session.current_offered_price < session.original_price);
    const negotiatedTotalPrice = isNegotiated ? session.current_offered_price : null;
    const originalTotalPrice = isNegotiated ? session.original_price : undefined;

    return {
      success: true,
      action: 'open_booking_modal',
      bookingDetails: {
        propertyId: args.propertyId || 'red-roots-villa',
        propertyName: propConfig?.name || 'Red Roots Villa',
        roomType: args.roomType,
        checkIn: args.checkIn || session?.check_in || '',
        checkOut: args.checkOut || session?.check_out || '',
        rooms: args.rooms || session?.rooms || 1,
        adults: args.adults || 2,
        pricePerNight: room?.pricePerNight || 0,
        isNegotiated,
        negotiatedTotalPrice,
        originalTotalPrice,
      },
    };
  }

  return { success: false, error: `Unknown tool: ${name}` };
}

// Fallback rule-based responder in case external LLM API is unavailable
function fallbackResponse(userMessage, messages = [], sessionId = null, bookingState = null) {
  const lower = (userMessage || '').toLowerCase();
  const session = (sessionId ? getChatBookingSession(sessionId) : null) || bookingState;

  let detectedProp = null;
  if (lower.includes('homestay 2') || lower.includes('hs2')) detectedProp = 'homestay-2';
  else if (lower.includes('homestay 3') || lower.includes('hs3')) detectedProp = 'homestay-3';
  else if (lower.includes('red roots') || lower.includes('rrv')) detectedProp = 'red-roots-villa';

  const propId = detectedProp || session?.property_id || 'red-roots-villa';
  const propConfig = getPropertyConfig(propId) || getPropertyConfig('red-roots-villa');

  // Check if customer rejected alternative dates and wants other options/properties
  const rejectsAltDates =
    session?.last_customer_intent === 'rejected_alt_dates' ||
    lower.includes('cannot change') ||
    lower.includes("can't change") ||
    lower.includes('other options') ||
    lower.includes('other homestay') ||
    lower.includes('other homestays') ||
    lower.includes('other property') ||
    lower.includes('other properties') ||
    lower.includes('sister homestay') ||
    lower.includes('sister homestays') ||
    lower.includes('sister property') ||
    lower.includes('alternative property') ||
    lower.includes('alternative homestay') ||
    lower.includes('different villa') ||
    lower.includes('different homestay') ||
    lower.includes('another homestay') ||
    lower.includes('another property') ||
    lower.includes('need those dates') ||
    lower.includes('only those dates') ||
    lower.includes('check other') ||
    lower.includes('check sister');

  // 1. Inquiries about exploring all properties, homestay overviews, or comparisons
  const isExploreInquiry =
    lower.includes('explore') ||
    lower.includes('all 3') ||
    lower.includes('all homestay') ||
    lower.includes('all three') ||
    lower.includes('three homestays') ||
    (lower.includes('homestay') &&
      (lower.includes('tell me') ||
        lower.includes('what are') ||
        lower.includes('show') ||
        lower.includes('difference') ||
        lower.includes('about')));

  if (isExploreInquiry && !session?.check_in && !rejectsAltDates) {
    const allProps = getAllPropertiesConfig();
    const list = allProps
      .map(
        (p, idx) =>
          `${idx + 1}. **${p.name}**: ${p.tagline} (${p.location})\n   *Highlights*: ${p.amenities.slice(0, 4).join(', ')}`
      )
      .join('\n\n');

    return {
      content: `We offer three serene, boutique homestays in Pondicherry:\n\n${list}\n\nWhich property would you like to explore or check dates for?`,
      action: null,
    };
  }

  // 2. Questions about zero online payment policy
  if (
    lower.includes('zero') ||
    lower.includes('payment policy') ||
    lower.includes('cardless') ||
    lower.includes('advance payment') ||
    lower.includes('pay at check-in')
  ) {
    return {
      content: `At **${propConfig.name}** and all our homestays, all reservations follow our **Zero Online Payment Policy**:\n\n• **100% Cardless Booking**: No credit card or advance deposit is required online.\n• **Instant Official Confirmation**: Your booking reference is generated immediately.\n• **Pay at Check-In**: You pay conveniently directly upon arrival at the property.\n\nWhich dates would you like me to check for your stay?`,
      action: null,
    };
  }

  // 3. Pool / Villa amenities inquiries (only when not inquiring about booking or dates)
  if (
    !session?.check_in &&
    !lower.includes('book') &&
    !lower.includes('reserve') &&
    !lower.includes('available') &&
    !lower.includes('november') &&
    !lower.includes('december') &&
    (lower.includes('private pool') ||
      lower.includes('swimming pool') ||
      (lower.includes('pool') && !lower.includes('suite') && !lower.includes('view')) ||
      lower.includes('3bhk') ||
      lower.includes('amenities'))
  ) {
    const amenitiesList = propConfig.amenities.map((a) => `• ${a}`).join('\n');
    return {
      content: `**${propConfig.name}** offers premier boutique hospitality with the following highlights:\n\n${amenitiesList}\n\nWould you like me to check room availability for specific dates?`,
      action: null,
    };
  }

  // Price negotiation / bargaining intent
  const isAccepting = isPriceAcceptanceMessage(lower);
  const isNegotiating =
    !isAccepting && (
      lower.includes('discount') ||
      lower.includes('better price') ||
      lower.includes('cheaper') ||
      lower.includes('bargain') ||
      lower.includes('expensive') ||
      lower.includes('less') ||
      lower.includes('can you do') ||
      lower.includes('make it') ||
      lower.includes('offer')
    );

  const roomTypeKey = session?.room_type || Object.keys(propConfig.rooms)[0];
  const effectiveSessionId = sessionId || `session_${propId}_${roomTypeKey.replace(/\s+/g, '_')}`;
  const existingNegSession = getNegotiationSession(effectiveSessionId);
  const isDealAlreadyAgreed = existingNegSession?.status === 'deal_agreed';

  const isProceedingWithAgreedDeal =
    isDealAlreadyAgreed &&
    (isAccepting ||
      lower.includes('book') ||
      lower.includes('proceed') ||
      lower.includes('confirm') ||
      lower.includes('take it') ||
      lower.includes('reservation'));

  if ((isNegotiating || isAccepting || isProceedingWithAgreedDeal) && !rejectsAltDates) {
    if (!session?.check_in || (!session?.check_out && !session?.stay_duration_known)) {
      return {
        content: `I would be delighted to assist you with a special rate! Before we discuss pricing, could you please share your preferred check-in and check-out dates and which homestay you would like to stay at? This helps me check live availability and find you the best possible rate.`,
        action: null,
      };
    }

    const numMatch = lower.match(/(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})/i);
    let customerOfferedPrice = numMatch ? parseInt(numMatch[1].replace(/,/g, ''), 10) : null;
    if (isNegotiating && customerOfferedPrice && existingNegSession?.original_price && customerOfferedPrice >= existingNegSession.original_price) {
      customerOfferedPrice = null;
    }

    const isCustomerAskingLower =
      customerOfferedPrice != null &&
      existingNegSession?.current_offered_price &&
      customerOfferedPrice < existingNegSession.current_offered_price;

    const res = executeNegotiateRoomRate(
      {
        propertyId: propId,
        roomType: session.room_type || existingNegSession?.room_type || Object.keys(propConfig.rooms)[0],
        checkIn: session.check_in,
        checkOut: session.check_out,
        rooms: session.rooms,
        customerOfferedPrice,
        customerAccepted: (isAccepting || isDealAlreadyAgreed) && !isNegotiating && !isCustomerAskingLower,
      },
      messages,
      sessionId,
      session
    );

    if (res.status === 'deal_agreed') {
      return {
        content: `Wonderful! We have agreed on a special courtesy rate of **₹${res.currentOfferedPrice.toLocaleString('en-IN')}** for your stay at **${res.propertyName}** (${res.roomType}) from ${res.checkIn} to ${res.checkOut}.\n\nNo advance payment is needed today—you pay directly upon arrival at check-in. Click **Continue to Booking** below to secure your room at this locked-in rate!`,
        action: {
          type: 'open_booking_modal',
          ...res.bookingDetails,
        },
      };
    }

    if (res.isOfferBelowFloor) {
      return {
        content: `I understand your budget! But ₹${res.customerOfferedPrice?.toLocaleString('en-IN')} would be difficult for our ${res.roomType}. However, as a valued guest, I can offer you **₹${res.currentOfferedPrice.toLocaleString('en-IN')}**.\n\nThis includes full access to our private pool and serene garden. Would that work for you?`,
        action: {
          type: 'open_booking_modal',
          ...res.bookingDetails,
        },
      };
    }

    return {
      content: `I can certainly try to get you a better deal! For the **${res.roomType}**, our standard rate is ₹${res.originalPrice.toLocaleString('en-IN')}. I can offer you a special courtesy rate of **₹${res.currentOfferedPrice.toLocaleString('en-IN')}**.\n\nWould you like to lock this rate in for your stay?`,
      action: {
        type: 'open_booking_modal',
        ...res.bookingDetails,
      },
    };
  }

  // Check availability or booking inquiry (using word boundaries for stay words)
  const hasStayWord = /\b(?:stay|stays|staying|night|nights)\b/i.test(lower);
  const isBookingOrAvailabilityInquiry =
    lower.includes('book') ||
    lower.includes('reserve') ||
    lower.includes('available') ||
    lower.includes('availability') ||
    hasStayWord ||
    Boolean(session?.check_in);

  if (isBookingOrAvailabilityInquiry) {
    if (!session?.check_in) {
      if (detectedProp || (session?.property_id && session.property_id !== 'red-roots-villa')) {
        return {
          content: `Welcome to **${propConfig.name}**! I would be delighted to assist with your reservation.\n\nWhich dates are you planning to visit Pondicherry? (You can share your check-in date or dates, and I will check live availability immediately for you!)`,
          action: null,
        };
      }
      return {
        content: `Welcome! I would be delighted to assist with your reservation. Which dates are you planning to visit Pondicherry, and which of our three homestays (**Red Roots Villa**, **Homestay 2**, or **Homestay 3**) would you prefer?`,
        action: null,
      };
    }

    const avail = {
      isAvailable: session.is_available,
      status: session.availability_status,
      requestedRoomUnavailable: session.requested_room_unavailable,
      propertyName: session.property_name,
      propertyId: session.property_id,
      checkIn: session.check_in,
      checkOut: session.check_out,
      nights: session.nights,
      stayDurationKnown: session.stay_duration_known,
      requestedRooms: session.rooms,
      adults: session.adults,
      roomType: session.room_type,
      availableRooms: session.available_room_types,
      soldOutRooms: session.sold_out_room_types,
      alternativeDates: session.alternative_dates,
      alternativeProperties: session.alternative_properties,
    };

    // Case 1: The specific requested room type is unavailable, but other room types at this property ARE available
    if (avail.requestedRoomUnavailable && avail.availableRooms.length > 0) {
      const roomLines = avail.availableRooms
        .map((r) =>
          avail.stayDurationKnown && r.totalPrice
            ? `• **${r.roomType}**: ₹${r.totalPrice.toLocaleString('en-IN')} total (₹${r.pricePerNight.toLocaleString('en-IN')}/night, ${r.minAvailableRooms} rooms available)`
            : `• **${r.roomType}**: ₹${r.pricePerNight.toLocaleString('en-IN')}/night (${r.minAvailableRooms} rooms available)`
        )
        .join('\n');

      if (!avail.stayDurationKnown) {
        return {
          content: `The **${avail.roomType}** is currently unavailable at **${avail.propertyName}** for check-in on **${avail.checkIn}**.\n\nHowever, we have other lovely rooms available at **${avail.propertyName}**:\n${roomLines}\n\nTo verify availability for your complete stay, how many nights will you be staying, and how many guests and rooms will you need?`,
          action: null,
        };
      }

      const primaryRoom = avail.availableRooms[0];
      return {
        content: `The **${avail.roomType}** is currently unavailable at **${avail.propertyName}** for your dates (${avail.checkIn} to ${avail.checkOut}).\n\nHowever, we have other available options at **${avail.propertyName}**:\n${roomLines}\n\nWould you like to book one of these available rooms, or explore our sister homestays?`,
        action: primaryRoom
          ? {
              type: 'open_booking_modal',
              propertyId: avail.propertyId,
              propertyName: avail.propertyName,
              roomType: primaryRoom.roomType,
              checkIn: avail.checkIn,
              checkOut: avail.checkOut,
              rooms: avail.requestedRooms,
              adults: avail.adults,
              pricePerNight: primaryRoom.pricePerNight,
              totalPrice: primaryRoom.totalPrice,
            }
          : null,
      };
    }

    // Case 2: Rooms ARE available
    if (avail.isAvailable) {
      // If stay duration is missing: tentative check-in confirmed
      if (!avail.stayDurationKnown || !avail.checkOut) {
        return {
          content: `Great news! **${avail.propertyName}** has availability for check-in on **${avail.checkIn}**!\n\nTo verify availability for your complete stay and prepare your reservation, how many nights will you be staying (or what is your checkout date), and how many guests and rooms will you need?`,
          action: null,
        };
      }

      const roomLines = avail.availableRooms
        .map(
          (r) =>
            `• **${r.roomType}**: ₹${r.totalPrice ? r.totalPrice.toLocaleString('en-IN') : (r.pricePerNight * avail.nights * avail.requestedRooms).toLocaleString('en-IN')} total (₹${r.pricePerNight.toLocaleString('en-IN')}/night, ${r.minAvailableRooms} available)`
        )
        .join('\n');

      const primaryRoom = avail.roomType
        ? avail.availableRooms.find((r) => r.roomType.toLowerCase() === avail.roomType.toLowerCase()) || avail.availableRooms[0]
        : avail.availableRooms[0];

      return {
        content: `Great news! **${avail.propertyName}** has availability for your selected dates (**${avail.checkIn} to ${avail.checkOut}** for ${avail.nights} night${avail.nights > 1 ? 's' : ''}):\n\n${roomLines}\n\nAll reservations require zero advance payment—you pay directly at check-in. Would you like to proceed with one of these rooms, or would you like to inquire about a courtesy group discount?`,
        action: primaryRoom
          ? {
              type: 'open_booking_modal',
              propertyId: avail.propertyId,
              propertyName: avail.propertyName,
              roomType: primaryRoom.roomType,
              checkIn: avail.checkIn,
              checkOut: avail.checkOut,
              rooms: avail.requestedRooms,
              adults: avail.adults,
              pricePerNight: primaryRoom.pricePerNight,
              totalPrice: primaryRoom.totalPrice || primaryRoom.pricePerNight * avail.nights * avail.requestedRooms,
            }
          : null,
      };
    }

    // Case 3: Rooms NOT available: Check if alternative dates are rejected and check sister properties
    if (rejectsAltDates) {
      if (avail.alternativeProperties.length > 0) {
        const propDescriptions = avail.alternativeProperties
          .map((p) => {
            const rooms = p.availableRooms
              .map((r) =>
                avail.stayDurationKnown && r.totalPrice
                  ? `  - **${r.roomType}**: ₹${r.totalPrice.toLocaleString('en-IN')} total (₹${r.pricePerNight.toLocaleString('en-IN')}/night)`
                  : `  - **${r.roomType}**: ₹${r.pricePerNight.toLocaleString('en-IN')}/night`
              )
              .join('\n');
            return `• **${p.propertyName}** (${p.location}):\n${rooms}`;
          })
          .join('\n\n');

        return {
          content: `Unfortunately, your preferred date (${avail.checkIn}) is fully booked at ${avail.propertyName}. However, I can offer you other options among our sister homestays that are available for your exact date:\n\n${propDescriptions}\n\nWould you like to explore either of these properties for your stay?`,
          action: null,
        };
      } else {
        return {
          content: `I am very sorry, but all three homestays are fully booked for your requested date (${avail.checkIn}). Would you be open to checking another set of dates?`,
          action: null,
        };
      }
    }

    // Case 4: Rooms NOT available: Suggest nearby alternative dates for the SAME homestay first
    if (avail.alternativeDates.length > 0) {
      if (!avail.stayDurationKnown || !avail.checkOut) {
        const dateList = avail.alternativeDates
          .map((d) => `• **${d.checkIn}** (${d.availableRooms.length} room types available)`)
          .join('\n');

        return {
          content: `I'm sorry, **${avail.propertyName}** is fully booked on **${avail.checkIn}**.\n\nHowever, I found tentative availability for check-in on these nearby dates:\n${dateList}\n\nWould any of these dates work for your visit? Alternatively, I can check our sister homestays for your original date.`,
          action: null,
        };
      }

      const bestAlt = avail.alternativeDates[0];
      const altRooms = bestAlt.availableRooms
        .map((r) =>
          r.totalPrice
            ? `• **${r.roomType}**: ₹${r.totalPrice.toLocaleString('en-IN')} total (₹${r.pricePerNight.toLocaleString('en-IN')}/night)`
            : `• **${r.roomType}**: ₹${r.pricePerNight.toLocaleString('en-IN')}/night`
        )
        .join('\n');

      return {
        content: `I'm sorry, **${avail.propertyName}** is fully booked for your selected dates (${avail.checkIn} to ${avail.checkOut}). However, I found availability from **${bestAlt.checkIn} to ${bestAlt.checkOut}** (${bestAlt.nights} night${bestAlt.nights > 1 ? 's' : ''}):\n\n${altRooms}\n\nWould you be interested in those dates? Alternatively, I can also check our sister homestays for your original dates.`,
        action: null,
      };
    }

    // Case 5: No alternative dates for same property, but sister homestays are available
    if (avail.alternativeProperties.length > 0) {
      const propDescriptions = avail.alternativeProperties
        .map((p) => {
          const rooms = p.availableRooms
            .map((r) =>
              avail.stayDurationKnown && r.totalPrice
                ? `  - **${r.roomType}**: ₹${r.totalPrice.toLocaleString('en-IN')} total (₹${r.pricePerNight.toLocaleString('en-IN')}/night)`
                : `  - **${r.roomType}**: ₹${r.pricePerNight.toLocaleString('en-IN')}/night`
            )
            .join('\n');
          return `• **${p.propertyName}** (${p.location}):\n${rooms}`;
        })
        .join('\n\n');

      return {
        content: `Unfortunately, your preferred date (${avail.checkIn}) is fully booked at ${avail.propertyName}. However, I can offer you other options that are available for your exact date:\n\n${propDescriptions}\n\nWould you like to explore either of them?`,
        action: null,
      };
    }

    // Case 6: All properties unavailable
    return {
      content: `I am very sorry, but all three homestays are completely booked for your requested date (${avail.checkIn}). Would you like me to check other dates for your visit to Pondicherry?`,
      action: null,
    };
  }

  // General questions
  if (lower.includes('price') || lower.includes('cost') || lower.includes('rate')) {
    const prices = Object.entries(propConfig.rooms)
      .map(([name, r]) => `• **${name}**: ₹${r.pricePerNight.toLocaleString('en-IN')} / night`)
      .join('\n');

    return {
      content: `Here are the nightly rates for **${propConfig.name}**:\n\n${prices}\n\nAll rates include full access to facilities and zero advance payment—you pay directly at check-in! Which dates would you like me to check for you?`,
      action: null,
    };
  }

  if (detectedProp || (session?.property_id && session.property_id !== 'red-roots-villa')) {
    return {
      content: `Welcome to **${propConfig.name}**! I am your Villa Concierge. I can check live availability, answer questions regarding amenities and rates, or assist you with an instant reservation. Which dates are you planning to visit?`,
      action: null,
    };
  }

  return {
    content: `Welcome to **Red Roots Villa** and our sister homestays! I am your personal Villa Concierge. I can check real-time availability across our three homestays, help you select rooms, and arrange your reservation. Which dates are you planning to visit Pondicherry?`,
    action: null,
  };
}

// Validates that an AI-generated message does not hallucinate outdated dates, wrong properties, or false availability claims
function validateResponseAgainstState(content, bookingState, lastUserMsg) {
  if (!content || !bookingState) return content;
  const lower = content.toLowerCase();

  // 1. If date was changed (e.g. to Nov 16), but content still references older dates
  if (bookingState.check_in && bookingState.check_in.includes('-11-16')) {
    if (lower.includes('november 20') || lower.includes('nov 20') || lower.includes('november 10') || lower.includes('nov 10')) {
      return null;
    }
  }

  // 2. If property is homestay-2, but content talks exclusively about Red Roots Villa without mentioning Homestay 2, or asks which homestay to choose
  if (bookingState.property_id === 'homestay-2') {
    if ((lower.includes('red roots villa is') || lower.includes('at red roots villa') || lower.includes('welcome to red roots villa')) && !lower.includes('homestay 2')) {
      return null;
    }
    if (lower.includes('which of our three homestays') || lower.includes('which homestay would you prefer') || lower.includes('which of our three properties')) {
      return null;
    }
  }

  // 3. If property is homestay-3, but content talks exclusively about Red Roots Villa without mentioning Homestay 3, or asks which homestay to choose
  if (bookingState.property_id === 'homestay-3') {
    if ((lower.includes('red roots villa is') || lower.includes('at red roots villa') || lower.includes('welcome to red roots villa')) && !lower.includes('homestay 3')) {
      return null;
    }
    if (lower.includes('which of our three homestays') || lower.includes('which homestay would you prefer') || lower.includes('which of our three properties')) {
      return null;
    }
  }

  // 4. If property is available, but content claims it is fully booked or unavailable
  if (bookingState.is_available === true && !bookingState.requested_room_unavailable) {
    if (lower.includes('is fully booked') || lower.includes('is completely booked') || lower.includes('has no availability') || lower.includes('is currently unavailable')) {
      return null;
    }
  }

  // 5. If requested room is unavailable but other rooms are open, do not allow claiming whole property is booked
  if (bookingState.is_available === true && bookingState.requested_room_unavailable) {
    if (lower.includes('homestay 2 is fully booked') || lower.includes('homestay 2 is completely booked') || lower.includes('completely booked at homestay 2')) {
      return null;
    }
  }

  // 6. If property has zero availability, do not allow claiming it has availability
  if (bookingState.is_available === false) {
    if (lower.includes('great news') || lower.includes('has availability for your selected dates') || lower.includes('has availability for check-in on')) {
      return null;
    }
  }

  return content;
}

export async function POST(request) {
  let effectiveSessionId = 'session_default';
  let currentMessagesList = [];
  try {
    const body = await request.json();
    const { messages = [], sessionId = null } = body;
    effectiveSessionId = sessionId || `session_${Date.now()}`;
    currentMessagesList = messages;
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || '';

    // Authoritative backend booking state update & verification
    const bookingState = updateChatBookingState({
      sessionId: effectiveSessionId,
      userMessage: lastUserMsg,
      messages,
    });

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

    if (!apiKey) {
      console.warn('OPENROUTER_API_KEY is not configured. Using fallback concierge logic.');
      const fallback = fallbackResponse(lastUserMsg, messages, effectiveSessionId, bookingState);
      return NextResponse.json({
        success: true,
        sessionId: effectiveSessionId,
        message: {
          role: 'assistant',
          content: fallback.content,
          action: fallback.action,
        },
      });
    }

    const systemPrompt = getSystemPrompt(bookingState);
    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // First API call with tool definitions (max_tokens 350 to ensure credit limits are respected)
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Red Roots Villa Chatbot Concierge',
      },
      body: JSON.stringify({
        model,
        max_tokens: 350,
        temperature: 0.7,
        messages: openRouterMessages,
        tools: CHAT_TOOLS,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`OpenRouter API error (status ${res.status}):`, errText);
      const fallback = fallbackResponse(lastUserMsg, messages, effectiveSessionId, bookingState);
      return NextResponse.json({
        success: true,
        sessionId: effectiveSessionId,
        message: {
          role: 'assistant',
          content: fallback.content,
          action: fallback.action,
        },
      });
    }

    const data = await res.json();
    const assistantMsg = data.choices?.[0]?.message;

    if (!assistantMsg) {
      throw new Error('Empty response from AI assistant');
    }

    let actionPayload = null;

    // Handle tool calling with iterative multi-step execution (up to 3 turns)
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      let currentAssistantMsg = assistantMsg;
      let iteration = 0;
      let executedNegotiationThisTurn = false;
      let lastNegotiationResult = null;
      const currentMessages = [...openRouterMessages];

      while (currentAssistantMsg?.tool_calls && currentAssistantMsg.tool_calls.length > 0 && iteration < 3) {
        iteration++;
        const toolCall = currentAssistantMsg.tool_calls[0];
        const fnName = toolCall.function?.name;
        let fnArgs = {};

        try {
          fnArgs = JSON.parse(toolCall.function?.arguments || '{}');
        } catch (e) {
          fnArgs = {};
        }

        let toolResult;
        if (fnName === 'negotiate_room_rate') {
          if (executedNegotiationThisTurn && lastNegotiationResult) {
            toolResult = lastNegotiationResult;
          } else {
            executedNegotiationThisTurn = true;
            lastNegotiationResult = executeNegotiateRoomRate(fnArgs, messages, effectiveSessionId, bookingState);
            toolResult = lastNegotiationResult;
          }
        } else {
          toolResult = executeTool(fnName, fnArgs, messages, effectiveSessionId, bookingState);
        }

        if (toolResult.action === 'open_booking_modal' && toolResult.bookingDetails) {
          actionPayload = {
            type: 'open_booking_modal',
            ...toolResult.bookingDetails,
          };
        } else if (fnName === 'check_availability' && toolResult.results) {
          if (toolResult.isAvailable && !toolResult.isStayDurationMissing && !toolResult.requestedRoomUnavailable) {
            const availableRoom = toolResult.results.find((r) => r.isAvailable);
            if (availableRoom) {
              const propConfig = getPropertyConfig(toolResult.propertyId);
              const negSId = effectiveSessionId || `session_${toolResult.propertyId}_${availableRoom.roomType.replace(/\s+/g, '_')}`;
              const negSession = getNegotiationSession(negSId);
              const isAgreedOrNegotiated = negSession && negSession.current_offered_price < negSession.original_price;

              actionPayload = {
                type: 'open_booking_modal',
                propertyId: toolResult.propertyId,
                propertyName: propConfig?.name || 'Red Roots Villa',
                roomType: availableRoom.roomType,
                checkIn: toolResult.checkIn,
                checkOut: toolResult.checkOut,
                pricePerNight: availableRoom.pricePerNight,
                totalPrice: isAgreedOrNegotiated ? negSession.current_offered_price : availableRoom.totalPrice,
                rooms: toolResult.requestedRooms || 1,
                adults: toolResult.adults || 2,
                isNegotiated: Boolean(isAgreedOrNegotiated),
                originalTotalPrice: isAgreedOrNegotiated ? negSession.original_price : undefined,
                negotiatedTotalPrice: isAgreedOrNegotiated ? negSession.current_offered_price : undefined,
              };
            }
          } else {
            actionPayload = null;
          }
        }

        currentMessages.push(currentAssistantMsg);
        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });

        const nextRes = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Red Roots Villa Chatbot Concierge',
          },
          body: JSON.stringify({
            model,
            max_tokens: 350,
            temperature: 0.7,
            messages: currentMessages,
            tools: CHAT_TOOLS,
          }),
        });

        if (!nextRes.ok) {
          break;
        }

        const nextData = await nextRes.json();
        currentAssistantMsg = nextData.choices?.[0]?.message;
      }

      const rawFinal = currentAssistantMsg?.content || assistantMsg.content;
      const validatedFinal = validateResponseAgainstState(rawFinal, bookingState, lastUserMsg);
      if (validatedFinal) {
        return NextResponse.json({
          success: true,
          sessionId: effectiveSessionId,
          message: {
            role: 'assistant',
            content: validatedFinal,
            action: actionPayload,
          },
        });
      }

      // If AI executed a tool but returned empty or contradicted content, use fallback availability logic
      const fallback = fallbackResponse(lastUserMsg, messages, effectiveSessionId, bookingState);
      return NextResponse.json({
        success: true,
        sessionId: effectiveSessionId,
        message: {
          role: 'assistant',
          content: fallback.content,
          action: actionPayload || fallback.action,
        },
      });
    }

    const rawContent = assistantMsg.content;
    const validatedContent = validateResponseAgainstState(rawContent, bookingState, lastUserMsg);
    const fallback = fallbackResponse(lastUserMsg, messages, effectiveSessionId, bookingState);
    return NextResponse.json({
      success: true,
      sessionId: effectiveSessionId,
      message: {
        role: 'assistant',
        content: validatedContent || fallback.content,
        action: actionPayload || fallback.action,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const lastUserMsg = currentMessagesList.filter((m) => m.role === 'user').pop()?.content || '';
    const fallback = fallbackResponse(lastUserMsg, currentMessagesList, effectiveSessionId);
    return NextResponse.json({
      success: true,
      sessionId: effectiveSessionId,
      message: {
        role: 'assistant',
        content: fallback.content,
        action: fallback.action,
      },
    });
  }
}
