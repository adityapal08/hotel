/**
 * Booking Service
 * Client-side integration for hotel reservations, dynamic SQLite availability checks,
 * multi-property support, and booking cancellations.
 */

/**
 * Checks dynamic room inventory from SQLite across all nights in a date range for a property.
 */
export async function checkAvailabilityApi(checkIn, checkOut, roomType = '', rooms = 1, propertyId = 'red-roots-villa') {
  const params = new URLSearchParams({
    checkIn,
    checkOut,
    rooms: String(rooms),
    propertyId: propertyId || 'red-roots-villa',
  });
  if (roomType) {
    params.set('roomType', roomType);
  }

  const response = await fetch(`/api/availability?${params.toString()}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to check room availability');
  }

  return result;
}

/**
 * Retrieves daily availability for an entire month for the compact calendar date-picker.
 */
export async function getMonthAvailabilityApi(month, roomType = '', propertyId = 'red-roots-villa') {
  const params = new URLSearchParams({
    month,
    propertyId: propertyId || 'red-roots-villa',
  });
  if (roomType) {
    params.set('roomType', roomType);
  }

  const response = await fetch(`/api/availability?${params.toString()}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch month availability');
  }

  return result;
}

/**
 * Submits a verified booking request for a specific property.
 * Server executes an atomic SQLite transaction, re-validates inventory for that property,
 * and updates available inventory dynamically.
 */
export async function submitBooking(bookingData) {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bookingData),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Booking failed with status ${response.status}`);
  }

  return result;
}

/**
 * Cancels a booking and restores room inventory to the correct property in SQLite.
 */
export async function cancelBookingApi(reference) {
  const response = await fetch('/api/bookings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reference,
      action: 'cancel',
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Cancellation failed with status ${response.status}`);
  }

  return result;
}

/**
 * Retrieves booking details by reference code.
 */
export async function getBookingByRefApi(reference) {
  const response = await fetch(`/api/bookings?ref=${encodeURIComponent(reference)}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to retrieve booking');
  }

  return result;
}

/**
 * Retrieves all bookings, optionally filtered by property ID (for admin/management).
 */
export async function getAllBookingsApi(propertyId = '') {
  const url = propertyId && propertyId !== 'all'
    ? `/api/bookings?propertyId=${encodeURIComponent(propertyId)}`
    : '/api/bookings';
  const response = await fetch(url);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch bookings list');
  }

  return result;
}

/**
 * Retrieves all registered homestay properties.
 */
export async function getPropertiesApi() {
  const response = await fetch('/api/properties');
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch properties');
  }

  return result;
}

/**
 * Retrieves raw daily inventory table for administrative testing/verification.
 */
export async function getRawInventoryApi(startDate, endDate, roomType = '', propertyId = 'red-roots-villa') {
  const params = new URLSearchParams({
    raw: 'true',
    checkIn: startDate,
    checkOut: endDate,
    propertyId: propertyId || 'red-roots-villa',
  });
  if (roomType) {
    params.set('roomType', roomType);
  }

  const response = await fetch(`/api/availability?${params.toString()}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch inventory data');
  }

  return result;
}
