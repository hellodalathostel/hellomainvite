import { getDaysDiff } from './utils';
import { BookingFormData, SaveBookingPayload } from '../types/bookingForm';
export const resolveRoomsToCheck = (form: BookingFormData, isGroupMode: boolean): string[] => {
  return isGroupMode && !form.id ? form.selectedRooms : [form.roomId];
};

const PHONE_REGEX = /^0[35789]\d{8}$/;

export const validateBookingForm = (
  form: BookingFormData,
  isGroupMode: boolean
): string | null => {
  if (!form.guestName?.trim()) {
    return 'Vui lòng nhập tên khách.';
  }

  if (form.phone?.trim() && !PHONE_REGEX.test(form.phone.trim())) {
    return 'Số điện thoại không hợp lệ (VD: 0912345678).';
  }

  const roomsToCheck = resolveRoomsToCheck(form, isGroupMode);
  if (roomsToCheck.length === 0 || roomsToCheck.some((roomId) => !roomId)) {
    return 'Vui lòng chọn ít nhất 1 phòng.';
  }

  return null;
};

export const buildBookingSavePayload = (
  form: BookingFormData,
  options: {
    isGroupMode: boolean;
    groupPrices: Record<string, number>;
    roomTotal: number;
    surcharge: number;
    grandTotal: number;
    syncToGroup: boolean;
  }
): SaveBookingPayload => {
  return {
    ...form,
    isGroupMode: options.isGroupMode,
    groupPrices: options.groupPrices,
    groupRoomTotal: options.roomTotal,
    surcharge: options.surcharge,
    grandTotal: options.grandTotal,
    nights: getDaysDiff(form.checkIn, form.checkOut),
    syncToGroup: options.syncToGroup,
  };
};
