import { useState } from 'react';
import { Booking, UserRole } from '../types/types';
import { BookingFormData, SaveBookingPayload } from '../types/bookingForm';
import { RoomChangeMode } from '../components/modals/RoomChangeModal';
import type { AddRoomPayload } from './useBookings';

interface UseRoomActionsOptions {
  form: BookingFormData;
  setForm: (f: BookingFormData) => void;
  currentBooking: Booking | null;
  userRole: UserRole;
  isLocked: boolean | string | 0 | undefined;
  onSave: (data: SaveBookingPayload) => void;
  onSplitBooking: (original: Booking, newRoomId: string) => Promise<string>;
  onSwitchBooking: (id: string) => void;
  onRepairGroup?: (groupId: string) => Promise<void>;
  addRoomToGroup: (groupId: string, payload: AddRoomPayload) => Promise<string>;
  convertSingleToGroup: (bookingId: string, payload: AddRoomPayload) => Promise<{ groupId: string; newBookingId: string }>;
  removeRoomFromGroup: (groupId: string, bookingId: string) => Promise<void>;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function useRoomActions({
  form, setForm, currentBooking, userRole, isLocked,
  onSave, onSplitBooking, onSwitchBooking, onRepairGroup,
  addRoomToGroup, convertSingleToGroup, removeRoomFromGroup, addToast,
}: UseRoomActionsOptions) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<'single' | 'group' | null>(null);
  const [showRoomChange, setShowRoomChange] = useState(false);
  const [roomChangeMode, setRoomChangeMode] = useState<RoomChangeMode>('change_room');

  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [newCheckIn, setNewCheckIn] = useState('');
  const [newCheckOut, setNewCheckOut] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);

  const handleOpenChangeRoom = () => {
    if (isLocked) return;
    setRoomChangeMode('change_room');
    setShowRoomChange(true);
  };

  const handleOpenAddRoom = () => {
    if (isLocked) return;
    setRoomChangeMode(form.groupId ? 'add_to_group' : 'add_to_single');
    setShowRoomChange(true);
  };

  const handleRoomChangeSubmit = async (payload: { newRoomId: string; transferDate?: string; isSplit: boolean }) => {
    const { newRoomId, isSplit } = payload;

    if (roomChangeMode.startsWith('add_')) {
      const addPayload = {
        roomId: newRoomId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        price: form.price,
        hasEarlyCheckIn: false,
        hasLateCheckOut: false,
        services: [],
        discounts: [],
        surcharge: 0,
      };

      let newId: string;
      if (form.groupId) {
        newId = await addRoomToGroup(form.groupId, addPayload);
      } else {
        if (!form.id) {
          throw new Error('Không tìm thấy booking gốc để thêm phòng.');
        }
        const result = await convertSingleToGroup(form.id, addPayload);
        newId = result.newBookingId;
      }

      addToast('Đã thêm phòng thành công', 'success');
      onSwitchBooking(newId);
      return;
    }

    if (isSplit) {
      if (!currentBooking) {
        throw new Error('Không tìm thấy booking hiện tại để tách phòng.');
      }
      const newId = await onSplitBooking(currentBooking, newRoomId);
      addToast('Đã tách và chuyển phòng thành công', 'success');
      onSwitchBooking(newId);
    } else {
      onSave({ ...form, roomId: newRoomId });
      setForm({ ...form, roomId: newRoomId });
      addToast('Đã đổi phòng thành công', 'success');
    }
  };

  const handleAddRoom = () => {
    setNewRoomId('');
    setNewCheckIn(form.checkIn || '');
    setNewCheckOut(form.checkOut || '');
    setNewPrice(0);
    setShowAddRoom(true);
  };

  const submitAddRoom = async () => {
    const payload = { roomId: newRoomId, checkIn: newCheckIn, checkOut: newCheckOut, price: newPrice };
    if (form.groupId) {
      await addRoomToGroup(form.groupId, payload);
    } else {
      await convertSingleToGroup(form.id, payload);
    }
    setShowAddRoom(false);
  };

  const handleRemoveRoom = async (bookingId: string) => {
    if (!form.groupId || userRole !== 'owner') return;
    if (!confirm('Xóa phòng khỏi đoàn? Phòng sẽ chuyển trạng thái CANCELLED.')) return;
    await removeRoomFromGroup(form.groupId, bookingId);
  };

  const handleRepair = async () => {
    if (!form.groupId || !onRepairGroup) return;
    if (!window.confirm('Admin: Tự động sửa lỗi dữ liệu đoàn (tạo lại Group Summary, sync Room IDs)?')) return;
    try {
      await onRepairGroup(form.groupId);
      addToast('Đã sửa dữ liệu đoàn!', 'success');
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Có lỗi xảy ra khi sửa dữ liệu đoàn', 'error');
    }
  };

  return {
    showAdvanced, setShowAdvanced,
    confirmDelete, setConfirmDelete,
    showRoomChange, setShowRoomChange,
    roomChangeMode,
    showAddRoom, setShowAddRoom,
    newRoomId, setNewRoomId,
    newCheckIn, setNewCheckIn,
    newCheckOut, setNewCheckOut,
    newPrice, setNewPrice,
    handleOpenChangeRoom,
    handleOpenAddRoom,
    handleRoomChangeSubmit,
    handleAddRoom,
    submitAddRoom,
    handleRemoveRoom,
    handleRepair,
  };
}
