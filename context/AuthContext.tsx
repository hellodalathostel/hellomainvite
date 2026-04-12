import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth, getDb } from '../config/firebaseConfig';
import type { UserRole } from '../types/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userRole: UserRole;
  loading: boolean;
  error: string;
  setError: (val: string) => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'admin@hellodalat.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('staff');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const roleCache = useRef<Record<string, UserRole>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const cachedRole = roleCache.current[currentUser.uid];
          if (cachedRole) {
            setUserRole(cachedRole);
            setLoading(false);
            return;
          }

          const [{ ref, get, child, set }, db] = await Promise.all([
            import('firebase/database'),
            getDb(),
          ]);
          const userRef = child(ref(db), `users/${currentUser.uid}`);
          const snapshot = await get(userRef);
          const fallbackRole: UserRole = currentUser.email === ADMIN_EMAIL ? 'admin' : 'staff';
          let role: UserRole = fallbackRole;

          if (snapshot.exists()) {
            const userData = snapshot.val() as { role?: string };
            if (userData.role === 'owner' || userData.role === 'admin' || userData.role === 'staff') {
              role = userData.role;
            }
          } else {
            if (fallbackRole === 'admin') {
              await set(userRef, {
                role: 'admin',
                email: currentUser.email || '',
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }
          }

          roleCache.current[currentUser.uid] = role;
          setUserRole(role);
        } catch (err) {
          console.error('Error fetching user role:', err);
          setUserRole('staff');
        }
      } else {
        setUserRole('staff');
        roleCache.current = {};
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthError = (authError: unknown) => {
    const fallback = 'Đăng nhập thất bại. Vui lòng thử lại.';
    if (!authError || typeof authError !== 'object') {
      setError(fallback);
      return;
    }

    const code = (authError as { code?: string }).code || '';
    const message = (authError as { message?: string }).message || fallback;

    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
      setError('Sai email hoặc mật khẩu.');
      return;
    }

    if (code === 'auth/email-already-in-use') {
      setError('Email này đã được đăng ký. Vui lòng chuyển sang Đăng nhập.');
      return;
    }

    if (code === 'auth/weak-password') {
      setError('Mật khẩu quá yếu (tối thiểu 6 ký tự).');
      return;
    }

    setError('Lỗi: ' + message);
  };

  const login = async (email: string, pass: string) => {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      handleAuthError(err);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserRole('staff');
    setError('');
  };

  const value = useMemo(
    () => ({
      user,
      userRole,
      loading,
      error,
      setError,
      login,
      logout,
    }),
    [user, userRole, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
