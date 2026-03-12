import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, Tag, Settings, Bed, ChevronDown, ArrowRightCircle, Clock, Users, Moon, Sun, Download, CreditCard } from 'lucide-react';
import { RoomDefinition, ServiceDefinition, DiscountDefinition, Booking, BeforeInstallPromptEvent } from '../types/types';
import { formatCurrency } from '../utils/utils';
import CurrencyInput from './CurrencyInput';
import { useUI } from '../context/UIContext';
import { useData } from '../context/DataContext';
import ExpensesList from './ExpensesList';

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
    const [newRoom, setNewRoom] = useState<Partial<RoomDefinition>>({ id: '', name: '', price: 0 });
    const [bankForm, setBankForm] = useState({
        bankName: propertyInfo.bankName || '',
        bankAccountNumber: propertyInfo.bankAccountNumber || '',
        bankOwner: propertyInfo.bankOwner || '',
    });
    const [activeSettingsTab, setActiveSettingsTab] = useState('general');

    useEffect(() => {
        setBankForm({
            bankName: propertyInfo.bankName || '',
            bankAccountNumber: propertyInfo.bankAccountNumber || '',
            bankOwner: propertyInfo.bankOwner || '',
        });
    }, [propertyInfo.bankName, propertyInfo.bankAccountNumber, propertyInfo.bankOwner]);

    // Toggle component for mobile settings visibility
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

    const handleAddRoom = () => {
        if (!newRoom.id || !newRoom.price) return;
        actions.saveRoom({ id: newRoom.id, name: newRoom.name || newRoom.id, price: newRoom.price });
        setNewRoom({ id: '', name: '', price: 0 });
        addToast('Đã lưu thông tin phòng', 'success');
    };

    const handleDeleteRoom = (rid: string) => {
        if (window.confirm('Xóa phòng này? Dữ liệu lịch sử vẫn giữ, nhưng phòng sẽ không hiện trên bảng.')) {
            actions.deleteRoom(rid);
            addToast('Đã xóa phòng', 'success');
        }
    };

    const handleSaveBankInfo = async () => {
        await actions.updateProperty({
            bankName: bankForm.bankName.trim(),
            bankAccountNumber: bankForm.bankAccountNumber.trim(),
            bankOwner: bankForm.bankOwner.trim(),
        });
        addToast('Đã cập nhật thông tin tài khoản ngân hàng', 'success');
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
                        onDelete={(id) => { if(window.confirm('Xóa?')) actions.deleteExpense(id) }}
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
                            className="w-28 p-2 border rounded-xl outline-none text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white placeholder-gray-400"
                        />
                        <button onClick={handleAddRoom} className="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700"><Plus size={20}/></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {rooms.map(r => (
                            <div key={r.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100 dark:bg-gray-900 dark:border-gray-700">
                                <span className="font-bold text-blue-800 dark:text-blue-300 w-16">{r.id}</span>
                                <span className="font-medium text-sm text-gray-900 dark:text-gray-200 flex-1 truncate">{r.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900 text-xs dark:text-white">{formatCurrency(r.price)}</span>
                                    <button onClick={() => handleDeleteRoom(r.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            )}

             {/* PRIORITY 2: System Configuration (Collapsible) */}
            <details className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden group">
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
                                <input
                                    value={bankForm.bankName}
                                    onChange={(e) => setBankForm(prev => ({ ...prev, bankName: e.target.value }))}
                                    placeholder="Tên ngân hàng"
                                    className="p-2 border rounded-lg outline-none text-sm text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
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
