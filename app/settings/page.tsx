'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/auth';

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', name: '', role: 'user' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch current user
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      }

      // Fetch all users
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to create user');
        return;
      }

      const data = await response.json();
      setTempPassword(data.temporaryPassword);
      setSuccess(`User created successfully! Temporary password: ${data.temporaryPassword}`);
      setFormData({ email: '', name: '', role: 'user' });
      setShowAddForm(false);
      await fetchData();
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete user');
        return;
      }

      setSuccess('User deleted successfully');
      await fetchData();
    } catch (err) {
      setError('An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="p-8">
      <h1 className="font-heading text-3xl text-secondary-black mb-8">Settings</h1>

      {/* Admin Only Section */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              {showAddForm ? 'Cancel' : 'Add User'}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* Add User Form */}
          {showAddForm && (
            <form onSubmit={handleAddUser} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
              >
                Create User
              </button>
            </form>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Last Login</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={!user.is_active}
                        className="text-red-600 hover:text-red-900 text-sm font-medium disabled:text-gray-400"
                      >
                        {user.is_active ? 'Delete' : 'Deleted'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Non-Admin Message */}
      {!isAdmin && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <p className="text-gray-600">Only administrators can manage users. Please contact an admin for assistance.</p>
        </div>
      )}
    </div>
  );
}








