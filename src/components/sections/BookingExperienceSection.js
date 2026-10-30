'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Users,
  Sparkles,
  Check,
  ShieldCheck,
  Home,
  ArrowRight,
  PhoneCall,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Flame,
} from 'lucide-react';
import MagneticButton from '@/components/ui/MagneticButton';
import Tilt3DCard from '@/components/ui/Tilt3DCard';
import { checkAvailabilityApi } from '@/services/bookingService';

export const ROOM_OPTIONS = [
  {
    name: 'Entire 3BHK Private Pool Villa',
    rate: 15000,
    tag: 'Exclusive Villa',
    maxGuests: 8,
    maxRooms: 2,
    desc: '3 air-conditioned master bedrooms, private pool, lawn & kitchen',
  },
  {
    name: 'The Master King Suite',
    rate: 6500,
    tag: 'Ground Floor Master',
    maxGuests: 3,
    maxRooms: 4,
    desc: 'King teak bed, olive quilt, en-suite bathroom & work desk',
  },
  {
    name: 'The Garden Deluxe Suite',
    rate: 5500,
    tag: 'Upper Garden View',
    maxGuests: 2,
    maxRooms: 6,
    desc: 'Emerald velvet drapery, serene river view artwork & balcony',
  },
  {
    name: 'Deluxe Room',
    rate: 4500,
    tag: 'Dummy Inventory Test',
    maxGuests: 3,
    maxRooms: 10,
    desc: '10 total rooms seeded in SQLite for dynamic inventory testing',
  },
  {
    name: 'Premium Room',
    rate: 5800,
    tag: 'Dummy Inventory Test',
    maxGuests: 4,
    maxRooms: 5,
    desc: '5 total rooms seeded in SQLite with live booked & available counts',
  },
];

