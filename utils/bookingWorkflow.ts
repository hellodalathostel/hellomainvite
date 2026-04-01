import { getDaysDiff } from './utils.ts';
import type { BookingFormData, SaveBookingPayload } from '../types/bookingForm.ts';

const hasValidDateRange = (checkIn?: string, checkOut?: string) => {
  return Boolean(checkIn && checkOut && checkIn < checkOut);
};

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

  if (new Set(roomsToCheck).size !== roomsToCheck.length) {
    return 'Danh sách phòng đang bị trùng. Vui lòng kiểm tra lại.';
  }

  if (isGroupMode && !form.id) {
    for (const roomId of roomsToCheck) {
      const roomDates = form.roomDates?.[roomId];
      if (!hasValidDateRange(roomDates?.checkIn, roomDates?.checkOut)) {
        return `Ngày lưu trú không hợp lệ cho phòng ${roomId}.`;
      }
    }
  } else if (!hasValidDateRange(form.checkIn, form.checkOut)) {
    return 'Ngày không hợp lệ (check-in phải nhỏ hơn check-out).';
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
