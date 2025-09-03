'use client';

import { useState, useEffect } from 'react';
import { User, Team } from '@/lib/types';

interface ExtendedUser extends User {
  organization_name?: string;
  organization_slug?: string;
  organization_status?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
  const [groupByOrganization, setGroupByOrganization] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstname: '',
    lastname: '',
    password: '',
    role: 'user' as 'user' | 'manager' | 'admin',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchUsers();
        resetForm();
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      password: '',
      role: user.role,
    });
    setShowForm(true);
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('An error occurred while deleting the user');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      firstname: '',
      lastname: '',
      password: '',
      role: 'user',
    });
    setEditingUser(null);
    setShowForm(false);
    setError('');
  };

  // Group users by organization
  const getGroupedUsers = () => {
    if (!groupByOrganization) {
      return { 'All Users': users };
    }

    const grouped: { [key: string]: ExtendedUser[] } = {};
    
    users.forEach(user => {
      const orgName = user.organization_name || 'No Organization';
      if (!grouped[orgName]) {
        grouped[orgName] = [];
      }
      grouped[orgName].push(user);
    });

    // Sort organizations, but put "No Organization" last
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'No Organization') return 1;
      if (b === 'No Organization') return -1;
      return a.localeCompare(b);
    });

    const sortedGrouped: { [key: string]: ExtendedUser[] } = {};
    sortedKeys.forEach(key => {
      sortedGrouped[key] = grouped[key];
    });

    return sortedGrouped;
  };

  const getOrganizationStatusBadge = (status: string) => {
    switch (status) {
      case 'active': 
        return 'bg-green-100 text-green-800';
      case 'inactive': 
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended': 
        return 'bg-red-100 text-red-800';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-yellow-100 text-yellow-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserAvatarColors = (user: User) => {
    if (user.favorite_team_id) {
      const team = teams.find(t => t.id === user.favorite_team_id);
      if (team) {
        return {
          backgroundColor: team.primary_color || '#3b82f6',
          borderColor: team.secondary_color || '#ffffff',
          color: '#ffffff'
        };
      }
    }
    // Default blue colors
    return {
      backgroundColor: '#3b82f6',
      borderColor: '#ffffff',
      color: '#ffffff'
    };
  };

  if (loading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Global User Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage users across all organizations</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              id="group-toggle"
              type="checkbox"
              checked={groupByOrganization}
              onChange={(e) => setGroupByOrganization(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="group-toggle" className="ml-2 text-sm text-gray-700">
              Group by Organization
            </label>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add New User
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.firstname}
                    onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.lastname}
                    onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password {editingUser && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'manager' | 'admin' })}
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(getGroupedUsers()).map(([orgName, orgUsers]) => (
          <div key={orgName} className="bg-white shadow overflow-hidden sm:rounded-md">
            {groupByOrganization && (
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">{orgName}</h3>
                    {orgUsers[0]?.organization_status && orgName !== 'No Organization' && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOrganizationStatusBadge(orgUsers[0].organization_status)}`}>
                        {orgUsers[0].organization_status}
                      </span>
                    )}
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {orgUsers.length} user{orgUsers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
            <ul className="divide-y divide-gray-200">
              {orgUsers.map((user) => (
                <li key={user.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div 
                          className="h-10 w-10 rounded-full border-2 flex items-center justify-center"
                          style={getUserAvatarColors(user)}
                        >
                          <span className="text-sm font-medium">
                            {user.firstname?.charAt(0)}{user.lastname?.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstname} {user.lastname} ({user.username})
                          </div>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                          {user.organization_role && user.organization_role !== 'user' && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {user.organization_role}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          <span>Created: {new Date(user.created_at).toLocaleDateString()}</span>
                          {!groupByOrganization && user.organization_name && (
                            <span className="flex items-center space-x-2">
                              <span className="text-blue-600">• {user.organization_name}</span>
                              {user.organization_status && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOrganizationStatusBadge(user.organization_status)}`}>
                                  {user.organization_status}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {orgUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found in {orgName}.
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}