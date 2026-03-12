
import { Booking, BookingEntity, GroupEntity, Expense, ServiceDefinition } from '../types/types';

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

    const serviceTotal = (b.services || []).reduce((sum, s) => sum + (s.price * s.qty), 0);
    const discountTotal = (b.discounts || []).reduce((sum, d) => sum + d.amount, 0);
    
    const d1 = new Date(b.checkIn);
    const d2 = new Date(b.checkOut);
    const diffTime = d2.getTime() - d1.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const roomCharge = b.price * nights;

    const totalAmount = roomCharge + serviceTotal + (b.surcharge || 0) - discountTotal;

    const guestName = group ? group.customer.name : legacy.guestName || 'Unknown';
    const phone = group ? group.customer.phone : legacy.phone || '';
    const otaBookingNumber = group ? group.customer.otaBookingNumber || '' : legacy.otaBookingNumber || '';
    const source = group ? group.customer.source : legacy.source || 'Vãng lai';
    const note = group ? group.customer.note : legacy.note || '';
    
    const paid = legacy.paid || 0; 
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
      createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now()
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
