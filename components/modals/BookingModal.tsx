
import React from 'react';
import {
  X, Trash2, Users, FileText, ClipboardCheck, UserPlus, AlertTriangle, Wrench, Lock, History, Moon, ChevronDown, ChevronUp, ArrowRightLeft
} from 'lucide-react';
import { Booking, ServiceDefinition, UserRole, RoomDefinition, DiscountDefinition } from '../../types/types';
import { SaveBookingPayload, SuggestedGuest } from '../../types/bookingForm';
import { formatDate } from '../../utils/utils';

import GuestInfoSection from '../booking-sections/GuestInfoSection';
import RoomStaySection from '../booking-sections/RoomStaySection';
import ServicesSection from '../booking-sections/ServicesSection';
import PaymentSection from '../booking-sections/PaymentSection';
import RoomChangeModal from './RoomChangeModal';
import { useUI } from '../../context/UIContext';
import { useBookingForm } from '../../hooks/useBookingForm';
import { useRoomActions } from '../../hooks/useRoomActions';
import type { AddRoomPayload } from '../../hooks/useBookings';

interface BookingModalProps {
  show: boolean;
  onClose: () => void;
  editingBooking: Partial<Booking> | null;
  findGuestByPhone: (phone: string) => void;
  findGuestByName: (name: string) => void;
  suggestedGuest: SuggestedGuest | null;
  setSuggestedGuest: (val: SuggestedGuest | null) => void;
  onSave: (data: SaveBookingPayload) => void;
  onDelete: (id: string, isGroup: boolean, groupId?: string) => void;
  onInvoice: (booking: Booking, isGroup: boolean) => void;
  onConfirmation: (booking: Booking, isGroup: boolean) => void;
  checkRoomCollision: (roomId: string, start: string, end: string, ignoreId?: string, isEarly?: boolean, isLate?: boolean) => Booking | undefined;
  onSplitBooking: (originalBooking: Booking, newRoomId: string) => Promise<string>;
  onSwitchBooking: (bookingId: string) => void;
  onRepairGroup?: (groupId: string) => Promise<void>;
  onExtendBooking?: (booking: Booking) => Promise<void>;
  addRoomToGroup: (groupId: string, payload: AddRoomPayload) => Promise<string>;
  convertSingleToGroup: (bookingId: string, payload: AddRoomPayload) => Promise<{ groupId: string; newBookingId: string }>;
  removeRoomFromGroup: (groupId: string, bookingId: string) => Promise<void>;
  userRole: UserRole;
  masterServices: ServiceDefinition[];
  masterDiscounts: DiscountDefinition[];
  allBookings: Booking[];
  rooms: RoomDefinition[];
}

