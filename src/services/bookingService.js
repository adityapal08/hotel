/**
 * Booking Service
 * Client-side integration for hotel reservations, dynamic SQLite availability checks,
 * and booking cancellations.
 */

/**
 * Checks dynamic room inventory from SQLite across all nights in a date range.
 */
export async function checkAvailabilityApi(checkIn, checkOut, roomType = '', rooms = 1) {
  const params = new URLSearchParams({
    checkIn,
    checkOut,
    rooms: String(rooms),
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
 * Submits a verified booking request.
 * Server executes an atomic SQLite transaction, re-validates inventory,
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
 * Cancels a booking and restores room inventory in SQLite.
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
 * Retrieves raw daily inventory table for administrative testing/verification.
 */
export async function getRawInventoryApi(startDate, endDate, roomType = '') {
  const params = new URLSearchParams({
    raw: 'true',
    checkIn: startDate,
    checkOut: endDate,
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
