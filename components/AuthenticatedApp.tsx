import React, { Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { BeforeInstallPromptEvent, UserRole } from '../types/types';
import { useSyncOnline } from '../hooks/useSyncOnline';
import { useUI } from '../context/UIContext';
import { DataProvider } from '../context/DataContext';
import ModalManager from './ModalManager';
import ToastContainer from './ToastContainer';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';

const DashboardView = React.lazy(() => import('./DashboardView'));
const CalendarView = React.lazy(() => import('./CalendarView'));
const GeneratedView = React.lazy(() => import('./GeneratedView'));
const ReportView = React.lazy(() => import('./ReportView'));
const SettingsView = React.lazy(() => import('./SettingsView'));

interface AuthenticatedAppProps {
  user: FirebaseUser;
  userRole: UserRole;
  logout: () => Promise<void>;
}

const AuthenticatedContent: React.FC<AuthenticatedAppProps> = ({ user, userRole, logout }) => {
  const { activeTab, setActiveTab, openBookingModal } = useUI();

  useSyncOnline();

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const fallbackLoader = (
    <div className="flex items-center justify-center h-full text-blue-600">
      <Loader2 className="animate-spin" size={32} />
    </div>
  );

  return (
    <div className="w-full h-[100dvh] flex font-sans relative shadow-2xl overflow-hidden bg-white dark:bg-slate-950 text-gray-900 dark:text-white">
      <ToastContainer />
      <ModalManager userRole={userRole} />

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        userRole={userRole}
        logout={logout}
        openBookingModal={() => openBookingModal(null)}
      />

      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-white dark:bg-slate-950">
        <MobileHeader />

        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth relative w-full">
          <Suspense fallback={fallbackLoader}>
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'calendar' && <CalendarView />}
            {activeTab === 'generated' && <GeneratedView />}
            {activeTab === 'reports' && <ReportView />}
            {activeTab === 'settings' && <SettingsView userRole={userRole} />}
          </Suspense>
        </div>

        <MobileNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openBookingModal={() => openBookingModal(null)}
        />
      </main>
    </div>
  );
};

export default function AuthenticatedApp({ user, userRole, logout }: AuthenticatedAppProps) {
  return (
    <DataProvider user={user}>
      <AuthenticatedContent user={user} userRole={userRole} logout={logout} />
    </DataProvider>
  );
}