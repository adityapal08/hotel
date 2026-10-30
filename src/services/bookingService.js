/**
 * Booking Service
 * Client-side integration for hotel reservations and availability checks.
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

export async function checkAvailabilityApi(checkIn, checkOut, roomType, rooms = 1) {
  const params = new URLSearchParams({
    checkIn,
    checkOut,
    roomType,
    rooms: String(rooms),
  });

  const response = await fetch(`/api/bookings?${params.toString()}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to check availability');
  }

  return result;
}

export async function getBookingByRefApi(reference) {
  const response = await fetch(`/api/bookings?ref=${encodeURIComponent(reference)}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Failed to retrieve booking');
  }

  return result;
}
