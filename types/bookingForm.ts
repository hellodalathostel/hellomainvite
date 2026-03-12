import { Booking, Discount, Expense, Guest, PropertyInfo, Service } from './types';

export type SuggestedGuest = {
  guestName?: string;
  source?: string;
  phone?: string;
  otaBookingNumber?: string;
};

export interface BookingFormData {
  id?: string;
  groupId?: string;
  roomId: string;
  guestName: string;
  phone: string;
  otaBookingNumber: string;
  source: string;
  note: string;
  isSticky?: boolean;
  checkIn: string;
  checkOut: string;
  status: Booking['status'];
  price: number;
  paid: number;
  surcharge?: number;
  services: Service[];
  discounts: Discount[];
  guests: Guest[];
  paymentMethod: 'cash' | 'card';
  depositMethod: 'cash' | 'transfer' | 'card';
  transactionId: string;
  selectedRooms: string[];
  roomDates: Record<string, { checkIn: string; checkOut: string }>;
  hasEarlyCheckIn: boolean;
  hasLateCheckOut: boolean;
  createdAt?: number;
}

export type BookingFormUpdate = BookingFormData | ((prev: BookingFormData) => BookingFormData);

export type SaveBookingPayload = Partial<Booking> &
  BookingFormData & {
    isGroupMode?: boolean;
    groupPrices?: Record<string, number>;
    groupRoomTotal?: number;
    grandTotal?: number;
    nights?: number;
    syncToGroup?: boolean;
  };

export type SaveExpensePayload = Partial<Expense> & {
  description: string;
  amount: number;
  date: string;
  category: string;
  type: Expense['type'];
};

export type PropertyUpdates = Partial<PropertyInfo>;
