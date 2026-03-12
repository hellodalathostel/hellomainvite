
import { ref, push } from "firebase/database";
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from '../config/firebaseConfig';
import { AuditLog } from '../types/types';

type AuditLogPayload = Omit<AuditLog, 'id'>;

export const useAudit = (user: FirebaseUser | null) => {

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

  return { logAction };
};
