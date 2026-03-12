
import { Booking, RoomDefinition, InvoiceItem } from '../types/types';
import { getDaysDiff, formatDate, formatCurrency } from './utils';

export const CARD_FEE_RATE = 0.04;
export const CARD_FEE_SERVICE_NAME = 'Phí quẹt thẻ (4%)';

export const calculateCardServiceFee = (amount: number) => {
  return Math.round(Math.max(0, amount) * CARD_FEE_RATE);
};

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
  booking: Partial<Booking>,
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

  const serviceTotal = (booking.services || []).reduce((sum, s) => sum + Math.round(s.price * s.qty), 0);
  const discountTotal = (booking.discounts || []).reduce((sum, d) => sum + Math.round(d.amount), 0);
  const preTaxTotal = Math.round(roomTotal + serviceTotal - discountTotal);

  const paid = booking.paid || 0;
  const remainingBeforeSurcharge = Math.max(0, preTaxTotal - paid);
  const hasCardFeeService = (booking.services || []).some(s => s.name === CARD_FEE_SERVICE_NAME);
  
  const surcharge = booking.paymentMethod === 'card' 
    ? (hasCardFeeService ? (booking.surcharge || 0) : calculateCardServiceFee(remainingBeforeSurcharge))
    : (booking.surcharge || 0); 

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
        
        calculatedSurcharge += (b.surcharge || 0);
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
