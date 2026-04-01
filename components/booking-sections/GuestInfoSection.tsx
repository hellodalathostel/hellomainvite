
import React from 'react';
import { User, Phone, History, CheckSquare } from 'lucide-react';
import { Booking } from '../../types/types';
import { BookingFormData, BookingFormUpdate, SuggestedGuest } from '../../types/bookingForm';
import { SOURCES } from '../../config/constants';

interface GuestInfoSectionProps {
  form: BookingFormData;
  setForm: (data: BookingFormUpdate) => void;
  findGuestByPhone: (phone: string) => void;
  findGuestByName: (name: string) => void;
  suggestedGuest: SuggestedGuest | null;
  setSuggestedGuest: (val: SuggestedGuest | null) => void;
  syncToGroup: boolean;
  setSyncToGroup: (val: boolean) => void;
}

const GuestInfoSection: React.FC<GuestInfoSectionProps> = ({
  form,
  setForm,
  findGuestByPhone,
  findGuestByName,
  suggestedGuest,
  setSuggestedGuest,
  syncToGroup,
  setSyncToGroup
}) => {
  const applySuggestion = () => {
    if (!suggestedGuest) return;
    setForm((prev: BookingFormData) => ({
      ...prev,
      guestName: suggestedGuest.guestName ?? prev.guestName,
      phone: suggestedGuest.phone ?? prev.phone,
      otaBookingNumber: suggestedGuest.otaBookingNumber || prev.otaBookingNumber,
      source: suggestedGuest.source || prev.source,
    }));
    setSuggestedGuest(null);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User size={16} className="text-blue-600" />
          <h4 className="text-xs font-black uppercase text-gray-500 tracking-widest">Thông tin khách hàng</h4>
        </div>
        {form.id && form.groupId && (
          <button
            onClick={() => setSyncToGroup(!syncToGroup)}
            className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all ${syncToGroup ? 'bg-blue-700 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
          >
            {syncToGroup ? <CheckSquare size={12} /> : <div className="w-3 h-3 border-2 border-gray-300 dark:border-gray-600 rounded-sm"></div>}
            Đồng bộ cả đoàn
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 ml-1">Số điện thoại</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500"><Phone size={14} /></div>
            <input
              type="tel"
              value={form.phone}
              onChange={e => { setForm({ ...form, phone: e.target.value }); findGuestByPhone(e.target.value); }}
              className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500 text-gray-900 dark:text-white transition-all text-sm font-medium"
              placeholder="09xx..."
            />
          </div>
          {suggestedGuest && (
            <button onClick={applySuggestion} className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full mt-2 hover:bg-blue-100 transition-colors">
              <History size={12} /> {suggestedGuest.guestName}
            </button>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 ml-1">OTAs num</label>
          <div className="relative">
            <input
              type="text"
              value={form.otaBookingNumber}
              onChange={e => setForm({ ...form, otaBookingNumber: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500 text-gray-900 dark:text-white transition-all text-sm font-medium"
              placeholder="Booking #..."
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-700 dark:text-gray-300 ml-1">Tên khách / Đại diện</label>
          <div className="relative">
            <input
              type="text"
              value={form.guestName}
              onChange={e => { setForm({ ...form, guestName: e.target.value }); findGuestByName(e.target.value); }}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500 text-gray-900 dark:text-white transition-all text-sm font-bold"
              placeholder="Nguyễn Văn A"
            />
          </div>
          {suggestedGuest && suggestedGuest.phone && suggestedGuest.guestName && form.guestName && suggestedGuest.guestName.toLowerCase().includes(form.guestName.toLowerCase()) && (
            <button onClick={applySuggestion} className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full mt-2 hover:bg-blue-100 transition-colors">
              <History size={12} /> {suggestedGuest.phone}
            </button>
          )}
        </div>
      </div>
      
       <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 ml-1 uppercase">Trạng thái đặt</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value as Booking['status']})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none font-bold text-sm focus:border-blue-500 text-gray-900 dark:text-white">
                <option value="booked">Đã đặt trước</option>
                <option value="checked-in">Đã Check-in</option>
                <option value="checked-out">Đã Check-out</option>
                <option value="cancelled">Đã Hủy</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 ml-1 uppercase">Nguồn khách</label>
              <select value={form.source} onChange={e => setForm({...form, source: e.target.value})} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none font-medium text-sm focus:border-blue-500 text-gray-900 dark:text-white">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
      </div>
      
      <div className="flex gap-2 items-start">
        <textarea 
          value={form.note || ''} 
          onChange={e => setForm({...form, note: e.target.value})} 
          placeholder="Ghi chú về khách hoặc yêu cầu đặc biệt..." 
          className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500 text-xs h-20 resize-none text-gray-900 dark:text-gray-200 placeholder-gray-400" 
        />
        <button
          onClick={() => setForm({...form, isSticky: !form.isSticky})}
          className={`mt-1 px-3 py-2 rounded-xl font-bold text-sm transition-colors flex items-center justify-center shrink-0 ${ 
            form.isSticky 
              ? 'bg-orange-500 text-white hover:bg-orange-600' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600' 
          }`}
          title="Pin ghi chú hiển thị trên Dashboard"
        >
          📌
        </button>
      </div>
    </section>
  );
};

export default React.memo(GuestInfoSection);
