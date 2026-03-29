
import React, { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Booking, RoomDefinition } from '../types/types';
import { getDaysDiff, formatDate, addDays } from '../utils/utils';
import { getLunarDate } from '../utils/lunar';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';

const areRoomBookingsEqual = (prev: Booking[], next: Booking[]) => {
  if (prev.length !== next.length) return false;

  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (
      a.id !== b.id ||
      a.status !== b.status ||
      a.roomId !== b.roomId ||
      a.guestName !== b.guestName ||
      a.checkIn !== b.checkIn ||
      a.checkOut !== b.checkOut ||
      a.hasEarlyCheckIn !== b.hasEarlyCheckIn ||
      a.hasLateCheckOut !== b.hasLateCheckOut
    ) {
      return false;
    }
  }

  return true;
};

// Keep CalendarRow as is or exported to separate file, for brevity assuming it's inside
const CalendarRow = React.memo(({ 
    room, daysInMonth, bookingsForRoom, onEdit, getLocalDateStr, getEffectiveBookingSpan, isDateInEffectiveRange
}: {
    room: { id: string }, 
    daysInMonth: Date[], 
    bookingsForRoom: Booking[], 
    onEdit: any,
    getLocalDateStr: (d: Date) => string,
    getEffectiveBookingSpan: (b: Booking, d: string) => number,
    isDateInEffectiveRange: (b: Booking, d: string) => boolean
}) => {
    // ... Implementation same as before ...
    const cells = [];
    let skip = 0;
    
    for (let i = 0; i < daysInMonth.length; i++) {
        if (skip > 0) {
            skip--;
            continue;
        }
        
        const date = daysInMonth[i];
        const dateStr = getLocalDateStr(date);
        
        const booking = bookingsForRoom.find(b => 
                b.status !== 'cancelled' && isDateInEffectiveRange(b, dateStr)
        );

        if (booking) {
            const effectiveStart = booking.hasEarlyCheckIn ? addDays(booking.checkIn, -1) : booking.checkIn;
            const isStartOfBar = effectiveStart === dateStr;
            const isFirstOfMonth = i === 0;
            
            if (isStartOfBar || (isFirstOfMonth && effectiveStart < dateStr)) {
                const span = getEffectiveBookingSpan(booking, dateStr);
                skip = span - 1;
                
                const isCheckedIn = booking.status === 'checked-in';
                const isCheckedOut = booking.status === 'checked-out';
                
                let bgClass = 'bg-green-600 border-green-700 text-white'; 
                if (isCheckedIn) bgClass = 'bg-red-600 border-red-700 text-white shadow-sm';
                if (isCheckedOut) bgClass = 'bg-gray-600 border-gray-700 text-white';

                cells.push(
                    <td key={dateStr} colSpan={span} className="p-0.5 border-r border-b dark:border-gray-700 h-14 lg:h-16 relative align-middle">
                        <div 
                            onClick={() => onEdit(booking)}
                            className={`
                                w-full h-full rounded-md shadow-sm border
                                flex flex-col justify-center px-1 cursor-pointer
                                overflow-hidden transition-all hover:brightness-110
                                text-center relative
                                ${bgClass}
                            `}
                            title={`${booking.guestName} (${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)})`}
                        >
                            {(booking.hasEarlyCheckIn && isStartOfBar) && (
                                <div className="absolute top-0.5 left-0.5 text-white/90"><Clock size={8} className="lg:w-3 lg:h-3" /></div>
                            )}
                            {(booking.hasLateCheckOut) && (
                                <div className="absolute bottom-0.5 right-0.5 text-white/90"><Clock size={8} className="lg:w-3 lg:h-3" /></div>
                            )}
                            
                            <div className="font-bold text-[10px] lg:text-xs leading-tight whitespace-normal break-words line-clamp-2 text-white drop-shadow-sm">
                                {booking.guestName}
                            </div>
                            {span > 1 && (
                                <div className="text-[9px] lg:text-[10px] text-white/90 font-medium whitespace-nowrap mt-0.5">
                                    {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                                </div>
                            )}
                        </div>
                    </td>
                );
            } else {
                 cells.push(<td key={dateStr} className="border-r border-b dark:border-gray-700 h-14 lg:h-16 bg-red-100">Err</td>);
            }
        } else {
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                cells.push(
                    <td 
                    key={dateStr} 
                    onClick={() => onEdit({ roomId: room.id, checkIn: dateStr, checkOut: new Date(date.getTime() + 86400000).toISOString().split('T')[0] })}
                    className={`
                        border-r border-b dark:border-gray-700 h-14 lg:h-16 cursor-pointer 
                        transition-colors hover:bg-gray-100 dark:hover:bg-gray-800
                        ${isWeekend ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}
                    `}
                    >
                    </td>
                );
        }
    }
    return (
        <tr className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td className="sticky left-0 z-10 w-[80px] min-w-[80px] lg:w-32 lg:min-w-32 p-2 bg-white dark:bg-slate-950 border-r border-b dark:border-gray-700 font-bold text-blue-800 dark:text-blue-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-gray-50 dark:group-hover:bg-gray-800 text-xs lg:text-sm">
                {room.id}
            </td>
            {cells}
        </tr>
    );
}, (prev, next) => {
    if (prev.room.id !== next.room.id) return false;
    if (prev.daysInMonth[0].getTime() !== next.daysInMonth[0].getTime()) return false;
  return areRoomBookingsEqual(prev.bookingsForRoom, next.bookingsForRoom);
});


const CalendarView = () => {
  const { bookings, rooms, viewDate, setViewDate } = useData();
  const { openBookingModal } = useUI();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  
  const getLocalDateStr = useCallback((d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  }, []);

  const monthStr = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth() + 1;
    return `${y}-${m.toString().padStart(2, '0')}`;
  }, [viewDate]);

  const getWeekStart = useCallback((date: Date) => {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday as first day
    result.setDate(result.getDate() + diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }, []);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.value) {
          const [y, m] = e.target.value.split('-').map(Number);
          const newDate = new Date(y, m - 1, 1);
          setViewDate(newDate);
          setViewMode('month');
      }
  };

  const daysInView = useMemo(() => {
    if (viewMode === 'month') {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const date = new Date(year, month, 1);
      const days = [];
      while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
      }
      return days;
    }

    const weekStart = getWeekStart(viewDate);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + idx);
      return d;
    });
  }, [viewDate, viewMode]);

  const viewEndExclusiveStr = useMemo(() => {
    if (!daysInView.length) return getLocalDateStr(viewDate);
    const lastDay = daysInView[daysInView.length - 1];
    const end = new Date(lastDay);
    end.setDate(end.getDate() + 1);
    return getLocalDateStr(end);
  }, [daysInView, viewDate]);

  const weekRangeLabel = useMemo(() => {
    if (viewMode !== 'week' || daysInView.length === 0) return '';
    const start = daysInView[0];
    const end = daysInView[daysInView.length - 1];
    return `${formatDate(getLocalDateStr(start))} - ${formatDate(getLocalDateStr(end))}`;
  }, [viewMode, daysInView]);

  const shiftPeriod = useCallback((delta: number) => {
    const newDate = new Date(viewDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + delta, 1);
    } else {
      newDate.setDate(newDate.getDate() + (delta * 7));
    }
    setViewDate(newDate);
  }, [setViewDate, viewDate, viewMode]);

  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }, []);

  const getEffectiveBookingSpan = useCallback((booking: Booking, startDateStr: string) => {
      let effectiveEnd = booking.hasLateCheckOut ? addDays(booking.checkOut, 1) : booking.checkOut;
      if (effectiveEnd > viewEndExclusiveStr) effectiveEnd = viewEndExclusiveStr;
      return getDaysDiff(startDateStr, effectiveEnd);
  }, [viewEndExclusiveStr]);

  const isDateInEffectiveRange = useCallback((booking: Booking, dateStr: string) => {
      const start = booking.hasEarlyCheckIn ? addDays(booking.checkIn, -1) : booking.checkIn;
      const end = booking.hasLateCheckOut ? addDays(booking.checkOut, 1) : booking.checkOut;
      return dateStr >= start && dateStr < end;
  }, []);

  const bookingsByRoom = useMemo(() => {
      const map: Record<string, Booking[]> = {};
      rooms.forEach(r => map[r.id] = []);
      bookings.forEach(b => {
          if (map[b.roomId]) map[b.roomId].push(b);
      });
      return map;
  }, [bookings, rooms]);

  const lunarByDate = useMemo(() => {
    const memo: Record<string, ReturnType<typeof getLunarDate>> = {};
    daysInView.forEach(date => {
      const dateStr = getLocalDateStr(date);
      memo[dateStr] = getLunarDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
    });
    return memo;
  }, [daysInView]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 gap-2">
        <div className="flex items-center gap-2 flex-1">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
              <CalendarIcon size={20} className="text-blue-700 dark:text-blue-400"/>
            </div>
            {viewMode === 'month' ? (
              <input 
                  type="month" 
                  value={monthStr}
                  onChange={handleMonthChange}
                  className="font-black text-lg text-gray-900 dark:text-white bg-transparent outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-1 transition-colors"
              />
            ) : (
              <div className="font-black text-base lg:text-lg text-gray-900 dark:text-white">{weekRangeLabel}</div>
            )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
          >
            7 ngày
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
          >
            Tháng
          </button>
          <button onClick={() => shiftPeriod(-1)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <ChevronLeft size={20} className="text-gray-700 dark:text-gray-200"/>
          </button>
          <button onClick={() => { const now = new Date(); setViewDate(now); setViewMode('week'); }} className="px-3 py-2 text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition-colors whitespace-nowrap">
            Hôm nay
          </button>
          <button onClick={() => shiftPeriod(1)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <ChevronRight size={20} className="text-gray-700 dark:text-gray-200"/>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative bg-gray-50 dark:bg-slate-950 custom-scrollbar">
        <table className="w-max border-collapse text-xs table-fixed">
          <thead className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 w-[80px] min-w-[80px] lg:w-32 lg:min-w-32 p-2 bg-gray-100 dark:bg-gray-800 border-r border-b dark:border-gray-700 text-left font-bold text-gray-800 dark:text-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-xs lg:text-sm">
                Phòng
              </th>
              {daysInView.map(date => {
                const dateStr = getLocalDateStr(date);
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const isCurrentDay = isToday(date);
                const lunar = lunarByDate[dateStr];
                const isSpecialLunar = lunar.day === 1 || lunar.day === 15;
                const lunarText = lunar.day === 1 ? `${lunar.day}/${lunar.month}` : lunar.day;

                return (
                  <th key={dateStr} className={`w-[40px] min-w-[40px] md:w-[60px] md:min-w-[60px] lg:w-[100px] lg:min-w-[100px] p-1 border-b border-r dark:border-gray-700 text-center ${isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/30' : ''} ${isWeekend ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' : 'text-gray-800 dark:text-gray-300'}`}>
                    <div className={`text-[9px] md:text-[10px] font-bold uppercase ${isCurrentDay ? 'text-blue-700 font-black' : ''}`}>
                        {['CN','T2','T3','T4','T5','T6','T7'][dayOfWeek]}
                    </div>
                    <div className={`text-sm md:text-base font-black leading-none ${isCurrentDay ? 'bg-blue-600 text-white w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center mx-auto mt-0.5 mb-0.5' : 'mb-0.5'}`}>
                        {date.getDate()}
                    </div>
                    <div className={`text-[8px] md:text-[9px] ${isSpecialLunar ? 'text-red-600 dark:text-red-400 font-black' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
                        {lunarText}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => (
              <CalendarRow 
                key={room.id}
                room={room}
                daysInMonth={daysInView}
                bookingsForRoom={bookingsByRoom[room.id] || []}
                onEdit={openBookingModal}
                getLocalDateStr={getLocalDateStr}
                getEffectiveBookingSpan={getEffectiveBookingSpan}
                isDateInEffectiveRange={isDateInEffectiveRange}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default CalendarView;
