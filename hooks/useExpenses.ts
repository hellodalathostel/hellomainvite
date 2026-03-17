
import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, set, remove } from "firebase/database";
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from '../config/database';
import { Expense } from '../types/types';
import { expenseConverter } from '../utils/dataConverters';
import { useAudit } from './useAudit';
import type { SaveExpensePayload } from '../types/bookingForm';

export const useExpenses = (user: FirebaseUser | null, enabled = true) => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { logAction } = useAudit(user);

  // Memoize active expenses to avoid re-filtering on every render
  const expenses = useMemo(() => {
    return allExpenses.filter(ex => !ex.isDeleted);
  }, [allExpenses]);

  useEffect(() => {
    if (!user) {
      setAllExpenses([]);
      setLoading(false);
      return;
    }

    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const expensesRef = ref(db, 'expenses');
    const unsubExpenses = onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
          setAllExpenses([]);
      } else {
          const raw = data as Record<string, unknown>;
          const list: Expense[] = Object.entries(raw)
            .map(([key, value]) => expenseConverter.fromFirestore(key, value as Record<string, unknown>));
          setAllExpenses(list);
      }
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubExpenses();
  }, [enabled, user]);

  const saveExpense = async (data: SaveExpensePayload) => {
    const id = data.id || Date.now().toString();
    const newExpense = { ...data, id, createdAt: data.createdAt || Date.now(), isDeleted: false };
    await set(ref(db, `expenses/${id}`), newExpense);
    // Note: Logging is handled in Modal or Wrapper, but we could add here if needed.
  };

  const deleteExpense = async (id: string) => {
    await remove(ref(db, `expenses/${id}`));
    logAction('delete_expense', `Xóa vĩnh viễn giao dịch ${id}`, id);
  };

  return {
    expenses,
    loading,
    saveExpense,
    deleteExpense
  };
};
