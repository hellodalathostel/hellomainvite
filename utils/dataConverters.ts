
import { Booking, BookingEntity, GroupEntity, Expense, ServiceDefinition } from '../types/types';
import { getBookingDiscountTotal, getBookingServiceTotal, getEffectiveBookingSurcharge, normalizeMoneyAmount } from './calculations';
import { getDaysDiff } from './utils';

type LegacyBookingFields = {
  guestName?: string;
  phone?: string;
  otaBookingNumber?: string;
  source?: string;
  note?: string;
  paid?: number;
  paymentMethod?: Booking['paymentMethod'];
  guests?: Booking['guests'];
};

type UnknownRecord = Record<string, unknown>;

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

    const guestName = group ? group.customer.name : legacy.guestName || 'Unknown';
    const phone = group ? group.customer.phone : legacy.phone || '';
    const otaBookingNumber = group ? group.customer.otaBookingNumber || '' : legacy.otaBookingNumber || '';
    const source = group ? group.customer.source : legacy.source || 'Vãng lai';
    const note = group ? group.customer.note : legacy.note || '';
    
    const paid = normalizeMoneyAmount(group?.payment.paid ?? legacy.paid); 
    const paymentMethod = legacy.paymentMethod; 

    return {
        ...b,
        guestName,
        phone,
        otaBookingNumber,
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
