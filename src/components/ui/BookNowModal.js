'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  CheckCircle2,
  Calendar,
  User,
  Mail,
  Phone,
  MessageSquare,
  Users,
  Home,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Copy,
  AlertCircle,
  ChevronDown,
  Layers,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Building2,
  MapPin,
} from 'lucide-react';
import CompactCalendar from '@/components/ui/CompactCalendar';
import { submitBooking, checkAvailabilityApi, cancelBookingApi } from '@/services/bookingService';
import { PROPERTIES_CONFIG } from '@/constants/propertiesConfig';

export const PROPERTY_DATA = Object.fromEntries(
  Object.entries(PROPERTIES_CONFIG).map(([propId, p]) => [
    propId,
    {
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      location: p.location,
      description: p.description,
      heroImage: p.heroImage,
      gallery: p.gallery,
      amenities: p.amenities,
      isPlaceholder: p.isPlaceholder,
      rooms: Object.entries(p.rooms).map(([roomName, r]) => ({
        name: roomName,
        rate: r.pricePerNight,
        pricePerNight: r.pricePerNight,
        maxGuests: r.maxGuests,
        maxRooms: r.maxRooms || 10,
        totalInventory: r.totalInventory || 10,
        tagline: r.tagline,
        description: r.description,
        image: r.image,
      })),
    },
  ])
);

// Backward compatibility export of Red Roots Villa's rooms
export const ROOM_OPTIONS = PROPERTY_DATA['red-roots-villa'].rooms;

