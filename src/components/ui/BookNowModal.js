'use client';

import { useState, useEffect } from 'react';
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
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { submitBooking } from '@/services/bookingService';

const ROOM_OPTIONS = [
  {
    name: 'Entire 3BHK Private Pool Villa',
    rate: 15000,
    maxGuests: 8,
    maxRooms: 1,
    tagline: 'Exclusive 3BHK villa with private swimming pool & kitchen',
  },
  {
    name: 'The Master King Suite',
    rate: 6500,
    maxGuests: 3,
    maxRooms: 1,
    tagline: 'Ground-floor master suite with private en-suite & garden patio',
  },
  {
    name: 'The Garden Deluxe Suite',
    rate: 5500,
    maxGuests: 2,
    maxRooms: 1,
    tagline: 'Upper-level sunlit suite with emerald curtains & serene views',
  },
];

export default function BookNowModal({ isOpen, onClose, initialData = {} }) {
  const [step, setStep] = useState(1); // 1: Details, 2: Review, 3: Confirmed
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const [todayStr, setTodayStr] = useState('');
  const [formData, setFormData] = useState({
    guestName: '',
    email: '',
    phone: '',
    checkIn: '',
    checkOut: '',
    adults: 2,
    children: 0,
    rooms: 1,
    roomType: 'Entire 3BHK Private Pool Villa',
    specialRequests: '',
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setTodayStr(today);

    if (isOpen) {
      setStep(1);
      setErrorMessage('');
      setConfirmedBooking(null);
      setFormData((prev) => ({
        ...prev,
        checkIn: initialData?.checkIn || prev.checkIn || today,
        checkOut: initialData?.checkOut || prev.checkOut || tomorrowStr,
        ...(initialData && Object.keys(initialData).length > 0 ? initialData : {}),
      }));
    }
  }, [isOpen, initialData]);

  // Calculations
  const checkInDate = formData.checkIn ? new Date(formData.checkIn) : null;
  const checkOutDate = formData.checkOut ? new Date(formData.checkOut) : null;
  const diffTime = checkInDate && checkOutDate ? checkOutDate.getTime() - checkInDate.getTime() : 0;
  const calculatedNights =
    checkInDate && checkOutDate && checkOutDate > checkInDate
      ? Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)))
      : 0;

  const selectedRoomConfig =
    ROOM_OPTIONS.find((r) => r.name === formData.roomType) || ROOM_OPTIONS[0];
  const currentRate = selectedRoomConfig.rate;
  const estimatedTotal = calculatedNights * currentRate * formData.rooms;

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
      };

      const result = await submitBooking(payload);

      if (result.success && result.booking) {
        setConfirmedBooking(result.booking);
        setStep(3);
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

  const copyRefToClipboard = () => {
    if (confirmedBooking?.reference) {
      navigator.clipboard.writeText(confirmedBooking.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Subtle warm architectural backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={loading ? undefined : onClose}
            className="fixed inset-0 bg-[#141312]/60 backdrop-blur-[3px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FCFAF7] rounded-2xl shadow-[0_20px_60px_-15px_rgba(20,19,18,0.22)] max-w-xl w-full overflow-hidden relative z-10 border border-[#E8E2D8] my-auto max-h-[92vh] flex flex-col text-[#22201E]"
          >
            {/* Header: Understated Luxury Editorial Style */}
            <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-[#EAE4DC] bg-[#FAF7F2] flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#8A7E6D] block mb-1">
                    Red Roots Villa • Pondicherry
                  </span>
                  <h3 className="font-serif text-2xl sm:text-[26px] font-normal text-[#1C1B1A] tracking-tight">
                    {step === 1 && 'Reserve Your Stay'}
                    {step === 2 && 'Review Reservation'}
                    {step === 3 && 'Reservation Confirmed'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={loading ? undefined : onClose}
                  disabled={loading}
                  className="w-8 h-8 rounded-full border border-[#E0D8CD] bg-white text-[#5E584F] hover:text-[#1C1B1A] hover:bg-[#F3EFE9] transition-colors flex items-center justify-center flex-shrink-0 cursor-pointer disabled:opacity-40"
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4 stroke-[1.8]" />
                </button>
              </div>

              {/* Minimalist Progress Indicator */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#EDE7DF]/80">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                      step >= 1
                        ? 'bg-[#1C1B1A] text-[#FAF8F5]'
                        : 'bg-[#EAE4DC] text-[#7A746B]'
                    }`}
                  >
                    1
                  </span>
                  <span
                    className={`text-[11px] font-medium tracking-wide ${
                      step === 1 ? 'text-[#1C1B1A] font-semibold' : 'text-[#8A8277]'
                    }`}
                  >
                    Stay Details
                  </span>
                </div>

                <div className="w-6 h-px bg-[#D9D1C5]" />

                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                      step >= 2
                        ? 'bg-[#1C1B1A] text-[#FAF8F5]'
                        : 'bg-[#EAE4DC] text-[#7A746B]'
                    }`}
                  >
                    2
                  </span>
                  <span
                    className={`text-[11px] font-medium tracking-wide ${
                      step === 2 ? 'text-[#1C1B1A] font-semibold' : 'text-[#8A8277]'
                    }`}
                  >
                    Summary
                  </span>
                </div>

                <div className="w-6 h-px bg-[#D9D1C5]" />

                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                      step === 3
                        ? 'bg-[#3B5441] text-[#FAF8F5]'
                        : 'bg-[#EAE4DC] text-[#7A746B]'
                    }`}
                  >
                    3
                  </span>
                  <span
                    className={`text-[11px] font-medium tracking-wide ${
                      step === 3 ? 'text-[#3B5441] font-semibold' : 'text-[#8A8277]'
                    }`}
                  >
                    Confirmation
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

            {/* Modal Body with smooth scrolling */}
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
                    {/* Accommodation Selection */}
                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-[0.12em] text-[#6B6459] mb-1.5">
                        Accommodation Type
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
                          {ROOM_OPTIONS.map((room) => (
                            <option key={room.name} value={room.name}>
                              {room.name} — ₹{room.rate.toLocaleString('en-IN')} / night
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-[#8A8277] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <p className="text-[11px] text-[#7A746B] mt-1 font-light">
                        {selectedRoomConfig.tagline}
                      </p>
                    </div>

                    {/* Date Pickers Card */}
                    <div className="bg-white border border-[#DDD6CC] rounded-xl p-3.5 shadow-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7E6D] mb-1">
                            Check-in Date
                          </label>
                          <div className="relative">
                            <input
                              type="date"
                              required
                              min={todayStr}
                              value={formData.checkIn}
                              onChange={(e) => {
                                const newCheckIn = e.target.value;
                                setFormData((prev) => {
                                  const nextDay = new Date(newCheckIn);
                                  nextDay.setDate(nextDay.getDate() + 1);
                                  const nextDayStr = nextDay.toISOString().split('T')[0];
                                  const newCheckOut =
                                    prev.checkOut <= newCheckIn ? nextDayStr : prev.checkOut;
                                  return { ...prev, checkIn: newCheckIn, checkOut: newCheckOut };
                                });
                              }}
                              className="w-full px-3 py-2 text-xs sm:text-sm bg-[#FAF8F5] border border-[#E5DFD4] rounded-lg focus:outline-none focus:border-[#7A6E5D] text-[#1C1B1A] font-medium cursor-pointer"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A7E6D] mb-1">
                            Check-out Date
                          </label>
                          <div className="relative">
                            <input
                              type="date"
                              required
                              min={formData.checkIn || todayStr}
                              value={formData.checkOut}
                              onChange={(e) =>
                                setFormData({ ...formData, checkOut: e.target.value })
                              }
                              className="w-full px-3 py-2 text-xs sm:text-sm bg-[#FAF8F5] border border-[#E5DFD4] rounded-lg focus:outline-none focus:border-[#7A6E5D] text-[#1C1B1A] font-medium cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[#F0EAE1] flex items-center justify-between text-[11px] text-[#7A746B]">
                        <span>Standard Check-in: 2:00 PM</span>
                        <span className="font-medium text-[#1C1B1A]">
                          {calculatedNights} {calculatedNights === 1 ? 'Night' : 'Nights'} Stay
                        </span>
                      </div>
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
                          disabled={formData.roomType === 'Entire 3BHK Private Pool Villa'}
                          value={formData.rooms}
                          onChange={(e) =>
                            setFormData({ ...formData, rooms: parseInt(e.target.value, 10) })
                          }
                          className="w-full px-2.5 py-2 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] text-[#1C1B1A] font-medium cursor-pointer disabled:opacity-60 shadow-xs"
                        >
                          {formData.roomType === 'Entire 3BHK Private Pool Villa' ? (
                            <option value={1}>1 Villa</option>
                          ) : (
                            [1, 2].map((n) => (
                              <option key={n} value={n}>
                                {n} {n === 1 ? 'Room' : 'Rooms'}
                              </option>
                            ))
                          )}
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
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] focus:ring-1 focus:ring-[#7A6E5D]/20 text-[#1C1B1A] placeholder-[#AAA194] shadow-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6459] mb-1">
                          Special Requests (Optional)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Dietary preferences, arrival time, or special arrangements..."
                          value={formData.specialRequests}
                          onChange={(e) =>
                            setFormData({ ...formData, specialRequests: e.target.value })
                          }
                          className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] focus:ring-1 focus:ring-[#7A6E5D]/20 text-[#1C1B1A] placeholder-[#AAA194] resize-none shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Integrated Price Summary Strip */}
                    <div className="p-4 bg-[#F5F1EA] border border-[#E5DFD4] rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-[#7A7266] block">
                          ₹{currentRate.toLocaleString('en-IN')} / night × {calculatedNights}{' '}
                          {calculatedNights === 1 ? 'night' : 'nights'}
                        </span>
                        <span className="text-xs font-medium text-[#2E2C29]">
                          Taxes & caretaker assistance included
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-[#8A8277] block font-semibold">
                          Estimated Total
                        </span>
                        <span className="font-serif text-xl sm:text-2xl font-bold text-[#1C1B1A]">
                          ₹{estimatedTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full py-3.5 px-6 rounded-xl text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] bg-[#1E1C1A] hover:bg-[#322F2C] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
                      >
                        <span>Review Reservation Details</span>
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
                    {/* Folio-style Reservation Summary */}
                    <div className="bg-white border border-[#E2DBD2] rounded-xl p-5 space-y-3.5 shadow-xs">
                      <div className="flex items-start justify-between pb-3 border-b border-[#EFE9DF]">
                        <div>
                          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#8A7E6D] block">
                            Selected Accommodation
                          </span>
                          <h4 className="font-serif text-lg font-bold text-[#1C1B1A] mt-0.5">
                            {formData.roomType}
                          </h4>
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
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="font-semibold text-[#1C1B1A]">{formData.guestName}</span>
                          <span className="text-[#B3AAA0]">•</span>
                          <span className="text-[#555047]">{formData.phone}</span>
                          <span className="text-[#B3AAA0]">•</span>
                          <span className="text-[#777066]">{formData.email}</span>
                        </div>
                      </div>

                      {formData.specialRequests && (
                        <div className="text-xs pt-2 border-t border-[#EFE9DF]">
                          <span className="text-[#8A8277] uppercase tracking-[0.12em] block text-[10px]">
                            Special Requests
                          </span>
                          <p className="text-[#555047] italic text-[11px] mt-0.5">
                            &ldquo;{formData.specialRequests}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Financial Summary Card */}
                    <div className="bg-[#FAF7F2] border border-[#E5DFD4] p-4.5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs text-[#5E584F]">
                        <span>
                          {formData.roomType} ({calculatedNights} nights × ₹
                          {currentRate.toLocaleString('en-IN')})
                        </span>
                        <span>₹{estimatedTotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#5E584F]">
                        <span>Taxes & Caretaker Hospitality</span>
                        <span className="text-[#3A5C46] font-medium">Included</span>
                      </div>
                      <div className="pt-2.5 border-t border-[#E4DDD2] flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.14em] font-semibold text-[#1C1B1A]">
                          Total Payable on Arrival
                        </span>
                        <span className="font-serif text-2xl font-bold text-[#1C1B1A]">
                          ₹{estimatedTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div className="px-1 text-center">
                      <p className="text-[11px] text-[#7A746B] leading-relaxed">
                        No online payment required. Pay directly upon check-in via UPI or cash to
                        the property caretaker.
                      </p>
                    </div>

                    {/* Step 2 Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setStep(1)}
                        className="py-3 px-4 rounded-xl border border-[#D9D1C5] bg-white hover:bg-[#F5F1EB] text-[#3D3A36] text-xs font-semibold uppercase tracking-[0.14em] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
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
                            <span>Confirming...</span>
                          </>
                        ) : (
                          <>
                            <span>Confirm Booking</span>
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
                    className="text-center py-2 space-y-5"
                  >
                    {/* Refined Luxury Check Icon */}
                    <div className="w-14 h-14 rounded-full bg-[#EBF2ED] text-[#2F5238] flex items-center justify-center mx-auto border border-[#D1E0D4]">
                      <Check className="w-7 h-7 stroke-[2.5]" />
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A7E6D] block">
                        Reservation Verified
                      </span>
                      <h4 className="font-serif text-2xl sm:text-3xl font-normal text-[#1C1B1A] mt-1">
                        We Look Forward to Your Visit
                      </h4>
                      <p className="text-xs sm:text-sm text-[#666056] mt-1.5 max-w-sm mx-auto font-light leading-relaxed">
                        Your stay at Red Roots Villa, Moratandi - Pondicherry has been registered in
                        our reservation register.
                      </p>
                    </div>

                    {/* Booking Reference Box */}
                    <div className="p-4 bg-white border border-[#DED7CC] rounded-xl max-w-sm mx-auto shadow-xs">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A8277] block mb-1">
                        Booking Reference Number
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
                        <span className="text-[11px] text-[#2F5238] font-medium block mt-1">
                          Copied to clipboard
                        </span>
                      )}
                    </div>

                    {/* Compact Folio Receipt */}
                    <div className="text-left bg-[#FAF7F2] border border-[#E5DFD4] p-4 rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between border-b border-[#EDE7DE] pb-1.5">
                        <span className="text-[#7A746B]">Accommodation:</span>
                        <span className="font-medium text-[#1C1B1A]">
                          {confirmedBooking.room_type}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[#EDE7DE] pb-1.5">
                        <span className="text-[#7A746B]">Dates:</span>
                        <span className="font-medium text-[#1C1B1A]">
                          {confirmedBooking.check_in} — {confirmedBooking.check_out} (
                          {confirmedBooking.nights} Nights)
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-[#EDE7DE] pb-1.5">
                        <span className="text-[#7A746B]">Guests:</span>
                        <span className="font-medium text-[#1C1B1A]">
                          {confirmedBooking.adults} Adults
                          {confirmedBooking.children > 0 && `, ${confirmedBooking.children} Children`}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1">
                        <span className="text-[#7A746B] font-medium">Due Upon Check-in:</span>
                        <span className="font-serif text-base font-bold text-[#1C1B1A]">
                          ₹{Number(confirmedBooking.total_price).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Concierge Actions */}
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                      <a
                        href={`https://wa.me/919363432220?text=${encodeURIComponent(
                          `Hello Red Roots Villa, I have confirmed a reservation. Reference: ${confirmedBooking.reference}. Dates: ${confirmedBooking.check_in} to ${confirmedBooking.check_out}. Primary Guest: ${confirmedBooking.guest_name}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold uppercase tracking-[0.14em] text-white bg-[#1E503A] hover:bg-[#256348] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat With Concierge</span>
                      </a>

                      <button
                        type="button"
                        onClick={onClose}
                        className="py-3 px-6 rounded-xl border border-[#D9D1C5] bg-white hover:bg-[#F3EFE9] text-[#3D3A36] text-xs font-semibold uppercase tracking-[0.14em] transition-colors cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
