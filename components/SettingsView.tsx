import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Plus, Trash2, Tag, Settings, Bed, ChevronDown, ArrowRightCircle, Clock, Users, Moon, Sun, Download, CreditCard, Link2, FileDown } from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { RoomDefinition, ServiceDefinition, DiscountDefinition, Booking, BeforeInstallPromptEvent, BookingComIcalRoomConfig } from '../types/types';
import { findVietQrBank, VIETQR_BANKS } from '../config/constants';
import { db } from '../config/database';
import { formatCurrency } from '../utils/utils';
import { buildBookingComIcalRoomConfigs, countConfiguredBookingComIcalRooms } from '../utils/bookingComIcalConfig';
import { buildSaveBookingPayloadFromPreview, createImportPreviewHash } from '../utils/bookingComImport';
import { downloadRoomIcal, downloadAllRoomsIcal } from '../utils/icalGenerator';
import { buildBookingComImportPreview, type BookingComImportPreviewItem, parseIcalEvents } from '../utils/icalParser';
import CurrencyInput from './CurrencyInput';
import { useUI } from '../context/UIContext';
import { useData } from '../context/DataContext';
import ExpensesList from './ExpensesList';

type BookingComConflictRecord = {
    id: string;
    roomId: string;
    roomName?: string;
    bookingId?: string | null;
    actionLabel?: string;
    reason?: string;
    status?: string;
    uid?: string;
    otaBookingNumber?: string;
    guestName?: string;
    summary?: string;
    description?: string;
    checkIn?: string;
    checkOut?: string;
    createdAt?: number;
};

