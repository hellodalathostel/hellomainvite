
import { useState, useEffect, useRef } from 'react';
import { ref, push, query, limitToLast, onValue } from "firebase/database";
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from '../config/firebaseConfig';
import { AuditLog } from '../types/types';

type AuditLogPayload = Omit<AuditLog, 'id'>;

export const useAudit = (user: FirebaseUser | null) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const logsRef = useRef<AuditLog[]>([]); // Cache for quick access

  useEffect(() => {
    if (!user) return;
    
    // Load last 50 logs (OPTIMIZED: limitToLast reduces payload)
    const q = query(ref(db, 'audit_logs'), limitToLast(50));
    const unsub = onValue(q, (snapshot) => {
      const data = snapshot.val() as Record<string, AuditLogPayload> | null;
        if (data) {
        const list = Object.entries(data).map(([key, val]) => ({
                id: key,
                ...val
            })).sort((a,b) => b.timestamp - a.timestamp); // Sort Newest First
            setLogs(list);
            logsRef.current = list; // Cache reference
        } else {
            setLogs([]);
            logsRef.current = [];
        }
    });
    return () => unsub();
  }, [user]);

  const logAction = async (action: string, description: string, bookingId?: string) => {
    if (!user) return;
    
    // Create base object without optional undefined properties
    const newLog: AuditLogPayload = {
        action,
        description,
        user: user.email || 'unknown',
        timestamp: Date.now(),
    };

    // Only add bookingId if it is defined and not null/empty
    if (bookingId) {
        newLog.bookingId = bookingId;
    }

    await push(ref(db, 'audit_logs'), newLog);
  };

  return { logs, logAction };
};
