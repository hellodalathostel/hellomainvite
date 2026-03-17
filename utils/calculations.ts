
import type { Booking, RoomDefinition, InvoiceItem } from '../types/types';
import { getDaysDiff, formatDate, formatCurrency } from './utils';

export const CARD_FEE_RATE = 0.04;
export const CARD_FEE_SERVICE_NAME = 'Phí quẹt thẻ (4%)';

type BookingFinancialInput = Pick<Booking, 'services' | 'discounts' | 'surcharge' | 'paymentMethod'>;

type BookingTotalInput = {
  id?: string;
  selectedRooms?: string[];
  roomDates?: Record<string, { checkIn: string; checkOut: string }>;
  checkIn?: string;
  checkOut?: string;
  price?: number;
  paid?: number;
  paymentMethod?: Booking['paymentMethod'];
  services?: Booking['services'];
  discounts?: Booking['discounts'];
  surcharge?: number;
};

export const calculateCardServiceFee = (amount: number) => {
  return Math.round(Math.max(0, amount) * CARD_FEE_RATE);
};

export const normalizeMoneyAmount = (value: number | undefined) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return 0;
  return Math.max(0, normalized);
};

export const getBookingServiceTotal = (booking: Pick<Booking, 'services'> | BookingFinancialInput | BookingTotalInput) =>
  (booking.services || []).reduce((sum, service) => {
    const unitPrice = normalizeMoneyAmount(service.price);
    const qty = normalizeMoneyAmount(service.qty);
    return sum + Math.round(unitPrice * qty);
  }, 0);

export const getBookingDiscountTotal = (booking: Pick<Booking, 'discounts'> | BookingFinancialInput | BookingTotalInput) =>
  (booking.discounts || []).reduce((sum, discount) => sum + Math.round(normalizeMoneyAmount(discount.amount)), 0);

export const hasCardFeeService = (booking: Pick<Booking, 'services'> | BookingFinancialInput | BookingTotalInput) =>
  (booking.services || []).some(service => service.name === CARD_FEE_SERVICE_NAME);

export const getEffectiveBookingSurcharge = (booking: Pick<Booking, 'services' | 'surcharge'> | BookingFinancialInput | BookingTotalInput) =>
  hasCardFeeService(booking) ? 0 : Math.round(normalizeMoneyAmount(booking.surcharge));

interface CalculationResult {
  roomTotal: number;
  serviceTotal: number;
  discountTotal: number;
  surcharge: number;
  preTaxTotal: number;
  grandTotal: number;
  debt: number;
}

interface BillResult {
    items: InvoiceItem[];
    surcharge: number;
    total: number;
    paid: number;
    balance: number;
    isGroup: boolean;
}

export const calculateBookingTotal = (
  booking: BookingTotalInput,
  rooms: RoomDefinition[],
  isGroupMode: boolean = false,
  groupPrices: Record<string, number> = {}
): CalculationResult => {
  let roomTotal = 0;

  if (isGroupMode && !booking.id && booking.selectedRooms && booking.selectedRooms.length > 0) {
    roomTotal = booking.selectedRooms.reduce((sum, rid) => {
      const rData = rooms.find(r => r.id === rid);
      const price = groupPrices[rid] !== undefined ? groupPrices[rid] : (rData?.price || 0);
      
      const rDates = booking.roomDates?.[rid] || { 
        checkIn: booking.checkIn || '', 
        checkOut: booking.checkOut || '' 
      };
      
      const nights = getDaysDiff(rDates.checkIn, rDates.checkOut);
      return sum + Math.round(price * nights);
    }, 0);
  } else {
    const nights = getDaysDiff(booking.checkIn || '', booking.checkOut || '');
    const price = booking.price || 0;
    roomTotal = Math.round(price * nights);
  }

  const serviceTotal = getBookingServiceTotal(booking);
  const discountTotal = getBookingDiscountTotal(booking);
  const preTaxTotal = Math.round(roomTotal + serviceTotal - discountTotal);

  const paid = normalizeMoneyAmount(booking.paid);
  const remainingBeforeSurcharge = Math.max(0, preTaxTotal - paid);
  const hasFixedCardFeeService = hasCardFeeService(booking);
  
  const surcharge = booking.paymentMethod === 'card' 
    ? (hasFixedCardFeeService ? 0 : calculateCardServiceFee(remainingBeforeSurcharge))
    : getEffectiveBookingSurcharge(booking);

  const grandTotal = Math.round(preTaxTotal + surcharge);
  const debt = Math.round(grandTotal - paid);

  return {
    roomTotal,
    serviceTotal,
    discountTotal,
    surcharge,
    preTaxTotal,
    grandTotal,
    debt
  };
};

export const calculateBill = (
    booking: Booking, 
    allBookings: Booking[], 
    rooms: RoomDefinition[], 
    forceGroup: boolean
): BillResult => {
    let items: InvoiceItem[] = [];
    
    const isGroup = forceGroup && !!booking.groupId; 
    
    const targetBookings = isGroup 
      ? allBookings.filter(b => b.groupId === booking.groupId && b.status !== 'cancelled' && !b.isDeleted)
      : [booking];

    const getRoomType = (id: string) => {
        const room = rooms.find(r => r.id === id);
        if (!room) return `Phòng ${id}`;
        return room.name;
    };

    let calculatedTotal = 0;
    let calculatedSurcharge = 0;
    
    targetBookings.forEach(b => { 
        const nights = getDaysDiff(b.checkIn, b.checkOut); 
        const roomName = getRoomType(b.roomId);
        
        items.push({ 
            desc: `${roomName} (${formatDate(b.checkIn)} - ${formatDate(b.checkOut)})\n${formatCurrency(b.price)} x ${nights} đêm`, 
            amount: Math.round(b.price * nights)
        }); 
        
        calculatedTotal += Math.round(b.price * nights);

        if (b.services) {
            b.services.forEach(s => {
                const amount = s.price * s.qty;
                items.push({ 
                    desc: `+ DV: ${s.name} x${s.qty} (${b.roomId})`, 
                    amount: Math.round(amount) 
                });
                calculatedTotal += amount;
            }); 
        }
        
        if (b.discounts) {
            b.discounts.forEach(d => {
                items.push({ 
                    desc: `- Ưu đãi: ${d.description} (${b.roomId})`, 
                    amount: Math.round(-d.amount) 
                });
                calculatedTotal -= d.amount;
            });
        }
        
        calculatedSurcharge += getEffectiveBookingSurcharge(b);
    }); 
    
    calculatedTotal += calculatedSurcharge;

    let paid = 0;
    if (isGroup) {
        paid = Math.max(...targetBookings.map(b => b.paid || 0));
    } else {
        paid = booking.paid || 0;
    }

    return { 
        items, 
        surcharge: calculatedSurcharge, 
        total: calculatedTotal, 
        paid: paid, 
        balance: calculatedTotal - paid, 
        isGroup 
    };
};
