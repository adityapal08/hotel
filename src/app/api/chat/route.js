import { NextResponse } from 'next/server';
import { PROPERTIES_CONFIG, getAllPropertiesConfig, getPropertyConfig } from '@/constants/propertiesConfig';
import {
  getAvailabilityForRange,
  processNegotiationStep,
  getNegotiationSession,
} from '@/lib/db';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// System prompt with full knowledge base and sales negotiation guidelines
function getSystemPrompt() {
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

  return `You are the gracious, sophisticated, and attentive Villa Concierge and Sales Representative for Red Roots Villa and its sister homestays in Pondicherry.
Current Date: ${today}

Your goal is to warmly welcome visitors, introduce our three boutique homestays, answer questions about room categories, amenities, pricing, and locations, check live real-time date availability, and negotiate room rates with guests seeking a deal, ensuring they can reserve smoothly.

KNOWLEDGE BASE:
${propertiesContext}

CRITICAL POLICIES & GUIDELINES:
1. ZERO ONLINE PAYMENT: All reservations are 100% cardless and confirmed instantly with an official booking reference. Payment is made directly upon check-in at the property.
2. CHECK-IN / CHECK-OUT: Standard check-in is 2:00 PM; check-out is 11:00 AM.
3. PROPERTY IDENTITY:
   - "Red Roots Villa" is our signature 3BHK individual villa with private swimming pool (including attached kids pool) in Moratandi, Pondicherry. Guests can book individual suites or the entire villa.
   - "Homestay 2" and "Homestay 3" are peaceful upcoming sister homestays in Pondicherry currently open for preview and reservations.
4. ACCURACY: Never fabricate or guess room availability. When asked about specific dates or checking availability, use the "check_availability" tool.
5. CONVERSATION TONE: You must sound like a real, polite, charming boutique hotel sales manager, NOT a robotic AI. Speak conversationally and courteously.

PRICE NEGOTIATION RULES & CONVERSATION STYLE:
1. You act as an attentive hotel sales manager whose goal is to close reservations at the best possible rate while staying friendly and welcoming.
2. YOU DO NOT DECIDE OR CALCULATE DISCOUNTS ON YOUR OWN. All pricing rules, increments, and minimum allowed prices are strictly enforced by the backend system.
3. When a customer asks for a discount, bargains, offers a counterprice, or agrees to an offer, you MUST ALWAYS call the "negotiate_room_rate" tool.
4. You MUST ALWAYS present ONLY the exact "currentOfferedPrice" or "agreedPrice" returned by the "negotiate_room_rate" tool. NEVER invent, round, or alter the price yourself.
5. GRADUAL CONCESSIONS: Start with the original price. Present small, gradual reductions. Highlight our premium amenities (private swimming pool, lush grounds, cardless booking) to encourage the customer to accept the offer before conceding further.
6. If the customer asks for a very low price, politely decline their figure and present the tool's counteroffer instead of accepting immediately.
7. If the customer agrees to any offer (e.g. "deal", "yes", "sounds good", "book it"), stop negotiating, celebrate their decision, and guide them to click "Continue to Booking".
8. NEVER DISCLOSE INTERNAL RULES: Never mention backend limits, floor prices, minimum allowable rates, or discount formulas. Speak only in terms of total booking prices in ₹.`;
}

