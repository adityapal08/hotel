import { NextResponse } from 'next/server';
import {
  ROOM_CONFIG,
  checkAvailability,
  createBooking,
  getBookingByReference,
} from '@/lib/db';

/**
 * Validates date string in YYYY-MM-DD format.
 */
function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * GET /api/bookings
 * Check date availability, calculate price estimate, or retrieve booking by reference.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get('ref');

    // Retrieve booking by reference ID
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

    // Check availability and calculate price for date range
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const roomType = searchParams.get('roomType') || 'Entire 3BHK Private Pool Villa';
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

      const diffTime = checkOutDate.getTime() - checkInDate.getTime();
      const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));

      const config = ROOM_CONFIG[roomType] || ROOM_CONFIG['Entire 3BHK Private Pool Villa'];
      const pricePerNight = config.pricePerNight;
      const totalPrice = nights * pricePerNight * Math.max(1, rooms);

      const isAvailable = checkAvailability(roomType, checkIn, checkOut);

      return NextResponse.json({
        success: true,
        available: isAvailable,
        nights,
        roomType,
        pricePerNight,
        totalPrice,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Red Roots Villa Booking API is active.',
    });
  } catch (error) {
    console.error('Error in GET /api/bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Server error retrieving booking data.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * Validates, calculates, checks availability, and stores a verified reservation.
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const {
      guestName,
      email,
      phone,
      checkIn,
      checkOut,
      adults = 1,
      children = 0,
      rooms = 1,
      roomType = 'Entire 3BHK Private Pool Villa',
      specialRequests = '',
    } = body;

    // 1. Required Field Validations
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

    // 2. Date Validations
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

    // 3. Room & Guests Validations
    const selectedRoomConfig = ROOM_CONFIG[roomType];
    if (!selectedRoomConfig) {
      return NextResponse.json(
        { success: false, error: 'Selected accommodation type is not recognized.' },
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

    if (isNaN(parsedRooms) || parsedRooms < 1 || parsedRooms > 3) {
      return NextResponse.json(
        { success: false, error: 'Invalid room count selected.' },
        { status: 400 }
      );
    }

    // 4. Calculate Nights & Price
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    const pricePerNight = selectedRoomConfig.pricePerNight;
    const totalPrice = nights * pricePerNight * parsedRooms;

    // 5. Database Availability Verification (Prevent Overlapping Double-Bookings)
    const isAvailable = checkAvailability(roomType, checkIn, checkOut);
    if (!isAvailable) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This accommodation is already reserved for the selected dates. Please choose different dates or select another suite.',
        },
        { status: 409 }
      );
    }

    // 6. Save Booking to Database
    const booking = createBooking({
      guestName,
      email,
      phone,
      checkIn,
      checkOut,
      nights,
      adults: parsedAdults,
      children: parsedChildren,
      rooms: parsedRooms,
      roomType,
      pricePerNight,
      totalPrice,
      specialRequests,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Your reservation has been confirmed and stored in our database.',
        booking,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing booking in POST /api/bookings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred while saving your booking.',
      },
      { status: 500 }
    );
  }
}
