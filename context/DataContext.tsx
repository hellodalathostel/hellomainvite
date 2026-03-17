
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { useBookings } from '../hooks/useBookings';
import type { AddRoomPayload } from '../hooks/useBookings';
import { useExpenses } from '../hooks/useExpenses';
import { useMasterData } from '../hooks/useMasterData';
import { useUI } from './UIContext';
import { Booking, Expense, RoomDefinition, ServiceDefinition, DiscountDefinition, RoomState, PropertyInfo } from '../types/types';
import { PropertyUpdates, SaveBookingPayload, SaveExpensePayload, SuggestedGuest } from '../types/bookingForm';

interface DataContextType {
    bookings: Booking[];
    expenses: Expense[];
    rooms: RoomDefinition[];
    masterServices: ServiceDefinition[];
    masterDiscounts: DiscountDefinition[];
    roomStates: RoomState;
    propertyInfo: PropertyInfo;
    zaloTemplate: string;
    
    actions: {
        saveBooking: (data: SaveBookingPayload) => Promise<void>;
        cancelBooking: (id: string, isGroup: boolean, groupId?: string) => Promise<void>;
        extendBooking: (booking: Booking) => Promise<void>;
        splitBooking: (original: Booking, newRoomId: string) => Promise<string>;
        addRoomToGroup: (groupId: string, payload: AddRoomPayload) => Promise<string>;
        convertSingleToGroup: (bookingId: string, payload: AddRoomPayload) => Promise<{ groupId: string; newBookingId: string }>;
        removeRoomFromGroup: (groupId: string, bookingId: string) => Promise<void>;
        repairGroup: (groupId: string) => Promise<void>;
        checkRoomCollision: (roomId: string, start: string, end: string, ignoreId?: string) => Booking | undefined;
        findGuestByPhone: (phone: string) => void;
        findGuestByName: (name: string) => void;
        
        saveExpense: (data: SaveExpensePayload) => Promise<void>;
        deleteExpense: (id: string) => Promise<void>;
        
        cleanRoom: (roomId: string) => Promise<void>;
        addService: (name: string, price: number) => Promise<void>;
        removeService: (id: string) => Promise<void>;
        addDiscount: (desc: string, amount: number) => Promise<void>;
        removeDiscount: (id: string) => Promise<void>;
        saveRoom: (room: RoomDefinition) => Promise<void>;
        deleteRoom: (id: string) => Promise<void>;
        updateProperty: (updates: PropertyUpdates) => Promise<void>;
    };

    loading: boolean;
    suggestedGuest: SuggestedGuest | null;
    setSuggestedGuest: (val: SuggestedGuest | null) => void;
    viewDate: Date;
    setViewDate: (date: Date) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode; user: FirebaseUser | null }> = ({ children, user }) => {
    const { activeTab } = useUI();
    const [viewDate, setViewDate] = useState(new Date());
    const [masterDataReady, setMasterDataReady] = useState(false);

    useEffect(() => {
        if (!user) {
            setMasterDataReady(false);
            return;
        }

        const timer = window.setTimeout(() => {
            setMasterDataReady(true);
        }, 400);

        return () => {
            window.clearTimeout(timer);
        };
    }, [user]);

    const queryDates = useMemo(() => {
        const y = viewDate.getFullYear();
        const m = viewDate.getMonth();
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m + 2, 0);
        
        const fmt = (d: Date) => {
            const yy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yy}-${mm}-${dd}`;
        };
        return { start: fmt(start), end: fmt(end) };
    }, [viewDate]);

    const expensesEnabled = activeTab === 'reports' || activeTab === 'settings';

    const bookingHook = useBookings(user, queryDates.start, queryDates.end);
    const expenseHook = useExpenses(user, expensesEnabled);
    const masterDataHook = useMasterData(user, masterDataReady);

    const {
        bookings,
        loading: bookingsLoading,
        suggestedGuest,
        setSuggestedGuest,
        saveBooking,
        cancelBooking,
        extendBooking,
        splitBooking,
        addRoomToGroup,
        convertSingleToGroup,
        removeRoomFromGroup,
        repairGroup,
        checkRoomCollision,
        findGuestByPhone,
        findGuestByName,
    } = bookingHook;

    const {
        expenses,
        loading: expensesLoading,
        saveExpense,
        deleteExpense,
    } = expenseHook;

    const {
        rooms,
        masterServices,
        masterDiscounts,
        roomStates,
        propertyInfo,
        zaloTemplate,
        cleanRoom,
        addService,
        removeService,
        addDiscount,
        removeDiscount,
        saveRoom,
        deleteRoom,
        updateProperty,
    } = masterDataHook;

    const loading = bookingsLoading || expensesLoading;

    const bookingActions = useMemo(() => ({
        saveBooking,
        cancelBooking,
        extendBooking,
        splitBooking,
        addRoomToGroup,
        convertSingleToGroup,
        removeRoomFromGroup,
        repairGroup,
        checkRoomCollision,
        findGuestByPhone,
        findGuestByName,
    }), [
        saveBooking,
        cancelBooking,
        extendBooking,
        splitBooking,
        addRoomToGroup,
        convertSingleToGroup,
        removeRoomFromGroup,
        repairGroup,
        checkRoomCollision,
        findGuestByPhone,
        findGuestByName,
    ]);

    const expenseActions = useMemo(() => ({
        saveExpense,
        deleteExpense,
    }), [saveExpense, deleteExpense]);

    const masterActions = useMemo(() => ({
        cleanRoom,
        addService,
        removeService,
        addDiscount,
        removeDiscount,
        saveRoom,
        deleteRoom,
        updateProperty,
    }), [
        cleanRoom,
        addService,
        removeService,
        addDiscount,
        removeDiscount,
        saveRoom,
        deleteRoom,
        updateProperty,
    ]);

    const actions = useMemo(() => ({
        ...bookingActions,
        ...expenseActions,
        ...masterActions,
    }), [bookingActions, expenseActions, masterActions]);

    // OPTIMIZED: Memoize context value to prevent unnecessary re-renders in child components
    // This is especially important since DataContext is used by many components
    const value = useMemo(() => ({
        bookings,
        expenses,
        rooms,
        masterServices,
        masterDiscounts,
        roomStates,
        propertyInfo,
        zaloTemplate,
        actions,
        
        loading,
        suggestedGuest,
        setSuggestedGuest,
        viewDate,
        setViewDate
    }), [
        bookings,
        expenses,
        rooms,
        masterServices,
        masterDiscounts,
        roomStates,
        propertyInfo,
        zaloTemplate,
        actions,
        loading,
        suggestedGuest,
        setSuggestedGuest,
        viewDate,
    ]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
