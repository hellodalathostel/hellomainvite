
import React, { useState } from 'react';
import { Calendar, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { RoomDefinition, Service } from '../../types/types';
import { BookingFormData, BookingFormUpdate } from '../../types/bookingForm';
import { getDaysDiff, formatCurrency } from '../../utils/utils';
import CurrencyInput from '../CurrencyInput';

interface RoomStaySectionProps {
  form: BookingFormData;
  setForm: (data: BookingFormUpdate) => void;
  rooms: RoomDefinition[];
  isGroupMode: boolean;
  groupPrices: Record<string, number>;
  setGroupPrices: (prices: Record<string, number>) => void;
}

const RoomStaySection: React.FC<RoomStaySectionProps> = ({
  form,
  setForm,
  rooms,
  isGroupMode,
  groupPrices,
  setGroupPrices
}) => {
  const [expandedRoomDates, setExpandedRoomDates] = useState<string | null>(null);
  
  const nights = getDaysDiff(form.checkIn, form.checkOut);
  const hasEarlyFee = form.hasEarlyCheckIn;
  const hasLateFee = form.hasLateCheckOut;
  
  const isExisting = !!form.id;

  const handleNightsChange = (newNights: number) => {
    if (newNights < 1) return;
    const startDate = new Date(form.checkIn);
    startDate.setDate(startDate.getDate() + newNights);
    const newCheckOut = startDate.toISOString().split('T')[0];

    setForm((prev: BookingFormData) => {
      const newRoomDates = { ...prev.roomDates };
      Object.keys(newRoomDates).forEach(rid => {
        if (newRoomDates[rid].checkOut === prev.checkOut) {
          newRoomDates[rid].checkOut = newCheckOut;
        }
      });
      return { ...prev, checkOut: newCheckOut, roomDates: newRoomDates };
    });
  };

  const toggleTimeFee = (type: 'early' | 'late') => {
    const name = type === 'early' ? 'Phụ thu nhận phòng sớm' : 'Phụ thu trả phòng trễ';
    const exists = form.services?.some((s: Service) => s.name === name);
    const flagKey = type === 'early' ? 'hasEarlyCheckIn' : 'hasLateCheckOut';

    if (exists) {
      setForm((prev: BookingFormData) => ({
        ...prev,
        [flagKey]: false,
        services: prev.services.filter((s: Service) => s.name !== name)
      }));
    } else {
      setForm((prev: BookingFormData) => ({
        ...prev,
        [flagKey]: true,
        services: [...(prev.services || []), { name, price: 50000, qty: 1 }]
      }));
    }
  };

  const handleGroupRoomToggle = (rid: string) => {
    setForm((prev: BookingFormData) => {
      const current = prev.selectedRooms || [];
      const isSelected = current.includes(rid);
      let newRooms;
      let newRoomDates = { ...prev.roomDates };

      if (isSelected) {
        newRooms = current.filter((id: string) => id !== rid);
        const newPrices = { ...groupPrices };
        delete newPrices[rid];
        setGroupPrices(newPrices);
        delete newRoomDates[rid];
      } else {
        newRooms = [...current, rid];
        const rData = rooms.find(r => r.id === rid);
        setGroupPrices({ ...groupPrices, [rid]: rData ? rData.price : 0 });
        newRoomDates[rid] = { checkIn: prev.checkIn, checkOut: prev.checkOut };
      }
      return { ...prev, selectedRooms: newRooms, roomDates: newRoomDates };
    });
  };

  const handleRoomDateChange = (rid: string, field: 'checkIn' | 'checkOut', value: string) => {
    setForm((prev: BookingFormData) => ({
      ...prev,
      roomDates: {
        ...prev.roomDates,
        [rid]: {
          ...(prev.roomDates[rid] || { checkIn: prev.checkIn, checkOut: prev.checkOut }),
          [field]: value
        }
      }
    }));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calendar size={16} className="text-blue-600" />
        <h4 className="text-xs font-black uppercase text-gray-500 tracking-widest">Thời gian & Phòng</h4>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-3xl border dark:border-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Check-in</span>
              <button
                onClick={() => toggleTimeFee('early')}
                className={`text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${hasEarlyFee ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <Clock size={10} /> Nhận sớm
              </button>
            </div>
            <input type="date" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} className="w-full bg-transparent text-gray-900 dark:text-white font-black text-sm outline-none cursor-pointer" />
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-blue-500/30 flex flex-col items-center justify-center bg-white dark:bg-gray-800 shadow-sm transform -translate-y-1">
              <span className="text-xs font-black text-blue-700 dark:text-blue-400">{nights}</span>
              <span className="text-[8px] uppercase text-gray-500 font-bold">đêm</span>
            </div>
            <div className="flex gap-1 mt-1">
              <button onClick={() => handleNightsChange(nights - 1)} className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs text-gray-700 dark:text-gray-300">-</button>
              <button onClick={() => handleNightsChange(nights + 1)} className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs text-gray-700 dark:text-gray-300">+</button>
            </div>
          </div>
          <div className="flex-1 space-y-1 text-right">
            <div className="flex justify-between items-center mb-1">
              <button
                onClick={() => toggleTimeFee('late')}
                className={`text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${hasLateFee ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <Clock size={10} /> Trả trễ
              </button>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Check-out</span>
            </div>
            <input type="date" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} className="bg-transparent text-gray-900 dark:text-white font-black text-sm outline-none cursor-pointer text-right w-full" />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t dark:border-gray-800">
          {isGroupMode && !form.id ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {rooms.map(r => {
                const isSelected = form.selectedRooms.includes(r.id);
                const isExpanded = expandedRoomDates === r.id;
                return (
                  <div key={r.id} className="space-y-1">
                    <button onClick={() => handleGroupRoomToggle(r.id)} className={`w-full py-3 px-2 rounded-2xl border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${isSelected ? 'bg-blue-700 border-blue-700 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-200'}`}>
                      <span className="text-[10px] opacity-70">P.</span><span>{r.id}</span>
                    </button>
                    {isSelected && (
                      <div className="flex flex-col gap-1 mt-1 p-2 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
                        <div className="flex justify-between items-center px-1">
                          <span className="text-[9px] font-bold text-blue-700 dark:text-blue-400">{formatCurrency(groupPrices[r.id] !== undefined ? groupPrices[r.id] : r.price)}</span>
                          <button onClick={() => setExpandedRoomDates(isExpanded ? null : r.id)}>{isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
                        </div>
                        {isExpanded && (
                          <div className="space-y-2 mt-2 border-t dark:border-gray-700 pt-2 animate-in slide-in-from-top-1">
                            <CurrencyInput value={groupPrices[r.id] !== undefined ? groupPrices[r.id] : r.price} onChange={(val) => setGroupPrices({ ...groupPrices, [r.id]: val })} className="w-full text-[10px] font-bold bg-gray-50 dark:bg-gray-900 p-1.5 rounded outline-none text-gray-900 dark:text-white" />
                            <input type="date" value={form.roomDates[r.id]?.checkIn || form.checkIn} onChange={(e) => handleRoomDateChange(r.id, 'checkIn', e.target.value)} className="w-full text-[10px] bg-gray-50 dark:bg-gray-900 p-1 rounded text-gray-900 dark:text-white" />
                            <input type="date" value={form.roomDates[r.id]?.checkOut || form.checkOut} onChange={(e) => handleRoomDateChange(r.id, 'checkOut', e.target.value)} className="w-full text-[10px] bg-gray-50 dark:bg-gray-900 p-1 rounded text-gray-900 dark:text-white" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex gap-4 items-start">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase flex justify-between items-center h-5">
                    <span>Phòng lưu trú</span>
                </label>
                
                <select 
                    disabled={isExisting} 
                    value={form.roomId} 
                    onChange={e => setForm({ ...form, roomId: e.target.value })} 
                    className={`w-full p-3 border rounded-2xl outline-none text-sm font-bold text-gray-900 dark:text-white transition-colors
                        ${isExisting
                            ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-500 cursor-not-allowed' 
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-800 focus:border-blue-500'}`}
                >
                    {form.roomId ? null : <option value="">-- Chọn phòng --</option>}
                    {rooms.map(r => <option key={r.id} value={r.id}>Phòng {r.name}</option>)}
                </select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">Giá phòng / Đêm</label>
                <CurrencyInput value={form.price} onChange={(val) => setForm({ ...form, price: val })} className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-black text-blue-800 dark:text-blue-400" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default React.memo(RoomStaySection);
