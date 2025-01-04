import { getDB } from '../db';

export async function checkForExistingAdmin(): Promise<boolean> {
  const db = await getDB();
  const users = await db.getAll('users');
  return users.some(user => user.role === 'admin');
}

export async function createInitialAdmin(email: string, name: string): Promise<void> {
  const db = await getDB();
  
  await db.add('users', {
    id: crypto.randomUUID(),
    name,
    email,
    role: 'admin',
    joinedAt: new Date(),
    lastActive: new Date()
  });
}