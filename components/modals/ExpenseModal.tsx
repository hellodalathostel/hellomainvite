
import React, { useState, useEffect } from 'react';
import { Expense } from '../../types/types';
import CurrencyInput from '../CurrencyInput';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface ExpenseModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: { description: string; amount: number; date: string; category: string, type: 'expense' | 'income', id?: string }) => void;
  editingExpense?: Expense | null;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ show, onClose, onSave, editingExpense }) => {
  const [d, setD] = useState<{ 
    description: string; 
    amount: number; 
    date: string; 
    category: string; 
    type: 'expense' | 'income'; 
  }>({ 
    description: '', 
    amount: 0, 
    date: new Date().toISOString().split('T')[0], 
    category: 'Khác',
    type: 'expense'
  });

  useEffect(() => {
    if (show) {
        if (editingExpense) {
            setD({
                description: editingExpense.description,
                amount: editingExpense.amount,
                date: editingExpense.date,
                category: editingExpense.category,
                type: editingExpense.type || 'expense'
            });
        } else {
            setD({ 
                description: '', 
                amount: 0, 
                date: new Date().toISOString().split('T')[0], 
                category: 'Khác',
                type: 'expense'
            });
        }
    }
  }, [show, editingExpense]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl space-y-4 dark:bg-gray-800">
        <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {editingExpense ? 'Sửa giao dịch' : 'Thêm giao dịch'}
            </h3>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button 
                    onClick={() => setD({...d, type: 'expense'})}
                    className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${d.type === 'expense' ? 'bg-white dark:bg-gray-600 text-red-600 shadow-sm' : 'text-gray-500'}`}
                >
                    <ArrowUpCircle size={14}/> Khoản Chi
                </button>
                <button 
                    onClick={() => setD({...d, type: 'income'})}
                    className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 transition-all ${d.type === 'income' ? 'bg-white dark:bg-gray-600 text-green-600 shadow-sm' : 'text-gray-500'}`}
                >
                    <ArrowDownCircle size={14}/> Khoản Thu
                </button>
            </div>
        </div>

        <input 
          value={d.description} 
          onChange={e=>setD({...d, description: e.target.value})} 
          className="w-full border p-2 rounded outline-none focus:border-blue-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
          placeholder="Nội dung..."
        />
        
        <div className="relative">
            <CurrencyInput 
            value={d.amount} 
            onChange={val => setD({...d, amount: val})} 
            className={`w-full border p-2 pl-3 rounded outline-none font-bold text-lg dark:bg-gray-700 dark:border-gray-600 ${d.type === 'expense' ? 'text-red-700 focus:border-red-500' : 'text-green-700 focus:border-green-500'}`}
            placeholder="Số tiền"
            />
        </div>

        <select 
          value={d.category} 
          onChange={e=>setD({...d, category: e.target.value})} 
          className="w-full border p-2 rounded outline-none bg-white focus:border-blue-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          {d.type === 'expense' ? (
              <>
                <option>Điện nước</option>
                <option>Lương nhân viên</option>
                <option>Sửa chữa</option>
                <option>Thực phẩm/Đồ uống</option>
                <option>Khác</option>
                <option>Phí ngân hàng</option>
              </>
          ) : (
              <>
                <option>Bán nước/Đồ ăn</option>
                <option>Thuê xe ngoài</option>
                <option>Giặt ủi lẻ</option>
                <option>Khác</option>
              </>
          )}
        </select>
        
        <input 
          type="date" 
          value={d.date} 
          onChange={e=>setD({...d, date: e.target.value})} 
          className="w-full border p-2 rounded outline-none focus:border-blue-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
        
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button onClick={onClose} className="py-2 bg-gray-100 rounded font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300">Hủy</button>
          <button 
            onClick={() => onSave({ ...d, amount: Number(d.amount) })} 
            className={`py-2 text-white rounded font-bold transition-colors ${d.type === 'expense' ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'}`}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseModal;
