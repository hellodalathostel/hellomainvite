import { useMemo } from 'react';
import type { Booking } from '../types/types';
import { getDaysDiff } from '../utils/utils';

export interface DailyRevenueData {
  date: string;
  revenue: number;
  roomRevenue: number;
  serviceRevenue: number;
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
  bookingCount: number;
  percentage: number;
}

export interface CustomerRevenueData {
  customerName: string;
  phone: string;
  revenue: number;
  bookingCount: number;
  totalNights: number;
  lastCheckOut: string;
}

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
  roomRevenue: number;
  serviceRevenue: number;
  bookingCount: number;
}

export interface RoomRevenuePeriodData {
  period: string;
  roomRevenue: number;
  bookingCount: number;
}

export const useReportAnalytics = (bookings: Booking[], startDate?: string, endDate?: string) => {
  
  // Daily revenue by date
  const dailyRevenue = useMemo(() => {
    const data: Record<string, DailyRevenueData> = {};
    
    (bookings || [])
      .filter(b => b.status === 'checked-out')
      .forEach(b => {
        // Use checkOut date as reference
        const date = b.checkOut;
        
        if (!data[date]) {
          data[date] = {
            date,
            revenue: 0,
            roomRevenue: 0,
            serviceRevenue: 0,
            bookingCount: 0,
          };
        }
        
        const nights = getDaysDiff(b.checkIn, b.checkOut);
        const roomRev = b.price * nights;
        const serviceRev = (b.services || []).reduce((sum, s) => sum + (s.price * s.qty), 0);
        const surge = b.surcharge || 0;
        
        data[date].roomRevenue += roomRev;
        data[date].serviceRevenue += serviceRev;
        data[date].revenue += roomRev + serviceRev + surge;
        data[date].bookingCount += 1;
      });
    
    return Object.values(data).sort((a, b) => a.date.localeCompare(b.date));
  }, [bookings]);

  // Revenue by room
  const roomRevenue = useMemo(() => {
    const data: Record<string, RoomRevenueData> = {};
    
    (bookings || [])
      .filter(b => b.status === 'checked-out')
      .forEach(b => {
        const roomId = b.roomId;
        
        if (!data[roomId]) {
          data[roomId] = {
            roomId,
            revenue: 0,
            nights: 0,
            bookingCount: 0,
            occupancyRate: 0,
          };
        }
        
        const nights = getDaysDiff(b.checkIn, b.checkOut);
        const roomRev = b.price * nights;
        const serviceRev = (b.services || []).reduce((sum, s) => sum + (s.price * s.qty), 0);
        
        data[roomId].revenue += roomRev + serviceRev;
        data[roomId].nights += nights;
        data[roomId].bookingCount += 1;
      });
    
    return Object.values(data).sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  // Revenue by source
  const sourceRevenue = useMemo(() => {
    const data: Record<string, SourceRevenueData> = {};
    let totalRevenue = 0;
    
    (bookings || [])
      .filter(b => b.status === 'checked-out')
      .forEach(b => {
        const source = b.source || 'Chưa xác định';
        
        if (!data[source]) {
          data[source] = {
            source,
            revenue: 0,
            bookingCount: 0,
            percentage: 0,
          };
        }
        
        const nights = getDaysDiff(b.checkIn, b.checkOut);
        const roomRev = b.price * nights;
        const serviceRev = (b.services || []).reduce((sum, s) => sum + (s.price * s.qty), 0);
        const surge = b.surcharge || 0;
        const rev = roomRev + serviceRev + surge;
        
        data[source].revenue += rev;
        data[source].bookingCount += 1;
        totalRevenue += rev;
      });
    
    // Calculate percentages
    Object.values(data).forEach(item => {
      item.percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
    });
    
    return Object.values(data).sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  // Revenue by customer
  const customerRevenue = useMemo(() => {
    const data: Record<string, CustomerRevenueData> = {};
    
    (bookings || [])
      .filter(b => b.status === 'checked-out')
      .forEach(b => {
        const key = `${b.guestName}||${b.phone}`;
        
        if (!data[key]) {
          data[key] = {
            customerName: b.guestName,
            phone: b.phone,
            revenue: 0,
            bookingCount: 0,
            totalNights: 0,
            lastCheckOut: b.checkOut,
          };
        }
        
        const nights = getDaysDiff(b.checkIn, b.checkOut);
        const roomRev = b.price * nights;
        const serviceRev = (b.services || []).reduce((sum, s) => sum + (s.price * s.qty), 0);
        const surge = b.surcharge || 0;
        
        data[key].revenue += roomRev + serviceRev + surge;
        data[key].bookingCount += 1;
        data[key].totalNights += nights;
        data[key].lastCheckOut = b.checkOut > data[key].lastCheckOut ? b.checkOut : data[key].lastCheckOut;
      });
    
    return Object.values(data).sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  // Revenue by month
  const monthlyRevenue = useMemo(() => {
    const data: Record<string, MonthlyRevenueData> = {};
    
    (bookings || [])
      .filter(b => b.status === 'checked-out')
      .forEach(b => {
        const month = b.checkOut.slice(0, 7); // YYYY-MM
        
        if (!data[month]) {
          data[month] = {
            month,
            revenue: 0,
            roomRevenue: 0,
            serviceRevenue: 0,
            bookingCount: 0,
          };
        }
        
        const nights = getDaysDiff(b.checkIn, b.checkOut);
        const roomRev = b.price * nights;
        const serviceRev = (b.services || []).reduce((sum, s) => sum + (s.price * s.qty), 0);
        const surge = b.surcharge || 0;
        
        data[month].roomRevenue += roomRev;
        data[month].serviceRevenue += serviceRev;
        data[month].revenue += roomRev + serviceRev + surge;
        data[month].bookingCount += 1;
      });
    
    return Object.values(data).sort((a, b) => a.month.localeCompare(b.month));
  }, [bookings]);

  const roomRevenueByMonth = useMemo(() => {
    const data: Record<string, RoomRevenuePeriodData> = {};

    (bookings || [])
      .filter(b => b.status === 'checked-out')
      .forEach(b => {
        const month = b.checkOut.slice(0, 7);
        if (!data[month]) {
          data[month] = {
            period: month,
            roomRevenue: 0,
            bookingCount: 0,
          };
        }

        const nights = getDaysDiff(b.checkIn, b.checkOut);
        const roomRev = b.price * nights;

        data[month].roomRevenue += roomRev;
        data[month].bookingCount += 1;
      });

    return Object.values(data).sort((a, b) => a.period.localeCompare(b.period));
  }, [bookings]);

  const roomRevenueByQuarter = useMemo(() => {
    const data: Record<string, RoomRevenuePeriodData> = {};

    (bookings || [])
      .filter(b => b.status === 'checked-out')
      .forEach(b => {
        const [year, month] = b.checkOut.split('-').map(Number);
        const quarter = Math.floor((month - 1) / 3) + 1;
        const period = `${year}-Q${quarter}`;

        if (!data[period]) {
          data[period] = {
            period,
            roomRevenue: 0,
            bookingCount: 0,
          };
        }

        const nights = getDaysDiff(b.checkIn, b.checkOut);
        const roomRev = b.price * nights;

        data[period].roomRevenue += roomRev;
        data[period].bookingCount += 1;
      });

    return Object.values(data).sort((a, b) => a.period.localeCompare(b.period));
  }, [bookings]);

  const roomRevenueByYear = useMemo(() => {
    const data: Record<string, RoomRevenuePeriodData> = {};

    (bookings || [])
      .filter(b => b.status === 'checked-out')
      .forEach(b => {
        const period = b.checkOut.slice(0, 4);
        if (!data[period]) {
          data[period] = {
            period,
            roomRevenue: 0,
            bookingCount: 0,
          };
        }

        const nights = getDaysDiff(b.checkIn, b.checkOut);
        const roomRev = b.price * nights;

        data[period].roomRevenue += roomRev;
        data[period].bookingCount += 1;
      });

    return Object.values(data).sort((a, b) => a.period.localeCompare(b.period));
  }, [bookings]);

  return {
    dailyRevenue,
    roomRevenue,
    sourceRevenue,
    customerRevenue,
    monthlyRevenue,
    roomRevenueByMonth,
    roomRevenueByQuarter,
    roomRevenueByYear,
  };
};
