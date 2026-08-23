import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, LayoutTemplate, Activity } from 'lucide-react';

export function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const q = query(collection(db, 'users'), orderBy('lastLogin', 'desc'));
        const snapshot = await getDocs(q);
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersList);
      } catch (err) {
        console.error("Failed to fetch users (are you admin?)", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Admin Dashboard</h1>
        <p className="text-neutral-400 text-sm">Monitor platform usage and registered users.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 bg-[#0F0F0F] border border-neutral-800 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Total Users</p>
            <p className="text-2xl font-bold text-white">{loading ? '...' : users.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#0F0F0F] border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-800">
          <h2 className="text-lg font-bold text-white">Registered Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-neutral-900/50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Last Login</th>
                <th className="px-6 py-3 font-medium">User ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No users found.</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-neutral-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-neutral-200">{user.email}</td>
                    <td className="px-6 py-4">{user.displayName || '-'}</td>
                    <td className="px-6 py-4">{new Date(user.lastLogin).toLocaleString()}</td>
                    <td className="px-6 py-4 font-mono text-[10px] text-neutral-600">{user.id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