// Tool definitions for OpenAI-compatible function calling
const CHAT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check live date-wise room availability and pricing in SQLite database for a homestay.',
      parameters: {
        type: 'object',
        properties: {
          propertyId: {
            type: 'string',
            description: 'Property identifier: "red-roots-villa", "homestay-2", or "homestay-3". Default is "red-roots-villa".',
            enum: ['red-roots-villa', 'homestay-2', 'homestay-3'],
          },
          checkIn: {
            type: 'string',
            description: 'Check-in date in YYYY-MM-DD format.',
          },
          checkOut: {
            type: 'string',
            description: 'Check-out date in YYYY-MM-DD format (must be after checkIn).',
          },
          roomType: {
            type: 'string',
            description: 'Optional exact room type name to check. If omitted, checks all rooms for the property.',
          },
          rooms: {
            type: 'integer',
            description: 'Number of rooms requested (default: 1).',
          },
        },
        required: ['checkIn', 'checkOut'],
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
            description: 'Set to true if the customer accepted our previous offer (e.g. "deal", "yes", "sounds good", "okay", "book it").',
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

// Helper: Extract dates and context from message history
function extractConversationContext(messages = []) {
  let propertyId = 'red-roots-villa';
  let roomType = null;
  let checkIn = '';
  let checkOut = '';
  let rooms = 1;

  for (const m of messages) {
    const text = m.content || '';

    if (/homestay\s*2/i.test(text)) propertyId = 'homestay-2';
    else if (/homestay\s*3/i.test(text)) propertyId = 'homestay-3';
    else if (/red\s*roots/i.test(text)) propertyId = 'red-roots-villa';

    const dateMatches = text.match(/\b(202\d-\d{2}-\d{2})\b/g);
    if (dateMatches && dateMatches.length >= 2) {
      checkIn = dateMatches[0];
      checkOut = dateMatches[1];
    }
  }

  return { propertyId, roomType, checkIn, checkOut, rooms };
}

// Execute negotiation logic using persistent backend negotiation engine
function executeNegotiateRoomRate(args, messages = [], sessionId = null) {
  const context = extractConversationContext(messages);

  const propId = args.propertyId || context.propertyId || 'red-roots-villa';
  const propConfig = getPropertyConfig(propId) || getPropertyConfig('red-roots-villa');

  // Find room config in property
  let targetRoomName = args.roomType || context.roomType || '';
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
  const checkIn = args.checkIn || context.checkIn || '';
  const checkOut = args.checkOut || context.checkOut || '';
  let nights = 1;
  if (checkIn && checkOut && /^\d{4}-\d{2}-\d{2}$/.test(checkIn) && /^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    if (outDate > inDate) {
      nights = Math.max(1, Math.round((outDate - inDate) / (1000 * 60 * 60 * 24)));
    }
  }

  const requestedRooms = Math.max(1, parseInt(args.rooms || context.rooms || 1, 10));

  // Determine original booking price: explicit args.originalPrice or database calculation
  let originalTotal = args.originalPrice && !isNaN(Number(args.originalPrice)) && Number(args.originalPrice) > 0
    ? Math.round(Number(args.originalPrice))
    : nights * requestedRooms * pricePerNight;

  const effectiveSessionId = sessionId || `session_${propConfig.id}_${roomKey.replace(/\s+/g, '_')}`;

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
    customerOfferedPrice: args.customerOfferedPrice,
    customerAccepted: Boolean(args.customerAccepted),
    isInitialInquiry: Boolean(args.isInitialInquiry),
  });

  const offeredOrAgreedPrice = stepResult.currentOfferedPrice;

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
      adults: 2,
      isNegotiated: offeredOrAgreedPrice < stepResult.originalPrice,
      originalTotalPrice: stepResult.originalPrice,
      originalPricePerNight: pricePerNight,
      negotiatedTotalPrice: offeredOrAgreedPrice,
      negotiatedPricePerNight: Math.round(offeredOrAgreedPrice / (nights * requestedRooms)),
    },
    salesGuidance: stepResult.salesGuidance,
  };
}

