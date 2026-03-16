import { useState, useEffect, useMemo } from 'react';
import { Booking, BookingWarning, RoomDefinition, UserRole } from '../types/types';
import { BookingFormData, SaveBookingPayload } from '../types/bookingForm';
import { calculateBookingTotal } from '../utils/calculations';
import { createInitialBookingForm } from '../utils/bookingForm';
import { buildBookingSavePayload, resolveRoomsToCheck, validateBookingForm } from '../utils/bookingWorkflow';
import { formatDate, getDaysDiff } from '../utils/utils';

interface UseBookingFormOptions {
  editingBooking: Partial<Booking> | null;
  rooms: RoomDefinition[];
  allBookings: Booking[];
  userRole: UserRole;
  checkRoomCollision: (roomId: string, start: string, end: string, ignoreId?: string, isEarly?: boolean, isLate?: boolean) => Booking | undefined;
  onSave: (data: SaveBookingPayload) => void;
}

export function useBookingForm({
  editingBooking,
  rooms,
  allBookings,
  userRole,
  checkRoomCollision,
  onSave,
}: UseBookingFormOptions) {
  const [form, setForm] = useState<BookingFormData>(() => createInitialBookingForm(editingBooking, rooms));
  const [groupPrices, setGroupPrices] = useState<Record<string, number>>({});
  const [isGroupMode, setIsGroupMode] = useState(!!editingBooking?.groupId);
  const [syncToGroup, setSyncToGroup] = useState(false);

  useEffect(() => {
    setForm(createInitialBookingForm(editingBooking, rooms));
  }, [editingBooking, rooms]);

  // Auto-fill room price for single bookings when room changes
  useEffect(() => {
    if (!editingBooking?.id && !isGroupMode && rooms.length > 0) {
      const room = rooms.find(r => r.id === form.roomId);
      if (room && room.price !== form.price) {
        setForm(f => ({ ...f, price: room.price, selectedRooms: [room.id] }));
      }
    }
  }, [form.roomId, isGroupMode, editingBooking?.id, rooms]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isLocked = userRole === 'staff' && !!form.id && form.checkOut < today;
  const showDesktopActionColumn = !!(form.id && !isLocked && form.status !== 'cancelled' && form.status !== 'checked-out');

  const groupPeers = useMemo(() => {
    if (!form.groupId) return [];
    return allBookings
      .filter(b => b.groupId === form.groupId && b.status !== 'cancelled')
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  }, [allBookings, form.groupId]);

  const roomStaySummary = useMemo(() => {
    if (!groupPeers.length) return null;
    const summary: Record<string, number> = {};
    let totalNights = 0;
    groupPeers.forEach(b => {
      const nights = getDaysDiff(b.checkIn, b.checkOut);
      summary[b.roomId] = (summary[b.roomId] || 0) + nights;
      totalNights += nights;
    });
    return { details: summary, total: totalNights };
  }, [groupPeers]);

  const financials = useMemo(
    () => calculateBookingTotal(form, rooms, isGroupMode && !form.id, groupPrices),
    [form, rooms, isGroupMode, groupPrices]
  );

  const warnings = useMemo(() => {
    const list: BookingWarning[] = [];
    if (form.groupId && groupPeers.length === 1 && form.id) {
      list.push({ type: 'info', msg: 'Đoàn chỉ còn 1 phòng.' });
    }
    if (isLocked) {
      list.push({ type: 'error', msg: 'Đơn đã kết thúc. Chỉ xem.' });
    }
    return list;
  }, [form.groupId, groupPeers.length, isLocked, form.id]);

  const handleSubmit = () => {
    if (isLocked) return;
    const validationError = validateBookingForm(form, isGroupMode);
    if (validationError) { alert(validationError); return; }

    const roomsToCheck = resolveRoomsToCheck(form, isGroupMode);
    for (const rid of roomsToCheck) {
      const rDates = form.roomDates?.[rid] || { checkIn: form.checkIn, checkOut: form.checkOut };
      const collision = checkRoomCollision(rid, rDates.checkIn, rDates.checkOut, form.id, form.hasEarlyCheckIn, form.hasLateCheckOut);
      if (collision) {
        alert(`⚠️ Phòng ${rid} bị trùng lịch với khách ${collision.guestName} (${formatDate(collision.checkIn)} - ${formatDate(collision.checkOut)})`);
        return;
      }
    }

    if (form.status === 'checked-out' && financials.debt !== 0) {
      alert('Không thể Check-out khi Tổng còn lại khác 0. Vui lòng thanh toán đủ trước khi trả phòng.');
      return;
    }

    onSave(buildBookingSavePayload(form, {
      isGroupMode,
      groupPrices,
      roomTotal: financials.roomTotal,
      surcharge: financials.surcharge,
      grandTotal: financials.grandTotal,
      syncToGroup,
    }));
  };

  return {
    form, setForm,
    groupPrices, setGroupPrices,
    isGroupMode, setIsGroupMode,
    syncToGroup, setSyncToGroup,
    isLocked,
    showDesktopActionColumn,
    groupPeers,
    roomStaySummary,
    financials,
    warnings,
    handleSubmit,
  };
}
