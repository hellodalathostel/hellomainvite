import { RoomDefinition } from '../types/types';
import { BookingFormData } from '../types/bookingForm';

export const createInitialBookingForm = (
  editingBooking: Partial<BookingFormData> | null,
  rooms: RoomDefinition[]
): BookingFormData => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const fallbackRoom = rooms.length > 0 ? rooms[0] : { id: '', price: 0 };

  if (editingBooking?.id) {
    return {
      ...editingBooking,
      roomId: editingBooking.roomId || fallbackRoom.id,
      guestName: editingBooking.guestName || '',
      phone: editingBooking.phone || '',
      otaBookingNumber: editingBooking.otaBookingNumber || '',
      source: editingBooking.source || 'Vãng lai (Walk-in)',
      note: editingBooking.note || '',
      checkIn: editingBooking.checkIn || today,
      checkOut: editingBooking.checkOut || tomorrow,
      status: editingBooking.status || 'booked',
      price: editingBooking.price || fallbackRoom.price,
      paid: editingBooking.paid || 0,
      services: editingBooking.services || [],
      discounts: editingBooking.discounts || [],
      guests: editingBooking.guests || [],
      paymentMethod: editingBooking.paymentMethod || 'cash',
      depositMethod: editingBooking.depositMethod || 'transfer',
      transactionId: editingBooking.transactionId || '',
      selectedRooms: editingBooking.selectedRooms || [editingBooking.roomId || fallbackRoom.id],
      roomDates: editingBooking.roomDates || {},
      hasEarlyCheckIn: editingBooking.hasEarlyCheckIn || false,
      hasLateCheckOut: editingBooking.hasLateCheckOut || false,
      isSticky: editingBooking.isSticky || false,
      surcharge: editingBooking.surcharge || 0,
    };
  }

  return {
    roomId: editingBooking?.roomId || fallbackRoom.id,
    guestName: editingBooking?.guestName || '',
    phone: editingBooking?.phone || '',
    otaBookingNumber: editingBooking?.otaBookingNumber || '',
    checkIn: editingBooking?.checkIn || today,
    checkOut: editingBooking?.checkOut || tomorrow,
    status: editingBooking?.status || 'booked',
    price: editingBooking?.price || fallbackRoom.price,
    services: editingBooking?.services || [],
    discounts: editingBooking?.discounts || [],
    paid: editingBooking?.paid || 0,
    source: editingBooking?.source || 'Vãng lai (Walk-in)',
    note: editingBooking?.note || '',
    paymentMethod: editingBooking?.paymentMethod || 'cash',
    depositMethod: editingBooking?.depositMethod || 'transfer',
    transactionId: editingBooking?.transactionId || '',
    selectedRooms: [editingBooking?.roomId || fallbackRoom.id],
    roomDates: {},
    guests: editingBooking?.guests || [],
    hasEarlyCheckIn: editingBooking?.hasEarlyCheckIn || false,
    hasLateCheckOut: editingBooking?.hasLateCheckOut || false,
    isSticky: editingBooking?.isSticky || false,
    surcharge: editingBooking?.surcharge || 0,
  };
};
