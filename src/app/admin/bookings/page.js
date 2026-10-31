'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Building2,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { getAllBookingsApi, cancelBookingApi } from '@/services/bookingService';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Filters
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancellingRef, setCancellingRef] = useState(null);

  const loadBookings = useCallback(async (propId = '') => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllBookingsApi(propId);
      if (res.success && res.bookings) {
        setBookings(res.bookings);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('Failed to load admin bookings:', err);
      setError(err.message || 'Error loading bookings from database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings(selectedProperty);
  }, [selectedProperty, loadBookings]);

  // Handle cancelling booking
  const handleCancelBooking = async (ref, propName) => {
    if (!window.confirm(`Are you sure you want to cancel booking ${ref} for ${propName || 'the homestay'}? This will restore room inventory back to SQLite.`)) {
      return;
    }

    setCancellingRef(ref);
    setActionMessage('');
    try {
      const res = await cancelBookingApi(ref);
      if (res.success) {
        setActionMessage(`✓ Booking ${ref} successfully cancelled. Inventory restored.`);
        loadBookings(selectedProperty);
      }
    } catch (err) {
      alert(`Error cancelling booking: ${err.message}`);
    } finally {
      setCancellingRef(null);
    }
  };

  // Filtered list
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Property Filter
      if (selectedProperty !== 'all' && b.property_id !== selectedProperty) {
        return false;
      }

      // Status Filter
      if (selectedStatus !== 'all' && b.status !== selectedStatus) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const refMatch = (b.reference || '').toLowerCase().includes(q);
        const nameMatch = (b.guest_name || '').toLowerCase().includes(q);
        const emailMatch = (b.email || '').toLowerCase().includes(q);
        const phoneMatch = (b.phone || '').toLowerCase().includes(q);
        const roomMatch = (b.room_type || '').toLowerCase().includes(q);
        const propMatch = (b.property_name || '').toLowerCase().includes(q);

        return refMatch || nameMatch || emailMatch || phoneMatch || roomMatch || propMatch;
      }

      return true;
    });
  }, [bookings, selectedProperty, selectedStatus, searchQuery]);

  // Property statistics
  const stats = useMemo(() => {
    const total = bookings.length;
    const rrv = bookings.filter((b) => b.property_id === 'red-roots-villa').length;
    const hs2 = bookings.filter((b) => b.property_id === 'homestay-2').length;
    const hs3 = bookings.filter((b) => b.property_id === 'homestay-3').length;
    const active = bookings.filter((b) => b.status === 'confirmed').length;

    return { total, rrv, hs2, hs3, active };
  }, [bookings]);

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1A202C] flex flex-col">
      {/* Admin Header */}
      <header className="bg-[#070C1B] text-white py-4 px-4 sm:px-8 border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Website</span>
            </Link>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#C5A059]" />
              <h1 className="font-serif text-lg font-bold tracking-tight text-white uppercase">
                Homestay Administration & Booking Console
              </h1>
            </div>
          </div>

          <button
            onClick={() => loadBookings(selectedProperty)}
            disabled={loading}
            className="text-xs bg-white/10 hover:bg-white/20 text-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Console Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Action Message Banner */}
        {actionMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage('')}
              className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-[#E2DBD2] shadow-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A7E6D] block">
              Total Bookings
            </span>
            <span className="font-serif text-2xl font-bold text-[#1C1B1A] mt-1 block">
              {stats.total}
            </span>
            <span className="text-[11px] text-[#2F5238] font-medium block mt-0.5">
              {stats.active} Active
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2DBD2] shadow-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A7E6D] block">
              Red Roots Villa
            </span>
            <span className="font-serif text-2xl font-bold text-[#1C1B1A] mt-1 block">
              {stats.rrv}
            </span>
            <span className="text-[11px] text-[#7A746B] block mt-0.5">Primary Estate</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2DBD2] shadow-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A7E6D] block">
              Homestay 2
            </span>
            <span className="font-serif text-2xl font-bold text-[#1C1B1A] mt-1 block">
              {stats.hs2}
            </span>
            <span className="text-[11px] text-[#7A746B] block mt-0.5">Preview Homestay</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2DBD2] shadow-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A7E6D] block">
              Homestay 3
            </span>
            <span className="font-serif text-2xl font-bold text-[#1C1B1A] mt-1 block">
              {stats.hs3}
            </span>
            <span className="text-[11px] text-[#7A746B] block mt-0.5">Preview Homestay</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E2DBD2] shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8A7E6D] block">
              Inventory Mode
            </span>
            <span className="font-serif text-lg font-bold text-[#2F5238] mt-1 block">
              Isolated SQLite
            </span>
            <span className="text-[11px] text-[#7A746B] block mt-0.5">Zero cross-effects</span>
          </div>
        </div>

        {/* Filters & Search Control Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E2DBD2] shadow-xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
          {/* Property Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Homestays' },
              { id: 'red-roots-villa', label: 'Red Roots Villa' },
              { id: 'homestay-2', label: 'Homestay 2' },
              { id: 'homestay-3', label: 'Homestay 3' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedProperty(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  selectedProperty === tab.id
                    ? 'bg-[#070C1B] text-white shadow-sm'
                    : 'bg-[#F5F1EB] text-[#6B6459] hover:bg-[#EAE4DC]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#8A8277] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search guest, ID, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] text-[#1C1B1A]"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#DDD6CC] rounded-xl focus:outline-none focus:border-[#7A6E5D] text-[#1C1B1A] font-medium cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-2xl border border-[#E2DBD2] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EFE9DF] flex items-center justify-between bg-[#FCFAF7]">
            <h3 className="font-serif text-base font-bold text-[#1C1B1A]">
              Bookings Ledger ({filteredBookings.length} records)
            </h3>
            <span className="text-[11px] text-[#7A746B]">
              Ordered by Most Recent
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[#7A746B]">
              Loading bookings from SQLite...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#7A746B]">
              No bookings found matching current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EFE9DF] text-[10px] uppercase font-bold tracking-wider text-[#8A7E6D] bg-[#F7F4EF]">
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Homestay Property</th>
                    <th className="py-3 px-4">Guest Details</th>
                    <th className="py-3 px-4">Check-in / Out</th>
                    <th className="py-3 px-4">Accommodation</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE9DF]">
                  {filteredBookings.map((b) => {
                    const isConfirmed = b.status === 'confirmed';
                    const isCancellingThis = cancellingRef === b.reference;

                    // Color code badge by property
                    const isRRV = b.property_id === 'red-roots-villa';
                    const isHS2 = b.property_id === 'homestay-2';
                    const isHS3 = b.property_id === 'homestay-3';

                    const propBadgeClass = isRRV
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : isHS2
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300';

                    return (
                      <tr key={b.reference} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#1C1B1A]">
                          {b.reference}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${propBadgeClass}`}
                          >
                            {b.property_name || b.property_id}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <strong className="block text-[#1C1B1A] font-semibold">
                            {b.guest_name}
                          </strong>
                          <span className="text-[11px] text-[#7A746B] block">
                            {b.phone} • {b.email}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[#1C1B1A] font-medium block">
                            {b.check_in} → {b.check_out}
                          </span>
                          <span className="text-[11px] text-[#7A746B] block">
                            {b.nights} {b.nights === 1 ? 'night' : 'nights'} • {b.rooms} room(s)
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[#1C1B1A] font-medium block">
                            {b.room_type}
                          </span>
                          <span className="text-[11px] text-[#7A746B] block">
                            {b.adults} Adults{b.children > 0 ? `, ${b.children} Children` : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-serif font-bold text-sm text-[#1C1B1A] block">
                            ₹{Number(b.total_price).toLocaleString('en-IN')}
                          </span>
                          {b.is_negotiated === 1 && (
                            <span className="text-[10px] text-[#762F3D] font-medium block">
                              Negotiated (Orig: ₹{Number(b.original_total_price).toLocaleString('en-IN')})
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                              <XCircle className="w-3 h-3 text-gray-500" /> Cancelled
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isConfirmed && (
                            <button
                              type="button"
                              disabled={isCancellingThis}
                              onClick={() => handleCancelBooking(b.reference, b.property_name)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md transition-colors cursor-pointer"
                            >
                              {isCancellingThis ? 'Restoring...' : 'Cancel'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
