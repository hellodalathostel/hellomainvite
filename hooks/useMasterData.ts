
import { useState, useEffect } from 'react';
import { ref, onValue, set, update, remove } from "firebase/database";
import { db } from '../config/database';
import { RoomState, ServiceDefinition, PropertyInfo, RoomDefinition, DiscountDefinition } from '../types/types';
import { DEFAULT_SERVICES, PROPERTY_INFO as DEFAULT_PROPERTY_INFO, DEFAULT_ROOM_DATA, PRESET_DISCOUNTS, DEFAULT_ZALO_TEMPLATE } from '../config/constants';

export const useMasterData = (user: { uid: string } | null, enabled = true) => {
  const [roomStates, setRoomStates] = useState<RoomState>({});
  const [masterServices, setMasterServices] = useState<ServiceDefinition[]>(DEFAULT_SERVICES);
  const [masterDiscounts, setMasterDiscounts] = useState<DiscountDefinition[]>([]);
  const [rooms, setRooms] = useState<RoomDefinition[]>(DEFAULT_ROOM_DATA);
  const [zaloTemplate, setZaloTemplate] = useState<string>(DEFAULT_ZALO_TEMPLATE);
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo>(DEFAULT_PROPERTY_INFO);

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
        setMasterDiscounts(Object.values(data));
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
        const data = snapshot.val();
        if (data) {
            setRooms(Object.values(data));
        } else {
            setRooms(DEFAULT_ROOM_DATA);
        }
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
  };

  const updateZaloTemplate = async (newTemplate: string) => {
      setZaloTemplate(newTemplate);
      await set(ref(db, 'app_data/templates/zalo'), newTemplate);
  };

  const addService = async (name: string, price: number) => {
    if (!name || !price) return;
    const id = Date.now().toString();
    await set(ref(db, `services/${id}`), { id, name, price, isDeleted: false });
  };

  const removeService = async (id: string) => {
    // Soft delete
    await update(ref(db, `services/${id}`), { isDeleted: true });
  };

  const addDiscount = async (description: string, amount: number) => {
    if (!description || !amount) return;
    const id = Date.now().toString();
    await set(ref(db, `app_data/discounts/${id}`), { id, description, amount });
  };

  const removeDiscount = async (id: string) => {
    await remove(ref(db, `app_data/discounts/${id}`));
  };

  // --- ROOM CRUD ---
  const saveRoom = async (room: RoomDefinition) => {
      if (!room.id) return;
      await set(ref(db, `app_data/rooms/${room.id}`), room);
  };

  const deleteRoom = async (roomId: string) => {
      // Hard delete allowed for room config for now, or could implementing soft delete if strict
      await remove(ref(db, `app_data/rooms/${roomId}`));
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
