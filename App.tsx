
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';

// Custom Hooks
import { useAuth } from './hooks/useAuth';

// Components (Eager Load)

// Components (Lazy Load)
const AuthScreen = React.lazy(() => import('./components/AuthScreen'));
const AuthenticatedApp = React.lazy(() => import('./components/AuthenticatedApp'));

const FullscreenLoader = () => (
    <div className="h-[100dvh] bg-gray-50 flex items-center justify-center text-blue-700 dark:bg-slate-950">
        <Loader2 size={48} className="animate-spin" />
    </div>
);

export default function App() {
    const { user, userRole, loading, error, setError, login, logout } = useAuth();

    if (loading) return <FullscreenLoader />;

  if (!user) {
        return (
            <Suspense fallback={<FullscreenLoader />}>
                <AuthScreen
                    login={login}
                    error={error}
                    setError={setError}
                />
            </Suspense>
        );
  }

  return (
        <ErrorBoundary>
            <Suspense fallback={<FullscreenLoader />}>
                <AuthenticatedApp user={user} userRole={userRole} logout={logout} />
            </Suspense>
        </ErrorBoundary>
  );
}
