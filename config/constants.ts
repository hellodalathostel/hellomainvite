
import { PropertyInfo, RoomDefinition, ServiceDefinition, User, Discount, Booking } from '../types/types';

export interface VietQrBankOption {
  code: string;
  label: string;
  shortName: string;
  aliases: string[];
}

export const VIETQR_BANKS: VietQrBankOption[] = [
  { code: '970436', label: 'Vietcombank (VCB)', shortName: 'VCB', aliases: ['vietcombank', 'vcb'] },
  { code: '970422', label: 'MB Bank (MBBank)', shortName: 'MBBank', aliases: ['mb bank', 'mbbank', 'mb'] },
  { code: '970407', label: 'Techcombank (TCB)', shortName: 'TCB', aliases: ['techcombank', 'tcb'] },
  { code: '970418', label: 'BIDV', shortName: 'BIDV', aliases: ['bidv', 'ngan hang dau tu va phat trien'] },
  { code: '970415', label: 'VietinBank', shortName: 'VietinBank', aliases: ['vietinbank', 'ctg'] },
  { code: '970405', label: 'Agribank', shortName: 'Agribank', aliases: ['agribank', 'vbard'] },
  { code: '970432', label: 'VPBank', shortName: 'VPBank', aliases: ['vpbank', 'vpb'] },
  { code: '970416', label: 'ACB', shortName: 'ACB', aliases: ['acb', 'asia commercial bank'] },
  { code: '970423', label: 'TPBank', shortName: 'TPBank', aliases: ['tpbank', 'tien phong bank'] },
  { code: '970403', label: 'Sacombank', shortName: 'Sacombank', aliases: ['sacombank', 'stb'] },
];

const normalizeBankValue = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const findVietQrBank = (bankCode?: string, bankName?: string) => {
  if (bankCode) {
    const byCode = VIETQR_BANKS.find((bank) => bank.code === bankCode);
    if (byCode) return byCode;
  }

  const normalizedName = normalizeBankValue(bankName);
  if (!normalizedName) return undefined;

  return VIETQR_BANKS.find((bank) =>
    normalizeBankValue(bank.label) === normalizedName ||
    normalizeBankValue(bank.shortName) === normalizedName ||
    bank.aliases.some((alias) => normalizeBankValue(alias) === normalizedName)
  );
};

export const PROPERTY_INFO: PropertyInfo = {
  name: "Hello Dalat Hostel",
  address: "33/18/2 Phan Đình Phùng, Phường 1, Đà Lạt",
  phone: "0969 975 935",
  bankCode: '970436',
  bankName: 'Vietcombank (VCB)',
  bankAccountNumber: '1014095502',
  bankOwner: 'Nguyen Thanh Hieu',
  invoiceHeader: "Cảm ơn quý khách đã lựa chọn dịch vụ của chúng tôi.",
  invoiceFooter: "Hẹn gặp lại quý khách!"
};

export const DEFAULT_ZALO_TEMPLATE = `🏨 *XÁC NHẬN ĐẶT PHÒNG - HELLO DALAT HOSTEL*
👤 Khách hàng: {guestName}
📱 SĐT: {phone}
📅 Check-in: {checkIn}
📅 Check-out: {checkOut}
------------------------------
💰 Tổng cộng: {total}
✅ Đã cọc: {deposit}
👉 Còn lại: {balance}
------------------------------
📍 Địa chỉ: 33/18/2 Phan Đình Phùng, Đà Lạt
🗺 Map: https://maps.app.goo.gl/example
❤️ Cảm ơn bạn đã lựa chọn Hello Dalat!`;

export const DEFAULT_ROOM_DATA: RoomDefinition[] = [
  { id: '101', name: '101 - Family', price: 450000 },
  { id: '201', name: '201 - Deluxe Queen', price: 400000 },
  { id: '102', name: '102 - Single', price: 180000 },
  { id: '202', name: '202 - Single', price: 180000 },
  { id: '301', name: '301 - Std Double', price: 250000 },
  { id: '302', name: '302 - Std Double', price: 250000 },
  { id: '103', name: '103 - Dlx Double', price: 300000 },
  { id: '203', name: '203 - Dlx Double', price: 300000 },
];

export const DEFAULT_SERVICES: ServiceDefinition[] = [
  { id: 's1', name: 'Thuê xe máy (Số)', price: 120000 },
  { id: 's2', name: 'Thuê xe máy (Ga)', price: 150000 },
  { id: 's3', name: 'Giặt sấy (kg)', price: 20000 },
  { id: 's4', name: 'Nước suối', price: 10000 },
  { id: 's5', name: 'Bò húc / Nước ngọt', price: 15000 },
  { id: 's6', name: 'Check-in sớm', price: 50000 },
];

export const PRESET_DISCOUNTS: Discount[] = [
  { description: 'Khách quen', amount: 20000 },
  { description: 'Voucher 50k', amount: 50000 },
  { description: 'Voucher 100k', amount: 100000 },
];

export const MOCK_USERS: User[] = [
  { email: 'admin@hellodalat.com', role: 'owner', name: 'Chủ Hostel' },
  { email: 'staff@hellodalat.com', role: 'staff', name: 'Nhân viên 1' }
];

export const SOURCES = ['Vãng lai (Walk-in)', 'Gọi điện/Zalo', 'Booking.com', 'Agoda', 'Facebook', 'Khách quen'];

export const MOCK_BOOKINGS: Booking[] = [];