export default function BookingExperienceSection({ onOpenModal }) {
  const [todayStr, setTodayStr] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomType, setRoomType] = useState('Deluxe Room');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [dateError, setDateError] = useState('');

  // Live SQLite availability state
  const [isSearching, setIsSearching] = useState(false);
  const [allAvailability, setAllAvailability] = useState({});
  const [currentAvailability, setCurrentAvailability] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Initialize initial test dates (starts tomorrow or Nov 1)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setTodayStr(today);
    // Default to Nov 1 - Nov 3, 2026 if valid for immediate dummy testing, else today/tomorrow
    if (today <= '2026-11-01') {
      setCheckIn('2026-11-01');
      setCheckOut('2026-11-03');
    } else {
      setCheckIn(today);
      setCheckOut(tomorrowStr);
    }
  }, []);

  // Fetch availability from SQLite API whenever checkIn, checkOut, or rooms change
  const fetchAvailability = useCallback(
    async (inDate, outDate, reqRooms) => {
      if (!inDate || !outDate || inDate >= outDate) return;
      setIsSearching(true);
      setDateError('');

      try {
        // Query all rooms so we have badges for each option
        const response = await checkAvailabilityApi(inDate, outDate, '', reqRooms);
        if (response.success && response.results) {
          const map = {};
          response.results.forEach((r) => {
            map[r.roomType] = r;
          });
          setAllAvailability(map);
          setCurrentAvailability(map[roomType] || null);
        }
      } catch (err) {
        console.error('Availability check failed:', err);
        setDateError(err.message || 'Unable to check live room availability');
      } finally {
        setIsSearching(false);
      }
    },
    [roomType]
  );

  // Trigger availability check when dates or room count changes
  useEffect(() => {
    if (checkIn && checkOut && checkIn < checkOut) {
      fetchAvailability(checkIn, checkOut, rooms);
    }
  }, [checkIn, checkOut, rooms, fetchAvailability]);

  // Keep currentAvailability in sync when active roomType changes
  useEffect(() => {
    if (allAvailability[roomType]) {
      setCurrentAvailability(allAvailability[roomType]);
    }
  }, [roomType, allAvailability]);

  // Calculations
  const checkInDate = checkIn ? new Date(checkIn) : null;
  const checkOutDate = checkOut ? new Date(checkOut) : null;
  const diffTime = checkInDate && checkOutDate ? checkOutDate.getTime() - checkInDate.getTime() : 0;
  const calculatedNights =
    checkInDate && checkOutDate && checkOutDate > checkInDate
      ? Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)))
      : 0;

  const selectedRoom = ROOM_OPTIONS.find((r) => r.name === roomType) || ROOM_OPTIONS[0];
  const pricePerNight = currentAvailability?.pricePerNight || selectedRoom.rate;
  const estimatedTotal = calculatedNights * pricePerNight * rooms;

  const handleDateChange = (type, val) => {
    setDateError('');
    if (type === 'checkIn') {
      setCheckIn(val);
      if (checkOut <= val) {
        const nextDay = new Date(val);
        nextDay.setDate(nextDay.getDate() + 1);
        setCheckOut(nextDay.toISOString().split('T')[0]);
      }
    } else {
      if (val <= checkIn) {
        setDateError('Check-out date must be at least one day after check-in date.');
      }
      setCheckOut(val);
    }
  };

  const handleApplyPreset = (inD, outD, roomT) => {
    setCheckIn(inD);
    setCheckOut(outD);
    if (roomT) setRoomType(roomT);
    setRooms(1);
    fetchAvailability(inD, outD, 1);
  };

  const handleProceedBooking = () => {
    if (calculatedNights < 1) {
      setDateError('Please ensure check-out date is at least one day after check-in.');
      return;
    }

    if (currentAvailability && !currentAvailability.isAvailable) {
      setDateError(
        currentAvailability.minAvailableRooms === 0
          ? 'This room type is Sold Out for the selected dates. Please choose another date or room.'
          : `Only ${currentAvailability.minAvailableRooms} room(s) available for these dates, but you selected ${rooms}.`
      );
      return;
    }

    if (onOpenModal) {
      onOpenModal({
        checkIn,
        checkOut,
        roomType,
        adults,
        children,
        rooms,
        pricePerNight,
        estimatedTotal,
      });
    }
  };

  // Status badge renderer
  const renderStatusBadge = (avail) => {
    if (!avail) {
      return (
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Checking...
        </span>
      );
    }

    if (avail.status === 'sold_out') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-950/80 border border-rose-600/40 px-2 py-0.5 rounded-md">
          <XCircle className="w-3 h-3" /> Sold Out
        </span>
      );
    }

    if (avail.status === 'insufficient') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-600/40 px-2 py-0.5 rounded-md">
          <AlertTriangle className="w-3 h-3" /> Only {avail.minAvailableRooms} Left
        </span>
      );
    }

    if (avail.status === 'limited') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">
          <Flame className="w-3 h-3 text-amber-400" /> Only {avail.minAvailableRooms} Left!
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
        <CheckCircle2 className="w-3 h-3" /> {avail.minAvailableRooms} Available
      </span>
    );
  };

  return (
    <section id="reserve" className="py-24 sm:py-36 bg-[#070c1b] text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#c5a059]/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#e5c384]/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/30"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e5c384]" />
            <span className="text-xs uppercase tracking-[0.28em] text-[#e5c384] font-bold">
              Live SQLite Room Inventory
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white uppercase"
          >
            CHECK AVAILABILITY & <span className="italic font-normal text-[#e5c384]">BOOK DIRECT</span>
          </motion.h2>
          <p className="text-gray-400 text-sm sm:text-base mt-4 max-w-2xl mx-auto font-light">
            Real-time, database-driven availability checking across all nights. Bookings atomically reduce
            the available room inventory in SQLite with zero race conditions.
          </p>

          {/* Quick Dummy Test Presets */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mr-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#e5c384]" /> Test Scenarios:
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset('2026-11-01', '2026-11-03', 'Deluxe Room')}
              className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/5 border border-white/15 hover:border-[#c5a059] text-gray-300 hover:text-[#e5c384] transition-all cursor-pointer"
            >
              Nov 1–3 (Deluxe • 7 Avail)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('2026-11-03', '2026-11-05', 'Deluxe Room')}
              className="text-[11px] font-medium px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/30 hover:border-rose-400 text-rose-300 transition-all cursor-pointer"
            >
              Nov 3–5 (Spans Nov 4 Sold Out!)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('2026-11-01', '2026-11-02', 'Premium Room')}
              className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/5 border border-white/15 hover:border-[#c5a059] text-gray-300 hover:text-[#e5c384] transition-all cursor-pointer"
            >
              Nov 1–2 (Premium • 4 Avail)
            </button>
          </div>
        </div>

        {/* 2-Column Interactive Booking Experience */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Interactive Preferences Widget */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 bg-[#0f172a] rounded-[2.5rem] p-6 sm:p-10 border border-[#c5a059]/30 shadow-2xl flex flex-col justify-between"
          >
            <div>
              {/* Accommodation Selector */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-[0.16em] text-gray-300">
                    Select Accommodation Type
                  </label>
                  <span className="text-[11px] text-[#e5c384] font-medium">
                    {ROOM_OPTIONS.length} Options Available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {ROOM_OPTIONS.map((opt) => {
                    const isSelected = roomType === opt.name;
                    const avail = allAvailability[opt.name];

                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => {
                          setRoomType(opt.name);
                          if (rooms > opt.maxRooms) setRooms(1);
                        }}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#c5a059]/15 border-[#c5a059] text-white shadow-lg shadow-[#c5a059]/10 ring-1 ring-[#c5a059]'
                            : 'bg-[#070c1b] border-white/10 text-gray-400 hover:border-white/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#e5c384] truncate">
                              {opt.tag}
                            </span>
                            {renderStatusBadge(avail)}
                          </div>
                          <span className="font-serif text-xs font-bold text-white block line-clamp-1">
                            {opt.name}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-white/5 flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-gray-200">
                            ₹{opt.rate.toLocaleString('en-IN')}
                            <span className="text-[10px] text-gray-500 font-normal"> / night</span>
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Up to {opt.maxGuests} guests
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.16em] text-gray-300 mb-2">
                    Check-in Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#e5c384] absolute left-4 top-3.5" />
                    <input
                      type="date"
                      min={todayStr || undefined}
                      value={checkIn}
                      onChange={(e) => handleDateChange('checkIn', e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#070c1b] border border-white/15 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.16em] text-gray-300 mb-2">
                    Check-out Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#e5c384] absolute left-4 top-3.5" />
                    <input
                      type="date"
                      min={checkIn || todayStr || undefined}
                      value={checkOut}
                      onChange={(e) => handleDateChange('checkOut', e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-[#070c1b] border border-white/15 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]"
                    />
                  </div>
                </div>
              </div>

              {dateError && (
                <div className="mb-4 p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{dateError}</span>
                </div>
              )}

              {/* Guest Counts: Adults, Children & Rooms */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-gray-300 mb-2">
                    Adults
                  </label>
                  <select
                    value={adults}
                    onChange={(e) => setAdults(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-3 bg-[#070c1b] border border-white/15 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#c5a059]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Adult' : 'Adults'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-gray-300 mb-2">
                    Children
                  </label>
                  <select
                    value={children}
                    onChange={(e) => setChildren(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-3 bg-[#070c1b] border border-white/15 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#c5a059]"
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Child' : 'Children'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-gray-300 mb-2">
                    Rooms Requested
                  </label>
                  <select
                    value={rooms}
                    onChange={(e) => setRooms(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-3 bg-[#070c1b] border border-white/15 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#c5a059]"
                  >
                    {Array.from({ length: selectedRoom.maxRooms || 5 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Room' : 'Rooms'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Availability Result Banner */}
              <div className="mb-5 p-4 bg-[#070c1b] rounded-2xl border border-white/10">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                      SQLite Live Status:
                    </span>
                    {isSearching ? (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c5a059]" /> Checking
                        database...
                      </span>
                    ) : (
                      renderStatusBadge(currentAvailability)
                    )}
                  </div>

                  {currentAvailability?.dailyBreakdown?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowBreakdown(!showBreakdown)}
                      className="text-xs text-[#e5c384] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <span>
                        {showBreakdown ? 'Hide Nightly Breakdown' : 'View Nightly Breakdown'}
                      </span>
                      {showBreakdown ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Nightly Breakdown Table */}
                <AnimatePresence>
                  {showBreakdown && currentAvailability?.dailyBreakdown && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3 pt-3 border-t border-white/10"
                    >
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-white/10 pb-1">
                            <th className="py-1.5 font-medium">Date</th>
                            <th className="py-1.5 font-medium">Total</th>
                            <th className="py-1.5 font-medium">Booked</th>
                            <th className="py-1.5 font-medium text-right">Available</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {currentAvailability.dailyBreakdown.map((row) => (
                            <tr key={row.date} className="hover:bg-white/5">
                              <td className="py-1.5 font-mono text-gray-200">{row.date}</td>
                              <td className="py-1.5 text-gray-400">{row.totalRooms}</td>
                              <td className="py-1.5 text-gray-400">{row.bookedRooms}</td>
                              <td className="py-1.5 text-right font-bold">
                                {row.availableRooms === 0 ? (
                                  <span className="text-rose-400">0 (Sold Out)</span>
                                ) : row.availableRooms <= 3 ? (
                                  <span className="text-amber-400">{row.availableRooms} Left</span>
                                ) : (
                                  <span className="text-emerald-400">{row.availableRooms}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-[10px] text-gray-400 mt-2 italic">
                        * Note: Check-out date is exclusive. The minimum available rooms across all
                        dates is {currentAvailability.minAvailableRooms}.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Price Calculation Ribbon */}
              <div className="p-4 bg-gradient-to-r from-[#070c1b] to-[#121c33] rounded-2xl border border-[#c5a059]/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-gray-400 block font-light">
                    {calculatedNights} {calculatedNights === 1 ? 'Night' : 'Nights'} • {rooms}{' '}
                    {rooms === 1 ? 'Room' : 'Rooms'} • {adults + children} Guests
                  </span>
                  <span className="text-sm font-semibold text-[#e5c384]">
                    ₹{pricePerNight.toLocaleString('en-IN')} / night
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 block">
                    Estimated Total
                  </span>
                  <span className="font-serif text-xl sm:text-2xl font-bold text-white">
                    ₹{estimatedTotal.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Section */}
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="w-4 h-4 text-[#e5c384]" />
                <span>Instant confirmation • Atomic SQLite lock</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fetchAvailability(checkIn, checkOut, rooms)}
                  disabled={isSearching}
                  className="px-4 py-3 rounded-xl border border-white/20 hover:border-white/40 text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  {isSearching ? 'Refreshing...' : 'Re-check Inventory'}
                </button>

                <MagneticButton
                  onClick={handleProceedBooking}
                  disabled={currentAvailability && !currentAvailability.isAvailable}
                  className={`px-8 py-4 text-xs ${
                    currentAvailability && !currentAvailability.isAvailable
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <span>
                    {currentAvailability && !currentAvailability.isAvailable
                      ? 'Sold Out For Dates'
                      : 'Continue Reservation'}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </MagneticButton>
              </div>
            </div>
          </motion.div>

          {/* Right Column: 3D Tilt VIP Concierge Summary Card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-5 flex flex-col"
          >
            <Tilt3DCard
              maxRotation={8}
              className="bg-gradient-to-b from-[#111d33] to-[#070c1b] rounded-[2.5rem] p-8 sm:p-10 border border-[#c5a059]/40 shadow-2xl flex flex-col justify-between h-full"
            >
              <div>
                <div className="w-14 h-14 rounded-2xl bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e5c384] flex items-center justify-center mb-6">
                  <ShieldCheck className="w-7 h-7" />
                </div>

                <span className="text-xs uppercase tracking-[0.25em] text-[#e5c384] font-bold block mb-1">
                  Guaranteed Direct Reservation
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-4">
                  Why Book Directly With Us?
                </h3>

                <ul className="space-y-4 text-xs sm:text-sm text-gray-300 font-light mb-8">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#c5a059]/20 text-[#e5c384] flex items-center justify-center flex-shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>
                      <strong className="text-white font-medium">Guaranteed Best Rates:</strong> Zero
                      third-party OTA booking fees or hidden platform markups.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#c5a059]/20 text-[#e5c384] flex items-center justify-center flex-shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>
                      <strong className="text-white font-medium">Real-Time Inventory Lock:</strong> Rooms
                      are instantly locked in the hotel database so you never get double-booked.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#c5a059]/20 text-[#e5c384] flex items-center justify-center flex-shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>
                      <strong className="text-white font-medium">Pondicherry Local Guidance:</strong> 24/7
                      caretaker support for early check-in, dining recommendations, and local beaches.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Call Caretaker Quick Box */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Have questions before booking?
                </span>
                <a
                  href="tel:+919363432220"
                  className="flex items-center gap-3 text-white hover:text-[#e5c384] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-full bg-[#c5a059] text-[#070c1b] flex items-center justify-center font-bold">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block">+91 9363432220</span>
                    <span className="text-[10px] text-gray-400 group-hover:text-[#e5c384]">
                      Tap to call villa caretaker directly
                    </span>
                  </div>
                </a>
              </div>
            </Tilt3DCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