export default function BookingModal({
  show, onClose, editingBooking, findGuestByPhone, findGuestByName, suggestedGuest,
  setSuggestedGuest, onSave, onDelete, onInvoice, onConfirmation, checkRoomCollision,
  onSplitBooking, onSwitchBooking, onRepairGroup,
  addRoomToGroup, convertSingleToGroup, removeRoomFromGroup,
  userRole, masterServices, masterDiscounts, allBookings, rooms
}: BookingModalProps) {
  const { addToast } = useUI();

  const {
    form, setForm,
    groupPrices, setGroupPrices,
    isGroupMode, setIsGroupMode,
    syncToGroup, setSyncToGroup,
    isLocked, showDesktopActionColumn,
    groupPeers, roomStaySummary,
    financials, warnings,
    handleSubmit,
  } = useBookingForm({ editingBooking, rooms, allBookings, userRole, checkRoomCollision, onSave });

  const currentBooking = React.useMemo(() => {
    if (!form.id) return null;
    return allBookings.find((b) => b.id === form.id) || null;
  }, [allBookings, form.id]);

  const handleInvoice = (isGroup: boolean) => {
    if (!currentBooking) return;
    onInvoice(currentBooking, isGroup);
  };

  const handleConfirmation = (isGroup: boolean) => {
    if (!currentBooking) return;
    onConfirmation(currentBooking, isGroup);
  };

  const {
    showAdvanced, setShowAdvanced,
    confirmDelete, setConfirmDelete,
    showRoomChange, setShowRoomChange,
    roomChangeMode,
    showAddRoom, setShowAddRoom,
    newRoomId, setNewRoomId,
    newCheckIn, setNewCheckIn,
    newCheckOut, setNewCheckOut,
    newPrice, setNewPrice,
    handleOpenChangeRoom, handleOpenAddRoom,
    handleRoomChangeSubmit,
    submitAddRoom, handleRemoveRoom, handleRepair,
  } = useRoomActions({
    form, setForm, currentBooking, userRole, isLocked, onSave,
    onSplitBooking, onSwitchBooking, onRepairGroup,
    addRoomToGroup, convertSingleToGroup, removeRoomFromGroup, addToast,
  });

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm transition-all duration-300">
      <div className="bg-white dark:bg-gray-950 w-full max-w-xl sm:rounded-3xl rounded-t-3xl h-[100dvh] sm:h-auto sm:max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b dark:border-gray-800 shrink-0 z-10">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
            <X size={24} />
          </button>
          <div className="flex flex-col items-center">
            <h3 className="font-bold text-gray-900 dark:text-white leading-none flex items-center gap-2">
              {form.id ? `Phòng ${form.roomId}` : isGroupMode ? 'Đặt Phòng Đoàn' : 'Đặt Phòng Lẻ'}
              {isLocked && <Lock size={12} className="text-red-500"/>}
            </h3>
            {form.groupId && <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full mt-1">Đoàn: {form.groupId.slice(-4)}</span>}
          </div>
          <div className="w-10"></div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24 sm:pb-6 relative bg-gray-50 dark:bg-slate-950/50">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_140px] xl:grid-cols-[minmax(0,1fr)_150px] lg:gap-3">
            <div className="space-y-6">

              {warnings.length > 0 && (
                <div className="space-y-2">
                  {warnings.map((w, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs font-bold p-3 rounded-xl border ${w.type === 'error' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                      <AlertTriangle size={16}/> {w.msg}
                    </div>
                  ))}
                </div>
              )}

              {form.groupId && roomStaySummary && (
                <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex justify-between items-center mb-3 border-b dark:border-gray-800 pb-2">
                    <h4 className="text-xs font-black uppercase text-gray-500 flex items-center gap-2"><Moon size={14}/> Danh sách phòng</h4>
                    <span className="text-xs font-bold text-blue-600">{roomStaySummary.total} đêm tổng</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(roomStaySummary.details).map(([rid, nights]) => (
                      <div key={rid} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Phòng {rid}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{nights} đêm</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {form.groupId && groupPeers.length > 0 && (
                <div className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 mb-2 flex items-center gap-1"><History size={12}/> Timeline</h4>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {groupPeers.map(b => (
                      <div key={b.id} className="relative">
                        <button
                          onClick={() => onSwitchBooking(b.id)}
                          className={`shrink-0 flex flex-col items-center justify-center p-2 rounded-xl border min-w-[70px] transition-all ${b.id === form.id ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                        >
                          <span className={`text-xs font-black ${b.id === form.id ? 'text-blue-800' : 'text-gray-700 dark:text-gray-300'}`}>{b.roomId}</span>
                          <span className="text-[9px] text-gray-500">{formatDate(b.checkIn)}</span>
                        </button>
                        {userRole === 'owner' && b.id !== form.id && (
                          <button onClick={() => handleRemoveRoom(b.id)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!form.id && (
                <div className="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-xl">
                  <button onClick={() => setIsGroupMode(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!isGroupMode ? 'bg-white dark:bg-gray-700 text-blue-700 shadow-sm' : 'text-gray-500'}`}>Đặt Lẻ</button>
                  <button onClick={() => setIsGroupMode(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isGroupMode ? 'bg-white dark:bg-gray-700 text-blue-700 shadow-sm' : 'text-gray-500'}`}>Đặt Đoàn</button>
                </div>
              )}

              <RoomStaySection form={form} setForm={setForm} rooms={rooms} isGroupMode={isGroupMode && !form.id} groupPrices={groupPrices} setGroupPrices={setGroupPrices} />
              <GuestInfoSection form={form} setForm={setForm} findGuestByPhone={findGuestByPhone} findGuestByName={findGuestByName} suggestedGuest={suggestedGuest} setSuggestedGuest={setSuggestedGuest} syncToGroup={syncToGroup} setSyncToGroup={setSyncToGroup} />
              <PaymentSection form={form} setForm={setForm} financials={financials} isGroupMode={isGroupMode} />
              <ServicesSection form={form} setForm={setForm} masterServices={masterServices} masterDiscounts={masterDiscounts} />

              {form.id && (
                <div className="border-t dark:border-gray-800 pt-4">
                  <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <span className="flex items-center gap-2"><Wrench size={14}/> Thao tác nâng cao</span>
                    {showAdvanced ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  </button>
                  {showAdvanced && (
                    <div className="mt-3 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                      <button onClick={() => handleInvoice(false)} className="p-3 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-blue-100"><FileText size={18}/> Hóa Đơn (Phòng)</button>
                      <button onClick={() => handleConfirmation(false)} className="p-3 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-purple-100"><ClipboardCheck size={18}/> Phiếu (Phòng)</button>
                      {form.groupId && (
                        <>
                          <button onClick={() => handleInvoice(true)} className="p-3 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-indigo-100"><Users size={18}/> Hóa Đơn (Đoàn)</button>
                          <button onClick={() => handleConfirmation(true)} className="p-3 bg-fuchsia-50 text-fuchsia-700 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-fuchsia-100"><Users size={18}/> Phiếu (Đoàn)</button>
                        </>
                      )}
                      {userRole === 'owner' && (
                        <>
                          <button onClick={() => setConfirmDelete(form.groupId ? 'group' : 'single')} className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-red-100 col-span-2"><Trash2 size={18}/> Xóa Booking</button>
                          {form.groupId && (
                            <button onClick={handleRepair} className="p-2 text-[10px] text-gray-400 font-mono uppercase col-span-2 text-center hover:text-gray-600">[Debug] Repair Group Structure</button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {confirmDelete && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-800 animate-in fade-in">
                  <h4 className="text-red-700 dark:text-red-400 font-bold mb-2 flex items-center gap-2"><AlertTriangle size={18}/> Xác nhận xóa?</h4>
                  <p className="text-xs text-red-600/80 mb-4">Hành động này không thể hoàn tác.</p>
                  <div className="flex gap-3">
                    <button onClick={() => { onDelete(form.id, confirmDelete === 'group', form.groupId); onClose(); }} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/30">Xóa Ngay</button>
                    <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 bg-white text-gray-700 border rounded-xl text-xs font-bold">Hủy</button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop action column */}
            {showDesktopActionColumn && !confirmDelete && (
              <aside className="hidden lg:block">
                <div className="sticky top-2 space-y-3">
                  <button onClick={handleOpenChangeRoom} className="w-full flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-200 transition-colors active:scale-95">
                    <ArrowRightLeft size={18} className="text-orange-500"/> Đổi phòng
                  </button>
                  {form.groupId && (
                    <button onClick={handleOpenAddRoom} className="w-full flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition-colors active:scale-95 border border-blue-100 dark:border-blue-800">
                      <UserPlus size={18} className="text-blue-600 dark:text-blue-400"/> Thêm phòng
                    </button>
                  )}
                  <button onClick={() => handleConfirmation(false)} className="w-full flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 transition-colors active:scale-95 border border-purple-100 dark:border-purple-800">
                    <ClipboardCheck size={18} className="text-purple-600 dark:text-purple-400"/> In Phiếu (Phòng)
                  </button>
                  <button onClick={() => handleInvoice(false)} className="w-full flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition-colors active:scale-95 border border-blue-100 dark:border-blue-800">
                    <FileText size={18} className="text-blue-600 dark:text-blue-400"/> In HĐ (Phòng)
                  </button>
                  {form.groupId && (
                    <>
                      <button onClick={() => handleConfirmation(true)} className="w-full flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-300 font-bold text-xs hover:bg-fuchsia-100 transition-colors active:scale-95 border border-fuchsia-100 dark:border-fuchsia-800">
                        <Users size={18} className="text-fuchsia-600 dark:text-fuchsia-400"/> In Phiếu (Đoàn)
                      </button>
                      <button onClick={() => handleInvoice(true)} className="w-full flex flex-col items-center justify-center gap-1 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 font-bold text-xs hover:bg-indigo-100 transition-colors active:scale-95 border border-indigo-100 dark:border-indigo-800">
                        <Users size={18} className="text-indigo-600 dark:text-indigo-400"/> In HĐ (Đoàn)
                      </button>
                    </>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>

        {/* Mobile action bar */}
        {form.id && !isLocked && form.status !== 'cancelled' && form.status !== 'checked-out' && !confirmDelete && (
          <div className="p-3 bg-white dark:bg-slate-950 border-t dark:border-slate-800 grid grid-cols-2 gap-3 shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:hidden">
            <button onClick={handleOpenChangeRoom} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs active:scale-95">
              <ArrowRightLeft size={18} className="text-orange-500"/> Đổi phòng
            </button>
            {form.groupId && (
              <button onClick={handleOpenAddRoom} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-bold text-xs active:scale-95 border border-blue-100 dark:border-blue-800">
                <UserPlus size={18} className="text-blue-600 dark:text-blue-400"/> Thêm Phòng
              </button>
            )}
            <button onClick={() => handleConfirmation(false)} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 font-bold text-xs active:scale-95 border border-purple-100 dark:border-purple-800">
              <ClipboardCheck size={18} className="text-purple-600 dark:text-purple-400"/> In Phiếu (P)
            </button>
            <button onClick={() => handleInvoice(false)} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-bold text-xs active:scale-95 border border-blue-100 dark:border-blue-800">
              <FileText size={18} className="text-blue-600 dark:text-blue-400"/> In HĐ (P)
            </button>
            {form.groupId && (
              <>
                <button onClick={() => handleConfirmation(true)} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-300 font-bold text-xs active:scale-95 border border-fuchsia-100 dark:border-fuchsia-800">
                  <Users size={18} className="text-fuchsia-600 dark:text-fuchsia-400"/> In Phiếu (Đ)
                </button>
                <button onClick={() => handleInvoice(true)} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 font-bold text-xs active:scale-95 border border-indigo-100 dark:border-indigo-800">
                  <Users size={18} className="text-indigo-600 dark:text-indigo-400"/> In HĐ (Đ)
                </button>
              </>
            )}
          </div>
        )}

        {/* Save button */}
        {!isLocked && !confirmDelete && (
            <div className="px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-slate-950 border-t dark:border-slate-800 shrink-0 z-20">
            <button onClick={handleSubmit} className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-600/20 transition-colors">
              Lưu Booking
            </button>
          </div>
        )}
      </div>

      {form.id && !isLocked && (
        <RoomChangeModal
          show={showRoomChange}
          onClose={() => setShowRoomChange(false)}
          mode={roomChangeMode}
          booking={form}
          rooms={rooms}
          checkCollision={checkRoomCollision}
          onSubmit={handleRoomChangeSubmit}
        />
      )}

      {showAddRoom && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl max-w-sm w-full mx-4">
            <h3 className="font-bold text-lg mb-4">Thêm Phòng Mới</h3>
            <div className="space-y-3">
              <select value={newRoomId} onChange={e => setNewRoomId(e.target.value)} className="w-full p-2 border rounded-lg">
                <option value="">Chọn phòng</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <input type="date" value={newCheckIn} onChange={e => setNewCheckIn(e.target.value)} className="w-full p-2 border rounded-lg" />
              <input type="date" value={newCheckOut} onChange={e => setNewCheckOut(e.target.value)} className="w-full p-2 border rounded-lg" />
              <input type="number" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} className="w-full p-2 border rounded-lg" placeholder="Giá" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddRoom(false)} className="flex-1 p-2 bg-gray-200 rounded-lg">Hủy</button>
              <button onClick={submitAddRoom} className="flex-1 p-2 bg-blue-500 text-white rounded-lg">Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
