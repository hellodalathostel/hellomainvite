
import React from 'react';
import { LayoutDashboard, CalendarDays, Plus, PieChart, Settings, MessageSquare, LogOut as LogoutIcon } from 'lucide-react';
import { User } from '../types/types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  userRole: string;
  logout: () => void;
  openBookingModal: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, user, userRole, logout, openBookingModal }) => {
  
  const SidebarItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === id 
              ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
          }`}
      >
          <Icon size={20} className={activeTab === id ? "fill-blue-700/20 dark:fill-blue-400/20" : ""} />
          {label}
      </button>
  );

  return (
    <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-950 border-r border-gray-100 dark:border-slate-800 flex-col h-full shrink-0 z-20">
        <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">HD</div>
            <div>
                <h1 className="font-black text-gray-900 dark:text-white leading-none">Hello Dalat</h1>
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 tracking-wider mt-0.5">MANAGER</p>
            </div>
        </div>

        <div className="px-4 mb-6">
            <button 
                onClick={openBookingModal}
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
                <Plus size={20}/> Booking Mới
            </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            <SidebarItem id="dashboard" icon={LayoutDashboard} label="Bảng điều khiển" />
            <SidebarItem id="calendar" icon={CalendarDays} label="Lịch phòng" />
            <div className="pt-4 pb-2">
                <p className="px-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Quản lý</p>
            </div>
            <SidebarItem id="generated" icon={MessageSquare} label="Tin nhắn" />
            <SidebarItem id="reports" icon={PieChart} label="Báo cáo" />
            <div className="pt-4 pb-2">
                <p className="px-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Hệ thống</p>
            </div>
            <SidebarItem id="settings" icon={Settings} label="Cài đặt" />
        </nav>
        
            <div className="p-4 border-t border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer group">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200 font-bold uppercase">
                   {user?.email?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-gray-900 dark:text-white">{user?.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-gray-500 truncate">{userRole === 'owner' ? 'Quản trị viên' : 'Nhân viên'}</p>
                </div>
                <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <LogoutIcon size={18}/>
                </button>
            </div>
        </div>
    </aside>
  );
};

export default Sidebar;
