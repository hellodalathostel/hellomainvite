
import React, { useState } from 'react';
import { Loader2, Lock, AlertCircle } from 'lucide-react';

interface AuthScreenProps {
  login: (email: string, pass: string) => Promise<void>;
  error: string;
  setError: (val: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ login, error, setError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      // Always perform login; registration is disabled
      await login(email, password);
    } catch (err) {
      // Error is set in parent hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-gray-100 flex flex-col justify-center p-6 text-gray-900">
      <div className="mb-8 text-center animate-fade-in">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-2xl border-b-4 border-blue-900 transform -rotate-3 text-white">HD</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Hello Dalat</h1>
        <p className="text-blue-800 font-bold tracking-wide">Hostel Management System</p>
      </div>
      <form onSubmit={handleAuthAction} className="w-full max-w-sm mx-auto space-y-5 bg-white p-8 rounded-3xl shadow-xl border border-gray-200">
        {error && (<div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-3"><AlertCircle size={16} className="shrink-0 mt-0.5"/><span>{error}</span></div>)}
        <div className="space-y-2"><label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Email</label><input type="email" required value={email} onChange={e => { setEmail(e.target.value); setError(''); }} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-base text-gray-900" placeholder="admin@hellodalat.com"/></div>
        <div className="space-y-2"><label className="block text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Mật khẩu</label><input type="password" required value={password} onChange={e => { setPassword(e.target.value); setError(''); }} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-base text-gray-900" placeholder="••••••••"/></div>
        <button type="submit" disabled={isSubmitting} className="w-full p-4 bg-blue-700 rounded-2xl font-black text-white hover:bg-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed">{isSubmitting ? (<Loader2 size={18} className="animate-spin"/>) : <Lock size={18}/>} Đăng nhập</button>
      </form>
    </div>
  );
};

export default AuthScreen;
