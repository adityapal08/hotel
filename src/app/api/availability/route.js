import { NextResponse } from 'next/server';
import {
  PROPERTIES_CONFIG,
  getAvailabilityForRange,
  getRawInventory,
  getMonthInventory,
  getProperty,
} from '@/lib/db';

function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * GET /api/availability
 * Query parameters:
 * - propertyId (optional, default 'red-roots-villa')
 * - month (YYYY-MM, optional, returns entire month availability for small calendar)
 * - checkIn (YYYY-MM-DD)
 * - checkOut (YYYY-MM-DD)
 * - roomType (optional, specific room type or null for all)
 * - rooms (optional, default 1)
 * - raw (optional, if 'true', returns raw daily inventory table for inspection)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId') || 'red-roots-villa';
    const month = searchParams.get('month') || searchParams.get('calendarMonth');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const roomType = searchParams.get('roomType');
    const rooms = parseInt(searchParams.get('rooms') || '1', 10);
    const raw = searchParams.get('raw');

    const prop = getProperty(propertyId);

    // 1. Month-level availability for the compact calendar date-picker
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json(
          { success: false, error: 'Invalid month format. Expected YYYY-MM.' },
          { status: 400 }
        );
      }
      const monthData = getMonthInventory(month, roomType, prop.id);
      return NextResponse.json({
        success: true,
        propertyId: prop.id,
        propertyName: prop.name,
        ...monthData,
      });
    }

    // 2. Raw inventory inspection for administrative/testing purposes
    if (raw === 'true') {
      const startDate = checkIn || new Date().toISOString().split('T')[0];
      const endDate = checkOut || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const inventory = getRawInventory(startDate, endDate, roomType, prop.id);
      return NextResponse.json({
        success: true,
        propertyId: prop.id,
        propertyName: prop.name,
        startDate,
        endDate,
        roomType: roomType || 'all',
        inventory,
      });
    }

    // 3. Validate Dates for Availability Search
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

    // 4. Query dynamic SQLite room inventory across all dates in range for selected property
    const results = getAvailabilityForRange(checkIn, checkOut, roomType, rooms, prop.id);

    return NextResponse.json({
      success: true,
      propertyId: prop.id,
      propertyName: prop.name,
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
