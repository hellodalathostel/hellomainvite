
import React, { useState, useMemo } from 'react';
import { MessageSquare, Wand2, Check, Copy, RefreshCcw } from 'lucide-react';
import { Booking } from '../types/types';
import { formatDate, getDaysDiff, formatCurrency } from '../utils/utils';
import { useUI } from '../context/UIContext';
import { useData } from '../context/DataContext';

const GeneratedView = () => {
    const { bookings, propertyInfo } = useData();
    const { addToast } = useUI();
    const [selectedBookingId, setSelectedBookingId] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);

    // Filter upcoming bookings for dropdown (Sorted by Check-in)
    const upcomingBookings = useMemo(() => {
        const now = new Date();
        now.setDate(now.getDate() - 3); // Show bookings from 3 days ago to future
        const dateStr = now.toISOString().split('T')[0];
        
        return bookings
          .filter(b => b.checkIn >= dateStr && b.status !== 'cancelled')
          .sort((a,b) => a.checkIn.localeCompare(b.checkIn));
    }, [bookings]);

    // Filtered bookings based on search
    const filteredBookings = useMemo(() => {
        if (!searchQuery.trim()) return upcomingBookings;
        const lowerQuery = searchQuery.toLowerCase();
        return upcomingBookings.filter(b => 
            b.guestName.toLowerCase().includes(lowerQuery) ||
            b.roomId.toLowerCase().includes(lowerQuery) ||
            b.phone.toLowerCase().includes(lowerQuery) ||
            (b.otaBookingNumber || '').toLowerCase().includes(lowerQuery)
        );
    }, [upcomingBookings, searchQuery]);

    const generateSmartZalo = () => {
        if (!selectedBookingId) {
          addToast('Vui lòng chọn khách hàng trước', 'info');
          return;
        }

        const mainBooking = bookings.find(b => b.id === selectedBookingId);
        if (!mainBooking) return;

        // 1. Identify Group & Sort
        const groupList = mainBooking.groupId 
          ? bookings.filter(b => b.groupId === mainBooking.groupId && b.status !== 'cancelled')
          : [mainBooking];

        groupList.sort((a,b) => a.roomId.localeCompare(b.roomId));

        // 2. Build Room Block
        let roomBlock = '';
        let grandTotal = 0;
        let totalPaid = 0;

        groupList.forEach((b, index) => {
            const nights = getDaysDiff(b.checkIn, b.checkOut);
            const roomTotal = b.price * nights;
            
            // Full date format (dd/mm/yyyy)
            const checkInDate = b.checkIn.split('-').reverse().join('/');
            const checkOutDate = b.checkOut.split('-').reverse().join('/');

            roomBlock += `${index + 1}. Phòng ${b.roomId} (${formatCurrency(b.price)}/đêm)\n`;
            roomBlock += `   Check-in: 14:00 | ${checkInDate}\n`;
            roomBlock += `   Check-out: 12:00 | ${checkOutDate} (${nights} đêm)\n`;
            roomBlock += `   Thành tiền: ${formatCurrency(roomTotal)}\n\n`;
        });

        // 3. Services Block & Financials
        let servicesBlock = '';
        let totalDiscount = 0;

        groupList.forEach(b => {
            // Aggregate Services
            if (b.services) {
                b.services.forEach(s => {
                     const isEarly = s.name.toLowerCase().includes('sớm') || s.name.includes('Early');
                     const isLate = s.name.toLowerCase().includes('trễ') || s.name.toLowerCase().includes('muộn') || s.name.includes('Late');
                     
                     let line = '';
                     const itemTotal = s.price * s.qty;
                     
                     if (isEarly) {
                         line = `• Nhận phòng sớm (${b.roomId}): ${formatCurrency(s.price)}\n`;
                     } else if (isLate) {
                         line = `• Trả phòng trễ (${b.roomId}): ${formatCurrency(s.price)}\n`;
                     } else {
                         line = `• ${s.name} (${b.roomId}): ${formatCurrency(s.price)} x ${s.qty} = ${formatCurrency(itemTotal)}\n`;
                     }
                     
                     servicesBlock += line;
                });
            }
            
            // Aggregate Discounts
            if (b.discounts) {
                 b.discounts.forEach(d => {
                     servicesBlock += `• Giảm giá (${b.roomId} - ${d.description}): -${formatCurrency(d.amount)}\n`;
                     totalDiscount += d.amount;
                 });
            }
            
            // Logic: Grand Total = Room + Services + Surcharge - Discount
            const bNights = getDaysDiff(b.checkIn, b.checkOut);
            const bRoomTotal = normalizeMoneyAmount(b.price) * bNights;
            const bServices = getBookingServiceTotal(b);
            const bDiscount = getBookingDiscountTotal(b);
            const bSurcharge = getEffectiveBookingSurcharge(b);
            
            grandTotal += (bRoomTotal + bServices + bSurcharge - bDiscount);
            totalPaid += (b.paid || 0);
        });

        if (!servicesBlock) servicesBlock = "Chưa có dịch vụ đi kèm.";

        // 4. Deposit Logic
        let depositText = '';
        if (totalPaid > 0) {
             if (totalPaid >= grandTotal) {
                 depositText = `0đ (Đã thanh toán đủ)`;
             } else {
                 depositText = `${formatCurrency(grandTotal - totalPaid)} (Còn lại)`;
             }
        } else {
            const depositVal = Math.round(grandTotal * 0.5); // 50% Deposit
            depositText = `${formatCurrency(depositVal)} (50%)`;
        }

        // 5. Final Message
        const bankName = propertyInfo.bankName || 'Vietcombank';
        const bankAccountNumber = propertyInfo.bankAccountNumber || '1014095502';
        const bankOwner = (propertyInfo.bankOwner || 'NGUYEN THANH HIEU').toUpperCase();

        const msg = `HELLO DALAT HOSTEL XÁC NHẬN BOOKING
Cảm ơn bạn đã lựa chọn Hello Dalat. Hostel gửi bạn thông tin chi tiết ạ:

👥️ Thông tin khách:
- Tên: ${mainBooking.guestName}
- Số điện thoại: ${mainBooking.phone}

🛏 Chi tiết phòng:
${roomBlock.trim()}

📋 Dịch vụ:
${servicesBlock.trim()}

💰 Thanh toán:
Tổng cộng: ${formatCurrency(grandTotal)}

Để chốt giữ phòng, bạn vui lòng chuyển khoản cọc ${depositText} giúp mình nhé:
💳 Thông tin chuyển khoản:
Ngân hàng: ${bankName}
STK: ${bankAccountNumber}
Chủ TK: ${bankOwner}
Bạn chuyển khoản xong chụp màn hình giúp hostel để hostel khóa phòng ngay cho mình nhé! 🌸`;

        setGeneratedContent(msg);
        addToast('Đã tạo tin nhắn thành công!', 'success');
    };

    const handleCopy = () => {
        if (!generatedContent) return;
        navigator.clipboard.writeText(generatedContent);
        addToast('Đã copy vào bộ nhớ đệm!', 'success');
    };

    return (
        <div className="p-4 pb-24 h-full flex flex-col gap-4 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <MessageSquare className="text-blue-600"/> Smart Zalo Generator
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Tự động tạo tin nhắn xác nhận booking chuyên nghiệp.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1 relative">
                        <input 
                          type="text"
                          value={searchQuery}
                          onChange={e => {
                            setSearchQuery(e.target.value);
                            setShowDropdown(true);
                          }}
                          onFocus={() => setShowDropdown(true)}
                          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                                                    placeholder="Tìm tên khách, phòng, số điện thoại hoặc OTAs num..."
                          className="w-full p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-500 font-bold text-gray-900 dark:text-white"
                        />
                        {showDropdown && filteredBookings.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mt-1 max-h-60 overflow-y-auto z-10 shadow-lg">
                            {filteredBookings.map(b => (
                              <button
                                key={b.id}
                                onClick={() => {
                                  setSelectedBookingId(b.id);
                                  setSearchQuery(`${b.guestName} - ${b.roomId} (${formatDate(b.checkIn)}) ${b.groupId ? '[Đoàn]' : ''}`);
                                  setShowDropdown(false);
                                }}
                                className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                              >
                                <div className="font-bold text-gray-900 dark:text-white">{b.guestName}</div>
                                <div className="text-sm text-gray-500">{b.roomId} • {formatDate(b.checkIn)} {b.groupId ? '• Đoàn' : ''}</div>
                                <div className="text-xs text-gray-400">{b.phone}</div>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                    <button 
                      onClick={generateSmartZalo}
                      className="bg-blue-700 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/20 active:scale-95 whitespace-nowrap"
                    >
                        <Wand2 size={18}/> Tạo Tin Nhắn
                    </button>
                </div>

                <div className="flex-1 flex flex-col relative">
                    <label className="text-xs font-black uppercase text-gray-500 mb-2 flex justify-between">
                        <span>Nội dung tin nhắn</span>
                        {generatedContent && <span className="text-green-600 flex items-center gap-1"><Check size={12}/> Đã tạo xong</span>}
                    </label>
                    <textarea 
                        className="flex-1 w-full p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-500 font-mono text-sm leading-relaxed resize-none text-gray-900 dark:text-white"
                        value={generatedContent}
                        onChange={e => setGeneratedContent(e.target.value)}
                        placeholder="Chọn khách hàng và bấm 'Tạo Tin Nhắn'..."
                    />
                    {generatedContent && (
                        <div className="absolute bottom-4 right-4 flex gap-2">
                           <button 
                              onClick={() => setGeneratedContent('')}
                              className="bg-gray-200 text-gray-700 p-3 rounded-xl hover:bg-gray-300 transition-colors"
                              title="Xóa"
                           >
                               <RefreshCcw size={18}/>
                           </button>
                           <button 
                              onClick={handleCopy}
                              className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                           >
                               <Copy size={18}/> Copy Zalo
                           </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
};

export default GeneratedView;
