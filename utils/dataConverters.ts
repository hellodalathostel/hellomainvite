
import { Booking, BookingEntity, GroupEntity, Expense, ServiceDefinition } from '../types/types';
import { getBookingDiscountTotal, getBookingServiceTotal, getEffectiveBookingSurcharge, normalizeMoneyAmount } from './calculations';
import { getDaysDiff } from './utils';

type LegacyBookingFields = {
  guestName?: string;
  phone?: string;
  otaBookingNumber?: string;
  externalSource?: string;
  externalIcalUid?: string;
  externalImportedAt?: number;
  source?: string;
  note?: string;
  paid?: number;
  paymentMethod?: Booking['paymentMethod'];
  guests?: Booking['guests'];
};

type UnknownRecord = Record<string, unknown>;

export const MISSING_GUEST_NAME = 'Chua co ten khach';

const normalizeText = (value?: string) => (typeof value === 'string' ? value.trim() : '');

export const hasMeaningfulGuestName = (value?: string) => {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return false;

  return normalized !== 'unknown' && normalized !== 'unknow' && normalized !== MISSING_GUEST_NAME.toLowerCase();
};

const getDisplayGuestName = (group?: GroupEntity, legacyGuestName?: string) => {
  const groupName = normalizeText(group?.customer?.name);
  if (hasMeaningfulGuestName(groupName)) return groupName;

  const legacyName = normalizeText(legacyGuestName);
  if (hasMeaningfulGuestName(legacyName)) return legacyName;

  return MISSING_GUEST_NAME;
};

export const mergeBookingData = (
    b: BookingEntity, 
    group?: GroupEntity
): Booking => {
  const legacy = b as BookingEntity & LegacyBookingFields;

    const serviceTotal = getBookingServiceTotal(b);
    const discountTotal = getBookingDiscountTotal(b);
    
    const nights = getDaysDiff(b.checkIn, b.checkOut);
    const roomCharge = normalizeMoneyAmount(b.price) * nights;

    const totalAmount = roomCharge + serviceTotal + getEffectiveBookingSurcharge(b) - discountTotal;

    const guestName = getDisplayGuestName(group, legacy.guestName);
    const phone = normalizeText(group?.customer.phone) || normalizeText(legacy.phone);
    const otaBookingNumber = normalizeText(group?.customer.otaBookingNumber) || normalizeText(legacy.otaBookingNumber);
    const externalSource = normalizeText(group?.customer.externalSource) || normalizeText(legacy.externalSource);
    const externalIcalUid = normalizeText(group?.customer.externalIcalUid) || normalizeText(legacy.externalIcalUid);
    const externalImportedAt = group?.customer.externalImportedAt ?? legacy.externalImportedAt;
    const source = normalizeText(group?.customer.source) || normalizeText(legacy.source) || 'Vãng lai';
    const note = normalizeText(group?.customer.note) || normalizeText(legacy.note);
    
    const paid = normalizeMoneyAmount(group?.payment.paid ?? legacy.paid); 
    const paymentMethod = legacy.paymentMethod; 

    return {
        ...b,
        guestName,
        phone,
        otaBookingNumber,
        externalSource,
        externalIcalUid,
        externalImportedAt,
        source,
        note,
        totalAmount,
        paid, 
        paymentMethod,
        depositMethod: group?.payment.depositMethod, 
        transactionId: group?.payment.transactionId, 
        guests: legacy.guests || [],
        isGroupMode: !!b.groupId
    };
};

export const expenseConverter = {
  fromFirestore: (key: string, data: UnknownRecord): Expense => {
    return {
      id: key,
      description: typeof data.description === 'string' ? data.description : '',
      amount: Number(data.amount) || 0,
      date: typeof data.date === 'string' ? data.date : new Date().toISOString().split('T')[0],
      category: typeof data.category === 'string' ? data.category : 'Khác',
      type: data.type === 'income' ? 'income' : 'expense',
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
      isDeleted: data.isDeleted === true
    };
  }
};

export const serviceConverter = {
    fromFirestore: (key: string, data: UnknownRecord): ServiceDefinition => {
        return {
            id: key,
            name: typeof data.name === 'string' ? data.name : 'Dịch vụ',
            price: Number(data.price) || 0
        }
    }
}
