
import React from 'react';
import { useUI } from '../context/UIContext';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContainer = () => {
  const { toasts, removeToast } = useUI();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-xs pointer-events-none px-4 sm:px-0">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`
            pointer-events-auto
            flex items-center gap-3 p-4 rounded-xl shadow-lg border-l-4
            transform transition-all duration-300 animate-in slide-in-from-top-2 fade-in
            ${toast.type === 'success' ? 'bg-white dark:bg-gray-800 border-green-500 text-gray-800 dark:text-white' : ''}
            ${toast.type === 'error' ? 'bg-white dark:bg-gray-800 border-red-500 text-gray-800 dark:text-white' : ''}
            ${toast.type === 'info' ? 'bg-white dark:bg-gray-800 border-blue-500 text-gray-800 dark:text-white' : ''}
          `}
        >
          <div className="shrink-0">
            {toast.type === 'success' && <CheckCircle size={20} className="text-green-500" />}
            {toast.type === 'error' && <AlertCircle size={20} className="text-red-500" />}
            {toast.type === 'info' && <Info size={20} className="text-blue-500" />}
          </div>
          <p className="text-xs font-bold flex-1">{toast.message}</p>
          <button onClick={() => removeToast(toast.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