export default function BookNowModal({ isOpen, onClose, initialData = {}, onBookingSuccess }) {
  const [step, setStep] = useState(1); // 1: Details, 2: Review, 3: Confirmed
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  // Cancellation test state
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationMessage, setCancellationMessage] = useState('');

  // Live availability check state
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityData, setAvailabilityData] = useState(null);

  const [todayStr, setTodayStr] = useState('');
  const [formData, setFormData] = useState({
    propertyId: 'red-roots-villa',
    guestName: '',
    email: '',
    phone: '',
    checkIn: '',
    checkOut: '',
    adults: 2,
    children: 0,
    rooms: 1,
    roomType: 'Deluxe Room',
    specialRequests: '',
    isNegotiated: false,
    originalTotalPrice: 0,
    negotiatedTotalPrice: 0,
    negotiatedPricePerNight: 0,
  });

  const selectedProperty = useMemo(() => {
    return PROPERTY_DATA[formData.propertyId] || PROPERTY_DATA['red-roots-villa'];
  }, [formData.propertyId]);

  const availableRooms = useMemo(() => {
    return selectedProperty.rooms || [];
  }, [selectedProperty]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setTodayStr(today);

    if (isOpen) {
      setStep(1);
      setErrorMessage('');
      setCancellationMessage('');
      setConfirmedBooking(null);

      const targetPropertyId = initialData?.propertyId || 'red-roots-villa';
      const targetProp = PROPERTY_DATA[targetPropertyId] || PROPERTY_DATA['red-roots-villa'];
      const defaultRoom = initialData?.roomType || targetProp.rooms[0]?.name || 'Deluxe Room';

      setFormData((prev) => ({
        ...prev,
        propertyId: targetPropertyId,
        roomType: defaultRoom,
        checkIn: initialData?.checkIn || prev.checkIn || (today <= '2026-11-01' ? '2026-11-01' : today),
        checkOut: initialData?.checkOut || prev.checkOut || (today <= '2026-11-01' ? '2026-11-03' : tomorrowStr),
        rooms: initialData?.rooms || prev.rooms || 1,
        adults: initialData?.adults || prev.adults || 2,
        isNegotiated: Boolean(initialData?.isNegotiated),
        originalTotalPrice: initialData?.originalTotalPrice || 0,
        negotiatedTotalPrice: initialData?.negotiatedTotalPrice || 0,
        negotiatedPricePerNight: initialData?.negotiatedPricePerNight || 0,
        ...(initialData && Object.keys(initialData).length > 0 ? initialData : {}),
      }));
    }
  }, [isOpen, initialData]);

  // Handle switching homestays inside modal
  const handlePropertyChange = (newPropId) => {
    const targetProp = PROPERTY_DATA[newPropId] || PROPERTY_DATA['red-roots-villa'];
    const firstRoom = targetProp.rooms[0]?.name || '';
    setFormData((prev) => ({
      ...prev,
      propertyId: newPropId,
      roomType: firstRoom,
      rooms: 1,
      isNegotiated: false,
      negotiatedTotalPrice: 0,
    }));
    setAvailabilityData(null);
    setCalendarRefreshKey((k) => k + 1);
  };

  // Live check availability on modal inputs
  const checkLiveInventory = useCallback(async (inDate, outDate, roomT, reqRooms, propId) => {
    if (!inDate || !outDate || inDate >= outDate) return;
    setCheckingAvailability(true);
    try {
      const res = await checkAvailabilityApi(inDate, outDate, roomT, reqRooms, propId);
      if (res.success && res.results && res.results.length > 0) {
        setAvailabilityData(res.results[0]);
      } else {
        setAvailabilityData(null);
      }
    } catch (err) {
      console.error('Modal availability check error:', err);
      setAvailabilityData(null);
    } finally {
      setCheckingAvailability(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && formData.checkIn && formData.checkOut && formData.checkIn < formData.checkOut) {
      checkLiveInventory(
        formData.checkIn,
        formData.checkOut,
        formData.roomType,
        formData.rooms,
        formData.propertyId
      );
    }
  }, [
    isOpen,
    formData.checkIn,
    formData.checkOut,
    formData.roomType,
    formData.rooms,
    formData.propertyId,
    checkLiveInventory,
  ]);

  // Calculations
  const checkInDate = formData.checkIn ? new Date(formData.checkIn) : null;
  const checkOutDate = formData.checkOut ? new Date(formData.checkOut) : null;
  const diffTime = checkInDate && checkOutDate ? checkOutDate.getTime() - checkInDate.getTime() : 0;
  const calculatedNights =
    checkInDate && checkOutDate && checkOutDate > checkInDate
      ? Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)))
      : 0;

  const selectedRoomConfig =
    availableRooms.find((r) => r.name === formData.roomType) || availableRooms[0] || {};
  const currentRate = availabilityData?.pricePerNight || selectedRoomConfig.rate || 4500;
  const standardTotal = calculatedNights * currentRate * formData.rooms;

  // Active negotiated rate applies if matching negotiated room and property
  const isNegotiatedActive =
    Boolean(formData.isNegotiated) &&
    formData.negotiatedTotalPrice > 0 &&
    formData.roomType === (initialData?.roomType || formData.roomType) &&
    formData.propertyId === (initialData?.propertyId || formData.propertyId);

  const displayTotal = isNegotiatedActive ? formData.negotiatedTotalPrice : standardTotal;

  const validateForm = () => {
    setErrorMessage('');

    if (!formData.guestName.trim()) {
      setErrorMessage('Please enter the primary guest name.');
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setErrorMessage('Please provide a valid email address.');
      return false;
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 8) {
      setErrorMessage('Please provide a valid contact phone number.');
      return false;
    }
    if (!formData.checkIn) {
      setErrorMessage('Please select a check-in date.');
      return false;
    }
    if (!formData.checkOut) {
      setErrorMessage('Please select a check-out date.');
      return false;
    }
    if (calculatedNights < 1) {
      setErrorMessage('Check-out date must be at least one day after check-in date.');
      return false;
    }

    if (availabilityData && !availabilityData.isAvailable) {
      setErrorMessage(
        availabilityData.minAvailableRooms === 0
          ? `"${formData.roomType}" at ${selectedProperty.name} is completely Sold Out for the selected dates. Please choose different dates.`
          : `Only ${availabilityData.minAvailableRooms} room(s) available for these dates, but you selected ${formData.rooms}.`
      );
      return false;
    }

    return true;
  };

  const handleProceedToSummary = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setStep(2);
    }
  };

  const handleConfirmReservation = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        propertyId: formData.propertyId,
        guestName: formData.guestName,
        email: formData.email,
        phone: formData.phone,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        adults: parseInt(formData.adults, 10),
        children: parseInt(formData.children, 10),
        rooms: parseInt(formData.rooms, 10),
        roomType: formData.roomType,
        specialRequests: formData.specialRequests,
        isNegotiated: isNegotiatedActive,
        negotiatedTotalPrice: isNegotiatedActive ? formData.negotiatedTotalPrice : null,
      };

      const result = await submitBooking(payload);

      if (result.success && result.booking) {
        setConfirmedBooking(result.booking);
        setStep(3);
        setCalendarRefreshKey((k) => k + 1);
        if (onBookingSuccess) {
          onBookingSuccess(result.booking);
        }
      } else {
        throw new Error(result.error || 'Unable to confirm reservation.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete reservation. Please try again.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirmedBooking?.reference) return;
    setIsCancelling(true);
    setCancellationMessage('');

    try {
      const result = await cancelBookingApi(confirmedBooking.reference);
      if (result.success) {
        setCancellationMessage(
          `✓ Booking ${confirmedBooking.reference} cancelled successfully. ${confirmedBooking.rooms} room(s) restored back to SQLite inventory for ${confirmedBooking.property_name || 'the homestay'} on dates ${confirmedBooking.check_in} to ${confirmedBooking.check_out}.`
        );
        // Refresh local availability cache
        checkLiveInventory(
          formData.checkIn,
          formData.checkOut,
          formData.roomType,
          formData.rooms,
          formData.propertyId
        );
        setCalendarRefreshKey((k) => k + 1);
        if (onBookingSuccess) {
          onBookingSuccess(confirmedBooking);
        }
      }
    } catch (err) {
      setCancellationMessage(`❌ Failed to cancel booking: ${err.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const copyRefToClipboard = () => {
    if (!confirmedBooking?.reference) return;
    navigator.clipboard.writeText(confirmedBooking.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-[#FAF8F5] rounded-2xl shadow-2xl border border-[#E2DBD2] overflow-hidden z-10 my-8 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 sm:px-8 border-b border-[#E2DBD2] bg-white flex items-center justify-between flex-shrink-0">
            <div>
              <span className="text-[10px] font-semibold tracking-[0.2em] text-[#8A7E6D] uppercase block">
                Homestay Reservation
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#1C1B1A] mt-0.5">
                {step === 3 ? 'Reservation Confirmed' : `Reserve at ${selectedProperty.name}`}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#F3EFE9] hover:bg-[#E7E1D8] text-[#4A453E] hover:text-[#1C1B1A] transition-colors flex items-center justify-center cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="px-6 sm:px-8 py-3 bg-[#F5F1EB] border-b border-[#E2DBD2] flex-shrink-0">
            <div className="flex items-center justify-between max-w-sm mx-auto">
              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${
                    step >= 1 ? 'bg-[#1E1C1A] text-white' : 'bg-[#DDD6CC] text-[#6B6459]'
                  }`}
                >
                  1
                </span>
                <span
                  className={`text-[11px] font-medium tracking-wide uppercase ${
                    step === 1 ? 'text-[#1C1B1A] font-semibold' : 'text-[#8A8277]'
                  }`}
                >
                  Details
                </span>
              </div>

              <div className="w-8 h-px bg-[#D6CEC3]" />

              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${
                    step >= 2 ? 'bg-[#1E1C1A] text-white' : 'bg-[#DDD6CC] text-[#6B6459]'
                  }`}
                >
                  2
                </span>
                <span
                  className={`text-[11px] font-medium tracking-wide uppercase ${
                    step === 2 ? 'text-[#1C1B1A] font-semibold' : 'text-[#8A8277]'
                  }`}
                >
                  Review
                </span>
              </div>

              <div className="w-8 h-px bg-[#D6CEC3]" />

              <div className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors ${
                    step === 3 ? 'bg-[#2F5238] text-white' : 'bg-[#DDD6CC] text-[#6B6459]'
                  }`}
                >
                  3
                </span>
                <span
                  className={`text-[11px] font-medium tracking-wide uppercase ${
                    step === 3 ? 'text-[#2F5238] font-bold' : 'text-[#8A8277]'
                  }`}
                >
                  Confirmed
                </span>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-6 sm:mx-8 mt-4 p-3 bg-[#FCF3F2] border border-[#F0D5D3] rounded-xl flex items-start gap-2.5 text-[#8A2B24] text-xs leading-relaxed flex-shrink-0">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#B83E34]" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Modal Body */}
          <div className="p-6 sm:p-8 overflow-y-auto flex-1">
            <AnimatePresence mode="wait">
              {/* ================= STEP 1: FORM DETAILS ================= */}
              {step === 1 && (
                <motion.form
                  key="step-1"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleProceedToSummary}
                  className="space-y-4"
                >
                  {/* Homestay Property Selection */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6459] mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#8A7E6D]" />
                        Select Homestay Property
                      </span>
                      {selectedProperty.isPlaceholder && (
                        <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-normal">
                          Preview Mode
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <select
                        value={formData.propertyId}
                        onChange={(e) => handlePropertyChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] focus:ring-1 focus:ring-[#7A6E5D]/20 text-[#1C1B1A] font-semibold appearance-none cursor-pointer transition-colors shadow-xs"
                      >
                        {Object.values(PROPERTY_DATA).map((prop) => (
                          <option key={prop.id} value={prop.id}>
                            {prop.name} — {prop.location}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#8A8277] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Accommodation Selection for Selected Property */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B6459] mb-1.5">
                      Accommodation Type ({selectedProperty.name})
                    </label>
                    <div className="relative">
                      <select
                        value={formData.roomType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            roomType: e.target.value,
                            rooms: 1,
                          })
                        }
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] focus:ring-1 focus:ring-[#7A6E5D]/20 text-[#1C1B1A] font-medium appearance-none cursor-pointer transition-colors shadow-xs"
                      >
                        {availableRooms.map((room) => (
                          <option key={room.name} value={room.name}>
                            {room.name} — ₹{room.rate.toLocaleString('en-IN')} / night
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#8A8277] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    {selectedRoomConfig?.tagline && (
                      <p className="text-[11px] text-[#7A746B] mt-1 font-light">
                        {selectedRoomConfig.tagline}
                      </p>
                    )}
                  </div>

                  {/* Calendar & Date Pickers Card */}
                  <div className="bg-white border border-[#DDD6CC] rounded-xl p-3.5 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7E6D]">
                        Select Dates on Calendar
                      </label>
                      <span className="text-[10px] text-[#7A746B] font-medium">
                        Live Inventory: {selectedProperty.name}
                      </span>
                    </div>

                    <CompactCalendar
                      checkIn={formData.checkIn}
                      checkOut={formData.checkOut}
                      roomType={formData.roomType}
                      propertyId={formData.propertyId}
                      refreshKey={calendarRefreshKey}
                      theme="light"
                      onSelectRange={(inD, outD) => {
                        setErrorMessage('');
                        if (inD && !outD) {
                          setFormData((prev) => ({ ...prev, checkIn: inD }));
                        } else if (inD && outD) {
                          setFormData((prev) => ({ ...prev, checkIn: inD, checkOut: outD }));
                        }
                      }}
                    />

                    {/* Quick Manual Date Inputs */}
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#F0EAE1]">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8277] mb-1">
                          Check-in Date
                        </label>
                        <input
                          type="date"
                          required
                          min={todayStr}
                          value={formData.checkIn}
                          onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-[#FAF8F5] border border-[#E5DFD4] rounded-lg focus:outline-none focus:border-[#7A6E5D] text-[#1C1B1A] font-medium cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8277] mb-1">
                          Check-out Date
                        </label>
                        <input
                          type="date"
                          required
                          min={formData.checkIn || todayStr}
                          value={formData.checkOut}
                          onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                          className="w-full px-3 py-2 text-xs sm:text-sm bg-[#FAF8F5] border border-[#E5DFD4] rounded-lg focus:outline-none focus:border-[#7A6E5D] text-[#1C1B1A] font-medium cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Real-time Inventory Verification Banner */}
                    <div className="mt-2.5 pt-2 border-t border-[#F0EAE1] flex items-center justify-between text-[11px]">
                      <span className="text-[#7A746B]">
                        {calculatedNights} {calculatedNights === 1 ? 'Night' : 'Nights'} Stay
                      </span>

                      <div>
                        {checkingAvailability ? (
                          <span className="text-[#8A7E6D] flex items-center gap-1 font-medium">
                            <Loader2 className="w-3 h-3 animate-spin" /> Verifying SQLite...
                          </span>
                        ) : availabilityData ? (
                          availabilityData.status === 'sold_out' ? (
                            <span className="text-[#B83E34] font-semibold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Sold Out for Dates
                            </span>
                          ) : availabilityData.status === 'insufficient' ? (
                            <span className="text-[#B87024] font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Only{' '}
                              {availabilityData.minAvailableRooms} Left
                            </span>
                          ) : availabilityData.status === 'limited' ? (
                            <span className="text-[#996515] font-semibold flex items-center gap-1">
                              ⚡ Limited: {availabilityData.minAvailableRooms} Left
                            </span>
                          ) : (
                            <span className="text-[#2F5238] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Available (
                              {availabilityData.minAvailableRooms} rooms)
                            </span>
                          )
                        ) : (
                          <span className="text-[#7A746B]">Checking dates...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Zero Online Payment Notice */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong>No Online Payment Required:</strong> Reserve directly with instant
                      confirmation. Zero payment details or card needed today — pay upon check-in.
                    </span>
                  </div>

                  {/* Guests & Room Count */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6459] mb-1">
                        Adults
                      </label>
                      <select
                        value={formData.adults}
                        onChange={(e) =>
                          setFormData({ ...formData, adults: parseInt(e.target.value, 10) })
                        }
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] text-[#1C1B1A] font-medium cursor-pointer shadow-xs"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Adult' : 'Adults'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6459] mb-1">
                        Children
                      </label>
                      <select
                        value={formData.children}
                        onChange={(e) =>
                          setFormData({ ...formData, children: parseInt(e.target.value, 10) })
                        }
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] text-[#1C1B1A] font-medium cursor-pointer shadow-xs"
                      >
                        {[0, 1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Child' : 'Children'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6459] mb-1">
                        Rooms
                      </label>
                      <select
                        value={formData.rooms}
                        onChange={(e) =>
                          setFormData({ ...formData, rooms: parseInt(e.target.value, 10) })
                        }
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] text-[#1C1B1A] font-medium cursor-pointer shadow-xs"
                      >
                        {Array.from({ length: selectedRoomConfig?.maxRooms || 10 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Room' : 'Rooms'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Guest Contact Information */}
                  <div className="pt-1 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6459] mb-1">
                          Primary Guest Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Aditya Sharma"
                          value={formData.guestName}
                          onChange={(e) =>
                            setFormData({ ...formData, guestName: e.target.value })
                          }
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] focus:ring-1 focus:ring-[#7A6E5D]/20 text-[#1C1B1A] placeholder-[#AAA194] shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6459] mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] focus:ring-1 focus:ring-[#7A6E5D]/20 text-[#1C1B1A] placeholder-[#AAA194] shadow-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6459] mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="aditya@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] focus:ring-1 focus:ring-[#7A6E5D]/20 text-[#1C1B1A] placeholder-[#AAA194] shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6459] mb-1">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Early check-in preference, dietary requests, etc."
                        value={formData.specialRequests}
                        onChange={(e) =>
                          setFormData({ ...formData, specialRequests: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] focus:ring-1 focus:ring-[#7A6E5D]/20 text-[#1C1B1A] placeholder-[#AAA194] resize-none shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Summary Footer Bar */}
                  <div className="pt-3 border-t border-[#E5DFD4] flex items-center justify-between">
                    <div>
                      {isNegotiatedActive ? (
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#762F3D]/10 text-[#762F3D] border border-[#762F3D]/20">
                            ✓ Special Negotiated Rate Applied
                          </span>
                          <span className="text-[11px] text-[#7A746B] block">
                            Standard: <span className="line-through">₹{standardTotal.toLocaleString('en-IN')}</span> • Concierge Discount
                          </span>
                        </div>
                      ) : (
                        <>
                          <span className="text-[10px] uppercase tracking-wider text-[#8A8277] block font-semibold">
                            Rate per Night ({selectedProperty.name})
                          </span>
                          <span className="text-xs text-[#524E48] font-medium">
                            ₹{currentRate.toLocaleString('en-IN')} × {calculatedNights} nights × {formData.rooms} room(s)
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-[#8A8277] block font-semibold">
                        {isNegotiatedActive ? 'Agreed Total' : 'Estimated Total'}
                      </span>
                      <span className={`font-serif text-xl sm:text-2xl font-bold ${isNegotiatedActive ? 'text-[#762F3D]' : 'text-[#1C1B1A]'}`}>
                        ₹{displayTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={availabilityData && !availabilityData.isAvailable}
                      className={`w-full py-3.5 px-6 rounded-xl text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] bg-[#1E1C1A] hover:bg-[#322F2C] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99] ${
                        availabilityData && !availabilityData.isAvailable
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <span>
                        {availabilityData && !availabilityData.isAvailable
                          ? 'Sold Out For Selected Dates'
                          : 'Review Reservation Details'}
                      </span>
                      <ArrowRight className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>
                </motion.form>
              )}

              {/* ================= STEP 2: SUMMARY REVIEW ================= */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="bg-white border border-[#E2DBD2] rounded-xl p-5 space-y-3.5 shadow-xs">
                    <div className="flex items-start justify-between pb-3 border-b border-[#EFE9DF]">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#8A7E6D] block">
                          Selected Homestay Property
                        </span>
                        <h4 className="font-serif text-lg font-bold text-[#1C1B1A] mt-0.5">
                          {selectedProperty.name}
                        </h4>
                        <span className="text-xs text-[#7A746B]">{formData.roomType}</span>
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#F3EFE9] text-[#4A453E] border border-[#E2DBD2]">
                        {formData.rooms} {formData.rooms === 1 ? 'Room' : 'Rooms'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[#8A8277] uppercase tracking-[0.12em] block text-[10px]">
                          Check-in
                        </span>
                        <span className="font-semibold text-[#1C1B1A] mt-0.5 block">
                          {formData.checkIn} <span className="text-[#7A746B] font-normal">(2:00 PM)</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8A8277] uppercase tracking-[0.12em] block text-[10px]">
                          Check-out
                        </span>
                        <span className="font-semibold text-[#1C1B1A] mt-0.5 block">
                          {formData.checkOut} <span className="text-[#7A746B] font-normal">(11:00 AM)</span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-[#EFE9DF]">
                      <div>
                        <span className="text-[#8A8277] uppercase tracking-[0.12em] block text-[10px]">
                          Guests
                        </span>
                        <span className="font-medium text-[#2E2C29] mt-0.5 block">
                          {formData.adults} Adults
                          {formData.children > 0 && `, ${formData.children} Children`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8A8277] uppercase tracking-[0.12em] block text-[10px]">
                          Duration
                        </span>
                        <span className="font-medium text-[#2E2C29] mt-0.5 block">
                          {calculatedNights} {calculatedNights === 1 ? 'Night' : 'Nights'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs pt-2 border-t border-[#EFE9DF]">
                      <span className="text-[#8A8277] uppercase tracking-[0.12em] block text-[10px]">
                        Primary Guest
                      </span>
                      <span className="font-semibold text-[#1C1B1A] mt-0.5 block">
                        {formData.guestName}
                      </span>
                      <span className="text-[#6B6459] text-[11px] block mt-0.5">
                        {formData.email} • {formData.phone}
                      </span>
                    </div>

                    {formData.specialRequests && (
                      <div className="text-xs pt-2 border-t border-[#EFE9DF]">
                        <span className="text-[#8A8277] uppercase tracking-[0.12em] block text-[10px]">
                          Special Requests
                        </span>
                        <span className="text-[#4A453E] italic mt-0.5 block">
                          &ldquo;{formData.specialRequests}&rdquo;
                        </span>
                      </div>
                    )}

                    {/* Price Breakdown */}
                    <div className="pt-3 border-t border-[#EFE9DF] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[#8A8277] block font-semibold">
                          Total Due Upon Arrival
                        </span>
                        <span className="text-[11px] text-[#2F5238] font-medium">
                          ✓ ₹0 charged today (Cardless reservation)
                        </span>
                        {isNegotiatedActive && (
                          <span className="text-[11px] text-[#762F3D] block font-medium mt-0.5">
                            ✓ Special Negotiated Rate (Standard: ₹{standardTotal.toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>
                      <span className={`font-serif text-2xl font-bold ${isNegotiatedActive ? 'text-[#762F3D]' : 'text-[#1C1B1A]'}`}>
                        ₹{displayTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="py-3 px-4 rounded-xl text-xs font-semibold uppercase tracking-[0.14em] text-[#4A453E] bg-[#EFEAE2] hover:bg-[#E5DFD4] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xl"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 stroke-[2]" />
                      <span>Modify Details</span>
                    </button>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleConfirmReservation}
                      className="py-3 px-4 rounded-xl text-xs font-semibold uppercase tracking-[0.14em] text-[#FAF8F5] bg-[#1E1C1A] hover:bg-[#322F2C] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99] disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Reserving SQLite...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm Reservation</span>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ================= STEP 3: SUCCESS CONFIRMATION ================= */}
              {step === 3 && confirmedBooking && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="text-center py-2 space-y-4"
                >
                  <div className="w-14 h-14 rounded-full bg-[#EBF2ED] text-[#2F5238] flex items-center justify-center mx-auto border border-[#D1E0D4]">
                    <Check className="w-7 h-7 stroke-[2.5]" />
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A7E6D] block">
                      Reservation Confirmed & Inventory Locked
                    </span>
                    <h4 className="font-serif text-2xl sm:text-3xl font-normal text-[#1C1B1A] mt-1">
                      We Look Forward to Your Visit
                    </h4>
                    <p className="text-xs sm:text-sm text-[#666056] mt-1.5 max-w-sm mx-auto font-light leading-relaxed">
                      Your stay at <strong>{confirmedBooking.property_name || selectedProperty.name}</strong> has been registered and available room inventory has been atomically deducted from the database.
                    </p>
                  </div>

                  {/* Prominent Zero Online Payment Badge */}
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2.5 max-w-md mx-auto text-left shadow-xs">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <strong className="block font-semibold text-emerald-950">
                        ✓ Reservation Confirmed Without Online Payment
                      </strong>
                      <span className="text-emerald-800 text-[11px] leading-relaxed block mt-0.5">
                        No payment was required or charged online. Your room is fully secured. The total
                        amount is payable directly upon check-in at the property.
                      </span>
                    </div>
                  </div>

                  {/* Booking Reference Box */}
                  <div className="p-4 bg-white border border-[#DED7CC] rounded-xl max-w-md mx-auto shadow-xs">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A8277] block mb-1">
                      Booking ID / Reference Number
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-xl sm:text-2xl font-bold text-[#1C1B1A] tracking-wider">
                        {confirmedBooking.reference}
                      </span>
                      <button
                        type="button"
                        onClick={copyRefToClipboard}
                        className="p-1.5 rounded-md hover:bg-[#F3EFE9] text-[#7A7266] hover:text-[#1C1B1A] transition-colors cursor-pointer"
                        title="Copy Reference"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-[#2F5238]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {copied && (
                      <span className="text-[10px] text-[#2F5238] block mt-1 font-medium">
                        ✓ Copied to clipboard
                      </span>
                    )}
                  </div>

                  {/* Booking Summary Box */}
                  <div className="p-4 bg-[#F5F1EB] rounded-xl max-w-md mx-auto text-left text-xs space-y-2 border border-[#E2DBD2]">
                    <div className="flex justify-between py-1 border-b border-[#E6E0D5]">
                      <span className="text-[#7A746B]">Homestay:</span>
                      <span className="font-bold text-[#1C1B1A]">{confirmedBooking.property_name || selectedProperty.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E6E0D5]">
                      <span className="text-[#7A746B]">Accommodation:</span>
                      <span className="font-semibold text-[#1C1B1A]">{confirmedBooking.room_type}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E6E0D5]">
                      <span className="text-[#7A746B]">Dates:</span>
                      <span className="font-medium text-[#1C1B1A]">
                        {confirmedBooking.check_in} to {confirmedBooking.check_out} ({confirmedBooking.nights} nights)
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E6E0D5]">
                      <span className="text-[#7A746B]">Rooms & Guests:</span>
                      <span className="font-medium text-[#1C1B1A]">
                        {confirmedBooking.rooms} Room(s) • {confirmedBooking.adults} Adults
                        {confirmedBooking.children > 0 && `, ${confirmedBooking.children} Children`}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E6E0D5]">
                      <span className="text-[#7A746B]">Guest Contact:</span>
                      <span className="font-medium text-[#1C1B1A]">
                        {confirmedBooking.guest_name} ({confirmedBooking.phone})
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-semibold">
                      <div>
                        <span className="text-[#1C1B1A] block">Total Payable at Check-in:</span>
                        {confirmedBooking.is_negotiated === 1 && (
                          <span className="text-[11px] text-[#762F3D] font-medium">
                            ✓ Special Negotiated Rate (Standard: ₹{Number(confirmedBooking.original_total_price || confirmedBooking.total_price).toLocaleString('en-IN')})
                          </span>
                        )}
                      </div>
                      <span className={`font-serif text-base ${confirmedBooking.is_negotiated === 1 ? 'text-[#762F3D]' : 'text-[#1C1B1A]'}`}>
                        ₹{Number(confirmedBooking.total_price).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Test Cancellation Box for Verification */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl max-w-md mx-auto text-left text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Cancel Booking & Test Inventory Restoration</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelBooking}
                        disabled={isCancelling || confirmedBooking.status === 'cancelled'}
                        className="px-3 py-1 bg-amber-700 hover:bg-amber-800 disabled:bg-gray-400 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        {isCancelling ? 'Restoring...' : confirmedBooking.status === 'cancelled' ? 'Cancelled' : 'Cancel Booking'}
                      </button>
                    </div>
                    {cancellationMessage && (
                      <p className="text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded border border-amber-200/80 leading-relaxed">
                        {cancellationMessage}
                      </p>
                    )}
                  </div>

                  {/* Done / Close Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full max-w-md mx-auto py-3 px-6 rounded-xl text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] bg-[#1E1C1A] hover:bg-[#322F2C] transition-colors block cursor-pointer shadow-sm"
                    >
                      Close Confirmation
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