const ToggleSettingsMobile: React.FC = () => {
    const { showSettingsOnMobile, setShowSettingsOnMobile } = useUI();
    return (
        <button
            onClick={() => setShowSettingsOnMobile(!showSettingsOnMobile)}
            className={`w-14 h-8 rounded-full p-1 flex items-center transition-colors ${showSettingsOnMobile ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}
            aria-pressed={showSettingsOnMobile}
        >
            <span className={`w-6 h-6 rounded-full bg-white shadow`} />
        </button>
    );
};

const SettingsView: React.FC<{ userRole: 'owner' | 'staff' }> = ({ userRole }) => {
    const { addToast, openExpenseModal, openBookingModal, isDarkMode, toggleTheme, deferredPrompt, setDeferredPrompt } = useUI();
    const { 
        rooms, masterServices, masterDiscounts, expenses, actions, bookings, propertyInfo
    } = useData();
    
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(deferredPrompt);

    useEffect(() => {
        setInstallPrompt(deferredPrompt);
    }, [deferredPrompt]);

    const handleInstallApp = async () => {
        if (!installPrompt) {
            addToast('Ứng dụng đã được cài đặt hoặc trình duyệt không hỗ trợ', 'info');
            return;
        }
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
            setDeferredPrompt(null);
            addToast('Cài đặt ứng dụng thành công', 'success');
        }
    };


    const [newService, setNewService] = useState({ name: '', price: 0 });
    const [newDiscount, setNewDiscount] = useState({ description: '', amount: 0 });
    const [newRoom, setNewRoom] = useState<Partial<RoomDefinition>>({ id: '', name: '', price: 0, isVirtual: false });
    const [isSyncingSheets, setIsSyncingSheets] = useState(false);
    const [isSavingBookingIcalConfig, setIsSavingBookingIcalConfig] = useState(false);
    const [importIcalTextByRoom, setImportIcalTextByRoom] = useState<Record<string, string>>({});
    const [importPreviewByRoom, setImportPreviewByRoom] = useState<Record<string, BookingComImportPreviewItem[]>>({});
    const [importPreviewErrorByRoom, setImportPreviewErrorByRoom] = useState<Record<string, string>>({});
    const [selectedImportPreviewIdsByRoom, setSelectedImportPreviewIdsByRoom] = useState<Record<string, string[]>>({});
    const [isApplyingImportPreviewByRoom, setIsApplyingImportPreviewByRoom] = useState<Record<string, boolean>>({});
    const [bookingComConflictsByRoom, setBookingComConflictsByRoom] = useState<Record<string, BookingComConflictRecord[]>>({});
    const resolvedBank = findVietQrBank(propertyInfo.bankCode, propertyInfo.bankName);
    const [bankForm, setBankForm] = useState({
        bankCode: resolvedBank?.code || propertyInfo.bankCode || '',
        bankName: resolvedBank?.label || propertyInfo.bankName || '',
        bankAccountNumber: propertyInfo.bankAccountNumber || '',
        bankOwner: propertyInfo.bankOwner || '',
    });
    const bookingComIcalRooms = useMemo(
        () => buildBookingComIcalRoomConfigs(rooms, propertyInfo.externalSync?.bookingComIcal?.rooms),
        [rooms, propertyInfo.externalSync?.bookingComIcal?.rooms]
    );
    const [bookingComIcalForm, setBookingComIcalForm] = useState<Record<string, BookingComIcalRoomConfig>>(bookingComIcalRooms);
    const bookingComIcalSummary = useMemo(
        () => countConfiguredBookingComIcalRooms(bookingComIcalForm),
        [bookingComIcalForm]
    );
    const autoExportBaseUrl = useMemo(() => {
        const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined)?.trim() || 'hello-dalat-manager';
        return `https://${projectId}.web.app/ical`;
    }, []);

    useEffect(() => {
        const nextBank = findVietQrBank(propertyInfo.bankCode, propertyInfo.bankName);
        setBankForm({
            bankCode: nextBank?.code || propertyInfo.bankCode || '',
            bankName: nextBank?.label || propertyInfo.bankName || '',
            bankAccountNumber: propertyInfo.bankAccountNumber || '',
            bankOwner: propertyInfo.bankOwner || '',
        });
    }, [propertyInfo.bankCode, propertyInfo.bankName, propertyInfo.bankAccountNumber, propertyInfo.bankOwner]);

    useEffect(() => {
        setBookingComIcalForm(bookingComIcalRooms);
    }, [bookingComIcalRooms]);

    useEffect(() => {
        const unsubscribe = onValue(ref(db, 'app_data/external_sync_conflicts'), (snapshot) => {
            const raw = snapshot.val() as Record<string, Record<string, BookingComConflictRecord>> | null;
            if (!raw || typeof raw !== 'object') {
                setBookingComConflictsByRoom({});
                return;
            }

            const next: Record<string, BookingComConflictRecord[]> = {};
            Object.entries(raw).forEach(([roomId, roomConflicts]) => {
                if (!roomConflicts || typeof roomConflicts !== 'object') {
                    next[roomId] = [];
                    return;
                }

                next[roomId] = Object.values(roomConflicts)
                    .filter((item): item is BookingComConflictRecord => Boolean(item && typeof item === 'object'))
                    .sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0));
            });

            setBookingComConflictsByRoom(next);
        });

        return () => unsubscribe();
    }, []);

    const formatSyncTimestamp = (value?: number) => {
        if (!value) return 'Chưa có';
        return new Date(value).toLocaleString('vi-VN');
    };

    const handleAddRoom = () => {
        if (!newRoom.id || (!newRoom.price && !newRoom.isVirtual)) return;
        actions.saveRoom({ id: newRoom.id, name: newRoom.name || newRoom.id, price: newRoom.price ?? 0, isVirtual: newRoom.isVirtual || false });
        setNewRoom({ id: '', name: '', price: 0, isVirtual: false });
        addToast('Đã lưu thông tin phòng', 'success');
    };

    const handleDeleteRoom = (rid: string) => {
        if (window.confirm('Xóa phòng này? Dữ liệu lịch sử vẫn giữ, nhưng phòng sẽ không hiện trên bảng.')) {
            actions.deleteRoom(rid);
            addToast('Đã xóa phòng', 'success');
        }
    };

    const handleSaveBankInfo = async () => {
        const selectedBank = VIETQR_BANKS.find((bank) => bank.code === bankForm.bankCode);
        await actions.updateProperty({
            bankCode: bankForm.bankCode,
            bankName: selectedBank?.label || bankForm.bankName.trim(),
            bankAccountNumber: bankForm.bankAccountNumber.trim(),
            bankOwner: bankForm.bankOwner.trim(),
        });
        addToast('Đã cập nhật thông tin tài khoản ngân hàng', 'success');
    };

    const handleBankSelect = (bankCode: string) => {
        const selectedBank = VIETQR_BANKS.find((bank) => bank.code === bankCode);
        setBankForm(prev => ({
            ...prev,
            bankCode,
            bankName: selectedBank?.label || prev.bankName,
        }));
    };

    const handleSyncSheets = async () => {
        setIsSyncingSheets(true);
        try {
            await actions.syncAll();
            addToast('Đã sync Google Sheets thành công', 'success');
        } catch (error) {
            addToast(`Sync thất bại: ${String(error)}`, 'error');
        } finally {
            setIsSyncingSheets(false);
        }
    };

    const updateBookingComIcalRoomField = <K extends keyof BookingComIcalRoomConfig>(
        roomId: string,
        key: K,
        value: BookingComIcalRoomConfig[K]
    ) => {
        setBookingComIcalForm((prev) => {
            const current = prev[roomId] || bookingComIcalRooms[roomId];

            return {
                ...prev,
                [roomId]: {
                    ...current,
                    roomId,
                    roomName: rooms.find((room) => room.id === roomId)?.name || current?.roomName || roomId,
                    [key]: value,
                },
            };
        });
    };

    const applyGeneratedExportUrl = (roomId: string) => {
        updateBookingComIcalRoomField(roomId, 'exportUrl', `${autoExportBaseUrl}/${roomId}.ics`);
    };

    const handleExportRoomIcal = (roomId: string, roomName: string) => {
        downloadRoomIcal(bookings, roomId, roomName);
        addToast(`Đã xuất file .ics cho phòng ${roomId}`, 'success');
    };

    const handleExportAllRoomsIcal = () => {
        const nonVirtualRooms = rooms.filter((r) => !r.isVirtual);
        downloadAllRoomsIcal(bookings, nonVirtualRooms);
        addToast(`Đã xuất file .ics cho ${nonVirtualRooms.length} phòng`, 'success');
    };

    const handlePreviewBookingComIcal = (roomId: string, roomName: string) => {
        const content = (importIcalTextByRoom[roomId] || '').trim();
        if (!content) {
            addToast(`Chưa có nội dung iCal cho phòng ${roomId}`, 'info');
            return;
        }

        try {
            const parsedEvents = parseIcalEvents(content);
            const preview = buildBookingComImportPreview(parsedEvents, roomId, roomName, bookings);
            const selectableIds = preview
                .filter((item) => item.action === 'create' || item.action === 'update')
                .map((item) => item.uid);

            setImportPreviewByRoom((prev) => ({ ...prev, [roomId]: preview }));
            setImportPreviewErrorByRoom((prev) => ({ ...prev, [roomId]: '' }));
            setSelectedImportPreviewIdsByRoom((prev) => ({ ...prev, [roomId]: selectableIds }));
            addToast(`Đã preview ${preview.length} dòng iCal cho phòng ${roomId}`, 'success');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            setImportPreviewErrorByRoom((prev) => ({ ...prev, [roomId]: message }));
            addToast(`Parse iCal thất bại cho phòng ${roomId}`, 'error');
        }
    };

    const handleClearBookingComIcalPreview = (roomId: string) => {
        setImportIcalTextByRoom((prev) => ({ ...prev, [roomId]: '' }));
        setImportPreviewByRoom((prev) => ({ ...prev, [roomId]: [] }));
        setImportPreviewErrorByRoom((prev) => ({ ...prev, [roomId]: '' }));
        setSelectedImportPreviewIdsByRoom((prev) => ({ ...prev, [roomId]: [] }));
    };

    const handleOpenBookingComPreviewItem = (item: BookingComImportPreviewItem) => {
        if (item.action === 'ignore') {
            addToast('Mục này không có booking local để xử lý', 'info');
            return;
        }

        const room = rooms.find((candidate) => candidate.id === item.roomId);
        const noteParts = [item.summary, item.description, `iCal UID: ${item.uid}`].filter(Boolean);

        if (item.existingBookingId) {
            const existingBooking = bookings.find((booking) => booking.id === item.existingBookingId);
            if (!existingBooking) {
                addToast('Không tìm thấy booking local tương ứng trong danh sách đang tải', 'error');
                return;
            }

            openBookingModal({
                ...existingBooking,
                status: item.status === 'CANCELLED' ? 'cancelled' : existingBooking.status,
                note: noteParts.join('\n'),
            });
            return;
        }

        openBookingModal({
            roomId: item.roomId,
            checkIn: item.checkIn,
            checkOut: item.checkOut,
            guestName: item.guestName || '',
            otaBookingNumber: item.otaBookingNumber || '',
            source: 'Booking.com',
            note: noteParts.join('\n'),
            status: item.status === 'CANCELLED' ? 'cancelled' : 'booked',
            price: room?.price || 0,
        });
    };

    const toggleImportPreviewSelection = (roomId: string, uid: string) => {
        setSelectedImportPreviewIdsByRoom((prev) => {
            const current = new Set(prev[roomId] || []);
            if (current.has(uid)) {
                current.delete(uid);
            } else {
                current.add(uid);
            }

            return {
                ...prev,
                [roomId]: Array.from(current),
            };
        });
    };

    const selectAllApplicableImportPreviewItems = (roomId: string) => {
        const applicableIds = (importPreviewByRoom[roomId] || [])
            .filter((item) => item.action === 'create' || item.action === 'update')
            .map((item) => item.uid);

        setSelectedImportPreviewIdsByRoom((prev) => ({
            ...prev,
            [roomId]: applicableIds,
        }));
    };

    const handleApplySelectedImportPreviewItems = async (roomId: string) => {
        const previewItems = importPreviewByRoom[roomId] || [];
        const selectedIds = new Set(selectedImportPreviewIdsByRoom[roomId] || []);
        const applicableItems = previewItems.filter(
            (item) => selectedIds.has(item.uid) && (item.action === 'create' || item.action === 'update')
        );

        if (applicableItems.length === 0) {
            addToast(`Chưa chọn mục hợp lệ nào để apply cho phòng ${roomId}`, 'info');
            return;
        }

        const room = rooms.find((candidate) => candidate.id === roomId);
        const roomPrice = room?.price || 0;

        setIsApplyingImportPreviewByRoom((prev) => ({ ...prev, [roomId]: true }));
        try {
            for (const item of applicableItems) {
                const existingBooking = item.existingBookingId
                    ? bookings.find((booking) => booking.id === item.existingBookingId)
                    : undefined;

                const payload = buildSaveBookingPayloadFromPreview(item, roomPrice, existingBooking);
                await actions.saveBooking(payload);
            }

            const updatedRooms = buildBookingComIcalRoomConfigs(rooms, bookingComIcalForm);
            const existingRoomConfig = updatedRooms[roomId];
            updatedRooms[roomId] = {
                ...existingRoomConfig,
                lastImportedAt: Date.now(),
                lastImportHash: createImportPreviewHash(applicableItems),
            };

            await actions.updateProperty({
                externalSync: {
                    ...(propertyInfo.externalSync || {}),
                    bookingComIcal: {
                        provider: 'Booking.com',
                        rooms: updatedRooms,
                        updatedAt: Date.now(),
                    },
                },
            });

            const appliedIds = new Set(applicableItems.map((item) => item.uid));
            setImportPreviewByRoom((prev) => ({
                ...prev,
                [roomId]: (prev[roomId] || []).filter((item) => !appliedIds.has(item.uid)),
            }));
            setSelectedImportPreviewIdsByRoom((prev) => ({
                ...prev,
                [roomId]: (prev[roomId] || []).filter((uid) => !appliedIds.has(uid)),
            }));
            addToast(`Đã apply ${applicableItems.length} mục iCal cho phòng ${roomId}`, 'success');
        } catch (error) {
            addToast(`Apply iCal thất bại cho phòng ${roomId}: ${String(error)}`, 'error');
        } finally {
            setIsApplyingImportPreviewByRoom((prev) => ({ ...prev, [roomId]: false }));
        }
    };

    const handleSaveBookingComIcalConfig = async () => {
        setIsSavingBookingIcalConfig(true);
        try {
            const normalizedRooms = buildBookingComIcalRoomConfigs(rooms, bookingComIcalForm);
            await actions.updateProperty({
                externalSync: {
                    ...(propertyInfo.externalSync || {}),
                    bookingComIcal: {
                        provider: 'Booking.com',
                        rooms: normalizedRooms,
                        updatedAt: Date.now(),
                    },
                },
            });
            addToast('Đã lưu cấu hình Booking.com iCal', 'success');
        } catch (error) {
            addToast(`Lưu cấu hình iCal thất bại: ${String(error)}`, 'error');
        } finally {
            setIsSavingBookingIcalConfig(false);
        }
    };

    return (
        <div className="p-4 space-y-6 pb-24 lg:pb-8">
            
            {/* PRIORITY 1: Services & Business (Always Open) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Service Settings */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700 h-full flex flex-col">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white"><ShoppingBag size={20} className="text-blue-600"/> Dịch vụ mẫu</h3>
                    <div className="flex gap-2 mb-4">
                        <input 
                        placeholder="Tên dịch vụ" 
                        className="flex-1 p-2 border rounded-xl outline-none text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
                        value={newService.name}
                        onChange={e => setNewService({...newService, name: e.target.value})}
                        />
                        <CurrencyInput
                        placeholder="Giá"
                        value={newService.price}
                        onChange={val => setNewService({...newService, price: val})}
                        className="w-24 p-2 border rounded-xl outline-none text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
                        />
                        <button onClick={() => { actions.addService(newService.name, newService.price); setNewService({name:'', price:0}); }} className="bg-blue-600 text-white px-3 rounded-xl font-bold hover:bg-blue-700 flex items-center"><Plus size={18}/></button>
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar min-h-[120px] max-h-60">
                        {masterServices.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 dark:bg-gray-900 dark:border-gray-700">
                                <span className="font-medium text-sm text-gray-900 dark:text-white">{s.name}</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-blue-700 text-sm dark:text-blue-400">{formatCurrency(s.price)}</span>
                                    <button onClick={() => actions.removeService(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Discount Settings (New) */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700 h-full flex flex-col">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white"><Tag size={20} className="text-orange-500"/> Mã giảm giá / Voucher</h3>
                    <div className="flex gap-2 mb-4">
                        <input 
                        placeholder="Tên mã (VD: Khách quen)" 
                        className="flex-1 p-2 border rounded-xl outline-none text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
                        value={newDiscount.description}
                        onChange={e => setNewDiscount({...newDiscount, description: e.target.value})}
                        />
                        <CurrencyInput
                        placeholder="Giảm"
                        value={newDiscount.amount}
                        onChange={val => setNewDiscount({...newDiscount, amount: val})}
                        className="w-24 p-2 border rounded-xl outline-none text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
                        />
                        <button onClick={() => { actions.addDiscount(newDiscount.description, newDiscount.amount); setNewDiscount({description:'', amount:0}); }} className="bg-orange-600 text-white px-3 rounded-xl font-bold hover:bg-orange-700 flex items-center"><Plus size={18}/></button>
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar min-h-[120px] max-h-60">
                        {masterDiscounts.map(d => (
                            <div key={d.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 dark:bg-gray-900 dark:border-gray-700">
                                <span className="font-medium text-sm text-gray-900 dark:text-white">{d.description}</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-orange-600 text-sm">-{formatCurrency(d.amount)}</span>
                                    <button onClick={() => actions.removeDiscount(d.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Expense Management Section */}
            <details className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden group" open>
                <summary className="p-4 font-bold text-lg flex items-center gap-2 cursor-pointer list-none select-none hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-lg text-blue-600"><ArrowRightCircle size={20}/></div>
                    <span className="flex-1">Quản lý Thu Chi</span>
                    <ChevronDown size={20} className="text-gray-400 group-open:rotate-180 transition-transform"/>
                </summary>
                <div className="p-0 border-t border-gray-100 dark:border-gray-700">
                    <ExpensesList 
                        expenses={expenses}
                        onAdd={() => openExpenseModal()}
                        onEdit={(ex) => openExpenseModal(ex)}
                        onDelete={(id) => { if(window.confirm('Xóa vĩnh viễn giao dịch này?')) actions.deleteExpense(id) }}
                    />
                </div>
            </details>

            {/* Room Management */}
            {userRole === 'owner' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-white"><Bed size={20} className="text-blue-600"/> Quản lý Phòng</h3>
                    </div>
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex gap-2">
                        <input 
                            placeholder="Số phòng (VD: 101)" 
                            className="w-24 p-2 border rounded-xl outline-none text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
                            value={newRoom.id}
                            onChange={e => setNewRoom({...newRoom, id: e.target.value})}
                        />
                        <input 
                            placeholder="Tên loại (VD: Đơn)" 
                            className="flex-1 p-2 border rounded-xl outline-none text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
                            value={newRoom.name}
                            onChange={e => setNewRoom({...newRoom, name: e.target.value})}
                        />
                        <CurrencyInput
                            placeholder="Giá"
                            value={newRoom.price || 0}
                            onChange={val => setNewRoom({...newRoom, price: val})}
                            className={`w-28 p-2 border rounded-xl outline-none text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400 ${newRoom.isVirtual ? 'opacity-40 pointer-events-none' : ''}`}
                        />
                        <label className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 cursor-pointer whitespace-nowrap font-bold select-none">
                            <input
                                type="checkbox"
                                checked={newRoom.isVirtual || false}
                                onChange={e => setNewRoom({...newRoom, isVirtual: e.target.checked, price: e.target.checked ? 0 : newRoom.price})}
                                className="rounded accent-orange-500"
                            />
                            Phòng chờ
                        </label>
                        <button onClick={handleAddRoom} className="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700"><Plus size={20}/></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {rooms.map(r => (
                            <div key={r.id} className={`flex justify-between items-center p-3 bg-gray-50 rounded border dark:bg-gray-900 ${r.isVirtual ? 'border-orange-300 dark:border-orange-700' : 'border-gray-100 dark:border-gray-700'}`}>
                                <span className="font-bold text-blue-800 dark:text-blue-300 w-16">{r.id}</span>
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-200 flex-1 truncate">{r.name}</span>
                                <div className="flex items-center gap-2">
                                    {r.isVirtual
                                        ? <span className="text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">CHỜ</span>
                                        : <span className="font-bold text-gray-900 text-xs dark:text-white">{formatCurrency(r.price)}</span>
                                    }
                                    <button onClick={() => handleDeleteRoom(r.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            )}

             {/* PRIORITY 2: System Configuration (Collapsible) */}
            <details className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden group" open>
                <summary className="p-4 font-bold text-lg flex items-center gap-2 cursor-pointer list-none select-none hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-lg text-blue-600"><Settings size={20}/></div>
                    <span className="flex-1">Cấu hình Hệ thống</span>
                    <ChevronDown size={20} className="text-gray-400 group-open:rotate-180 transition-transform"/>
                </summary>
                
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-4">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            {isDarkMode ? <Moon size={20} className="text-yellow-500" /> : <Sun size={20} className="text-orange-500" />}
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">Chế độ</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{isDarkMode ? 'Chế độ tối (Dark Mode)' : 'Chế độ sáng (Light Mode)'}</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                        >
                            {isDarkMode ? 'Sáng' : 'Tối'}
                        </button>
                    </div>

                    {/* Install App */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <Download size={20} className="text-green-600" />
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">Cài đặt Ứng dụng</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Sử dụng như ứng dụng native trên điện thoại</p>
                            </div>
                        </div>
                        <button
                            onClick={handleInstallApp}
                            disabled={!installPrompt}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Cài đặt
                        </button>
                    </div>

                    {/* Bank Account Info */}
                    {userRole === 'owner' && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                            <div className="flex items-center gap-3">
                                <CreditCard size={20} className="text-blue-600" />
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">Tài khoản ngân hàng hiển thị</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">Áp dụng cho Tin nhắn, Hóa đơn và Phiếu xác nhận</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <select
                                    value={bankForm.bankCode}
                                    onChange={(e) => handleBankSelect(e.target.value)}
                                    className="p-2 border rounded-lg outline-none text-sm text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="">Chọn ngân hàng để tạo VietQR</option>
                                    {VIETQR_BANKS.map((bank) => (
                                        <option key={bank.code} value={bank.code}>{bank.label}</option>
                                    ))}
                                </select>
                                <input
                                    value={bankForm.bankAccountNumber}
                                    onChange={(e) => setBankForm(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                                    placeholder="Số tài khoản"
                                    className="p-2 border rounded-lg outline-none text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                                <input
                                    value={bankForm.bankOwner}
                                    onChange={(e) => setBankForm(prev => ({ ...prev, bankOwner: e.target.value }))}
                                    placeholder="Chủ tài khoản"
                                    className="p-2 border rounded-lg outline-none text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                QR trong hóa đơn sẽ tự tạo theo số còn lại phải trả. Nếu cấu hình cũ chưa có mã ngân hàng, hãy chọn lại ngân hàng ở đây để bật VietQR tự động.
                            </p>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveBankInfo}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                                >
                                    Lưu thông tin ngân hàng
                                </button>
                            </div>
                        </div>
                    )}

                    {userRole === 'owner' && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                            <div className="flex items-start gap-3">
                                <Link2 size={20} className="text-indigo-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-bold text-gray-900 dark:text-white">Booking.com iCal theo từng phòng</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        Lưu trước cấu hình import/export cho 8 phòng. Pha kế tiếp sẽ dùng dữ liệu này để preview đồng bộ Booking.com -&gt; DB và feed block availability tạm thời.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                                    <p className="text-gray-500 dark:text-gray-400">Room có import URL</p>
                                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{bookingComIcalSummary.importRooms}/{rooms.length}</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                                    <p className="text-gray-500 dark:text-gray-400">Import đang bật</p>
                                    <p className="mt-1 text-lg font-bold text-green-700 dark:text-green-400">{bookingComIcalSummary.enabledImports}</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                                    <p className="text-gray-500 dark:text-gray-400">Room có export URL</p>
                                    <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{bookingComIcalSummary.exportRooms}/{rooms.length}</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                                    <p className="text-gray-500 dark:text-gray-400">Export đang bật</p>
                                    <p className="mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-400">{bookingComIcalSummary.enabledExports}</p>
                                </div>
                            </div>

                            <div className="space-y-3 max-h-[28rem] overflow-y-auto custom-scrollbar pr-1">
                                {rooms.map((room) => {
                                    const roomConfig = bookingComIcalForm[room.id] || bookingComIcalRooms[room.id];
                                    const previewItems = importPreviewByRoom[room.id] || [];
                                    const roomConflicts = bookingComConflictsByRoom[room.id] || [];
                                    const selectedIds = new Set(selectedImportPreviewIdsByRoom[room.id] || []);
                                    const selectableCount = previewItems.filter((item) => item.action === 'create' || item.action === 'update').length;
                                    const previewCounts = previewItems.reduce(
                                        (summary, item) => {
                                            summary[item.action] += 1;
                                            return summary;
                                        },
                                        { create: 0, update: 0, conflict: 0, ignore: 0 }
                                    );

                                    return (
                                        <div key={room.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-3">
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white">{room.id} - {room.name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Cặp feed này sẽ là nền cho import Booking.com -&gt; DB và export block availability theo ngày.</p>
                                                </div>
                                                <div className="flex flex-wrap gap-3 text-xs items-center">
                                                    <label className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(roomConfig?.importEnabled)}
                                                            onChange={(e) => updateBookingComIcalRoomField(room.id, 'importEnabled', e.target.checked)}
                                                            className="rounded accent-green-600"
                                                            disabled={!roomConfig?.importUrl}
                                                        />
                                                        Bật import
                                                    </label>
                                                    <label className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(roomConfig?.exportEnabled)}
                                                            onChange={(e) => updateBookingComIcalRoomField(room.id, 'exportEnabled', e.target.checked)}
                                                            className="rounded accent-indigo-600"
                                                            disabled={!roomConfig?.exportUrl}
                                                        />
                                                        Bật export
                                                    </label>
                                                    <button
                                                        onClick={() => handleExportRoomIcal(room.id, room.name)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg font-bold text-xs hover:bg-teal-700 transition-colors"
                                                        title={`Tải .ics block availability cho phòng ${room.id}`}
                                                    >
                                                        <FileDown size={14} /> Export .ics
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-[11px]">
                                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-2">
                                                    <p className="text-gray-500 dark:text-gray-400">Lần import thành công</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{formatSyncTimestamp(roomConfig?.lastImportedAt)}</p>
                                                </div>
                                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-2">
                                                    <p className="text-gray-500 dark:text-gray-400">Lần thử import gần nhất</p>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{formatSyncTimestamp(roomConfig?.lastImportAttemptAt)}</p>
                                                </div>
                                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-2">
                                                    <p className="text-gray-500 dark:text-gray-400">Conflict đang chờ xử lý</p>
                                                    <p className="font-semibold text-orange-700 dark:text-orange-400">{roomConflicts.length}</p>
                                                </div>
                                                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-2">
                                                    <p className="text-gray-500 dark:text-gray-400">Lỗi import gần nhất</p>
                                                    <p className="font-semibold text-red-700 dark:text-red-400 line-clamp-2">{roomConfig?.lastImportError || 'Không có'}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Import URL từ Booking.com</label>
                                                    <input
                                                        value={roomConfig?.importUrl || ''}
                                                        onChange={(e) => updateBookingComIcalRoomField(room.id, 'importUrl', e.target.value)}
                                                        placeholder="https://admin.booking.com/.../calendar.ics"
                                                        className="w-full p-2 border rounded-lg outline-none text-sm text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    />
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Feed đọc từ Booking.com để nhập booking về DB.</p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Export URL cho Booking.com import</label>
                                                    <input
                                                        value={roomConfig?.exportUrl || ''}
                                                        onChange={(e) => updateBookingComIcalRoomField(room.id, 'exportUrl', e.target.value)}
                                                        placeholder="https://your-domain.example/ical/101.ics"
                                                        className="w-full p-2 border rounded-lg outline-none text-sm text-gray-900 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    />
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <button
                                                            onClick={() => applyGeneratedExportUrl(room.id)}
                                                            className="px-2.5 py-1.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
                                                        >
                                                            Dùng URL tự động
                                                        </button>
                                                        <span className="text-[11px] text-gray-500 dark:text-gray-400 break-all">{`${autoExportBaseUrl}/${room.id}.ics`}</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Feed công khai sẽ dùng cho pha tạm thời DB -&gt; Booking để block ngày.</p>
                                                </div>
                                            </div>

                                            <details className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3">
                                                <summary className="cursor-pointer list-none text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between gap-3">
                                                    <span>Preview import thủ công (.ics)</span>
                                                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Dán nội dung iCal rồi mở booking nháp để xác nhận</span>
                                                </summary>

                                                <div className="mt-3 space-y-3">
                                                    <textarea
                                                        value={importIcalTextByRoom[room.id] || ''}
                                                        onChange={(e) => setImportIcalTextByRoom((prev) => ({ ...prev, [room.id]: e.target.value }))}
                                                        placeholder="Dán toàn bộ nội dung file .ics từ Booking.com vào đây"
                                                        rows={6}
                                                        className="w-full p-3 border rounded-lg outline-none text-xs font-mono text-gray-900 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                                                    />

                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => handlePreviewBookingComIcal(room.id, room.name)}
                                                            className="px-3 py-2 bg-green-600 text-white rounded-lg font-bold text-xs hover:bg-green-700 transition-colors"
                                                        >
                                                            Parse preview
                                                        </button>
                                                        <button
                                                            onClick={() => handleClearBookingComIcalPreview(room.id)}
                                                            className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold text-xs hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-colors"
                                                        >
                                                            Xóa nội dung
                                                        </button>
                                                        {previewItems.length > 0 && (
                                                            <button
                                                                onClick={() => selectAllApplicableImportPreviewItems(room.id)}
                                                                className="px-3 py-2 bg-white text-gray-800 rounded-lg font-bold text-xs border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
                                                            >
                                                                Chọn tất cả khả dụng
                                                            </button>
                                                        )}
                                                    </div>

                                                    {importPreviewErrorByRoom[room.id] && (
                                                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                                                            {importPreviewErrorByRoom[room.id]}
                                                        </div>
                                                    )}

                                                    {previewItems.length > 0 && (
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                                                                <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                                                                    <p className="text-gray-500 dark:text-gray-400">Tạo mới</p>
                                                                    <p className="font-bold text-gray-900 dark:text-white">{previewCounts.create}</p>
                                                                </div>
                                                                <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                                                                    <p className="text-gray-500 dark:text-gray-400">Cập nhật</p>
                                                                    <p className="font-bold text-blue-700 dark:text-blue-400">{previewCounts.update}</p>
                                                                </div>
                                                                <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                                                                    <p className="text-gray-500 dark:text-gray-400">Trùng lịch</p>
                                                                    <p className="font-bold text-orange-700 dark:text-orange-400">{previewCounts.conflict}</p>
                                                                </div>
                                                                <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                                                                    <p className="text-gray-500 dark:text-gray-400">Bỏ qua</p>
                                                                    <p className="font-bold text-gray-700 dark:text-gray-300">{previewCounts.ignore}</p>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 px-3 py-2 text-[11px]">
                                                                <p className="text-indigo-700 dark:text-indigo-300 font-medium">
                                                                    Đã chọn {selectedIds.size}/{selectableCount} mục có thể apply trực tiếp.
                                                                </p>
                                                                <button
                                                                    onClick={() => handleApplySelectedImportPreviewItems(room.id)}
                                                                    disabled={selectedIds.size === 0 || Boolean(isApplyingImportPreviewByRoom[room.id])}
                                                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    {isApplyingImportPreviewByRoom[room.id] ? 'Đang apply...' : 'Apply selected'}
                                                                </button>
                                                            </div>

                                                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                                                                {previewItems.map((item) => (
                                                                    <div key={`${room.id}-${item.uid}`} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-2">
                                                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex items-start gap-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={selectedIds.has(item.uid)}
                                                                                        onChange={() => toggleImportPreviewSelection(room.id, item.uid)}
                                                                                        disabled={item.action !== 'create' && item.action !== 'update'}
                                                                                        className="mt-0.5 rounded accent-indigo-600"
                                                                                    />
                                                                                    <div className="min-w-0 flex-1">
                                                                                <p className="font-bold text-sm text-gray-900 dark:text-white break-words">{item.guestName || item.summary || 'Booking.com guest'}</p>
                                                                                <p className="text-xs text-gray-500 dark:text-gray-400">{`${item.checkIn} -> ${item.checkOut} · ${item.nights} đêm`}</p>
                                                                                {item.otaBookingNumber && (
                                                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">OTA: {item.otaBookingNumber}</p>
                                                                                )}
                                                                                {item.conflictBookingId && (
                                                                                    <p className="text-[11px] font-medium text-orange-600 dark:text-orange-400">Trùng với booking local {item.conflictBookingId}</p>
                                                                                )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold whitespace-nowrap ${
                                                                                item.action === 'create'
                                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                                                    : item.action === 'update'
                                                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                                                        : item.action === 'conflict'
                                                                                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                                                                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                                            }`}>
                                                                                {item.actionLabel}
                                                                            </span>
                                                                        </div>

                                                                        {(item.summary || item.description) && (
                                                                            <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
                                                                                {item.summary && <p>Summary: {item.summary}</p>}
                                                                                {item.description && <p className="break-words">Description: {item.description}</p>}
                                                                            </div>
                                                                        )}

                                                                        <div className="flex justify-end">
                                                                            <button
                                                                                onClick={() => handleOpenBookingComPreviewItem(item)}
                                                                                disabled={item.action === 'ignore'}
                                                                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                            >
                                                                                {item.actionLabel}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </details>

                                            {roomConflicts.length > 0 && (
                                                <details className="rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/60 dark:bg-orange-950/20 p-3">
                                                    <summary className="cursor-pointer list-none text-sm font-bold text-orange-800 dark:text-orange-300 flex items-center justify-between gap-3">
                                                        <span>Conflict gần đây ({roomConflicts.length})</span>
                                                        <span className="text-[11px] font-medium text-orange-700/80 dark:text-orange-300/80">Xử lý thủ công để tránh ghi đè sai booking</span>
                                                    </summary>

                                                    <div className="mt-3 space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                                                        {roomConflicts.slice(0, 8).map((conflict) => (
                                                            <div
                                                                key={`${room.id}-${conflict.id}`}
                                                                className="rounded-lg border border-orange-200 dark:border-orange-900/60 bg-white dark:bg-gray-900 px-3 py-2 text-xs"
                                                            >
                                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                                    {conflict.guestName || conflict.summary || 'Booking.com event'}
                                                                </p>
                                                                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                                                                    {(conflict.checkIn && conflict.checkOut) ? `${conflict.checkIn} -> ${conflict.checkOut}` : 'Không có khoảng ngày'}
                                                                </p>
                                                                {conflict.bookingId && (
                                                                    <p className="text-orange-700 dark:text-orange-400 mt-0.5">Booking local: {conflict.bookingId}</p>
                                                                )}
                                                                {conflict.otaBookingNumber && (
                                                                    <p className="text-gray-600 dark:text-gray-300 mt-0.5">OTA: {conflict.otaBookingNumber}</p>
                                                                )}
                                                                {conflict.reason && (
                                                                    <p className="text-red-700 dark:text-red-400 mt-1">{conflict.reason}</p>
                                                                )}
                                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                                                    Tạo lúc: {formatSyncTimestamp(conflict.createdAt)}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Export .ics tạo file block availability từ booking nội bộ để import thủ công vào Booking.com extranet. Ở chiều ngược lại, phần preview import đang đọc nội dung .ics dán tay để tránh phụ thuộc CORS trên frontend.
                                </p>
                                <div className="flex flex-shrink-0 gap-2">
                                    <button
                                        onClick={handleExportAllRoomsIcal}
                                        className="px-4 py-2 bg-teal-600 text-white rounded-lg font-bold text-sm hover:bg-teal-700 transition-colors flex items-center gap-2"
                                    >
                                        <FileDown size={16} /> Export tất cả
                                    </button>
                                    <button
                                        onClick={handleSaveBookingComIcalConfig}
                                        disabled={isSavingBookingIcalConfig}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isSavingBookingIcalConfig ? 'Đang lưu...' : 'Lưu cấu hình'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {userRole === 'owner' && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <Clock size={20} className="text-green-600" />
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">Đồng bộ Google Sheets</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">Đồng bộ thủ công bookings và expenses</p>
                                </div>
                            </div>
                            <button
                                onClick={handleSyncSheets}
                                disabled={isSyncingSheets}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSyncingSheets ? 'Đang sync...' : 'Sync ngay'}
                            </button>
                        </div>
                    )}
                    
                    {/* Mobile Settings Button Visibility */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 dark:text-gray-300"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"></path><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09c.67 0 1.2-.38 1.51-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06c.5.5 1.2.72 1.82.33.4-.25.68-.66.68-1.17V3a2 2 0 0 1 4 0v.09c0 .5.28.92.68 1.17.62.39 1.32.17 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06c-.25.4-.33 1-.33 1.51V9c0 .5.28.92.68 1.17.62.39 1.32.17 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06c-.25.4-.33 1-.33 1.51V15c0 .5-.28.92-.68 1.17z"></path></svg>
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">Hiển thị nút Cài đặt trên Mobile</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Cho phép hiển thị/ẩn nút Cài đặt ở giao diện điện thoại</p>
                            </div>
                        </div>
                        <ToggleSettingsMobile />
                    </div>
                </div>
            </details>
        </div>
    )
};

export default SettingsView;
