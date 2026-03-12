import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ref, onValue, update, push, get, remove } from "firebase/database";
import { db } from '../config/firebaseConfig';
import type { CustomerRecord, CustomerUsageRecord } from '../types/types';
import { now } from '../utils/utils';

export const useCustomerHistory = () => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, CustomerRecord>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const usageCacheRef = useRef<Map<string, CustomerUsageRecord[]>>(new Map());
  const pageSize = 50; // Load 50 customers per page

  // Memoized paginated customers for infinite scroll
  const paginatedCustomers = useMemo(() => {
    return customers.slice(0, (currentPage + 1) * pageSize);
  }, [customers, currentPage, pageSize]);

  const hasMore = useMemo(() => {
    return paginatedCustomers.length < customers.length;
  }, [paginatedCustomers.length, customers.length]);

  const searchableCustomers = useMemo(() => {
    return customers.map((customer) => ({
      customer,
      lowerName: customer.name.toLowerCase(),
      normalizedPhone: customer.phone.replace(/\s+/g, ''),
      cccd: customer.cccd || '',
    }));
  }, [customers]);

  // Load customers from Firebase
  useEffect(() => {
    const customersRef = ref(db, 'customers');
    const unsubscribe = onValue(customersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const customerList: CustomerRecord[] = Object.entries(data)
          .map(([id, val]) => ({ ...(val as any), id }))
          .filter(c => !c.isDeleted)
          .sort((a, b) => b.createdAt - a.createdAt);
        
        setCustomers(customerList);
        setCustomersMap(data);
      } else {
        setCustomers([]);
        setCustomersMap({});
      }
      setLoading(false);
    }, (error) => {
      console.warn('Error loading customers:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Add or update customer
  const saveCustomer = async (customer: Omit<CustomerRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    try {
      const { id, ...data } = customer;
      const timestamp = now();
      
      if (id && customersMap[id]) {
        // Update existing
        const updates: Record<string, any> = {};
        updates[`customers/${id}/name`] = data.name;
        updates[`customers/${id}/cccd`] = data.cccd || '';
        updates[`customers/${id}/phone`] = data.phone;
        updates[`customers/${id}/source`] = data.source || '';
        updates[`customers/${id}/note`] = data.note || '';
        updates[`customers/${id}/updatedAt`] = timestamp;
        
        await update(ref(db), updates);
        return id;
      } else {
        // Create new
        const newRef = push(ref(db, 'customers'));
        const newId = newRef.key as string;
        
        const newCustomer: CustomerRecord = {
          id: newId,
          name: data.name,
          cccd: data.cccd,
          phone: data.phone,
          source: data.source,
          note: data.note,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        const updates: Record<string, any> = {};
        updates[`customers/${newId}`] = newCustomer;
        await update(ref(db), updates);
        return newId;
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      throw error;
    }
  };

  // Delete customer (soft delete)
  const deleteCustomer = async (customerId: string) => {
    try {
      const updates: Record<string, any> = {};
      updates[`customers/${customerId}/isDeleted`] = true;
      updates[`customers/${customerId}/updatedAt`] = now();
      await update(ref(db), updates);
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  // Record customer usage (from booking)
  const recordCustomerUsage = async (customerId: string, bookingId: string, bookingName: string, checkIn: string, checkOut: string, phone: string, source?: string) => {
    try {
      const usageRef = push(ref(db, `customerUsage/${customerId}`));
      const usageRecord: CustomerUsageRecord = {
        bookingId,
        bookingName,
        checkIn,
        checkOut,
        phone,
        source,
        createdAt: now(),
      };
      
      const updates: Record<string, any> = {};
      updates[`customerUsage/${customerId}/${usageRef.key}`] = usageRecord;
      await update(ref(db), updates);
      usageCacheRef.current.delete(customerId);
    } catch (error) {
      console.error('Error recording customer usage:', error);
      throw error;
    }
  };

  // Get customer usage history
  const getCustomerUsage = useCallback(async (customerId: string): Promise<CustomerUsageRecord[]> => {
    try {
      if (usageCacheRef.current.has(customerId)) {
        return usageCacheRef.current.get(customerId) || [];
      }

      const snapshot = await get(ref(db, `customerUsage/${customerId}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const usage = Object.entries(data)
          .map(([, val]) => val as CustomerUsageRecord)
          .sort((a, b) => b.createdAt - a.createdAt);
        usageCacheRef.current.set(customerId, usage);
        return usage;
      }
      usageCacheRef.current.set(customerId, []);
      return [];
    } catch (error) {
      console.error('Error getting customer usage:', error);
      return [];
    }
  }, []);

  // Get all usage records
  const getAllUsage = async (): Promise<Record<string, CustomerUsageRecord[]>> => {
    try {
      const snapshot = await get(ref(db, 'customerUsage'));
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return {};
    } catch (error) {
      console.error('Error getting all usage:', error);
      return {};
    }
  };

  // Memoized phone to customer map for O(1) lookups
  const customerByPhoneMap = useMemo(() => {
    const map = new Map<string, CustomerRecord>();
    customers.forEach(c => {
      if (c.phone) {
        map.set(c.phone, c);
      }
    });
    return map;
  }, [customers]);

  // Get customer by phone (efficient lookup)
  const getCustomerByPhone = useCallback((phone: string): CustomerRecord | undefined => {
    return customerByPhoneMap.get(phone);
  }, [customerByPhoneMap]);

  // Search customer by phone or name (with pagination)
  const searchCustomer = (query: string, limit: number = 20): CustomerRecord[] => {
    if (!query.trim()) return customers.slice(0, limit);
    
    const lowQuery = query.toLowerCase();
    const normalizedQuery = query.replace(/\s+/g, '');

    return searchableCustomers
      .filter(({ lowerName, normalizedPhone, cccd }) =>
        lowerName.includes(lowQuery) ||
        normalizedPhone.includes(normalizedQuery) ||
        cccd.includes(query)
      )
      .map(({ customer }) => customer)
      .slice(0, limit); // Limit results to reduce rendering
  };

  // Find or create customer from guest info
  const findOrCreateCustomer = async (name: string, phone: string, cccd?: string, source?: string, note?: string): Promise<CustomerRecord> => {
    // Search existing by phone
    const existing = getCustomerByPhone(phone);
    if (existing) {
      return existing;
    }

    // Create new
    const newId = await saveCustomer({
      name,
      phone,
      cccd,
      source,
      note,
    });

    return {
      id: newId,
      name,
      phone,
      cccd,
      source,
      note,
      createdAt: now(),
      updatedAt: now(),
    };
  };

  // Sync customers from bookings (create or update based on phone number)
  const syncCustomersFromBookings = async (bookings: any[]): Promise<number> => {
    let synced = 0;
    
    try {
      // Create a lookup map for better performance O(N)
      // We initialize from the memoized map to avoid redundant iterations
      const customerMap = new Map<string, CustomerRecord>(customerByPhoneMap);

      for (const booking of bookings) {
        // Skip deleted or cancelled bookings
        if (booking.isDeleted || booking.status === 'cancelled') {
          continue;
        }

        const phone = booking.phone?.trim();
        if (!phone) continue;

        // Check if customer exists - O(1) lookup
        const existing = customerMap.get(phone);

        if (existing) {
          // Update existing customer if new info has cccd or better source
          let needsUpdate = false;
          const updates: any = {};

          if (!existing.cccd && booking.guests && booking.guests.length > 0) {
            updates.cccd = booking.guests[0].cccd || '';
            needsUpdate = true;
          }

          if (booking.source && (!existing.source || existing.source !== booking.source)) {
            updates.source = booking.source;
            needsUpdate = true;
          }

          // Update name if different (prefer longer/more complete name)
          if (booking.guestName && booking.guestName.length > existing.name.length) {
            updates.name = booking.guestName;
            needsUpdate = true;
          }

          if (needsUpdate) {
            const updatedCustomer = {
              ...existing,
              ...updates,
            };
            await saveCustomer(updatedCustomer);

            // Update map to reflect changes for subsequent bookings in the same sync
            customerMap.set(phone, {
              ...updatedCustomer,
              updatedAt: now()
            });
            synced++;
          }
        } else {
          // Create new customer from booking
          const cccd = booking.guests && booking.guests.length > 0 ? booking.guests[0].cccd : '';
          
          const newCustomerData = {
            name: booking.guestName || 'Unknown',
            phone,
            cccd,
            source: booking.source,
            note: booking.note,
          };

          const newId = await saveCustomer(newCustomerData);

          // Add to map so we don't create it again if another booking has the same phone
          const newCustomer: CustomerRecord = {
            ...newCustomerData,
            id: newId,
            createdAt: now(),
            updatedAt: now(),
          };
          customerMap.set(phone, newCustomer);
          synced++;
        }
      }
    } catch (error) {
      console.error('Error syncing customers from bookings:', error);
    }

    return synced;
  };

  return {
    customers,
    paginatedCustomers, // Use this for list rendering (pagination support)
    customersMap,
    loading,
    hasMore,
    loadMore: () => setCurrentPage(prev => prev + 1), // Load next page
    saveCustomer,
    deleteCustomer,
    recordCustomerUsage,
    getCustomerUsage,
    getAllUsage,
    searchCustomer,
    getCustomerByPhone,
    findOrCreateCustomer,
    syncCustomersFromBookings,
  };
};