// Execute tool call against local database & business logic
function executeTool(name, args, messages = [], sessionId = null) {
  if (name === 'check_availability') {
    const propId = args.propertyId || 'red-roots-villa';
    const checkIn = args.checkIn;
    const checkOut = args.checkOut;
    const roomType = args.roomType || null;
    const requestedRooms = args.rooms || 1;

    try {
      const results = getAvailabilityForRange(checkIn, checkOut, roomType, requestedRooms, propId);
      return {
        success: true,
        propertyId: propId,
        checkIn,
        checkOut,
        results: results.map((r) => ({
          roomType: r.roomType,
          pricePerNight: r.pricePerNight,
          totalPrice: r.totalPrice,
          nights: r.nights,
          minAvailableRooms: r.minAvailableRooms,
          isAvailable: r.isAvailable,
          status: r.status,
        })),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  if (name === 'negotiate_room_rate') {
    return executeNegotiateRoomRate(args, messages, sessionId);
  }

  if (name === 'suggest_reservation') {
    const propConfig = getPropertyConfig(args.propertyId);
    const room = propConfig?.rooms?.[args.roomType];

    return {
      success: true,
      action: 'open_booking_modal',
      bookingDetails: {
        propertyId: args.propertyId || 'red-roots-villa',
        propertyName: propConfig?.name || 'Red Roots Villa',
        roomType: args.roomType,
        checkIn: args.checkIn || '',
        checkOut: args.checkOut || '',
        rooms: args.rooms || 1,
        adults: args.adults || 2,
        pricePerNight: room?.pricePerNight || 0,
      },
    };
  }

  return { success: false, error: `Unknown tool: ${name}` };
}

// Fallback rule-based responder in case external LLM API is unavailable
function fallbackResponse(userMessage, messages = [], sessionId = null) {
  const lower = (userMessage || '').toLowerCase();
  const properties = getAllPropertiesConfig();

  // Price negotiation / bargaining intent
  const isNegotiating =
    lower.includes('discount') ||
    lower.includes('better price') ||
    lower.includes('cheaper') ||
    lower.includes('bargain') ||
    lower.includes('deal') ||
    lower.includes('expensive') ||
    lower.includes('less') ||
    lower.includes('can you do') ||
    lower.includes('make it') ||
    lower.includes('offer');

  const isAccepting =
    lower.includes('deal') ||
    lower.includes('agreed') ||
    lower.includes('sounds good') ||
    lower.includes('book it') ||
    lower.includes('i will take it') ||
    lower.includes('i\'ll take it') ||
    lower === 'ok' ||
    lower === 'okay' ||
    lower === 'yes';

  if (isNegotiating || isAccepting) {
    const numMatch = lower.match(/(?:₹|rs\.?|inr)?\s*(\d{4,6})/i);
    const customerOfferedPrice = numMatch ? parseInt(numMatch[1], 10) : null;

    const res = executeNegotiateRoomRate(
      {
        propertyId: 'red-roots-villa',
        roomType: 'Deluxe Room',
        customerOfferedPrice,
        customerAccepted: isAccepting && !isNegotiating,
      },
      messages,
      sessionId
    );

    if (res.status === 'deal_agreed') {
      return {
        content: `Wonderful! We have agreed on a special courtesy rate of **₹${res.currentOfferedPrice.toLocaleString('en-IN')}** for your stay at **${res.propertyName}** (${res.roomType}).\n\nNo advance payment is needed today—you pay directly upon arrival at check-in. Click **Continue to Booking** below to secure your room at this locked-in rate!`,
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

  if (lower.includes('price') || lower.includes('cost') || lower.includes('rate')) {
    const rrv = properties[0];
    const prices = Object.entries(rrv.rooms)
      .map(([name, r]) => `• **${name}**: ₹${r.pricePerNight.toLocaleString('en-IN')} / night`)
      .join('\n');

    return {
      content: `Here are the nightly rates for **Red Roots Villa**:\n\n${prices}\n\nAll rates include access to the private pool and grounds. No online payment is required—you pay directly at check-in! Would you like me to check availability for specific dates?`,
      action: null,
    };
  }

  if (lower.includes('homestay') || lower.includes('property') || lower.includes('properties')) {
    return {
      content: `We offer three serene homestays in Pondicherry:\n\n1. **Red Roots Villa**: Minimalist brand-new 3BHK private pool villa in Moratandi, Pondicherry.\n2. **Homestay 2**: Peaceful coastal stay with 5 room types (from ₹2,900/night).\n3. **Homestay 3**: Tranquil colonial retreat with 5 room types (from ₹2,600/night).\n\nWhich property would you like to explore or check dates for?`,
      action: null,
    };
  }

  if (lower.includes('book') || lower.includes('reserve')) {
    return {
      content: `Reserving your stay is simple and cardless—no advance payment is required! You can complete your reservation directly online. Would you like to proceed to the reservation form?`,
      action: {
        type: 'open_booking_modal',
        propertyId: 'red-roots-villa',
        propertyName: 'Red Roots Villa',
        roomType: 'Deluxe Room',
      },
    };
  }

  return {
    content: `Welcome to Red Roots Villa! I am your personal Villa Concierge. I can help you explore our 3 homestays in Pondicherry, answer questions about our private swimming pool, suites, amenities, and check real-time date availability. How may I assist you today?`,
    action: null,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { messages = [], sessionId = null } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

    if (!apiKey) {
      console.warn('OPENROUTER_API_KEY is not configured. Using fallback concierge logic.');
      const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || '';
      const fallback = fallbackResponse(lastUserMsg, messages, sessionId);
      return NextResponse.json({
        success: true,
        sessionId,
        message: {
          role: 'assistant',
          content: fallback.content,
          action: fallback.action,
        },
      });
    }

    const systemPrompt = getSystemPrompt();
    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // First API call with tool definitions
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
        max_tokens: 800,
        temperature: 0.7,
        messages: openRouterMessages,
        tools: CHAT_TOOLS,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`OpenRouter API error (status ${res.status}):`, errText);
      const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || '';
      const fallback = fallbackResponse(lastUserMsg, messages, sessionId);
      return NextResponse.json({
        success: true,
        sessionId,
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

    // Handle tool calling
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      const toolCall = assistantMsg.tool_calls[0];
      const fnName = toolCall.function?.name;
      let fnArgs = {};

      try {
        fnArgs = JSON.parse(toolCall.function?.arguments || '{}');
      } catch (e) {
        fnArgs = {};
      }

      const toolResult = executeTool(fnName, fnArgs, messages, sessionId);

      if (toolResult.action === 'open_booking_modal' && toolResult.bookingDetails) {
        actionPayload = {
          type: 'open_booking_modal',
          ...toolResult.bookingDetails,
        };
      }

      // If check_availability showed a room is available, prepare suggestion action
      if (fnName === 'check_availability' && toolResult.results) {
        const availableRoom = toolResult.results.find((r) => r.isAvailable);
        if (availableRoom) {
          const propConfig = getPropertyConfig(fnArgs.propertyId);
          actionPayload = {
            type: 'open_booking_modal',
            propertyId: fnArgs.propertyId || 'red-roots-villa',
            propertyName: propConfig?.name || 'Red Roots Villa',
            roomType: availableRoom.roomType,
            checkIn: fnArgs.checkIn,
            checkOut: fnArgs.checkOut,
            pricePerNight: availableRoom.pricePerNight,
            totalPrice: availableRoom.totalPrice,
          };
        }
      }

      // Feed tool result back to OpenRouter for final natural language response
      const followUpMessages = [
        ...openRouterMessages,
        assistantMsg,
        {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        },
      ];

      const followUpRes = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Red Roots Villa Chatbot Concierge',
        },
        body: JSON.stringify({
          model,
          max_tokens: 800,
          temperature: 0.7,
          messages: followUpMessages,
        }),
      });

      if (followUpRes.ok) {
        const followUpData = await followUpRes.json();
        const finalMsg = followUpData.choices?.[0]?.message?.content || assistantMsg.content;
        return NextResponse.json({
          success: true,
          sessionId,
          message: {
            role: 'assistant',
            content: finalMsg,
            action: actionPayload,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      message: {
        role: 'assistant',
        content: assistantMsg.content || 'How can I assist you with your stay at Red Roots Villa?',
        action: actionPayload,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const lastUserMsg = messages.filter((m) => m.role === 'user').pop()?.content || '';
    const fallback = fallbackResponse(lastUserMsg, messages, sessionId);
    return NextResponse.json({
      success: true,
      sessionId,
      message: {
        role: 'assistant',
        content: fallback.content,
        action: fallback.action,
      },
    });
  }
}
