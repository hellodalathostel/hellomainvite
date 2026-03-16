
import React, { useState, useMemo } from 'react';
import { Download, Copy, TrendingUp, Wallet, PieChart, ChevronDown, ChevronUp, CreditCard, Layers, BedDouble, ArrowDownCircle } from 'lucide-react';
import { addDays, formatCompactCurrency, formatCurrency, getDaysDiff } from '../utils/utils';
import { getBookingDiscountTotal, getBookingServiceTotal, getEffectiveBookingSurcharge, normalizeMoneyAmount } from '../utils/calculations';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { buildDailyAccountingExportRows, useReportAnalytics } from '../hooks/useReportAnalytics';
import { BarChart, PieChart as PieChartComponent, LineChart } from './charts/Charts';

const ReportView = () => {
  const { bookings, expenses, rooms, roomStates } = useData();
  const { addToast } = useUI();
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showDetails, setShowDetails] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'daily' | 'room' | 'source' | 'customer'>('summary');
  const [reportRange, setReportRange] = useState<'today' | '7days' | 'month'>('month');
  const [revenueMode, setRevenueMode] = useState<'net' | 'gross'>('net');

  const today = new Date().toISOString().split('T')[0];

  const dateRange = useMemo(() => {
    if (reportRange === 'today') {
      return { start: today, end: today };
    }

    if (reportRange === '7days') {
      return { start: today, end: addDays(today, 6) };
    }

    const [year, month] = reportMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return {
      start: `${reportMonth}-01`,
      end: `${reportMonth}-${String(daysInMonth).padStart(2, '0')}`,
    };
  }, [reportRange, reportMonth, today]);

  const inRange = (date: string) => date >= dateRange.start && date <= dateRange.end;

  const rangeLabel = useMemo(() => {
    if (reportRange === 'today') return 'Hôm nay';
    if (reportRange === '7days') return `${dateRange.start} đến ${dateRange.end}`;
    return reportMonth;
  }, [reportRange, dateRange, reportMonth]);

  const reportBookings = useMemo(() => {
    return bookings.filter(b => b.status === 'checked-out' && inRange(b.checkOut));
  }, [bookings, dateRange]);

  const {
    dailyRevenue,
    roomRevenue,
    sourceRevenue,
    customerRevenue,
    monthlyRevenue,
    roomRevenueByMonth,
    roomRevenueByQuarter,
    roomRevenueByYear,
  } = useReportAnalytics(reportBookings, dateRange.start, dateRange.end);

  const stats = useMemo(() => {
    if(!bookings || !expenses) return { 
        netRevenue: 0, grossRevenue: 0, roomRevenue: 0, serviceRevenue: 0, surchargeRevenue: 0, discountRevenue: 0, otherIncome: 0,
        expense: 0, bankFee: 0, operatingExpense: 0, 
        netProfit: 0, grossProfit: 0,
        occupancyRate: 0, totalNightsSold: 0, totalAvailableNights: 0
    };
    
    let roomRevenue = 0;
    let serviceRevenue = 0;
    let surchargeRevenue = 0;
    let discountRevenue = 0;

    const relevantBookings = reportBookings;

    relevantBookings.forEach(b => {
        const nights = getDaysDiff(b.checkIn, b.checkOut);
      roomRevenue += (normalizeMoneyAmount(b.price) * nights);
        
      serviceRevenue += getBookingServiceTotal(b);
        
      surchargeRevenue += getEffectiveBookingSurcharge(b);

      discountRevenue += getBookingDiscountTotal(b);
    });

    let bankFee = 0;
    let operatingExpense = 0;
    let otherIncome = 0;

    const relevantTransactions = expenses.filter(e => inRange(e.date));

    relevantTransactions.forEach(e => {
        if (e.type === 'income') {
            otherIncome += Number(e.amount);
        } else {
            if (e.category === 'Phí ngân hàng') {
                bankFee += Number(e.amount);
            } else {
                operatingExpense += Number(e.amount);
            }
        }
    });

    const totalRevenueGross = roomRevenue + serviceRevenue + surchargeRevenue + otherIncome;
    const totalRevenueNet = Math.max(0, totalRevenueGross - discountRevenue);
    const totalExpense = bankFee + operatingExpense;

    const rangeStart = dateRange.start;
    const rangeEndInclusive = dateRange.end;
    const rangeEndExclusive = addDays(rangeEndInclusive, 1);
    const totalDaysInRange = getDaysDiff(rangeStart, rangeEndExclusive);
    const totalAvailableNights = rooms.length * totalDaysInRange;
    
    let totalNightsSold = 0;

    const activeBookings = bookings.filter(b => 
        b.status !== 'cancelled' && 
      b.checkIn < rangeEndExclusive && 
      b.checkOut > rangeStart
    );

    activeBookings.forEach(b => {
      const start = b.checkIn < rangeStart ? rangeStart : b.checkIn;
        const dStart = new Date(start);
      const dEnd = new Date(b.checkOut > rangeEndExclusive ? rangeEndExclusive : b.checkOut);
        
        const diff = dEnd.getTime() - dStart.getTime();
        const nights = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        totalNightsSold += nights;
    });

    const occupancyRate = totalAvailableNights > 0 ? (totalNightsSold / totalAvailableNights) * 100 : 0;

    return {
      netRevenue: totalRevenueNet,
      grossRevenue: totalRevenueGross,
      roomRevenue,
      serviceRevenue,
      surchargeRevenue,
      discountRevenue,
      otherIncome,
      expense: totalExpense,
      bankFee,
      operatingExpense,
      netProfit: totalRevenueNet - totalExpense,
      grossProfit: totalRevenueGross - totalExpense,
      occupancyRate,
      totalNightsSold,
      totalAvailableNights
    };
  }, [bookings, expenses, rooms, reportBookings, dateRange]);

  const dailyOps = useMemo(() => {
    const todaysCheckIn = bookings.filter(b => b.status !== 'cancelled' && inRange(b.checkIn)).length;
    const todaysCheckOut = bookings.filter(b => b.status !== 'cancelled' && inRange(b.checkOut)).length;

    const activeRoomIds = new Set(
      bookings
        .filter(b => b.status !== 'cancelled' && b.checkIn <= dateRange.start && b.checkOut > dateRange.start)
        .map(b => b.roomId)
    );

    const dirtyRooms = rooms.filter(r => roomStates[r.id] === 'dirty').length;
    const emptyRooms = Math.max(0, rooms.length - activeRoomIds.size);

    const dueCollection = bookings
      .filter(b => b.status !== 'cancelled' && inRange(b.checkOut))
      .reduce((sum, b) => {
        const roomTotal = normalizeMoneyAmount(b.price) * getDaysDiff(b.checkIn, b.checkOut);
        const serviceTotal = getBookingServiceTotal(b);
        const discountTotal = getBookingDiscountTotal(b);
        const grandTotal = roomTotal + serviceTotal + getEffectiveBookingSurcharge(b) - discountTotal;
        const debt = Math.max(0, grandTotal - normalizeMoneyAmount(b.paid));
        return sum + debt;
      }, 0);

    return {
      todaysCheckIn,
      todaysCheckOut,
      emptyRooms,
      dirtyRooms,
      dueCollection,
    };
  }, [bookings, rooms, roomStates, dateRange]);

  const handleExport = () => {
      window.print();
  }

  const displayedRevenue = revenueMode === 'net' ? stats.netRevenue : stats.grossRevenue;
  const displayedProfit = revenueMode === 'net' ? stats.netProfit : stats.grossProfit;
  const dailyAccountingRows = useMemo(() => buildDailyAccountingExportRows(dailyRevenue), [dailyRevenue]);

  const handleExportRoomRevenueCsv = () => {
    const rows: string[] = ['Loại kỳ,Kỳ,Tiền phòng,Số booking'];

    roomRevenueByMonth.forEach(item => {
      rows.push(`Tháng,${item.period},${Math.round(item.roomRevenue)},${item.bookingCount}`);
    });

    roomRevenueByQuarter.forEach(item => {
      rows.push(`Quý,${item.period},${Math.round(item.roomRevenue)},${item.bookingCount}`);
    });

    roomRevenueByYear.forEach(item => {
      rows.push(`Năm,${item.period},${Math.round(item.roomRevenue)},${item.bookingCount}`);
    });

    const csvContent = `\uFEFF${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-tien-phong-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDailyAccountingCsv = () => {
    const rows: string[] = ['Ngay,So booking,Tien phong,Tien dich vu,Phu thu,Giam tru,Doanh thu gross,Doanh thu net'];

    dailyAccountingRows.forEach(item => {
      rows.push([
        item.date,
        item.bookingCount,
        item.roomRevenue,
        item.serviceRevenue,
        item.surchargeRevenue,
        item.discountTotal,
        item.grossRevenue,
        item.revenue,
      ].join(','));
    });

    const csvContent = `\uFEFF${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `so-ke-toan-theo-ngay-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Da xuat CSV so ke toan theo ngay', 'success');
  };

  const handleCopyDailyAccounting = async () => {
    try {
      const lines = [
        ['Ngay', 'So booking', 'Tien phong', 'Tien dich vu', 'Phu thu', 'Giam tru', 'Doanh thu gross', 'Doanh thu net'].join('\t'),
        ...dailyAccountingRows.map(item => [
          item.date,
          item.bookingCount,
          item.roomRevenue,
          item.serviceRevenue,
          item.surchargeRevenue,
          item.discountTotal,
          item.grossRevenue,
          item.revenue,
        ].join('\t')),
      ];

      await navigator.clipboard.writeText(lines.join('\n'));
      addToast('Da copy bang so ke toan theo ngay', 'success');
    } catch (error) {
      console.error('Copy daily accounting failed', error);
      addToast('Khong the copy du lieu so ke toan', 'error');
    }
  };

  return (
    <div className="p-4 pb-24 bg-gray-50 dark:bg-slate-950 min-h-full space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white">Báo cáo tài chính</h2>
        <div className="flex gap-2">
           <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setReportRange('today')}
                className={`px-2 py-1 text-xs font-bold ${reportRange === 'today' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setReportRange('7days')}
                className={`px-2 py-1 text-xs font-bold ${reportRange === '7days' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
              >
                7 ngày
              </button>
              <button
                onClick={() => setReportRange('month')}
                className={`px-2 py-1 text-xs font-bold ${reportRange === 'month' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
              >
                Tháng
              </button>
           </div>
           {reportRange === 'month' && (
             <input 
               type="month" 
               value={reportMonth} 
               onChange={e => setReportMonth(e.target.value)} 
               className="border p-1 rounded dark:bg-gray-700 text-gray-900 dark:text-white dark:border-gray-600 outline-none focus:border-blue-500 font-bold"
             />
           )}
            <button onClick={handleExport} className="bg-blue-700 text-white p-2 rounded hover:bg-blue-800 transition-colors shadow-sm">
              <Download size={20}/>
           </button>
        </div>
      </div>

      <div className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
        Kỳ báo cáo: {rangeLabel}
      </div>

      <div className="flex justify-end">
        <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setRevenueMode('net')}
            className={`px-3 py-1.5 text-xs font-bold ${revenueMode === 'net' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
          >
            Net
          </button>
          <button
            onClick={() => setRevenueMode('gross')}
            className={`px-3 py-1.5 text-xs font-bold ${revenueMode === 'gross' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'}`}
          >
            Gross
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border-l-4 border-green-500 shadow-sm">
           <div className="flex justify-between items-start">
             <div>
                <p className="text-gray-600 dark:text-gray-300 text-xs font-black uppercase">Doanh thu</p>
                <h3 className="text-2xl font-black text-green-700 dark:text-green-400 mt-1">{formatCompactCurrency(displayedRevenue)}</h3>
             </div>
             <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-700"><TrendingUp size={20}/></div>
           </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border-l-4 border-red-500 shadow-sm">
           <div className="flex justify-between items-start">
             <div>
                <p className="text-gray-600 dark:text-gray-300 text-xs font-black uppercase">Chi phí</p>
                <h3 className="text-2xl font-black text-red-700 dark:text-red-400 mt-1">{formatCompactCurrency(stats.expense)}</h3>
             </div>
             <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-700"><Wallet size={20}/></div>
           </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border-l-4 border-blue-500 shadow-sm">
           <div className="flex justify-between items-start">
             <div>
                <p className="text-gray-600 dark:text-gray-300 text-xs font-black uppercase">Lợi nhuận</p>
                <h3 className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">{formatCompactCurrency(displayedProfit)}</h3>
             </div>
             <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700"><PieChart size={20}/></div>
           </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border-l-4 border-purple-500 shadow-sm">
           <div className="flex justify-between items-start">
             <div>
                <p className="text-gray-600 dark:text-gray-300 text-xs font-black uppercase">Công suất sử dụng</p>
                <h3 className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">{stats.occupancyRate.toFixed(1)}%</h3>
                <p className="text-[10px] text-gray-500 font-bold">{stats.totalNightsSold}/{stats.totalAvailableNights} đêm hoạt động</p>
             </div>
             <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-700"><BedDouble size={20}/></div>
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Vận hành hôm nay</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-100 dark:border-blue-800">
            <p className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300">Check-in</p>
            <p className="text-xl font-black text-blue-800 dark:text-blue-200">{dailyOps.todaysCheckIn}</p>
          </div>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-100 dark:border-red-800">
            <p className="text-[10px] font-black uppercase text-red-700 dark:text-red-300">Check-out</p>
            <p className="text-xl font-black text-red-800 dark:text-red-200">{dailyOps.todaysCheckOut}</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-100 dark:border-blue-800">
            <p className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300">Phòng trống</p>
            <p className="text-xl font-black text-blue-800 dark:text-blue-200">{dailyOps.emptyRooms}</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-100 dark:border-amber-800">
            <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-300">Chưa dọn</p>
            <p className="text-xl font-black text-amber-800 dark:text-amber-200">{dailyOps.dirtyRooms}</p>
          </div>
          <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3 border border-purple-100 dark:border-purple-800 col-span-2 lg:col-span-1">
            <p className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-300">Cần thu thêm</p>
            <p className="text-base font-black text-purple-800 dark:text-purple-200">{formatCompactCurrency(dailyOps.dueCollection)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <div 
            onClick={() => setShowDetails(!showDetails)}
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-blue-700 dark:text-blue-400"/> Chi tiết Thu / Chi
            </h3>
            {showDetails ? <ChevronUp size={20} className="text-gray-500"/> : <ChevronDown size={20} className="text-gray-500"/>}
        </div>
        
        {showDetails && (
            <div className="p-4 border-t dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-3">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Nguồn thu</h4>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Tiền phòng</span>
                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(stats.roomRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Dịch vụ</span>
                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(stats.serviceRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-orange-700 dark:text-orange-400">
                        <span className="flex items-center gap-1 font-bold"><CreditCard size={14}/> Phí dịch vụ (Thu khách)</span>
                        <span className="font-bold">{formatCurrency(stats.surchargeRevenue)}</span>
                    </div>
                    {stats.discountRevenue > 0 && (
                      <div className="flex justify-between items-center text-sm text-amber-700 dark:text-amber-400">
                        <span className="font-bold">Giảm trừ</span>
                        <span className="font-bold">- {formatCurrency(stats.discountRevenue)}</span>
                      </div>
                    )}
                    {stats.otherIncome > 0 && (
                        <div className="flex justify-between items-center text-sm text-green-700 dark:text-green-400">
                            <span className="flex items-center gap-1 font-bold"><ArrowDownCircle size={14}/> Thu nhập khác</span>
                            <span className="font-bold">{formatCurrency(stats.otherIncome)}</span>
                        </div>
                    )}
                    <div className="border-t dark:border-gray-700 pt-2 flex justify-between items-center font-black text-green-700 dark:text-green-400">
                      <span>Tổng thu ({revenueMode.toUpperCase()})</span>
                      <span>{formatCurrency(displayedRevenue)}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Khoản chi</h4>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Chi vận hành</span>
                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(stats.operatingExpense)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-red-700 dark:text-red-400">
                        <span className="flex items-center gap-1 font-bold"><CreditCard size={14}/> Phí ngân hàng (Cắt lại)</span>
                        <span className="font-bold">{formatCurrency(stats.bankFee)}</span>
                    </div>
                    <div className="border-t dark:border-gray-700 pt-2 flex justify-between items-center font-black text-red-700 dark:text-red-400">
                        <span>Tổng chi</span>
                        <span>{formatCurrency(stats.expense)}</span>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Charts Section */}
      <div className="space-y-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'summary'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Tóm tắt
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Theo ngày
          </button>
          <button
            onClick={() => setActiveTab('room')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'room'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Theo phòng
          </button>
          <button
            onClick={() => setActiveTab('source')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'source'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Theo nguồn
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'customer'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Theo khách
          </button>
        </div>

        {activeTab === 'summary' && (
          <div className="space-y-6">
            <LineChart
              data={monthlyRevenue.map(m => ({ date: m.month, value: revenueMode === 'net' ? m.revenue : m.grossRevenue }))}
              title={`Doanh thu theo tháng (${revenueMode.toUpperCase()})`}
              height={300}
            />
          </div>
        )}

        {activeTab === 'daily' && (
          <div className="space-y-6">
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCopyDailyAccounting}
                className="px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm font-bold flex items-center gap-2"
              >
                <Copy size={16} /> Copy bang ngay
              </button>
              <button
                onClick={handleExportDailyAccountingCsv}
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2"
              >
                <Download size={16} /> Xuat CSV so ke toan
              </button>
            </div>
            <LineChart
              data={dailyRevenue.map(d => ({ date: d.date, value: revenueMode === 'net' ? d.revenue : d.grossRevenue }))}
              title={`Doanh thu theo ngày (${revenueMode.toUpperCase()})`}
              height={300}
            />
          </div>
        )}

        {activeTab === 'room' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={handleExportRoomRevenueCsv}
                className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2"
              >
                <Download size={16} /> Xuất CSV tiền phòng
              </button>
            </div>

            <BarChart data={roomRevenue} title="Doanh thu theo phòng" />
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Phòng</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Doanh thu</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Lần đặt</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Tổng đêm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {roomRevenue.map(room => (
                    <tr key={room.roomId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{room.roomId}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white font-bold">{formatCurrency(room.revenue)}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">{room.bookingCount}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">{room.nights}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">Tiền phòng theo tháng</h4>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white">Kỳ</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900 dark:text-white">Tiền phòng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {roomRevenueByMonth.map((item) => (
                        <tr key={item.period} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{item.period}</td>
                          <td className="px-4 py-2 text-sm text-right font-bold text-gray-900 dark:text-white">{formatCurrency(item.roomRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">Tiền phòng theo quý</h4>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white">Kỳ</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900 dark:text-white">Tiền phòng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {roomRevenueByQuarter.map((item) => (
                        <tr key={item.period} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{item.period}</td>
                          <td className="px-4 py-2 text-sm text-right font-bold text-gray-900 dark:text-white">{formatCurrency(item.roomRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">Tiền phòng theo năm</h4>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white">Kỳ</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-900 dark:text-white">Tiền phòng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {roomRevenueByYear.map((item) => (
                        <tr key={item.period} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{item.period}</td>
                          <td className="px-4 py-2 text-sm text-right font-bold text-gray-900 dark:text-white">{formatCurrency(item.roomRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'source' && (
          <div className="space-y-6">
            <PieChartComponent
              data={sourceRevenue.map(s => ({ name: s.source, value: revenueMode === 'net' ? s.revenue : s.grossRevenue, percentage: revenueMode === 'net' ? s.percentage : s.grossPercentage }))}
              title={`Doanh thu theo nguồn (${revenueMode.toUpperCase()})`}
            />
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Nguồn</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Doanh thu</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Phần trăm</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Lần đặt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sourceRevenue.map((source, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{source.source}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white font-bold">{formatCurrency(revenueMode === 'net' ? source.revenue : source.grossRevenue)}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">{(revenueMode === 'net' ? source.percentage : source.grossPercentage).toFixed(1)}%</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">{source.bookingCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'customer' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Doanh thu theo khách hàng (Top 20)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Khách hàng</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">SĐT</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Doanh thu</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Lần đặt</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">Tổng đêm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {customerRevenue.slice(0, 20).map((customer, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{customer.customerName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{customer.phone}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900 dark:text-white font-bold">{formatCurrency(revenueMode === 'net' ? customer.revenue : customer.grossRevenue)}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">{customer.bookingCount}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">{customer.totalNights}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportView;
