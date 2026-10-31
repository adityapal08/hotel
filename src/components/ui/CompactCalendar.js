'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { getMonthAvailabilityApi } from '@/services/bookingService';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Compact, luxury hotel calendar date picker for Reserve / Book Now.
 * Highlights check-in, check-out, and date ranges.
 * Displays real-time database room availability and disables sold-out/past dates.
 * Supports both 'dark' (default) and 'light' luxury themes.
 */
export default function CompactCalendar({
  checkIn = '',
  checkOut = '',
  onSelectRange,
  roomType = 'Deluxe Room',
  propertyId = 'red-roots-villa',
  minDate = '',
  className = '',
  refreshKey = 0,
  theme = 'dark',
}) {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const effectiveMinDate = minDate || today;
  const isLight = theme === 'light';

  // Initialize view month based on checkIn or today
  const [viewYear, setViewYear] = useState(() => {
    if (checkIn) return parseInt(checkIn.split('-')[0], 10);
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (checkIn) return parseInt(checkIn.split('-')[1], 10) - 1; // 0-indexed
    return new Date().getMonth();
  });

  const [monthData, setMonthData] = useState({});
  const [loading, setLoading] = useState(false);
  const [helperNotice, setHelperNotice] = useState('');

  const currentMonthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  // Fetch month availability whenever month, roomType, propertyId, or refreshKey changes
  const loadMonthInventory = useCallback(async (monthStr, rType, propId) => {
    setLoading(true);
    try {
      const res = await getMonthAvailabilityApi(monthStr, rType, propId);
      if (res.success && res.days) {
        setMonthData(res.days);
      }
    } catch (err) {
      console.error('Error fetching calendar month inventory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonthInventory(currentMonthStr, roomType, propertyId);
  }, [currentMonthStr, roomType, propertyId, refreshKey, loadMonthInventory]);

  // Keep view in sync when checkIn changes externally
  useEffect(() => {
    if (checkIn) {
      const parts = checkIn.split('-');
      if (parts.length === 3) {
        const inYear = parseInt(parts[0], 10);
        const inMonth = parseInt(parts[1], 10) - 1;
        if (inYear !== viewYear || inMonth !== viewMonth) {
          setViewYear(inYear);
          setViewMonth(inMonth);
        }
      }
    }
  }, [checkIn]);

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Determine if previous month is disabled (cannot go before current month)
  const isPrevDisabled = useMemo(() => {
    const todayYear = new Date().getFullYear();
    const todayMonth = new Date().getMonth();
    return viewYear < todayYear || (viewYear === todayYear && viewMonth <= todayMonth);
  }, [viewYear, viewMonth]);

  // Calendar calculations
  const firstDayOfWeek = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();

  // Day click handler for range selection
  const handleDayClick = (dateStr, isSoldOut, isPast) => {
    if (isPast || isSoldOut) return;
    setHelperNotice('');

    // Case 1: No checkIn selected, or both checkIn & checkOut already selected
    if (!checkIn || (checkIn && checkOut)) {
      if (onSelectRange) {
        onSelectRange(dateStr, '');
      }
      setHelperNotice('Check-in selected. Now choose your check-out date.');
      return;
    }

    // Case 2: checkIn is selected, waiting for checkOut
    if (checkIn && !checkOut) {
      if (dateStr <= checkIn) {
        // Clicked date is earlier or same as checkIn -> reset checkIn
        if (onSelectRange) {
          onSelectRange(dateStr, '');
        }
        setHelperNotice('Updated check-in date. Now select your check-out date.');
      } else {
        // Validate if any night in between is sold out (check-out date itself is excluded!)
        let hasSoldOutNight = false;
        const cur = new Date(checkIn + 'T00:00:00Z');
        const end = new Date(dateStr + 'T00:00:00Z');
        while (cur < end) {
          const y = cur.getUTCFullYear();
          const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
          const d = String(cur.getUTCDate()).padStart(2, '0');
          const dStr = `${y}-${m}-${d}`;
          if (monthData[dStr] && monthData[dStr].availableRooms === 0) {
            hasSoldOutNight = true;
            break;
          }
          cur.setUTCDate(cur.getUTCDate() + 1);
        }

        if (hasSoldOutNight) {
          setHelperNotice('Selected date range spans a sold-out night. Please choose another range.');
          return;
        }

        // Complete the range: checkIn -> dateStr
        if (onSelectRange) {
          onSelectRange(checkIn, dateStr);
        }
        setHelperNotice('');
      }
    }
  };

  // Calculate nights if both selected
  const calculatedNights = useMemo(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    }
    return 0;
  }, [checkIn, checkOut]);

  // Color theme classes
  const containerStyle = isLight
    ? 'bg-[#FAF7F2] border-[#E2DBD2] text-[#1C1B1A] shadow-md'
    : 'bg-[#070c1b]/95 border-[#c5a059]/30 text-white shadow-xl';

  const headerBorder = isLight ? 'border-[#EAE4DC]' : 'border-white/10';
  const headerText = isLight ? 'text-[#1C1B1A]' : 'text-white';
  const navBtnStyle = isLight
    ? 'border-[#DDD6CC] bg-white text-[#5E584F] hover:bg-[#F3EFE9]'
    : 'border-white/15 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white';
  const weekdayText = isLight ? 'text-[#8A8277]' : 'text-gray-400';

  return (
    <div className={`rounded-2xl p-4 sm:p-5 border transition-all ${containerStyle} ${className}`}>
      {/* Month Navigation Header */}
      <div className={`flex items-center justify-between mb-3.5 pb-2.5 border-b ${headerBorder}`}>
        <div className="flex items-center gap-2">
          <CalendarIcon className={`w-4 h-4 ${isLight ? 'text-[#8A7E6D]' : 'text-[#e5c384]'}`} />
          <span className={`font-serif text-sm sm:text-base font-bold tracking-wide ${headerText}`}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          {loading && (
            <span
              className={`w-2 h-2 rounded-full animate-ping ${isLight ? 'bg-[#8A7E6D]' : 'bg-[#c5a059]'}`}
              title="Updating inventory..."
            />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={isPrevDisabled}
            className={`w-7 h-7 rounded-lg border disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer ${navBtnStyle}`}
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${navBtnStyle}`}
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Row */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {WEEKDAYS.map((wd, i) => (
          <span key={i} className={`text-[10px] font-bold uppercase tracking-wider py-1 ${weekdayText}`}>
            {wd}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Leading empty cells */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-9 w-full" />
        ))}

        {/* Days in Month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isPast = dateStr < effectiveMinDate;

          const inv = monthData[dateStr];
          const availableRooms = inv ? inv.availableRooms : 20;
          const isSoldOut = !isPast && inv && inv.availableRooms === 0;

          const isCheckIn = dateStr === checkIn;
          const isCheckOut = dateStr === checkOut;
          const isInRange = checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;

          // Compute button styling
          let cellStyle = isLight
            ? 'text-[#2E2C29] hover:bg-[#F3EFE9] border-transparent'
            : 'text-gray-200 hover:bg-white/10 hover:border-[#c5a059]/40 border-transparent';

          if (isPast) {
            cellStyle = isLight
              ? 'opacity-25 text-gray-400 pointer-events-none border-transparent cursor-not-allowed'
              : 'opacity-25 text-gray-600 pointer-events-none border-transparent cursor-not-allowed';
          } else if (isSoldOut) {
            cellStyle = isLight
              ? 'line-through text-rose-500 bg-rose-50 border-rose-200 cursor-not-allowed opacity-60'
              : 'line-through text-rose-400/60 bg-rose-950/20 border-rose-500/20 cursor-not-allowed opacity-50';
          } else if (isCheckIn && isCheckOut) {
            cellStyle = isLight
              ? 'bg-[#1C1B1A] text-[#FAF8F5] font-bold shadow-md rounded-lg'
              : 'bg-gradient-to-r from-[#c5a059] to-[#e5c384] text-[#070c1b] font-bold shadow-md rounded-lg';
          } else if (isCheckIn) {
            cellStyle = isLight
              ? 'bg-[#1C1B1A] text-[#FAF8F5] font-bold shadow-md rounded-l-lg'
              : 'bg-gradient-to-r from-[#c5a059] to-[#e5c384] text-[#070c1b] font-bold shadow-md rounded-l-lg';
          } else if (isCheckOut) {
            cellStyle = isLight
              ? 'bg-[#1C1B1A] text-[#FAF8F5] font-bold shadow-md rounded-r-lg'
              : 'bg-gradient-to-r from-[#c5a059] to-[#e5c384] text-[#070c1b] font-bold shadow-md rounded-r-lg';
          } else if (isInRange) {
            cellStyle = isLight
              ? 'bg-[#EFE8DC] text-[#1C1B1A] font-semibold border-y border-[#DED7CA]'
              : 'bg-[#c5a059]/25 text-[#e5c384] font-medium border-y border-[#c5a059]/30';
          }

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast || isSoldOut}
              onClick={() => handleDayClick(dateStr, isSoldOut, isPast)}
              className={`h-9 w-full rounded-md border flex flex-col items-center justify-center transition-all cursor-pointer relative text-xs sm:text-[13px] ${cellStyle}`}
              title={
                isPast
                  ? 'Past Date'
                  : isSoldOut
                    ? 'Sold Out'
                    : `${dateStr}: ${availableRooms} room(s) available`
              }
            >
              <span>{dayNum}</span>
              {!isPast && !isCheckIn && !isCheckOut && !isInRange && (
                <span
                  className={`text-[8px] leading-none font-mono scale-90 ${isLight ? 'text-[#8A8277]' : 'text-gray-400'
                    }`}
                >
                  {isSoldOut ? '0' : availableRooms}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Helper notice */}
      {helperNotice && (
        <div
          className={`mt-3 p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${isLight
              ? 'bg-[#F2EFE9] border border-[#DDD6CC] text-[#6B6459]'
              : 'bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#e5c384]'
            }`}
        >
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{helperNotice}</span>
        </div>
      )}

      {/* Selected Dates Folio Strip */}
      <div
        className={`mt-3 pt-2.5 border-t flex items-center justify-between text-xs ${isLight ? 'border-[#EAE4DC]' : 'border-white/10'
          }`}
      >
        <div>
          <span
            className={`text-[10px] uppercase tracking-wider block ${isLight ? 'text-[#8A8277]' : 'text-gray-400'
              }`}
          >
            Selected Range
          </span>
          <span className={`font-semibold ${isLight ? 'text-[#1C1B1A]' : 'text-white'}`}>
            {checkIn ? checkIn : 'Select Check-in'} → {checkOut ? checkOut : 'Select Check-out'}
          </span>
        </div>
        {calculatedNights > 0 && (
          <span
            className={`px-2 py-0.5 rounded-full font-bold text-[11px] border ${isLight
                ? 'bg-[#EAE4DC] border-[#DDD6CC] text-[#1C1B1A]'
                : 'bg-[#c5a059]/20 border-[#c5a059]/40 text-[#e5c384]'
              }`}
          >
            {calculatedNights} {calculatedNights === 1 ? 'Night' : 'Nights'}
          </span>
        )}
      </div>

      {/* Calendar Legend */}
      <div
        className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] flex-wrap gap-2 ${isLight ? 'border-[#EDE7DE] text-[#8A8277]' : 'border-white/5 text-gray-400'
          }`}
      >
        <div className="flex items-center gap-1">
          <span className={`w-2.5 h-2.5 rounded-sm ${isLight ? 'bg-[#1C1B1A]' : 'bg-[#c5a059]'}`} />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`w-2.5 h-2.5 rounded-sm ${isLight ? 'bg-[#EAE4DC]' : 'bg-white/20'}`}
          />
          <span>Available (Up to 20)</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`w-2.5 h-2.5 rounded-sm ${isLight
                ? 'bg-rose-100 border border-rose-300'
                : 'bg-rose-900/60 border border-rose-500/40'
              }`}
          />
          <span>Sold Out / Past</span>
        </div>
      </div>
    </div>
  );
}
