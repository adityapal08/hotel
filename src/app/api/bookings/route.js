import { NextResponse } from 'next/server';
import {
  PROPERTIES_CONFIG,
  getAvailabilityForRange,
  reserveBooking,
  cancelBooking,
  getBookingByReference,
  getAllBookings,
  getProperty,
} from '@/lib/db';

function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * GET /api/bookings
 * Check availability, retrieve booking by reference, or list bookings by property.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref');
    const propertyId = searchParams.get('propertyId') || searchParams.get('property');

    // 1. Retrieve booking by reference ID
    if (ref) {
      const booking = getBookingByReference(ref.trim().toUpperCase());
      if (!booking) {
        return NextResponse.json(
          { success: false, error: 'Booking reference not found.' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, booking });
    }

    // 2. Check availability and calculate price for date range
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const roomType = searchParams.get('roomType');
    const rooms = parseInt(searchParams.get('rooms') || '1', 10);

    if (checkIn && checkOut) {
      if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
        return NextResponse.json(
          { success: false, error: 'Invalid date format. Use YYYY-MM-DD.' },
          { status: 400 }
        );
      }

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        return NextResponse.json(
          { success: false, error: 'Check-in date cannot be in the past.' },
          { status: 400 }
        );
      }

      if (checkOutDate <= checkInDate) {
        return NextResponse.json(
          { success: false, error: 'Check-out date must be after check-in date.' },
          { status: 400 }
        );
      }

      const activePropId = propertyId || 'red-roots-villa';
      const results = getAvailabilityForRange(checkIn, checkOut, roomType, rooms, activePropId);
      const selectedResult = results[0] || null;

      return NextResponse.json({
        success: true,
        propertyId: activePropId,
        available: selectedResult ? selectedResult.isAvailable : false,
        status: selectedResult ? selectedResult.status : 'sold_out',
        minAvailableRooms: selectedResult ? selectedResult.minAvailableRooms : 0,
        nights: selectedResult ? selectedResult.nights : 1,
        roomType: selectedResult ? selectedResult.roomType : roomType,
        pricePerNight: selectedResult ? selectedResult.pricePerNight : 0,
        totalPrice: selectedResult ? selectedResult.totalPrice : 0,
        dailyBreakdown: selectedResult ? selectedResult.dailyBreakdown : [],
        allOptions: results,
      });
    }

    // 3. List bookings (admin/verification), optionally filtered by property
    const bookings = getAllBookings(100, propertyId);
    return NextResponse.json({
      success: true,
      message: 'Homestay Booking API is active.',
      propertyId: propertyId || 'all',
      totalCount: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error('Error in GET /api/bookings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error retrieving booking data.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * Validates guest data, rechecks inventory atomically for the selected property,
 * decrements inventory, and creates confirmed booking in SQLite.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const {
      propertyId = 'red-roots-villa',
      guestName,
      email,
      phone,
      checkIn,
      checkOut,
      adults = 1,
      children = 0,
      rooms = 1,
      roomType,
      specialRequests = '',
      isNegotiated = false,
      negotiatedTotalPrice = null,
    } = body;

    // 1. Validate Property
    const prop = PROPERTIES_CONFIG[propertyId];
    if (!prop) {
      return NextResponse.json(
        { success: false, error: `Invalid homestay property selected: "${propertyId}".` },
        { status: 400 }
      );
    }

    // 2. Required Field Validations
    if (!guestName || typeof guestName !== 'string' || guestName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid guest name (minimum 2 characters).' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const cleanPhone = (phone || '').replace(/[\s-]/g, '');
    if (!phone || cleanPhone.length < 8 || cleanPhone.length > 18) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid contact phone number.' },
        { status: 400 }
      );
    }

    // 3. Date Validations
    if (!checkIn || !isValidDate(checkIn)) {
      return NextResponse.json(
        { success: false, error: 'Please select a valid check-in date.' },
        { status: 400 }
      );
    }

    if (!checkOut || !isValidDate(checkOut)) {
      return NextResponse.json(
        { success: false, error: 'Please select a valid check-out date.' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return NextResponse.json(
        { success: false, error: 'Check-in date cannot be in the past.' },
        { status: 400 }
      );
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { success: false, error: 'Check-out date must be at least one day after check-in.' },
        { status: 400 }
      );
    }

    // 4. Room & Guests Validations for the selected Property
    const selectedRoomType = roomType || Object.keys(prop.rooms)[0];
    const selectedRoomConfig = prop.rooms[selectedRoomType];
    if (!selectedRoomConfig) {
      return NextResponse.json(
        {
          success: false,
          error: `Room type "${selectedRoomType}" does not belong to ${prop.name}. Available rooms: ${Object.keys(prop.rooms).join(', ')}`,
        },
        { status: 400 }
      );
    }

    const parsedAdults = parseInt(adults, 10);
    const parsedChildren = parseInt(children || 0, 10);
    const parsedRooms = parseInt(rooms || 1, 10);

    if (isNaN(parsedAdults) || parsedAdults < 1) {
      return NextResponse.json(
        { success: false, error: 'At least 1 adult guest is required.' },
        { status: 400 }
      );
    }

    if (isNaN(parsedChildren) || parsedChildren < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid number of children.' },
        { status: 400 }
      );
    }

    if (isNaN(parsedRooms) || parsedRooms < 1 || parsedRooms > selectedRoomConfig.totalInventory) {
      return NextResponse.json(
        { success: false, error: `Invalid room count. You can select between 1 and ${selectedRoomConfig.totalInventory} rooms.` },
        { status: 400 }
      );
    }

    // 5. Atomic SQLite Reservation & Inventory Decrement for Selected Property
    const { booking, updatedInventory } = reserveBooking({
      propertyId: prop.id,
      guestName,
      email,
      phone,
      checkIn,
      checkOut,
      adults: parsedAdults,
      children: parsedChildren,
      rooms: parsedRooms,
      roomType: selectedRoomType,
      specialRequests,
      isNegotiated: Boolean(isNegotiated),
      negotiatedTotalPrice: negotiatedTotalPrice != null ? Number(negotiatedTotalPrice) : null,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Your reservation at ${prop.name} has been confirmed.`,
        booking,
        updatedInventory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing booking in POST /api/bookings:', error);
    const isConflict =
      error.message &&
      (error.message.includes('Sold Out') ||
        error.message.includes('available') ||
        error.message.includes('conflict'));
    const isBadRequest =
      error.message &&
      (error.message.includes('authorized minimum rate') ||
        error.message.includes('below our authorized') ||
        error.message.includes('below our minimum') ||
        error.message.includes('allowable minimum rate'));

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred while saving your booking.',
      },
      { status: isConflict ? 409 : isBadRequest ? 400 : 500 }
    );
  }
}

/**
 * PATCH /api/bookings
 * Allows booking cancellation and atomic inventory restoration to the correct property.
 */
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { reference, action } = body;

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid booking reference.' },
        { status: 400 }
      );
    }

    if (action === 'cancel') {
      const { booking, restoredInventory } = cancelBooking(reference.trim().toUpperCase());
      return NextResponse.json({
        success: true,
        message: `Booking ${reference} for ${booking.property_name || 'the homestay'} has been cancelled and room inventory restored.`,
        booking,
        restoredInventory,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unrecognized action. Supported actions: "cancel".' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/bookings:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update booking.' },
      { status: 500 }
    );
  }
}
