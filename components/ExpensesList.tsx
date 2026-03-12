import React from 'react';
import { Plus, Trash2, Edit2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Expense } from '../types/types';
import { formatDate, formatCompactCurrency } from '../utils/utils';

interface ExpensesListProps {
  expenses: Expense[];
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

const ExpensesList: React.FC<ExpensesListProps> = ({ expenses, onAdd, onEdit, onDelete, loading }) => {
  return (
    <div className="p-4 pb-24 space-y-4 bg-white dark:bg-slate-950 min-h-full">
       <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700">
         <h2 className="font-bold text-lg text-gray-900 dark:text-white">Quản lý Thu / Chi</h2>
        <button onClick={onAdd} className="bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-800 shadow-sm transition-colors">
            <Plus size={18}/> Giao dịch mới
         </button>
       </div>

       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
         <table className="w-full text-sm">
           <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-700">
             <tr>
               <th className="p-3 text-left text-gray-800 dark:text-gray-200 font-bold">Ngày</th>
               <th className="p-3 text-left text-gray-800 dark:text-gray-200 font-bold">Nội dung</th>
               <th className="p-3 text-right text-gray-800 dark:text-gray-200 font-bold">Số tiền</th>
               <th className="p-3"></th>
             </tr>
           </thead>
           <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
             {loading ? (
                // Skeleton Rows
                [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                        <td className="p-3"><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                        <td className="p-3">
                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </td>
                        <td className="p-3 text-right"><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div></td>
                        <td className="p-3"></td>
                    </tr>
                ))
             ) : (
                <>
                    {expenses.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(ex => {
                    const isIncome = ex.type === 'income';
                    return (
                        <tr key={ex.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="p-3 text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">{formatDate(ex.date)}</td>
                        <td className="p-3 font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                                {isIncome ? <ArrowDownLeft size={14} className="text-green-600"/> : <ArrowUpRight size={14} className="text-red-600"/>}
                                {ex.description} 
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold block ml-6">{ex.category}</span>
                        </td>
                        <td className={`p-3 text-right font-black ${isIncome ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            {isIncome ? '+' : '-'}{formatCompactCurrency(ex.amount)}
                        </td>
                        <td className="p-3 text-right flex justify-end gap-2">
                            <button onClick={() => onEdit(ex)} className="text-gray-400 hover:text-blue-600 transition-colors">
                                <Edit2 size={16}/>
                            </button>
                            <button onClick={() => onDelete(ex.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                                <Trash2 size={16}/>
                            </button>
                        </td>
                        </tr>
                    )
                    })}
                    {expenses.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-6 text-center text-gray-500 italic">Chưa có giao dịch nào.</td>
                        </tr>
                    )}
                </>
             )}
           </tbody>
         </table>
       </div>
    </div>
  )
}

export default ExpensesList;