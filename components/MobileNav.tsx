
import React from 'react';
import { LayoutDashboard, CalendarDays, PieChart, Plus, Settings, MessageSquare } from 'lucide-react';
import { useUI } from '../context/UIContext';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openBookingModal: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab, openBookingModal }) => {
  const { showSettingsOnMobile } = useUI();
  return (
    <nav className="lg:hidden h-auto min-h-[4rem] pb-[env(safe-area-inset-bottom)] bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 flex justify-around items-center px-1 shrink-0 z-20 w-full gap-0.5">
      <button onClick={() => setActiveTab('dashboard')} className={`flex-1 p-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-colors text-[8px] ${activeTab === 'dashboard' ? 'text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-500'}`}>
            <LayoutDashboard size={18} className={activeTab === 'dashboard' ? 'fill-current' : ''}/>
            <span className="font-bold">Tổng quan</span>
        </button>
      <button onClick={() => setActiveTab('calendar')} className={`flex-1 p-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-colors text-[8px] ${activeTab === 'calendar' ? 'text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-500'}`}>
            <CalendarDays size={18} className={activeTab === 'calendar' ? 'fill-current' : ''}/>
            <span className="font-bold">Lịch</span>
        </button>
        
        <div className="relative -top-3">
            <button 
              onClick={openBookingModal}
              className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/40 border-4 border-gray-100 dark:border-slate-950 active:scale-95 transition-transform"
            >
                <Plus size={24} />
            </button>
        </div>

        <button onClick={() => setActiveTab('generated')} className={`flex-1 p-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-colors text-[8px] ${activeTab === 'generated' ? 'text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-500'}`}>
          <MessageSquare size={18} className={activeTab === 'generated' ? 'fill-current' : ''}/>
          <span className="font-bold">Tin nhắn</span>
        </button>
        <button onClick={() => setActiveTab('reports')} className={`flex-1 p-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-colors text-[8px] ${activeTab === 'reports' ? 'text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-500'}`}>
            <PieChart size={18} className={activeTab === 'reports' ? 'fill-current' : ''}/>
            <span className="font-bold">Báo cáo</span>
        </button>
        {showSettingsOnMobile && (
          <button onClick={() => setActiveTab('settings')} className={`flex-1 p-1.5 rounded-lg flex flex-col items-center gap-0.5 transition-colors text-[8px] ${activeTab === 'settings' ? 'text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-500'}`}>
              <Settings size={18} className={activeTab === 'settings' ? 'fill-current' : ''}/>
              <span className="font-bold">Cài đặt</span>
          </button>
        )}
    </nav>
  );
};

export default MobileNav;
