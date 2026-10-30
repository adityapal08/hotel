import { NextResponse } from 'next/server';
import {
  ROOM_CONFIG,
  getAvailabilityForRange,
  getRawInventory,
} from '@/lib/db';

function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * GET /api/availability
 * Query parameters:
 * - checkIn (YYYY-MM-DD)
 * - checkOut (YYYY-MM-DD)
 * - roomType (optional, specific room type or null for all)
 * - rooms (optional, default 1)
 * - raw (optional, if 'true', returns raw daily inventory table for inspection)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const roomType = searchParams.get('roomType');
    const rooms = parseInt(searchParams.get('rooms') || '1', 10);
    const raw = searchParams.get('raw');

    // 1. Raw inventory inspection for administrative/testing purposes
    if (raw === 'true') {
      const startDate = checkIn || new Date().toISOString().split('T')[0];
      const endDate = checkOut || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const inventory = getRawInventory(startDate, endDate, roomType);
      return NextResponse.json({
        success: true,
        startDate,
        endDate,
        roomType: roomType || 'all',
        inventory,
      });
    }

    // 2. Validate Dates for Availability Search
    if (!checkIn || !checkOut) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide both checkIn and checkOut dates in YYYY-MM-DD format.',
        },
        { status: 400 }
      );
    }

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
        { success: false, error: 'Check-out date must be at least one day after check-in.' },
        { status: 400 }
      );
    }

    // 3. Query dynamic SQLite room inventory across all dates in range
    const results = getAvailabilityForRange(checkIn, checkOut, roomType, rooms);

    return NextResponse.json({
      success: true,
      checkIn,
      checkOut,
      nights: results[0]?.nights || 1,
      requestedRooms: rooms,
      results,
    });
  } catch (error) {
    console.error('Error in GET /api/availability:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error checking availability.' },
      { status: 500 }
    );
  }
}
