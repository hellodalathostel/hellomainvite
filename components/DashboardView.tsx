
import React, { useMemo, useState } from 'react';
import { Search, X, Users, StickyNote, Brush, LogIn, LogOut as LogoutIcon, ChevronRight } from 'lucide-react';
import { Booking, RoomDefinition } from '../types/types';
import { formatCurrency, formatCompactCurrency, formatDate } from '../utils/utils';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';

type RoomQuickFilter = 'all' | 'checkin' | 'checkout' | 'dirty' | 'debt';

const RoomCardSkeleton = () => (
    <div className="p-3 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm min-h-[120px] flex flex-col justify-between animate-pulse h-full">
        <div className="flex justify-between items-start">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
            <div className="w-12 h-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        <div className="mt-4 space-y-2">
            <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-1/2 h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
    </div>
);

const TodayFocusView = ({ bookings, onEdit, today, displayDate }: { bookings: Booking[], onEdit: (b: Booking) => void, today: string, displayDate: string }) => {
    const stats = useMemo(() => {
        const checkIn = bookings.filter(b => b.checkIn === displayDate && b.status !== 'cancelled').sort((a,b) => a.roomId.localeCompare(b.roomId));
        const staying = bookings.filter(b => b.checkIn < displayDate && b.checkOut > displayDate && b.status !== 'cancelled').sort((a,b) => a.roomId.localeCompare(b.roomId));
        const checkOut = bookings.filter(b => b.checkOut === displayDate && b.status !== 'cancelled').sort((a,b) => a.roomId.localeCompare(b.roomId));
        return { checkIn, staying, checkOut };
    }, [bookings, displayDate]);

    const isToday = displayDate === today;
    const dateStr = isToday ? 'Hôm Nay' : 'Ngày Mai';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center justify-between shadow-sm">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 mb-1">
                        <LogIn size={16} className="shrink-0"/>
                        <span className="text-xs font-black uppercase tracking-wide">Check-in {dateStr}</span>
                    </div>
                    <span className="text-3xl font-black text-blue-700 dark:text-blue-400 leading-none">{stats.checkIn.length}</span>
                </div>
                <div className="flex flex-col gap-1 items-end max-w-[50%]">
                    {stats.checkIn.map(b => (
                        <button key={b.id} onClick={() => onEdit(b)} className="px-2 py-1 bg-white dark:bg-blue-950 text-[10px] font-bold rounded-lg text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 truncate w-full text-right">
                            {b.roomId} - {b.guestName}
                        </button>
                    ))}
                    {stats.checkIn.length === 0 && <span className="text-[10px] text-blue-400 italic">Không có</span>}
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center justify-between shadow-sm">
                <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 mb-1">
                        <Users size={16} className="shrink-0"/>
                        <span className="text-xs font-black uppercase tracking-wide">Đang Ở</span>
                    </div>
                <span className="text-3xl font-black text-blue-700 dark:text-blue-400 leading-none">{stats.staying.length}</span>
                </div>
                <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                     {stats.staying.slice(0, 6).map(b => (
                  <button key={b.id} onClick={() => onEdit(b)} className="px-1.5 py-0.5 bg-white dark:bg-blue-950 text-[10px] font-bold rounded text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 hover:bg-blue-100">
                            {b.roomId}
                        </button>
                    ))}
                {stats.staying.length > 6 && <span className="text-[10px] text-blue-600 font-bold self-center">+{stats.staying.length - 6}</span>}
                </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-800 flex items-center justify-between shadow-sm">
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-red-800 dark:text-red-300 mb-1">
                        <LogoutIcon size={16} className="shrink-0"/>
                        <span className="text-xs font-black uppercase tracking-wide">Check-out {dateStr}</span>
                    </div>
                    <span className="text-3xl font-black text-red-700 dark:text-red-400 leading-none">{stats.checkOut.length}</span>
                </div>
                <div className="flex flex-col gap-1 items-end max-w-[50%]">
                    {stats.checkOut.map(b => (
                        <button key={b.id} onClick={() => onEdit(b)} className="px-2 py-1 bg-white dark:bg-red-950 text-[10px] font-bold rounded-lg text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 hover:bg-red-100 truncate w-full text-right">
                            {b.roomId} - {b.guestName}
                        </button>
                    ))}
                    {stats.checkOut.length === 0 && <span className="text-[10px] text-red-400 italic">Không có</span>}
                </div>
            </div>
        </div>
    )
}

