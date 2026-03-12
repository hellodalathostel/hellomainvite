
import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, PlusCircle, AlertTriangle, Calendar, BedDouble } from 'lucide-react';
import { Booking, RoomDefinition } from '../../types/types';
import { getDaysDiff, addDays, formatDate } from '../../utils/utils';

export type RoomChangeMode = 'add_to_single' | 'add_to_group' | 'change_room';

interface RoomChangeModalProps {
  show: boolean;
  onClose: () => void;
  mode: RoomChangeMode;
    booking: Pick<Booking, 'roomId' | 'checkIn' | 'checkOut' | 'status'> & { id?: string };
  rooms: RoomDefinition[];
  checkCollision: (roomId: string, start: string, end: string, ignoreId?: string) => Booking | undefined;
  onSubmit: (payload: { newRoomId: string; transferDate?: string; isSplit: boolean }) => Promise<void>;
}

const RoomChangeModal: React.FC<RoomChangeModalProps> = ({
  show,
  onClose,
  mode,
  booking,
  rooms,
  checkCollision,
  onSubmit
}) => {
  const [newRoomId, setNewRoomId] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [changeType, setChangeType] = useState<'immediate' | 'split'>('immediate');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const isBeforeCheckIn = today < booking.checkIn;
  const isCheckedIn = booking.status === 'checked-in';

  // Reset state when opening
  useEffect(() => {
    if (show) {
      setNewRoomId('');
      setError('');
      
      // Default logic for Change Room
      if (mode === 'change_room') {
          if (isBeforeCheckIn) {
              setChangeType('immediate');
              setTransferDate('');
          } else {
              setChangeType('split'); // Default to split if already started/checked-in
              setTransferDate(today > booking.checkIn ? today : booking.checkIn);
          }
      } else {
          // Add Room modes
          setChangeType('immediate'); // Not used but reset for safety
          setTransferDate(booking.checkIn);
      }
    }
  }, [show, mode, booking, isBeforeCheckIn, today]);

  if (!show) return null;

  const handleSubmit = async () => {
    setError('');
    
    // 1. Basic Validation
    if (!newRoomId) {
        setError('Vui lòng chọn phòng mới.');
        return;
    }

    // 2. Date Logic & Range Calculation
    let reqStart = booking.checkIn;
    let reqEnd = booking.checkOut;

    if (mode === 'change_room' && changeType === 'split') {
        if (!transferDate) {
            setError('Vui lòng chọn ngày chuyển phòng.');
            return;
        }
        if (transferDate <= booking.checkIn) {
            setError(`Ngày chuyển phải sau ngày Check-in hiện tại (${formatDate(booking.checkIn)}).`);
            return;
        }
        if (transferDate >= booking.checkOut) {
            setError(`Ngày chuyển phải trước ngày Check-out hiện tại (${formatDate(booking.checkOut)}).`);
            return;
        }
        
        // For split, the NEW room is booked from transferDate to original checkOut
        reqStart = transferDate;
        reqEnd = booking.checkOut;
    } else if (mode.startsWith('add_')) {
        // Add room uses original dates
        reqStart = booking.checkIn;
        reqEnd = booking.checkOut;
    } else {
        // Change room immediate (Edit roomId) uses original dates
        reqStart = booking.checkIn;
        reqEnd = booking.checkOut;
    }

    // 3. Collision Check
    const collision = checkCollision(newRoomId, reqStart, reqEnd, mode === 'change_room' && changeType === 'immediate' ? booking.id : undefined);
    if (collision) {
        setError(`Phòng ${newRoomId} đã có khách trong khoảng ${formatDate(reqStart)} - ${formatDate(reqEnd)}.`);
        return;
    }

    // 4. Submit
    setIsSubmitting(true);
    try {
        await onSubmit({
            newRoomId,
            transferDate: changeType === 'split' ? transferDate : undefined,
            isSplit: changeType === 'split'
        });
        onClose();
    } catch (e: any) {
        setError(e.message || 'Có lỗi xảy ra.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const title = mode === 'change_room' ? 'Chuyển / Đổi Phòng' : 'Thêm Phòng Vào Đoàn';
  const filteredRooms = rooms.filter(r => r.id !== booking.roomId); // Exclude current room

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center px-4 pt-4 pb-safe-modal backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden animate-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                {mode === 'change_room' ? <ArrowRightLeft className="text-orange-500"/> : <PlusCircle className="text-blue-600"/>}
                {title}
            </h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <X size={20} className="text-gray-500"/>
            </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded-xl text-sm font-bold flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
                    <span>{error}</span>
                </div>
            )}

            {/* Room Selection */}
            <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-500 tracking-wider">Chọn phòng mới</label>
                <div className="relative">
                    <select 
                        value={newRoomId} 
                        onChange={e => setNewRoomId(e.target.value)}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl outline-none font-bold text-gray-900 dark:text-white appearance-none focus:border-blue-500 transition-colors"
                    >
                        <option value="">-- Chọn phòng --</option>
                        {filteredRooms.map(r => (
                            <option key={r.id} value={r.id}>
                                Phòng {r.name} - {new Intl.NumberFormat('vi-VN').format(r.price)}đ
                            </option>
                        ))}
                    </select>
                    <BedDouble className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20}/>
                </div>
            </div>

            {/* Change Room Logic (Only for change_room mode) */}
            {mode === 'change_room' && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <label className="text-xs font-black uppercase text-gray-500 tracking-wider">Hình thức đổi phòng</label>
                    
                    {/* Option A: Immediate (Before Check-in) */}
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${changeType === 'immediate' ? 'bg-white dark:bg-gray-700 border-blue-500 ring-1 ring-blue-500' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        <input 
                            type="radio" 
                            name="changeType" 
                            checked={changeType === 'immediate'} 
                            onChange={() => setChangeType('immediate')}
                            disabled={isCheckedIn && !isBeforeCheckIn} // Cannot edit directly if checked-in (must split) - though user might fix mistake
                            className="mt-1"
                        />
                        <div>
                            <span className="block text-sm font-bold text-gray-900 dark:text-white">Sửa phòng trực tiếp</span>
                            <span className="block text-xs text-gray-500 mt-0.5">Thay đổi số phòng cho toàn bộ thời gian đặt. Chỉ dùng khi khách chưa nhận phòng hoặc xếp nhầm.</span>
                        </div>
                    </label>

                    {/* Option B: Split (After Check-in) */}
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${changeType === 'split' ? 'bg-white dark:bg-gray-700 border-orange-500 ring-1 ring-orange-500' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        <input 
                            type="radio" 
                            name="changeType" 
                            checked={changeType === 'split'} 
                            onChange={() => setChangeType('split')}
                            className="mt-1"
                        />
                        <div>
                            <span className="block text-sm font-bold text-gray-900 dark:text-white">Tách & Chuyển phòng (Đã Check-in)</span>
                            <span className="block text-xs text-gray-500 mt-0.5">Kết thúc ở phòng cũ và tạo booking mới ở phòng mới từ ngày chọn.</span>
                        </div>
                    </label>

                    {/* Transfer Date Picker (Only if Split) */}
                    {changeType === 'split' && (
                        <div className="mt-3 pl-7 animate-in slide-in-from-top-2">
                            <label className="block text-[10px] font-bold text-orange-600 mb-1">Ngày bắt đầu ở phòng mới:</label>
                            <div className="relative">
                                <input 
                                    type="date"
                                    value={transferDate}
                                    min={booking.checkIn}
                                    max={booking.checkOut}
                                    onChange={e => setTransferDate(e.target.value)}
                                    className="w-full p-2 pl-9 bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 rounded-xl text-sm font-bold outline-none focus:border-orange-500"
                                />
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500"/>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 italic">
                                * Thao tác này sẽ biến đơn này thành <b>Booking Đoàn</b> (2 phòng).
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t dark:border-gray-700 flex gap-3">
            <button 
                onClick={onClose} 
                className="flex-1 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
                Hủy
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${mode === 'change_room' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
            >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
        </div>

      </div>
    </div>
  );
};

export default RoomChangeModal;
