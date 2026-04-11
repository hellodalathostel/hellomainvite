
import { useState, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { ref, onValue, set, update, remove } from "firebase/database";
import { db } from '../config/database';
import { RoomState, ServiceDefinition, PropertyInfo, RoomDefinition, DiscountDefinition } from '../types/types';
import { DEFAULT_SERVICES, PROPERTY_INFO as DEFAULT_PROPERTY_INFO, DEFAULT_ROOM_DATA, PRESET_DISCOUNTS, DEFAULT_ZALO_TEMPLATE } from '../config/constants';
import { useAudit } from './useAudit';

export const useMasterData = (user: FirebaseUser | null, enabled = true) => {
  const [roomStates, setRoomStates] = useState<RoomState>({});
  const [masterServices, setMasterServices] = useState<ServiceDefinition[]>(DEFAULT_SERVICES);
  const [masterDiscounts, setMasterDiscounts] = useState<DiscountDefinition[]>([]);
  const [rooms, setRooms] = useState<RoomDefinition[]>(DEFAULT_ROOM_DATA);
  const [zaloTemplate, setZaloTemplate] = useState<string>(DEFAULT_ZALO_TEMPLATE);
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo>(DEFAULT_PROPERTY_INFO);
  const { logAction } = useAudit(user);

  const logMasterDataAction = async (action: string, description: string, entityId?: string) => {
    try {
      await logAction(action, description, entityId);
    } catch (error) {
      console.error('Master data audit error', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setRoomStates({});
      setMasterServices(DEFAULT_SERVICES);
      setMasterDiscounts([]);
      setRooms(DEFAULT_ROOM_DATA);
      setZaloTemplate(DEFAULT_ZALO_TEMPLATE);
      setPropertyInfo(DEFAULT_PROPERTY_INFO);
      return;
    }

    if (!enabled) {
      setRoomStates({});
      setMasterServices(DEFAULT_SERVICES);
      setMasterDiscounts([]);
      setRooms(DEFAULT_ROOM_DATA);
      setZaloTemplate(DEFAULT_ZALO_TEMPLATE);
      setPropertyInfo(DEFAULT_PROPERTY_INFO);
      return;
    }

    const unsubRoomStates = onValue(ref(db, 'app_data/room_states'), (snapshot) => {
      const data = snapshot.val();
      if (data) setRoomStates(data as RoomState);
      else setRoomStates({});
    });

    const unsubServices = onValue(ref(db, 'services'), (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMasterServices(DEFAULT_SERVICES);
        return;
      }
      const list: ServiceDefinition[] = Object.values(data);
      const activeList = list.filter((s: any) => !s.isDeleted);
      setMasterServices(activeList.length > 0 ? activeList : DEFAULT_SERVICES);
    });

    const unsubDiscounts = onValue(ref(db, 'app_data/discounts'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: DiscountDefinition[] = Object.values(data);
        setMasterDiscounts(list.filter((d: any) => !d.isDeleted));
      } else {
        const presetWithIds = PRESET_DISCOUNTS.map((d, i) => ({
            id: `preset_${i}`,
            description: d.description,
            amount: d.amount
        }));
        setMasterDiscounts(presetWithIds);
      }
    });

    const unsubRooms = onValue(ref(db, 'app_data/rooms'), (snapshot) => {
      const data = snapshot.val() as Record<string, RoomDefinition> | null;
      const roomsMap = new Map(DEFAULT_ROOM_DATA.map(room => [room.id, room] as const));

      if (data) {
        Object.values(data).forEach((room) => {
          if (room?.id) {
            roomsMap.set(room.id, room);
          }
        });
      }

      setRooms(Array.from(roomsMap.values()));
    });

    const unsubProperty = onValue(ref(db, 'app_data/property_info'), (snapshot) => {
      const data = snapshot.val();
      if (data) setPropertyInfo({ ...DEFAULT_PROPERTY_INFO, ...(data as PropertyInfo) });
      else setPropertyInfo(DEFAULT_PROPERTY_INFO);
    });

    const unsubTemplate = onValue(ref(db, 'app_data/templates/zalo'), (snapshot) => {
        const val = snapshot.val();
        if (val) setZaloTemplate(val);
    });

    return () => {
      unsubRoomStates();
      unsubServices();
      unsubDiscounts();
      unsubRooms();
      unsubProperty();
      unsubTemplate();
    };
  }, [enabled, user]);

  const cleanRoom = async (roomId: string) => { 
    if (!window.confirm(`Xác nhận đã dọn sạch phòng ${roomId}?`)) return; 
    await update(ref(db, 'app_data/room_states'), { [roomId]: 'clean' });
  };

  const updateProperty = async (updates: Partial<PropertyInfo>) => {
    setPropertyInfo(prev => ({ ...prev, ...updates }));
    await update(ref(db, 'app_data/property_info'), updates);
    await logMasterDataAction('update_property_info', `Cập nhật thông tin cơ sở lưu trú: ${Object.keys(updates).join(', ')}`);
  };

  const updateZaloTemplate = async (newTemplate: string) => {
      setZaloTemplate(newTemplate);
      await set(ref(db, 'app_data/templates/zalo'), newTemplate);
  };

  const addService = async (name: string, price: number) => {
    if (!name || !price) return;
    const id = Date.now().toString();
    await set(ref(db, `services/${id}`), { id, name, price, isDeleted: false });
    await logMasterDataAction('add_service', `Thêm dịch vụ ${name} (${price})`, id);
  };

  const removeService = async (id: string) => {
    // Soft delete
    await update(ref(db, `services/${id}`), { isDeleted: true });
    await logMasterDataAction('remove_service', `Ẩn dịch vụ ${id}`, id);
  };

  const addDiscount = async (description: string, amount: number) => {
    if (!description || !amount) return;
    const id = Date.now().toString();
    await set(ref(db, `app_data/discounts/${id}`), { id, description, amount });
    await logMasterDataAction('add_discount', `Thêm ưu đãi ${description} (${amount})`, id);
  };

  const removeDiscount = async (id: string) => {
    await update(ref(db, `app_data/discounts/${id}`), { isDeleted: true });
    await logMasterDataAction('remove_discount', `Ẩn ưu đãi ${id}`, id);
  };

  // --- ROOM CRUD ---
  const saveRoom = async (room: RoomDefinition) => {
      if (!room.id) return;
      await set(ref(db, `app_data/rooms/${room.id}`), room);
      await logMasterDataAction('save_room', `Lưu cấu hình phòng ${room.id} (${room.name || 'N/A'})`, room.id);
  };

  const deleteRoom = async (roomId: string) => {
      // Hard delete allowed for room config for now, or could implementing soft delete if strict
      await remove(ref(db, `app_data/rooms/${roomId}`));
      await logMasterDataAction('delete_room', `Xóa cấu hình phòng ${roomId}`, roomId);
  };

  return {
    roomStates,
    masterServices,
    masterDiscounts,
    rooms,
    zaloTemplate,
    propertyInfo,
    cleanRoom,
    updateProperty,
    updateZaloTemplate,
    addService,
    removeService,
    addDiscount,
    removeDiscount,
    saveRoom,
    deleteRoom
  };
};
