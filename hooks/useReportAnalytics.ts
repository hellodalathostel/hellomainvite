import { useMemo } from 'react';
import type { Booking } from '../types/types';
import { addDays, getDaysDiff } from '../utils/utils.ts';
import { getBookingDiscountTotal, getBookingServiceTotal, getEffectiveBookingSurcharge, normalizeMoneyAmount } from '../utils/calculations.ts';

export interface DailyRevenueData {
  date: string;
  revenue: number;
  grossRevenue: number;
  discountTotal: number;
  roomRevenue: number;
  serviceRevenue: number;
  surchargeRevenue: number;
  bookingCount: number;
}

export interface RoomRevenueData {
  roomId: string;
  revenue: number;
  nights: number;
  bookingCount: number;
  occupancyRate: number;
}

export interface SourceRevenueData {
  source: string;
  revenue: number;
  grossRevenue: number;
  discountTotal: number;
  bookingCount: number;
  percentage: number;
  grossPercentage: number;
}

export interface CustomerRevenueData {
  customerName: string;
  phone: string;
  revenue: number;
  grossRevenue: number;
  discountTotal: number;
  bookingCount: number;
  totalNights: number;
  lastCheckOut: string;
}

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
  grossRevenue: number;
  discountTotal: number;
  roomRevenue: number;
  serviceRevenue: number;
  surchargeRevenue: number;
  bookingCount: number;
}

export interface RoomRevenuePeriodData {
  period: string;
  roomRevenue: number;
  bookingCount: number;
}

export interface BookingRevenueBreakdown {
  bookingId: string;
  date: string;
  month: string;
  quarter: string;
  year: string;
  roomId: string;
  customerName: string;
  phone: string;
  source: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomRevenue: number;
  serviceRevenue: number;
  surchargeRevenue: number;
  discountTotal: number;
  grossRevenue: number;
  revenue: number;
}

export interface DailyAccountingExportRow {
  date: string;
  bookingCount: number;
  roomRevenue: number;
  serviceRevenue: number;
  surchargeRevenue: number;
  discountTotal: number;
  grossRevenue: number;
  revenue: number;
}

export interface ReportAnalyticsResult {
  dailyRevenue: DailyRevenueData[];
  roomRevenue: RoomRevenueData[];
  sourceRevenue: SourceRevenueData[];
  customerRevenue: CustomerRevenueData[];
  monthlyRevenue: MonthlyRevenueData[];
  roomRevenueByMonth: RoomRevenuePeriodData[];
  roomRevenueByQuarter: RoomRevenuePeriodData[];
  roomRevenueByYear: RoomRevenuePeriodData[];
}

export const getReportSourceLabel = (source: string | undefined) => {
  const normalized = (source || '').trim();
  return normalized || 'Chua xac dinh';
};

export const getBookingRevenueBreakdown = (booking: Booking): BookingRevenueBreakdown => {
  const nights = getDaysDiff(booking.checkIn, booking.checkOut);
  const roomRevenue = normalizeMoneyAmount(booking.price) * nights;
  const serviceRevenue = getBookingServiceTotal(booking);
  const surchargeRevenue = getEffectiveBookingSurcharge(booking);
  const discountTotal = getBookingDiscountTotal(booking);
  const grossRevenue = roomRevenue + serviceRevenue + surchargeRevenue;
  const revenue = Math.max(0, grossRevenue - discountTotal);

  const [yearStr, monthStr] = booking.checkOut.split('-');
  const year = Number(yearStr) || 0;
  const month = Number(monthStr) || 1;
  const quarter = Math.floor((month - 1) / 3) + 1;

  return {
    bookingId: booking.id,
    date: booking.checkOut,
    month: booking.checkOut.slice(0, 7),
    quarter: `${year}-Q${quarter}`,
    year: booking.checkOut.slice(0, 4),
    roomId: booking.roomId,
    customerName: booking.guestName,
    phone: booking.phone,
    source: getReportSourceLabel(booking.source),
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    nights,
    roomRevenue,
    serviceRevenue,
    surchargeRevenue,
    discountTotal,
    grossRevenue,
    revenue,
  };
};