const DashboardView = () => {
  const { bookings, rooms, roomStates, loading, actions } = useData();
  const { searchInput, setSearchInput, activeSearchTerm, setActiveSearchTerm, openBookingModal, addToast } = useUI();

  function getBookingTotal(booking: Booking) {
    const serviceTotal = booking.services?.reduce((sum, service) => sum + (service.price * service.qty), 0) || 0;
    return (booking.totalAmount || 0) + (booking.surcharge || 0) + serviceTotal;
  }
  
  const today = new Date().toISOString().split('T')[0];
  const [viewDayOffset, setViewDayOffset] = useState(0); // 0 = today, 1 = tomorrow
  const [roomQuickFilter, setRoomQuickFilter] = useState<RoomQuickFilter>('all');
  
  // Calculate selected date based on offset
  const selectedDate = new Date(new Date().getTime() + viewDayOffset * 86400000).toISOString().split('T')[0];
  
  const filteredBookings = useMemo(() => {
    if (!activeSearchTerm) return [];
    const lowerTerm = activeSearchTerm.toLowerCase();
    return bookings.filter(b => 
      b.guestName?.toLowerCase().includes(lowerTerm) || 
      b.phone?.toLowerCase().includes(lowerTerm) ||
      b.otaBookingNumber?.toLowerCase().includes(lowerTerm) ||
      b.roomId?.toString().includes(lowerTerm) ||
      b.guests?.some(g => g.name?.toLowerCase().includes(lowerTerm) || g.cccd?.includes(lowerTerm))
    );
  }, [bookings, activeSearchTerm]);

  const roomById = useMemo(() => {
    return rooms.reduce<Record<string, RoomDefinition>>((acc, room) => {
      acc[room.id] = room;
      return acc;
    }, {});
  }, [rooms]);

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [rooms]);

  const roomStatusMap = useMemo(() => {
    const map: Record<string, { status: 'checked-in' | 'booked' | 'dirty' | 'empty'; data: Booking | null }> = {};

    rooms.forEach(room => {
      map[room.id] = { status: 'empty', data: null };
    });

    Object.entries(roomStates).forEach(([roomId, state]) => {
      if (state === 'dirty') {
        map[roomId] = { status: 'dirty', data: null };
      }
    });

    bookings.forEach(booking => {
      if (booking.status === 'checked-in') {
        map[booking.roomId] = { status: 'checked-in', data: booking };
      }
    });

    bookings.forEach(booking => {
      if (
        booking.status === 'booked' &&
        booking.checkIn <= today &&
        booking.checkOut > today &&
        map[booking.roomId]?.status !== 'checked-in'
      ) {
        map[booking.roomId] = { status: 'booked', data: booking };
      }
    });

    return map;
  }, [rooms, roomStates, bookings, today]);

  const getRoomState = (roomId: string) => roomStatusMap[roomId] || { status: 'empty', data: null };

  const checkoutList = useMemo(() => {
    return bookings.filter(b => b.status === 'checked-in').sort((a, b) => new Date(a.checkOut).getTime() - new Date(b.checkOut).getTime());
  }, [bookings]);

  const roomQuickFilterCounts = useMemo(() => {
    const checkin = bookings.filter(b => b.status !== 'cancelled' && b.checkIn === selectedDate).length;
    const checkout = bookings.filter(b => b.status !== 'cancelled' && b.checkOut === selectedDate).length;
    const dirty = sortedRooms.filter(r => roomStates[r.id] === 'dirty').length;
    const debt = sortedRooms.filter(r => {
      const roomData = roomStatusMap[r.id]?.data;
      if (!roomData || roomStatusMap[r.id]?.status === 'empty' || roomStatusMap[r.id]?.status === 'dirty') return false;
      return getBookingTotal(roomData) > (roomData.paid || 0);
    }).length;

    return {
      all: sortedRooms.length,
      checkin,
      checkout,
      dirty,
      debt,
    };
  }, [bookings, selectedDate, sortedRooms, roomStates, roomStatusMap]);

  const visibleRooms = useMemo(() => {
    if (roomQuickFilter === 'all') return sortedRooms;

    return sortedRooms.filter(room => {
      const roomData = roomStatusMap[room.id]?.data;

      if (roomQuickFilter === 'dirty') {
        return roomStates[room.id] === 'dirty';
      }

      if (roomQuickFilter === 'checkin') {
        return bookings.some(b => b.roomId === room.id && b.status !== 'cancelled' && b.checkIn === selectedDate);
      }

      if (roomQuickFilter === 'checkout') {
        return bookings.some(b => b.roomId === room.id && b.status !== 'cancelled' && b.checkOut === selectedDate);
      }

      if (roomQuickFilter === 'debt') {
        if (!roomData || roomStatusMap[room.id]?.status === 'empty' || roomStatusMap[room.id]?.status === 'dirty') return false;
        return getBookingTotal(roomData) > (roomData.paid || 0);
      }

      return true;
    });
  }, [roomQuickFilter, sortedRooms, roomStatusMap, roomStates, bookings, selectedDate]);

  const notesWithBookings = useMemo(() => {
    return bookings
      .filter(b => b.note && b.status !== 'cancelled' && new Date(b.checkIn) >= new Date(today))
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
  }, [bookings, today]);

  const handleCleanRoom = async (id: string) => {
      await actions.cleanRoom(id);
      addToast(`Đã dọn phòng ${id}`, 'info');
  }

  return (
    <div className="p-4 pb-24 lg:p-6 lg:pb-6 animate-fade-in space-y-6 h-full">
      {/* Search Bar */}
      <div className="flex gap-2 sticky top-0 z-10 bg-gray-50 dark:bg-slate-950 pb-2">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="Tìm tên, SĐT, OTAs num, CCCD..." 
            value={searchInput} 
            onChange={(e) => setSearchInput(e.target.value)} 
            className="w-full pl-4 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm outline-none focus:border-blue-500 text-gray-900 dark:bg-gray-800 dark:text-white transition-all text-base font-medium placeholder-gray-500" 
            onKeyDown={(e) => e.key === 'Enter' && setActiveSearchTerm(searchInput)}
          />
          {searchInput && (
            <button 
              onClick={() => { setSearchInput(''); setActiveSearchTerm(''); }} 
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <button 
          onClick={() => setActiveSearchTerm(searchInput)} 
          className="bg-blue-700 text-white w-12 rounded-2xl shadow-sm hover:bg-blue-800 flex items-center justify-center"
        >
          <Search size={24} />
        </button>
      </div>
      
      {!activeSearchTerm && !loading && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setViewDayOffset(0)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  viewDayOffset === 0 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Hôm Nay
              </button>
              <ChevronRight size={20} className="text-gray-400" />
              <button
                onClick={() => setViewDayOffset(1)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  viewDayOffset === 1 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Ngày Mai
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {([
                { key: 'all', label: 'Tất cả' },
                { key: 'checkin', label: 'Check-in' },
                { key: 'checkout', label: 'Check-out' },
                { key: 'dirty', label: 'Chưa dọn' },
                { key: 'debt', label: 'Còn nợ' },
              ] as Array<{ key: RoomQuickFilter; label: string }>).map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setRoomQuickFilter(filter.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition-colors ${
                    roomQuickFilter === filter.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {filter.label} ({roomQuickFilterCounts[filter.key]})
                </button>
              ))}
            </div>

            <TodayFocusView bookings={bookings} onEdit={openBookingModal} today={today} displayDate={selectedDate} />
          </>
      )}

      {activeSearchTerm ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
             <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase">Kết quả ({filteredBookings.length})</h3>
             <button onClick={() => { setActiveSearchTerm(''); setSearchInput(''); }} className="text-xs text-blue-700 dark:text-blue-400 font-bold">Xóa lọc</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredBookings.map(b => (
                <div key={b.id} onClick={() => openBookingModal(b)} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-400">
                <div>
                    <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-800 dark:text-blue-300">{b.roomId}</span>
                    {b.status === 'checked-out' && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 font-bold">Đã trả</span>}
                    {b.status === 'cancelled' && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded font-bold">ĐÃ HỦY</span>}
                    </div>
                    <span className={`font-bold ${b.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{b.guestName}</span>
                </div>
                <div className="text-right">
                    <span className="text-xs text-gray-600 dark:text-gray-400 block font-medium">{formatDate(b.checkIn)} - {formatDate(b.checkOut)}</span>
                    <span className="text-sm font-black text-blue-700 dark:text-blue-400">{formatCurrency(getBookingTotal(b))}</span>
                </div>
                </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Desktop: unified operational room grid */}
          <div className="hidden lg:grid grid-cols-2 xl:grid-cols-4 gap-3">
            {visibleRooms.map(room => {
              const { status, data } = getRoomState(room.id);
              let bgClass = 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500';
              let statusText = 'Trống';
              let statusColor = 'text-gray-500 dark:text-gray-400';
              if (status === 'checked-in') { bgClass = 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800/60'; statusText = 'Đang ở'; statusColor = 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100'; }
              else if (status === 'booked') { bgClass = 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/60'; statusText = 'Đã đặt'; statusColor = 'bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-100'; }
              else if (status === 'dirty') { bgClass = 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600/60'; statusText = 'Chưa dọn'; statusColor = 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'; }
              return (
                <div key={room.id} onClick={() => status === 'dirty' ? handleCleanRoom(room.id) : openBookingModal(data || { roomId: room.id, price: room.price })} className={`relative w-full p-3 lg:p-4 rounded-2xl border-2 shadow-sm flex flex-col justify-between min-h-[120px] h-full transition-all active:scale-95 cursor-pointer ${bgClass}`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-2xl font-black ${status === 'dirty' ? 'text-amber-900 dark:text-amber-100' : 'text-gray-900 dark:text-white'}`}>{room.id}</span>
                    {status === 'empty' ? (
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full border border-blue-100 dark:border-blue-800">{formatCompactCurrency(room.price)}</span>
                    ) : (
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${statusColor}`}>{statusText}</span>
                    )}
                  </div>
                  {status === 'dirty' ? (
                    <div className="mt-auto flex flex-col items-center justify-center text-amber-800 dark:text-amber-200">
                      <Brush size={24} className="animate-pulse"/>
                      <span className="text-[10px] font-bold mt-1 uppercase tracking-wide">Dọn phòng</span>
                    </div>
                  ) : data ? (
                    <div className="mt-2">
                      <p className="font-bold text-gray-900 dark:text-white truncate text-sm leading-tight mb-1">{data.guestName}{data.groupId && <Users size={12} className="text-blue-600 shrink-0 inline-block ml-1"/>}</p>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-black/20 px-1.5 py-0.5 rounded font-bold">{formatDate(data.checkIn)} - {formatDate(data.checkOut)}</span>
                        {data.paid > 0 && <span className="text-gray-600 dark:text-gray-400 font-bold">Cọc: <b className="text-orange-700 dark:text-orange-400">{formatCompactCurrency(data.paid)}</b></span>}
                      </div>
                      {data.isSticky && data.note ? (
                        <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <div className="flex items-start gap-1">
                            <span className="text-lg">📌</span>
                            <p className="text-[10px] text-orange-900 dark:text-orange-200 line-clamp-3 break-words font-semibold">{data.note}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 break-words">Ghi chú: {data.note ? data.note : '-'}</div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-auto text-center text-gray-400 dark:text-gray-600 text-[10px] font-bold uppercase tracking-widest">Chạm để đặt</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile / small screens: original grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:hidden">
            {loading ? (
                sortedRooms.map(r => <RoomCardSkeleton key={r.id}/>)
            ) : (
                visibleRooms.map(room => {
                const { status, data } = getRoomState(room.id);
                let bgClass = 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500';
                let statusText = 'Trống';
                let statusColor = 'text-gray-500 dark:text-gray-400';

                if (status === 'checked-in') { 
                    bgClass = 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800/60'; 
                    statusText = 'Đang ở'; 
                    statusColor = 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100'; 
                } else if (status === 'booked') { 
                    bgClass = 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/60'; 
                    statusText = 'Đã đặt'; 
                    statusColor = 'bg-green-200 dark:bg-green-900 text-green-900 dark:text-green-100'; 
                } else if (status === 'dirty') { 
                    bgClass = 'bg-amber-100 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600/60'; 
                    statusText = 'Chưa dọn'; 
                    statusColor = 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100'; 
                }

                return (
                    <div key={room.id} onClick={() => status === 'dirty' ? handleCleanRoom(room.id) : openBookingModal(data || { roomId: room.id, price: room.price })} className={`relative p-3 lg:p-4 rounded-2xl border-2 shadow-sm flex flex-col justify-between min-h-[120px] lg:min-h-[140px] h-full transition-all active:scale-95 cursor-pointer ${bgClass}`}>
                    <div className="flex justify-between items-start">
                        <span className={`text-2xl lg:text-3xl font-black ${status === 'dirty' ? 'text-amber-900 dark:text-amber-100' : 'text-gray-900 dark:text-white'}`}>{room.id}</span>
                        {status === 'empty' ? (
                        <span className="text-[10px] lg:text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full border border-blue-100 dark:border-blue-800">{formatCompactCurrency(room.price)}</span>
                        ) : (
                        <span className={`text-[9px] lg:text-[10px] font-black uppercase px-2 py-1 rounded-full ${statusColor}`}>{statusText}</span>
                        )}
                    </div>
                    {status === 'dirty' ? (
                        <div className="mt-auto flex flex-col items-center justify-center text-amber-800 dark:text-amber-200">
                        <Brush size={28} className="animate-pulse lg:w-8 lg:h-8"/>
                        <span className="text-[10px] lg:text-xs font-bold mt-1 uppercase tracking-wide">Dọn phòng</span>
                        </div>
                    ) : data ? (
                        <div className="mt-2">
                        <p className="font-bold text-gray-900 dark:text-white truncate text-sm lg:text-base flex items-center gap-1 leading-tight mb-1">{data.guestName}{data.groupId && <Users size={12} className="text-blue-600 shrink-0"/>}</p>
                        <div className="flex justify-between items-center text-[10px] lg:text-xs">
                            <span className="text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-black/20 px-1.5 py-0.5 rounded font-bold">{formatDate(data.checkIn)} - {formatDate(data.checkOut)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1 text-[10px] lg:text-xs">
                            {data.paid > 0 && <span className="text-gray-600 dark:text-gray-400 font-bold">Cọc: <b className="text-orange-700 dark:text-orange-400">{formatCompactCurrency(data.paid)}</b></span>}
                        </div>
                        {data.note && <div className="absolute bottom-2 right-2 text-orange-600 bg-white dark:bg-slate-950 rounded-full p-0.5 shadow-sm"><StickyNote size={12} className="lg:w-4 lg:h-4"/></div>}
                        </div>
                    ) : (
                        <div className="mt-auto text-center text-gray-400 dark:text-gray-600 text-[10px] lg:text-xs font-bold uppercase tracking-widest">Chạm để đặt</div>
                    )}
                    </div>
                );
            })
            )}
          </div>

          {!loading && visibleRooms.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 font-medium bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              Không có phòng phù hợp bộ lọc hiện tại.
            </div>
          )}

          {/* Notes List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mt-6">
            <div className="bg-orange-50 dark:bg-orange-900/20 px-4 py-3 border-b border-orange-200 dark:border-orange-800 flex items-center gap-2">
              <StickyNote size={18} className="text-orange-700 dark:text-orange-400"/>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wide">Danh Sách Ghi Chú</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2">Phòng</th>
                    <th className="px-4 py-2">Tên Khách</th>
                    <th className="px-4 py-2 text-center">Ngày Check-in</th>
                    <th className="px-4 py-2">Nội Dung Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={4} className="p-4 text-center"><div className="w-full h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div></td></tr>
                  ) : (() => {
                    return notesWithBookings.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500 italic text-xs">Không có ghi chú nào từ hôm nay trở đi.</td></tr>
                    ) : (
                      notesWithBookings.map(b => (
                        <tr key={b.id} onClick={() => openBookingModal(b)} className="hover:bg-orange-50 dark:hover:bg-orange-900/10 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-bold text-blue-800 dark:text-blue-300">{b.roomId}</td>
                          <td className="px-4 py-3 font-bold text-gray-900 dark:text-white"><div className="truncate max-w-xs">{b.guestName}</div></td>
                          <td className="px-4 py-3 text-center font-bold text-gray-700 dark:text-gray-300">{formatDate(b.checkIn)}</td>
                          <td className="px-4 py-3 text-gray-800 dark:text-gray-200 break-words max-w-lg">
                            <div className="line-clamp-2">{b.note}</div>
                          </td>
                        </tr>
                      ))
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardView;
