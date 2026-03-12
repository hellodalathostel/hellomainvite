import { useState, useEffect, useCallback, useMemo } from 'react';
import { ref, onValue, update, query, orderByChild, startAt, endAt, get, child, push } from "firebase/database";
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from '../config/firebaseConfig';
import type { Booking, BookingEntity, GroupEntity, Service, Discount } from '../types/types';
import { getDaysDiff, addDays, formatCurrency, isOverlap, now } from '../utils/utils';
import { mergeBookingData } from '../utils/dataConverters';
import { useAudit } from './useAudit';
import type { SuggestedGuest, SaveBookingPayload } from '../types/bookingForm';

type UpdateMap = Record<string, unknown>;
type LegacyBookingFields = Partial<Pick<Booking, 'guestName' | 'phone' | 'otaBookingNumber' | 'source' | 'note' | 'paid'>>;

export type AddRoomPayload = {
  roomId: string;
  checkIn: string;
  checkOut: string;
  price: number;
  hasEarlyCheckIn?: boolean;
  hasLateCheckOut?: boolean;
  services?: Service[];
  discounts?: Discount[];
  surcharge?: number;
};

export const useBookings = (user: FirebaseUser | null, startDate?: string, endDate?: string) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestedGuest, setSuggestedGuest] = useState<SuggestedGuest | null>(null);
  const { logAction } = useAudit(user);

  // Check if a room is free for a date range by scanning existing bookings.
  // OPTIMIZED: Use in-memory state first; fallback queries by roomId using DB index.
  const assertRoomAvailable = async (roomId: string, checkIn: string, checkOut: string, ignoreBookingId?: string) => {
    type CollisionBooking = {
      id: string;
      roomId: string;
      status: Booking['status'];
      checkIn: string;
      checkOut: string;
      isDeleted?: boolean;
    };

    let checkList: CollisionBooking[];

    if (bookings.length > 0) {
      // Fast path: filter in-memory bookings by roomId
      checkList = bookings
        .filter(b => b.roomId === roomId)
        .map(b => ({
          id: b.id,
          roomId: b.roomId,
          status: b.status,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          isDeleted: b.isDeleted,
        }));
    } else {
      // Fallback: query DB using roomId index to avoid loading all bookings
      const roomQuery = query(ref(db, 'bookings'), orderByChild('roomId'), startAt(roomId), endAt(roomId));
      const snapshot = await get(roomQuery);
      const val = snapshot.val() || {};
      checkList = Object.entries(val).map(([id, b]) => {
        const entity = b as BookingEntity;
        return {
          id,
          roomId: entity.roomId,
          status: entity.status,
          checkIn: entity.checkIn,
          checkOut: entity.checkOut,
          isDeleted: entity.isDeleted,
        };
      });
    }

    for (const b of checkList) {
      if (ignoreBookingId && b.id === ignoreBookingId) continue;
      if (b.status === 'cancelled' || b.isDeleted === true) continue;

      if (isOverlap(checkIn, checkOut, b.checkIn, b.checkOut)) {
        throw new Error(`Phòng ${roomId} bị trùng lịch với booking ${b.id}`);
      }
    }
  };

  const addRoomToGroup = async (groupId: string, payload: AddRoomPayload) => {
    const { roomId, checkIn, checkOut, price } = payload;

    if (!checkIn || !checkOut || checkIn >= checkOut) {
      throw new Error("Ngày không hợp lệ (check-in phải nhỏ hơn check-out).");
    }

    // 1) Check room availability
    await assertRoomAvailable(roomId, checkIn, checkOut);

    // 2) Create new booking id
    const newBookingRef = push(ref(db, "bookings"));
    const newBookingId = newBookingRef.key as string;
    if (!newBookingId) throw new Error("Không tạo được bookingId.");

    // 3) Create BookingEntity
    const bookingEntity: BookingEntity = {
      id: newBookingId,
      roomId,
      groupId,
      checkIn,
      checkOut,
      hasEarlyCheckIn: payload.hasEarlyCheckIn ?? false,
      hasLateCheckOut: payload.hasLateCheckOut ?? false,
      price,
      status: "booked",
      services: payload.services ?? [],
      discounts: payload.discounts ?? [],
      surcharge: payload.surcharge ?? 0,
      createdAt: now(),
      updatedAt: now()
    };

    // 4) Multi-location update (atomic)
    const updates: UpdateMap = {};
    updates[`/bookings/${newBookingId}`] = bookingEntity;
    updates[`/groups/${groupId}/roomIds/${newBookingId}`] = roomId;
    updates[`/groups/${groupId}/updatedAt`] = now();

    await update(ref(db), updates);

    return newBookingId;
  };

  const convertSingleToGroup = async (oldBookingId: string, newRoom: AddRoomPayload) => {
    // Load old booking
    const oldSnap = await get(child(ref(db), `bookings/${oldBookingId}`));
    if (!oldSnap.exists()) throw new Error("Không tìm thấy booking lẻ.");

    const oldBooking = oldSnap.val() as BookingEntity;
    const oldBookingLegacy = oldBooking as BookingEntity & LegacyBookingFields;

    // Nếu đã có groupId thì không phải booking lẻ
    if (oldBooking.groupId) {
      // Nếu bạn muốn: gọi thẳng addRoomToGroup
      const newBookingId = await addRoomToGroup(oldBooking.groupId, newRoom);
      return { groupId: oldBooking.groupId, newBookingId };
    }

    // Validate new room
    if (!newRoom.checkIn || !newRoom.checkOut || newRoom.checkIn >= newRoom.checkOut) {
      throw new Error("Ngày phòng mới không hợp lệ.");
    }

    // Check new room availability
    await assertRoomAvailable(newRoom.roomId, newRoom.checkIn, newRoom.checkOut);

    // Create groupId
    const groupRef = push(ref(db, "groups"));
    const newGroupId = groupRef.key as string;
    if (!newGroupId) throw new Error("Không tạo được groupId.");

    // Create new booking id for second room
    const newBookingRef = push(ref(db, "bookings"));
    const newBookingId = newBookingRef.key as string;
    if (!newBookingId) throw new Error("Không tạo được bookingId mới.");

    // [Chưa xác minh] Nguồn dữ liệu customer cho booking lẻ:
    // - Nếu bạn vẫn có legacy fields guestName/phone/source/note trong BookingEntity: lấy từ đó
    // - Nếu không có: bạn cần truyền từ UI (booking view model)
    //
    // Ở đây giả định booking lẻ cũ đã có các field này được lưu trong node "legacy" hoặc bạn đang lưu trực tiếp.
    const legacyGuestName = oldBookingLegacy.guestName;
    const legacyPhone = oldBookingLegacy.phone;
    const legacySource = oldBookingLegacy.source;
    const legacyNote = oldBookingLegacy.note;

    // Hard validation: booking lẻ phải có đủ thông tin khách
    if (!legacyGuestName || !legacyPhone || !legacySource) {
      throw new Error("Booking lẻ thiếu thông tin khách (guestName/phone/source). Không thể chuyển thành booking đoàn.");
    }

    const groupEntity: GroupEntity = {
      id: newGroupId,
      customer: {
        name: legacyGuestName,
        phone: legacyPhone,
        otaBookingNumber: oldBookingLegacy.otaBookingNumber || '',
        source: legacySource,
        note: legacyNote
      },
      payment: {
        paid: oldBookingLegacy.paid ?? 0
      },
      roomIds: {
        [oldBookingId]: oldBooking.roomId,
        [newBookingId]: newRoom.roomId
      },
      status: "active",
      createdAt: now(),
      updatedAt: now()
    };

    const newBookingEntity: BookingEntity = {
      id: newBookingId,
      roomId: newRoom.roomId,
      groupId: newGroupId,
      checkIn: newRoom.checkIn,
      checkOut: newRoom.checkOut,
      hasEarlyCheckIn: newRoom.hasEarlyCheckIn ?? false,
      hasLateCheckOut: newRoom.hasLateCheckOut ?? false,
      price: newRoom.price,
      status: "booked",
      services: newRoom.services ?? [],
      discounts: newRoom.discounts ?? [],
      surcharge: newRoom.surcharge ?? 0,
      createdAt: now(),
      updatedAt: now()
    };

    // Update old booking to link groupId
    const updates: UpdateMap = {};
    updates[`/groups/${newGroupId}`] = groupEntity;
    updates[`/bookings/${oldBookingId}/groupId`] = newGroupId;
    updates[`/bookings/${oldBookingId}/updatedAt`] = now();
    updates[`/bookings/${newBookingId}`] = newBookingEntity;
    updates[`/groups/${newGroupId}/roomIds/${oldBookingId}`] = oldBooking.roomId;
    updates[`/groups/${newGroupId}/roomIds/${newBookingId}`] = newRoom.roomId;

    await update(ref(db), updates);

    return { groupId: newGroupId, newBookingId };
  };

  const removeRoomFromGroup = async (groupId: string, bookingIdToRemove: string) => {
    // Mark booking cancelled
    const updates: UpdateMap = {};
    updates[`/bookings/${bookingIdToRemove}/status`] = "cancelled";
    updates[`/bookings/${bookingIdToRemove}/updatedAt`] = now();

    // Remove mapping from group
    updates[`/groups/${groupId}/roomIds/${bookingIdToRemove}`] = null;
    updates[`/groups/${groupId}/updatedAt`] = now();

    await update(ref(db), updates);
  };

  // 1. Fetch Logic: Load both Bookings and Groups
  useEffect(() => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Listen to Bookings (include stays that overlap the current window)
    let bookingsRef = query(ref(db, 'bookings'));
    if (endDate) {
      // Query all bookings with checkIn <= endDate, then filter by overlap below.
      // This avoids missing long stays that started before startDate.
      bookingsRef = query(bookingsRef, orderByChild('checkIn'), startAt(''), endAt(endDate));
    }

    // Listen to Groups
    const groupsRef = ref(db, 'groups');

    // Combine listeners
    let rawBookings: Record<string, BookingEntity> = {};
    let rawGroups: Record<string, GroupEntity> = {};

    const unsubBookings = onValue(bookingsRef, (snapB) => {
        rawBookings = snapB.val() || {};
        triggerUpdate();
    });

    const unsubGroups = onValue(groupsRef, (snapG) => {
        rawGroups = snapG.val() || {};
        triggerUpdate();
    });

    function triggerUpdate() {
        const combinedList: Booking[] = [];
        
        Object.entries(rawBookings).forEach(([bId, bEntity]) => {
            // FILTER: Soft Deleted
            if (bEntity.isDeleted) return;

          // Keep only bookings that overlap the requested window.
          if (startDate && endDate) {
            const overlapsWindow = bEntity.checkIn < endDate && bEntity.checkOut > startDate;
            if (!overlapsWindow) return;
          }

            let group: GroupEntity | undefined = undefined;
            if (bEntity.groupId && rawGroups[bEntity.groupId]) {
                group = rawGroups[bEntity.groupId];
            }

            // Merge Data
            const viewBooking = mergeBookingData(bEntity, group);

            if (group) {
                viewBooking.paid = group.payment.paid;
            }

            combinedList.push(viewBooking);
        });

        setBookings(combinedList);
        setLoading(false);
      }

    return () => {
        unsubBookings();
        unsubGroups();
    };
  }, [user, startDate, endDate]);


  // Helper: Collision Check
  const checkCollisionInternal = useCallback((
      roomId: string,
      start: string,
      end: string,
      ignoreId: string | null = null
  ) => {
    return bookings.find(b => {
        if (ignoreId && b.id === ignoreId) return false;
        if (b.roomId !== roomId) return false;
        if (b.status === 'checked-out' || b.status === 'cancelled') return false;
        return (start < b.checkOut && end > b.checkIn);
    });
  }, [bookings]);

  const checkRoomCollision = (
      roomId: string, 
      checkInStr: string, 
      checkOutStr: string, 
      ignoreId: string | null = null,
      isEarly: boolean = false,
      isLate: boolean = false
  ) => { 
    const reqStart = isEarly ? addDays(checkInStr, -1) : checkInStr;
    const reqEnd = isLate ? addDays(checkOutStr, 1) : checkOutStr;
    return checkCollisionInternal(roomId, reqStart, reqEnd, ignoreId);
  };

  const guestSearchIndexes = useMemo(() => {
    const phoneMap: Record<string, { guestName?: string; source?: string; phone?: string; otaBookingNumber?: string }> = {};
    const nameMap: Record<string, { guestName?: string; source?: string; phone?: string; otaBookingNumber?: string }> = {};

    bookings.forEach((booking) => {
      if (booking.status === 'cancelled' || booking.isDeleted) return;

      if (booking.phone) {
        const normalizedPhone = booking.phone.replace(/\s+/g, '').toLowerCase();
        if (normalizedPhone && !phoneMap[normalizedPhone]) {
          phoneMap[normalizedPhone] = {
            guestName: booking.guestName,
            source: booking.source,
            phone: booking.phone,
            otaBookingNumber: booking.otaBookingNumber,
          };
        }
      }

      if (booking.guestName) {
        const normalizedName = booking.guestName.trim().toLowerCase();
        if (normalizedName && !nameMap[normalizedName]) {
          nameMap[normalizedName] = {
            guestName: booking.guestName,
            source: booking.source,
            phone: booking.phone,
            otaBookingNumber: booking.otaBookingNumber,
          };
        }
      }
    });

    return { phoneMap, nameMap };
  }, [bookings]);

  const findGuestByPhone = useCallback((phone: string) => {
    if (!phone) return;
    const normalizedPhone = phone.replace(/\s+/g, '').toLowerCase();
    const directHit = guestSearchIndexes.phoneMap[normalizedPhone];

    if (directHit) {
      setSuggestedGuest(directHit);
      return;
    }

    const partialHit = Object.entries(guestSearchIndexes.phoneMap).find(([storedPhone]) => storedPhone.includes(normalizedPhone));
    if (partialHit) {
      setSuggestedGuest(partialHit[1]);
    }
  }, [guestSearchIndexes.phoneMap, setSuggestedGuest]);

  // Find guest by name and suggest phone
  const findGuestByName = useCallback((name: string) => {
    if (!name) return;
    const lowerName = name.trim().toLowerCase();
    const directHit = guestSearchIndexes.nameMap[lowerName];

    if (directHit) {
      setSuggestedGuest(directHit);
      return;
    }

    const partialHit = Object.entries(guestSearchIndexes.nameMap).find(([storedName]) => storedName.includes(lowerName));
    if (partialHit) {
      setSuggestedGuest(partialHit[1]);
    }
  }, [guestSearchIndexes.nameMap, setSuggestedGuest]);

  /**
   * ATOMIC SAVE BOOKING WITH AUDIT
   */
  const saveBooking = async (data: SaveBookingPayload) => {
    const timestamp = Date.now();
    const updates: UpdateMap = {};
    
    let groupId = data.groupId;
    const isNewGroup = data.isGroupMode && !data.id;
    let isMigration = false;

    // Determine Group ID strategy
    if (isNewGroup) {
        groupId = crypto.randomUUID();
    } else if (data.id && !groupId) {
        // MIGRATION: Auto-create group for legacy booking
        groupId = crypto.randomUUID();
        isMigration = true;
        updates[`bookings/${data.id}/groupId`] = groupId;
        console.log(`Auto-migrated booking ${data.id} to group ${groupId}`);
    }

    // AUDIT LOGGING - OPTIMIZED: Compare with already-loaded bookings to avoid extra get() call
    if (data.id) {
        try {
            // Find existing booking in already-loaded state (faster than DB get)
            const existingBooking = bookings.find(b => b.id === data.id);
            if (existingBooking) {
                const changes = [];
                if (existingBooking.price !== data.price) changes.push(`Giá: ${formatCurrency(existingBooking.price)} -> ${formatCurrency(data.price)}`);
                if (existingBooking.checkIn !== data.checkIn) changes.push(`CheckIn: ${existingBooking.checkIn} -> ${data.checkIn}`);
                if (existingBooking.checkOut !== data.checkOut) changes.push(`CheckOut: ${existingBooking.checkOut} -> ${data.checkOut}`);
                if (existingBooking.status !== data.status) changes.push(`Status: ${existingBooking.status} -> ${data.status}`);
                
                if (changes.length > 0) {
                    logAction('update_booking', `Sửa Booking ${data.roomId}: ${changes.join(' | ')}`, data.id);
                }
            }
        } catch (e) {
            console.error("Audit error", e);
        }
    }
    
    // 1. Group Data Preparation
    if (groupId) {
        const customer = {
            name: data.guestName || '',
            phone: data.phone || '',
          otaBookingNumber: data.otaBookingNumber || '',
            source: data.source || 'Vãng lai',
            note: data.note || ''
        };
        
        const payment = {
                paid: Number(data.paid) || 0,
                depositMethod: data.depositMethod || data.paymentMethod || 'cash',
                transactionId: data.transactionId || null
            };

            if (isNewGroup) {
                // Will set full object later after accumulating roomIds
            } else if (isMigration) {
                // Migration: Set full object now
                updates[`groups/${groupId}`] = {
                    id: groupId,
                    customer,
                    payment,
                    roomIds: { [data.id]: data.roomId },
                    status: 'active',
                    createdAt: data.createdAt || timestamp,
                    updatedAt: timestamp
                };
            } else {
                // Existing Group: Partial updates to avoid overwriting other potential fields
                updates[`groups/${groupId}/customer`] = customer;
                updates[`groups/${groupId}/payment`] = payment;
                updates[`groups/${groupId}/updatedAt`] = timestamp;
            }
        }

    // 2. Booking Data & Linkage
    if (isNewGroup) {
        // Case A: New Group
    }

    // 2. Booking Data & Linkage
    if (isNewGroup) {
        // Case A: New Group
        const roomIdsMap: Record<string, string> = {};
        
        data.selectedRooms.forEach((rid: string) => {
             const bookingId = crypto.randomUUID();
             const rDates = data.roomDates?.[rid] || { checkIn: data.checkIn, checkOut: data.checkOut };
             const price = data.groupPrices?.[rid] || data.price;
             
             const bookingEntity: BookingEntity = {
                 id: bookingId,
                 roomId: rid,
                 groupId: groupId,
                 checkIn: rDates.checkIn,
                 checkOut: rDates.checkOut,
                 status: 'booked',
                 price: price,
                 services: data.services || [],
                 discounts: data.discounts || [],
                 surcharge: 0,
                 createdAt: timestamp,
                 updatedAt: timestamp,
                 isDeleted: false
             };
             
             updates[`bookings/${bookingId}`] = bookingEntity;
             roomIdsMap[bookingId] = rid;
        });
        
        // Set Group Full Object here to include roomIds map
        updates[`groups/${groupId}`] = {
            id: groupId,
            customer: {
                name: data.guestName || '',
                phone: data.phone || '',
              otaBookingNumber: data.otaBookingNumber || '',
                source: data.source || 'Vãng lai',
                note: data.note || ''
            },
            payment: {
                paid: Number(data.paid) || 0,
                depositMethod: data.depositMethod || data.paymentMethod || 'cash',
                transactionId: data.transactionId || null
            },
            roomIds: roomIdsMap,
            status: 'active',
            createdAt: timestamp,
            updatedAt: timestamp
        };
        
        logAction('create_group', `Tạo đoàn mới: ${data.guestName} - ${data.selectedRooms.length} phòng`);

    } else if (data.id) {
        // Case B: Update Existing Booking
        const bookingId = data.id;
        
        updates[`bookings/${bookingId}/roomId`] = data.roomId;
        updates[`bookings/${bookingId}/checkIn`] = data.checkIn;
        updates[`bookings/${bookingId}/checkOut`] = data.checkOut;
        updates[`bookings/${bookingId}/price`] = data.price;
        updates[`bookings/${bookingId}/status`] = data.status;
        updates[`bookings/${bookingId}/services`] = data.services || [];
        updates[`bookings/${bookingId}/discounts`] = data.discounts || [];
        updates[`bookings/${bookingId}/surcharge`] = data.surcharge || 0;
        updates[`bookings/${bookingId}/hasEarlyCheckIn`] = data.hasEarlyCheckIn || false;
        updates[`bookings/${bookingId}/hasLateCheckOut`] = data.hasLateCheckOut || false;
        updates[`bookings/${bookingId}/updatedAt`] = timestamp;

        // Legacy cleanup (Only if linked to group)
        if (groupId) {
            updates[`bookings/${bookingId}/paid`] = null;
            updates[`bookings/${bookingId}/deposit`] = null;
            updates[`bookings/${bookingId}/paymentMethod`] = null;
        }

    } else {
        // Case C: New Single Booking (No group mode selected)
        const newGroupId = crypto.randomUUID();
        const newBookingId = crypto.randomUUID();
        
        updates[`groups/${newGroupId}`] = {
            id: newGroupId,
            customer: {
                name: data.guestName || '',
                phone: data.phone || '',
              otaBookingNumber: data.otaBookingNumber || '',
                source: data.source || 'Vãng lai',
                note: data.note || ''
            },
            payment: {
                paid: Number(data.paid) || 0,
                depositMethod: data.depositMethod || data.paymentMethod || 'cash',
                transactionId: data.transactionId || null,
            },
            roomIds: { [newBookingId]: data.roomId },
            status: 'active',
            createdAt: timestamp,
            updatedAt: timestamp
        };

        updates[`bookings/${newBookingId}`] = {
            id: newBookingId,
            roomId: data.roomId,
            groupId: newGroupId,
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            price: data.price,
            status: 'booked',
            services: data.services || [],
            discounts: data.discounts || [],
            surcharge: data.surcharge || 0,
            hasEarlyCheckIn: data.hasEarlyCheckIn || false,
            hasLateCheckOut: data.hasLateCheckOut || false,
            createdAt: timestamp,
            updatedAt: timestamp,
            isDeleted: false
        };
        logAction('create_booking', `Tạo đơn lẻ: ${data.roomId} - ${data.guestName}`, newBookingId);
    }

    await update(ref(db), updates);
  };

  const extendBooking = async (booking: Booking) => {
      const timestamp = Date.now();
      const currentCheckOut = booking.checkOut;
      const newCheckOut = addDays(currentCheckOut, 1);
      
      const collision = checkCollisionInternal(booking.roomId, currentCheckOut, newCheckOut, booking.id);
      
      if (collision) {
          throw new Error(`Phòng ${booking.roomId} đã có khách vào ngày ${currentCheckOut}.`);
      }

      const updates: UpdateMap = {};
      updates[`bookings/${booking.id}/checkOut`] = newCheckOut;
      updates[`bookings/${booking.id}/updatedAt`] = timestamp;
      
      if (booking.groupId) {
          updates[`groups/${booking.groupId}/updatedAt`] = timestamp;
      }

      await update(ref(db), updates);
      logAction('extend_booking', `Gia hạn ${booking.roomId} thêm 1 đêm đến ${newCheckOut}`, booking.id);
  };

  const cancelBooking = async (id: string, isGroupDelete = false, groupId: string | null = null) => {
    const updates: UpdateMap = {};
    const timestamp = Date.now();

    if (isGroupDelete && groupId) {
        const groupBookings = bookings.filter(b => b.groupId === groupId);
        groupBookings.forEach(b => {
             updates[`bookings/${b.id}/isDeleted`] = true;
             updates[`bookings/${b.id}/updatedAt`] = timestamp;
        });
        logAction('delete_group', `Xóa đoàn ${groupId} (Soft Delete)`);
    } else {
        updates[`bookings/${id}/isDeleted`] = true;
        updates[`bookings/${id}/updatedAt`] = timestamp;
        logAction('delete_booking', `Xóa đơn ${id} (Soft Delete)`, id);
    }
    
    await update(ref(db), updates);
  };

  const splitBooking = async (originalBooking: Booking, newRoomId: string) => {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = Date.now();
      const updates: UpdateMap = {};
      
      if (originalBooking.checkIn >= today) throw new Error("Khách chưa đến, vui lòng đổi số phòng.");
      if (originalBooking.checkOut <= today) throw new Error("Khách đã/sắp trả phòng.");
      const collision = checkCollisionInternal(newRoomId, today, originalBooking.checkOut);
      if (collision) throw new Error(`Phòng ${newRoomId} đã có khách.`);

      let groupId = originalBooking.groupId;
      if(!groupId) {
          groupId = crypto.randomUUID();
          updates[`groups/${groupId}`] = {
              id: groupId,
              customer: { name: originalBooking.guestName, phone: originalBooking.phone, source: originalBooking.source },
              payment: { paid: originalBooking.paid },
              roomIds: { [originalBooking.id]: originalBooking.roomId },
              status: 'active',
              createdAt: Date.now(),
              updatedAt: Date.now()
          };
          updates[`bookings/${originalBooking.id}/groupId`] = groupId;
      }

      updates[`bookings/${originalBooking.id}/checkOut`] = today;
      updates[`bookings/${originalBooking.id}/updatedAt`] = timestamp;

      const newBookingId = crypto.randomUUID();
      updates[`bookings/${newBookingId}`] = {
          id: newBookingId,
          roomId: newRoomId,
          groupId: groupId,
          checkIn: today,
          checkOut: originalBooking.checkOut,
          status: 'checked-in',
          price: originalBooking.price,
          services: [],
          discounts: [],
          surcharge: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
          isDeleted: false
      };
      updates[`groups/${groupId}/roomIds/${newBookingId}`] = newRoomId;
      
      await update(ref(db), updates);
      logAction('split_booking', `Tách phòng ${originalBooking.roomId} sang ${newRoomId}`, originalBooking.id);
      return newBookingId;
  };

  const repairGroup = async (groupId: string) => {
      const timestamp = Date.now();
      const updates: UpdateMap = {};
      const groupSnap = await get(ref(db, `groups/${groupId}`));
      const groupExists = groupSnap.exists();
      const groupBookings = bookings.filter(b => b.groupId === groupId);
      if (groupBookings.length === 0) throw new Error("No bookings found");

      if (!groupExists) {
          const leader = groupBookings[0];
          updates[`groups/${groupId}`] = {
              id: groupId,
              customer: { name: leader.guestName, phone: leader.phone, source: leader.source, note: leader.note },
              payment: { paid: leader.paid || 0 },
              roomIds: {},
              status: 'active',
              createdAt: leader.createdAt,
              updatedAt: timestamp
          };
      }
      const correctRoomIds: Record<string, string> = {};
      groupBookings.forEach(b => { if (!b.isDeleted) correctRoomIds[b.id] = b.roomId; });
      updates[`groups/${groupId}/roomIds`] = correctRoomIds;
      updates[`groups/${groupId}/updatedAt`] = timestamp;
      await update(ref(db), updates);
      logAction('repair_group', `Sửa lỗi group ${groupId}`);
  };

  return {
    bookings,
    loading,
    suggestedGuest,
    setSuggestedGuest,
    findGuestByPhone,
    findGuestByName,
    checkRoomCollision,
    saveBooking,
    cancelBooking,
    splitBooking,
    addRoomToGroup,
    convertSingleToGroup,
    removeRoomFromGroup,
    repairGroup,
    extendBooking
  };
};
