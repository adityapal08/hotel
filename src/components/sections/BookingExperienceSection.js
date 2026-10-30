'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import MagneticButton from '@/components/ui/MagneticButton';
import Tilt3DCard from '@/components/ui/Tilt3DCard';

const ROOM_OPTIONS = [
  {
    name: 'Entire 3BHK Private Pool Villa',
    rate: 15000,
    tag: 'Exclusive Property',
    maxGuests: 8,
  },
  {
    name: 'The Master King Suite',
    rate: 6500,
    tag: 'Ground Floor Master',
    maxGuests: 3,
  },
  {
    name: 'The Garden Deluxe Suite',
    rate: 5500,
    tag: 'Upper Garden View',
    maxGuests: 2,
  },
];

export default function BookingExperienceSection({ onOpenModal }) {
  const [todayStr, setTodayStr] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [roomType, setRoomType] = useState('Entire 3BHK Private Pool Villa');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setTodayStr(today);
    setCheckIn(today);
    setCheckOut(tomorrowStr);
  }, []);

  // Calculations
  const checkInDate = checkIn ? new Date(checkIn) : null;
  const checkOutDate = checkOut ? new Date(checkOut) : null;
  const diffTime = checkInDate && checkOutDate ? checkOutDate.getTime() - checkInDate.getTime() : 0;
  const calculatedNights =
    checkInDate && checkOutDate && checkOutDate > checkInDate
      ? Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)))
      : 0;

  const selectedRoom = ROOM_OPTIONS.find((r) => r.name === roomType) || ROOM_OPTIONS[0];
  const estimatedTotal = calculatedNights * selectedRoom.rate * rooms;

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
        setDateError('Check-out date must be after check-in date.');
      }
      setCheckOut(val);
    }
  };

  const handleProceedBooking = () => {
    if (calculatedNights < 1) {
      setDateError('Please ensure check-out date is at least one day after check-in.');
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
      });
    }
  };

  const includedPerks = [
    'Private Swimming Pool with kids pool attached',
    'Exclusive 3BHK air-conditioned villa layout',
    'Fully functional kitchen with cookware & diningware',
    'Solar water heating in every lavatory',
    'High-speed WiFi with dedicated work desks',
    'Secure on-site car parking & 24/7 caretaker',
  ];

  return (
    <section id="reserve" className="py-24 sm:py-36 bg-[#070c1b] text-white relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#c5a059]/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#e5c384]/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-3"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#e5c384]" />
            <span className="text-xs uppercase tracking-[0.28em] text-[#e5c384] font-bold">
              Direct Villa Reservations
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white uppercase"
          >
            PLAN YOUR <span className="italic font-normal text-[#e5c384]">SANCTUARY STAY</span>
          </motion.h2>
          <p className="text-gray-400 text-sm sm:text-base mt-4 max-w-xl mx-auto font-light">
            Book directly with Red Roots Villa for personalized caretaker service, zero platform markup,
            and complete private access to the entire 3BHK villa and pool.
          </p>
        </div>

        {/* 2-Column Interactive Booking Experience */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Interactive Preferences Widget */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 bg-[#0f172a] rounded-[2.5rem] p-8 sm:p-12 border border-[#c5a059]/30 shadow-2xl flex flex-col justify-between"
          >
            <div>
              {/* Accommodation Selector */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-[0.16em] text-gray-300 mb-2">
                  Select Accommodation
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ROOM_OPTIONS.map((opt) => (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => {
                        setRoomType(opt.name);
                        setRooms(1);
                      }}
                      className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                        roomType === opt.name
                          ? 'bg-[#c5a059]/15 border-[#c5a059] text-white shadow-lg shadow-[#c5a059]/10'
                          : 'bg-[#070c1b] border-white/10 text-gray-400 hover:border-white/30'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#e5c384] block mb-1">
                        {opt.tag}
                      </span>
                      <span className="font-serif text-xs font-bold text-white block truncate">
                        {opt.name.replace('Entire 3BHK ', '')}
                      </span>
                      <span className="text-xs font-semibold text-gray-300 block mt-1">
                        ₹{opt.rate.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] text-gray-500 font-normal">/ night</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>{dateError}</span>
                </div>
              )}

              {/* Guest Counts: Adults & Children */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
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
                    Rooms
                  </label>
                  <select
                    disabled={roomType === 'Entire 3BHK Private Pool Villa'}
                    value={rooms}
                    onChange={(e) => setRooms(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-3 bg-[#070c1b] border border-white/15 rounded-2xl text-xs sm:text-sm text-white focus:outline-none focus:border-[#c5a059] disabled:opacity-50"
                  >
                    {roomType === 'Entire 3BHK Private Pool Villa' ? (
                      <option value={1}>1 Villa (3 Rooms)</option>
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

              {/* Price Calculation Ribbon */}
              <div className="p-4 bg-[#070c1b] rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-gray-400 block font-light">
                    {calculatedNights} {calculatedNights === 1 ? 'Night' : 'Nights'} •{' '}
                    {adults + children} Guests
                  </span>
                  <span className="text-sm font-semibold text-[#e5c384]">
                    ₹{selectedRoom.rate.toLocaleString('en-IN')} / night
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

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="w-4 h-4 text-[#e5c384]" />
                <span>Instant confirmation • Check-in: 2:00 PM</span>
              </div>
              <MagneticButton onClick={handleProceedBooking} className="px-8 py-4 text-xs">
                <span>Continue Reservation</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </MagneticButton>
            </div>
          </motion.div>

          {/* Right Column: 3D Tilt VIP Concierge Summary Card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
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
                  Direct Guest Benefits
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
                      <strong className="text-white font-medium">Flexible Scheduling:</strong> Direct
                      communication with caretaker for early check-in or late checkout upon availability.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#c5a059]/20 text-[#e5c384] flex items-center justify-center flex-shrink-0 mt-0.5">
                      ✓
                    </span>
                    <span>
                      <strong className="text-white font-medium">Pondicherry Local Guidance:</strong> Caretaker
                      support for local sightseeing, beaches, and dining recommendations.
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
