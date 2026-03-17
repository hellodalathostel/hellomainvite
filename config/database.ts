import { getDatabase } from 'firebase/database';
import { app } from './firebaseConfig';

export const db = getDatabase(app);