export const buildDailyAccountingExportRows = (dailyRevenue: DailyRevenueData[]): DailyAccountingExportRow[] => {
  return (dailyRevenue || []).map(item => ({
    date: item.date,
    bookingCount: item.bookingCount,
    roomRevenue: Math.round(item.roomRevenue),
    serviceRevenue: Math.round(item.serviceRevenue),
    surchargeRevenue: Math.round(item.surchargeRevenue),
    discountTotal: Math.round(item.discountTotal),
    grossRevenue: Math.round(item.grossRevenue),
    revenue: Math.round(item.revenue),
  }));
};

export const buildReportAnalytics = (bookings: Booking[], startDate?: string, endDate?: string): ReportAnalyticsResult => {
  const checkedOutBookings = (bookings || []).filter(b => {
    if (b.status !== 'checked-out') return false;
    if (startDate && b.checkOut < startDate) return false;
    if (endDate && b.checkOut > endDate) return false;
    return true;
  });
  const breakdowns = checkedOutBookings.map(getBookingRevenueBreakdown);

  const dailyRevenueMap: Record<string, DailyRevenueData> = {};
  const roomRevenueMap: Record<string, RoomRevenueData> = {};
  const sourceRevenueMap: Record<string, SourceRevenueData> = {};
  const customerRevenueMap: Record<string, CustomerRevenueData> = {};
  const monthlyRevenueMap: Record<string, MonthlyRevenueData> = {};
  const roomRevenueByMonthMap: Record<string, RoomRevenuePeriodData> = {};
  const roomRevenueByQuarterMap: Record<string, RoomRevenuePeriodData> = {};
  const roomRevenueByYearMap: Record<string, RoomRevenuePeriodData> = {};

  let totalNetRevenue = 0;
  let totalGrossRevenue = 0;

  breakdowns.forEach(b => {
    if (!dailyRevenueMap[b.date]) {
      dailyRevenueMap[b.date] = {
        date: b.date,
        revenue: 0,
        grossRevenue: 0,
        discountTotal: 0,
        roomRevenue: 0,
        serviceRevenue: 0,
        surchargeRevenue: 0,
        bookingCount: 0,
      };
    }
    dailyRevenueMap[b.date].revenue += b.revenue;
    dailyRevenueMap[b.date].grossRevenue += b.grossRevenue;
    dailyRevenueMap[b.date].discountTotal += b.discountTotal;
    dailyRevenueMap[b.date].roomRevenue += b.roomRevenue;
    dailyRevenueMap[b.date].serviceRevenue += b.serviceRevenue;
    dailyRevenueMap[b.date].surchargeRevenue += b.surchargeRevenue;
    dailyRevenueMap[b.date].bookingCount += 1;

    if (!roomRevenueMap[b.roomId]) {
      roomRevenueMap[b.roomId] = {
        roomId: b.roomId,
        revenue: 0,
        nights: 0,
        bookingCount: 0,
        occupancyRate: 0,
      };
    }
    roomRevenueMap[b.roomId].revenue += b.revenue;
    roomRevenueMap[b.roomId].nights += b.nights;
    roomRevenueMap[b.roomId].bookingCount += 1;

    if (!sourceRevenueMap[b.source]) {
      sourceRevenueMap[b.source] = {
        source: b.source,
        revenue: 0,
        grossRevenue: 0,
        discountTotal: 0,
        bookingCount: 0,
        percentage: 0,
        grossPercentage: 0,
      };
    }
    sourceRevenueMap[b.source].revenue += b.revenue;
    sourceRevenueMap[b.source].grossRevenue += b.grossRevenue;
    sourceRevenueMap[b.source].discountTotal += b.discountTotal;
    sourceRevenueMap[b.source].bookingCount += 1;

    totalNetRevenue += b.revenue;
    totalGrossRevenue += b.grossRevenue;

    const customerKey = `${b.customerName}||${b.phone}`;
    if (!customerRevenueMap[customerKey]) {
      customerRevenueMap[customerKey] = {
        customerName: b.customerName,
        phone: b.phone,
        revenue: 0,
        grossRevenue: 0,
        discountTotal: 0,
        bookingCount: 0,
        totalNights: 0,
        lastCheckOut: b.checkOut,
      };
    }
    customerRevenueMap[customerKey].revenue += b.revenue;
    customerRevenueMap[customerKey].grossRevenue += b.grossRevenue;
    customerRevenueMap[customerKey].discountTotal += b.discountTotal;
    customerRevenueMap[customerKey].bookingCount += 1;
    customerRevenueMap[customerKey].totalNights += b.nights;
    customerRevenueMap[customerKey].lastCheckOut = b.checkOut > customerRevenueMap[customerKey].lastCheckOut ? b.checkOut : customerRevenueMap[customerKey].lastCheckOut;

    if (!monthlyRevenueMap[b.month]) {
      monthlyRevenueMap[b.month] = {
        month: b.month,
        revenue: 0,
        grossRevenue: 0,
        discountTotal: 0,
        roomRevenue: 0,
        serviceRevenue: 0,
        surchargeRevenue: 0,
        bookingCount: 0,
      };
    }
    monthlyRevenueMap[b.month].revenue += b.revenue;
    monthlyRevenueMap[b.month].grossRevenue += b.grossRevenue;
    monthlyRevenueMap[b.month].discountTotal += b.discountTotal;
    monthlyRevenueMap[b.month].roomRevenue += b.roomRevenue;
    monthlyRevenueMap[b.month].serviceRevenue += b.serviceRevenue;
    monthlyRevenueMap[b.month].surchargeRevenue += b.surchargeRevenue;
    monthlyRevenueMap[b.month].bookingCount += 1;

    if (!roomRevenueByMonthMap[b.month]) {
      roomRevenueByMonthMap[b.month] = { period: b.month, roomRevenue: 0, bookingCount: 0 };
    }
    roomRevenueByMonthMap[b.month].roomRevenue += b.roomRevenue;
    roomRevenueByMonthMap[b.month].bookingCount += 1;

    if (!roomRevenueByQuarterMap[b.quarter]) {
      roomRevenueByQuarterMap[b.quarter] = { period: b.quarter, roomRevenue: 0, bookingCount: 0 };
    }
    roomRevenueByQuarterMap[b.quarter].roomRevenue += b.roomRevenue;
    roomRevenueByQuarterMap[b.quarter].bookingCount += 1;

    if (!roomRevenueByYearMap[b.year]) {
      roomRevenueByYearMap[b.year] = { period: b.year, roomRevenue: 0, bookingCount: 0 };
    }
    roomRevenueByYearMap[b.year].roomRevenue += b.roomRevenue;
    roomRevenueByYearMap[b.year].bookingCount += 1;
  });

  const sourceRevenue = Object.values(sourceRevenueMap)
    .map(item => ({
      ...item,
      percentage: totalNetRevenue > 0 ? (item.revenue / totalNetRevenue) * 100 : 0,
      grossPercentage: totalGrossRevenue > 0 ? (item.grossRevenue / totalGrossRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const daysInRange = startDate && endDate ? getDaysDiff(startDate, addDays(endDate, 1)) : 0;
  const roomRevenue = Object.values(roomRevenueMap)
    .map(item => ({
      ...item,
      occupancyRate: daysInRange > 0 ? (item.nights / daysInRange) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    dailyRevenue: Object.values(dailyRevenueMap).sort((a, b) => a.date.localeCompare(b.date)),
    roomRevenue,
    sourceRevenue,
    customerRevenue: Object.values(customerRevenueMap).sort((a, b) => b.revenue - a.revenue),
    monthlyRevenue: Object.values(monthlyRevenueMap).sort((a, b) => a.month.localeCompare(b.month)),
    roomRevenueByMonth: Object.values(roomRevenueByMonthMap).sort((a, b) => a.period.localeCompare(b.period)),
    roomRevenueByQuarter: Object.values(roomRevenueByQuarterMap).sort((a, b) => a.period.localeCompare(b.period)),
    roomRevenueByYear: Object.values(roomRevenueByYearMap).sort((a, b) => a.period.localeCompare(b.period)),
  };
};

export const useReportAnalytics = (bookings: Booking[], startDate?: string, endDate?: string) => {
  return useMemo(() => buildReportAnalytics(bookings, startDate, endDate), [bookings, startDate, endDate]);
};
