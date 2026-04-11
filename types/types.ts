
export interface Guest {
  name: string;
  cccd: string;
}

export interface Service {
  name: string;
  price: number;
  qty: number;
}

export interface Discount {
  description: string;
  amount: number;
}

export interface PaymentRecord {
  date: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer';
  note?: string;
  createdAt?: number;
}

export interface CustomerRecord {
  id: string;
  name: string;
  cccd?: string;
  phone: string;
  source?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
}

export interface CustomerUsageRecord {
  bookingId: string;
  bookingName: string;
  checkIn: string;
  checkOut: string;
  phone: string;
  source?: string;
  createdAt: number;
}

export interface ServiceDefinition {
  id: string;
  name: string;
  price: number;
  isDeleted?: boolean;
}

export interface DiscountDefinition {
  id: string;
  description: string;
  amount: number;
}

export type UserRole = 'owner' | 'staff';

export type AppTab = 'dashboard' | 'calendar' | 'generated' | 'reports' | 'settings';

export interface User {
  uid?: string;
  email: string;
  role: UserRole;
  name?: string;
  createdAt?: number;
}

export interface GroupEntity {
    id: string;
    customer: {
        name: string;
        phone: string;
    otaBookingNumber?: string;
    externalSource?: string;
    externalIcalUid?: string;
    externalImportedAt?: number;
        source: string;
        note?: string;
    };
    payment: {
        paid: number;
        depositMethod?: 'cash' | 'transfer' | 'card';
        transactionId?: string;
    };
    roomIds: Record<string, string>;
    status: 'active' | 'cancelled';
    createdAt: number;
    updatedAt: number;
}

export interface BookingEntity {
    id: string;
    roomId: string;
    groupId?: string;
    checkIn: string;
    checkOut: string;
    hasEarlyCheckIn?: boolean;
    hasLateCheckOut?: boolean;
    price: number;
    status: 'booked' | 'checked-in' | 'checked-out' | 'cancelled';
    services: Service[];
    discounts: Discount[];
    surcharge?: number;
    createdAt: number;
    updatedAt?: number;
    isDeleted?: boolean;
}

export interface Booking {
  id: string;
  roomId: string;
  groupId?: string;
  guestName: string;
  phone: string;
  otaBookingNumber?: string;
  externalSource?: string;
  externalIcalUid?: string;
  externalImportedAt?: number;
  source: string;
  note?: string;
  isSticky?: boolean;
  checkIn: string;
  checkOut: string;
  hasEarlyCheckIn?: boolean;
  hasLateCheckOut?: boolean;
  status: 'booked' | 'checked-in' | 'checked-out' | 'cancelled';
  price: number;
  totalAmount: number;
  paid: number;
  surcharge?: number;
  services: Service[];
  discounts?: Discount[];
  guests: Guest[];
  createdAt: number;
  paymentMethod?: 'cash' | 'card';
  depositMethod?: 'cash' | 'transfer' | 'card';
  transactionId?: string;
  isGroupMode?: boolean;
  selectedRooms?: string[];
  groupPrices?: Record<string, number>;
  roomDates?: Record<string, { checkIn: string, checkOut: string }>;
  groupRoomTotal?: number;
  syncToGroup?: boolean;
  isDeleted?: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: 'expense' | 'income';
  createdAt?: number;
  isDeleted?: boolean;
}

export interface RoomState {
  [roomId: string]: 'clean' | 'dirty';
}

export interface InvoiceItem {
  desc: string;
  amount: number;
  roomId?: string;
}

export interface InvoiceData {
  guestName: string;
  phone: string;
  otaBookingNumber?: string;
  date: string;
  checkIn: string;
  checkOut: string;
  isGroupInvoice: boolean;
  items: InvoiceItem[];
  surcharge: number;
  total: number;
  paid: number;
  balance: number;
}

export interface ConfirmationData extends InvoiceData {
  bankInfo?: string;
}

export interface RoomDefinition {
  id: string;
  name: string;
  price: number;
  isVirtual?: boolean;
}

export interface BookingComIcalRoomConfig {
  roomId: string;
  roomName?: string;
  importUrl?: string;
  exportUrl?: string;
  importEnabled?: boolean;
  exportEnabled?: boolean;
  lastImportedAt?: number;
  lastExportedAt?: number;
  lastImportHash?: string;
  lastImportError?: string;
  lastImportAttemptAt?: number;
}

export interface BookingComIcalConfig {
  provider: 'Booking.com';
  rooms: Record<string, BookingComIcalRoomConfig>;
  updatedAt?: number;
}

export interface ExternalSyncConfig {
  bookingComIcal?: BookingComIcalConfig;
}

export interface PropertyInfo {
  name: string;
  address: string;
  phone: string;
  logoUrl?: string;
  qrUrl?: string;
  bankCode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankOwner?: string;
  invoiceHeader?: string;
  invoiceFooter?: string;
  externalSync?: ExternalSyncConfig;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

export interface BookingWarning {
  type: 'info' | 'error';
  msg: string;
}

export interface AuditLog {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: number;
  bookingId?: string;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
  }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
