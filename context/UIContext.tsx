
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { AppTab, Booking, Expense, InvoiceData, ConfirmationData, ToastMessage, BeforeInstallPromptEvent } from '../types/types';

type ModalDataByType = {
  booking: Partial<Booking> | null;
  expense: Expense | null;
  invoice: InvoiceData;
  confirmation: ConfirmationData;
  null: undefined;
};

type ModalType = keyof ModalDataByType;

type ModalState =
  | { type: null; data: null }
  | { type: 'booking'; data: ModalDataByType['booking'] }
  | { type: 'expense'; data: ModalDataByType['expense'] }
  | { type: 'invoice'; data: ModalDataByType['invoice'] }
  | { type: 'confirmation'; data: ModalDataByType['confirmation'] };

interface UIContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  searchInput: string;
  setSearchInput: (val: string) => void;
  activeSearchTerm: string;
  setActiveSearchTerm: (val: string) => void;
  modalState: ModalState;
  openModal: <T extends ModalType>(type: T, data?: ModalDataByType[T]) => void;
  closeModal: () => void;
  openBookingModal: (booking?: Partial<Booking> | null) => void;
  openExpenseModal: (expense?: Expense | null) => void;
  openInvoiceModal: (data: InvoiceData) => void;
  openConfirmationModal: (data: ConfirmationData) => void;
  deferredPrompt: BeforeInstallPromptEvent | null;
  setDeferredPrompt: (e: BeforeInstallPromptEvent | null) => void;
  showSettingsOnMobile: boolean;
  setShowSettingsOnMobile: (val: boolean) => void;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const toastTimeoutsRef = useRef<number[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [modalState, setModalState] = useState<ModalState>({ type: null, data: null });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showSettingsOnMobile, setShowSettingsOnMobileState] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('showSettingsOnMobile');
      return v === null ? true : v === 'true';
    } catch (e) {
      return true;
    }
  });

  const setShowSettingsOnMobile = useCallback((val: boolean) => {
    try {
      localStorage.setItem('showSettingsOnMobile', val ? 'true' : 'false');
    } catch (e) {
      // ignore write errors
    }
    setShowSettingsOnMobileState(val);
  }, []);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    return () => {
      toastTimeoutsRef.current.forEach(timeoutId => window.clearTimeout(timeoutId));
      toastTimeoutsRef.current = [];
    };
  }, []);

  const toggleTheme = useCallback(() => setIsDarkMode(prev => !prev), []);

  const openModal = useCallback(<T extends ModalType>(type: T, data?: ModalDataByType[T]) => {
    if (type === 'null') {
      setModalState({ type: null, data: null });
      return;
    }

    if (type === 'booking') {
      setModalState({ type, data: (data ?? null) as ModalDataByType['booking'] });
      return;
    }

    if (type === 'expense') {
      setModalState({ type, data: (data ?? null) as ModalDataByType['expense'] });
      return;
    }

    if (type === 'invoice') {
      if (!data) return;
      setModalState({ type, data: data as ModalDataByType['invoice'] });
      return;
    }

    if (!data) return;
    setModalState({ type, data: data as ModalDataByType['confirmation'] });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ type: null, data: null });
  }, []);

  const openBookingModal = useCallback((booking: Partial<Booking> | null = null) => openModal('booking', booking), [openModal]);
  const openExpenseModal = useCallback((expense: Expense | null = null) => openModal('expense', expense), [openModal]);
  const openInvoiceModal = useCallback((data: InvoiceData) => openModal('invoice', data), [openModal]);
  const openConfirmationModal = useCallback((data: ConfirmationData) => openModal('confirmation', data), [openModal]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    const timeoutId = window.setTimeout(() => {
      removeToast(id);
    }, 3000);
    toastTimeoutsRef.current.push(timeoutId);
  }, [removeToast]);

  const value = useMemo(() => ({
    isDarkMode, toggleTheme,
    activeTab, setActiveTab,
    searchInput, setSearchInput, activeSearchTerm, setActiveSearchTerm,
    modalState, openModal, closeModal,
    openBookingModal, openExpenseModal, openInvoiceModal, openConfirmationModal,
    deferredPrompt, setDeferredPrompt,
    showSettingsOnMobile, setShowSettingsOnMobile,
    toasts, addToast, removeToast
  }), [
    isDarkMode,
    toggleTheme,
    activeTab,
    searchInput,
    activeSearchTerm,
    modalState,
    openModal,
    closeModal,
    openBookingModal,
    openExpenseModal,
    openInvoiceModal,
    openConfirmationModal,
    deferredPrompt,
    showSettingsOnMobile,
    setShowSettingsOnMobile,
    toasts,
    addToast,
    removeToast,
  ]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
