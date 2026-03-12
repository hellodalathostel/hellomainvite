
import React, { Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';

// Custom Hooks
import { useAuth } from './hooks/useAuth';
import { useSyncOnline } from './hooks/useSyncOnline';

// Context
import { useUI } from './context/UIContext';
import { DataProvider } from './context/DataContext';

// Components (Eager Load)
import DashboardView from './components/DashboardView';
import CalendarView from './components/CalendarView';
import GeneratedView from './components/GeneratedView';
import ModalManager from './components/ModalManager';
import ToastContainer from './components/ToastContainer';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import MobileNav from './components/MobileNav';

// Components (Lazy Load)
const ReportView = React.lazy(() => import('./components/ReportView'));
const SettingsView = React.lazy(() => import('./components/SettingsView'));

// Wrapper Component to use DataContext inside
const AppContent: React.FC<{
    user: ReturnType<typeof useAuth>['user'];
    userRole: ReturnType<typeof useAuth>['userRole'];
    logout: ReturnType<typeof useAuth>['logout'];
}> = ({ user, userRole, logout }) => {
    const { activeTab, setActiveTab, openBookingModal } = useUI();
    
    // Setup auto-sync for mobile offline support
    useSyncOnline();

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const FallbackLoader = () => (
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
                    <Suspense fallback={<FallbackLoader />}>
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

export default function App() {
    const { user, userRole, loading, error, setError, login, logout } = useAuth();

    if (loading) return <div className="h-[100dvh] bg-gray-50 flex items-center justify-center text-blue-700 dark:bg-slate-950"><Loader2 size={48} className="animate-spin"/></div>;
  
  if (!user) {
       return (
          <AuthScreen 
            login={login} 
            error={error} 
            setError={setError} 
          />
      )
  }

  return (
      <ErrorBoundary>
          <DataProvider user={user}>
              <AppContent user={user} userRole={userRole} logout={logout} />
          </DataProvider>
      </ErrorBoundary>
  );
}
