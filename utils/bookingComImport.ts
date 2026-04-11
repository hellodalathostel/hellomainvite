import type { SaveBookingPayload } from '../types/bookingForm';
import type { Booking } from '../types/types';
import type { BookingComImportPreviewItem } from './icalParser';

const normalizeImportText = (value?: string) => (value || '').trim();

export const buildImportedBookingNote = (item: BookingComImportPreviewItem) => {
  return [
    normalizeImportText(item.summary),
    normalizeImportText(item.description),
    `iCal UID: ${item.uid}`,
  ]
    .filter(Boolean)
    .join('\n');
};

export const createImportPreviewHash = (items: BookingComImportPreviewItem[]) => {
  const raw = [...items]
    .sort((left, right) => {
      const leftKey = `${left.uid}|${left.checkIn}|${left.checkOut}|${left.status}|${left.otaBookingNumber || ''}`;
      const rightKey = `${right.uid}|${right.checkIn}|${right.checkOut}|${right.status}|${right.otaBookingNumber || ''}`;
      return leftKey.localeCompare(rightKey);
    })
    .map((item) => `${item.uid}|${item.checkIn}|${item.checkOut}|${item.status}|${item.otaBookingNumber || ''}`)
    .join('||');

  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = (hash * 31 + raw.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
};

export const buildSaveBookingPayloadFromPreview = (
  item: BookingComImportPreviewItem,
  roomPrice: number,
  existingBooking?: Booking
): SaveBookingPayload => {
  const note = buildImportedBookingNote(item);
  const importedAt = Date.now();

  if (existingBooking) {
    return {
      ...existingBooking,
      id: existingBooking.id,
      groupId: existingBooking.groupId,
      roomId: item.roomId,
      guestName: item.guestName || existingBooking.guestName || '',
      phone: existingBooking.phone || '',
      otaBookingNumber: item.otaBookingNumber || existingBooking.otaBookingNumber || '',
      externalSource: 'Booking.com',
      externalIcalUid: item.uid,
      externalImportedAt: importedAt,
      source: 'Booking.com',
      note,
      checkIn: item.checkIn,
      checkOut: item.checkOut,
      status: item.status === 'CANCELLED'
        ? 'cancelled'
        : existingBooking.status === 'checked-in'
          ? 'checked-in'
          : 'booked',
      price: existingBooking.price || roomPrice,
      paid: existingBooking.paid || 0,
      services: existingBooking.services || [],
      discounts: existingBooking.discounts || [],
      guests: existingBooking.guests || [],
      paymentMethod: existingBooking.paymentMethod || 'cash',
      depositMethod: existingBooking.depositMethod || 'transfer',
      transactionId: existingBooking.transactionId || '',
      selectedRooms: [item.roomId],
      roomDates: {},
      hasEarlyCheckIn: existingBooking.hasEarlyCheckIn || false,
      hasLateCheckOut: existingBooking.hasLateCheckOut || false,
      isSticky: existingBooking.isSticky || false,
      surcharge: existingBooking.surcharge || 0,
    };
  }

  return {
    roomId: item.roomId,
    guestName: item.guestName || '',
    phone: '',
    otaBookingNumber: item.otaBookingNumber || '',
    externalSource: 'Booking.com',
    externalIcalUid: item.uid,
    externalImportedAt: importedAt,
    source: 'Booking.com',
    note,
    checkIn: item.checkIn,
    checkOut: item.checkOut,
    status: item.status === 'CANCELLED' ? 'cancelled' : 'booked',
    price: roomPrice,
    paid: 0,
    services: [],
    discounts: [],
    guests: [],
    paymentMethod: 'cash',
    depositMethod: 'transfer',
    transactionId: '',
    selectedRooms: [item.roomId],
    roomDates: {},
    hasEarlyCheckIn: false,
    hasLateCheckOut: false,
    isSticky: false,
    surcharge: 0,
  };
};