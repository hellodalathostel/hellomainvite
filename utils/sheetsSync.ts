// utils/sheetsSync.ts

export interface BookingForSheet {
  id: string;
  checkIn: string;
  checkOut: string;
  nights?: number;
  roomId: string;
  guestName?: string;
  source?: string;
  paymentMethod?: string;
  price: number;
  services?: { name: string; price: number; qty: number }[];
  serviceTotal?: number;
  servicesText?: string;
  discount?: number;
  surcharge?: number;
  grandTotal?: number;
  status: string;
  note?: string;
  updatedAt: number;
}

export interface ExpenseForSheet {
  id: string;
  date: string;
  type?: string;
  category?: string;
  description?: string;
  amount: number;
  createdAt: number;
}

// Thay bằng URL sau khi deploy Apps Script
const APPS_SCRIPT_URL = import.meta.env.VITE_SHEETS_WEBHOOK_URL || "";

function calcNights(checkIn: string, checkOut: string): number {
  try {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  } catch {
    return 1;
  }
}

function normalizeBooking(raw: Record<string, any>): BookingForSheet {
  const services = Array.isArray(raw.services) ? raw.services : [];
  const serviceTotal = services.reduce((sum: number, s: any) => sum + (s.price * s.qty), 0);
  const servicesText = services.map((s: any) => `${s.name} x${s.qty}`).join(", ");
  const nights = raw.nights || calcNights(raw.checkIn, raw.checkOut);

  return {
    id: raw.id || "",
    checkIn: raw.checkIn || "",
    checkOut: raw.checkOut || "",
    nights,
    roomId: raw.roomId || "",
    guestName: raw.guestName || raw.guests?.[0]?.name || "",
    source: raw.source || "",
    paymentMethod: raw.paymentMethod || "",
    price: raw.price || 0,
    services,
    serviceTotal,
    servicesText,
    discount: raw.discount || 0,
    surcharge: raw.surcharge || 0,
    status: raw.status || "",
    note: raw.note || "",
    updatedAt: raw.updatedAt || Date.now(),
  };
}

async function postToSheets(payload: object): Promise<void> {
  if (!APPS_SCRIPT_URL) {
    console.warn("[SheetsSync] VITE_SHEETS_WEBHOOK_URL chưa được cấu hình");
    return;
  }
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // Apps Script yêu cầu no-cors
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[SheetsSync] ✓ Đã gửi dữ liệu lên Google Sheets");
  } catch (err) {
    console.error("[SheetsSync] ✗ Lỗi khi gửi:", err);
  }
}

/**
 * Sync toàn bộ bookings lên Google Sheets
 * Gọi khi: app khởi động, sau khi checkout, hoặc nút "Sync thủ công"
 */
export async function syncBookingsToSheets(
  rawBookings: Record<string, any>
): Promise<void> {
  const bookings = Object.values(rawBookings)
    .filter((b: any) => !b.isDeleted) // bỏ booking đã xóa
    .map(normalizeBooking);

  await postToSheets({ type: "sync_bookings", bookings });
  // Sau khi sync bookings, cập nhật bảng tổng hợp tháng
  await postToSheets({ type: "update_monthly" });
}

/**
 * Sync toàn bộ chi phí lên Google Sheets
 */
export async function syncExpensesToSheets(
  rawExpenses: Record<string, any>
): Promise<void> {
  const expenses = Object.values(rawExpenses).filter((e: any) => !e.isDeleted);
  await postToSheets({ type: "sync_expenses", expenses });
}

/**
 * Sync tất cả dữ liệu (bookings + expenses) — dùng cho nút "Sync thủ công"
 */
export async function syncAllToSheets(
  rawBookings: Record<string, any>,
  rawExpenses: Record<string, any>
): Promise<void> {
  await syncBookingsToSheets(rawBookings);
  await syncExpensesToSheets(rawExpenses);
}