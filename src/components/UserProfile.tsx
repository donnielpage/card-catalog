'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSession } from 'next-auth/react';
import { Team, Player } from '@/lib/types';

export default function UserProfile() {
  const { user } = useAuth();
  const { update } = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [favorites, setFavorites] = useState({
    favorite_team_id: user?.favorite_team_id?.toString() || '',
    favorite_player_id: user?.favorite_player_id?.toString() || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchTeamsAndPlayers();
  }, []);

  useEffect(() => {
    if (user) {
      setFavorites({
        favorite_team_id: user.favorite_team_id?.toString() || '',
        favorite_player_id: user.favorite_player_id?.toString() || '',
      });
    }
  }, [user]);

  const fetchTeamsAndPlayers = async () => {
    try {
      const [teamsResponse, playersResponse] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/players')
      ]);

      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        setTeams(teamsData);
      }

      if (playersResponse.ok) {
        const playersData = await playersResponse.json();
        setPlayers(playersData);
      }
    } catch (error) {
      console.error('Error fetching teams and players:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage('');

    console.log('Submitting favorites:', {
      user_id: user.id,
      favorite_team_id: favorites.favorite_team_id || null,
      favorite_player_id: favorites.favorite_player_id || null,
    });

    try {
      const response = await fetch(`/api/users/${user.id}/favorites`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          favorite_team_id: favorites.favorite_team_id || null,
          favorite_player_id: favorites.favorite_player_id || null,
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setMessage('Favorites updated successfully!');
        // Trigger session refresh to get updated user data
        await update();
      } else {
        setMessage(data.error || 'Failed to update favorites');
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      setMessage('An error occurred while updating favorites');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setMessage('New password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`/api/users/${user?.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      
      if (response.ok) {
        setMessage('Password updated successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordChange(false);
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Failed to update password');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setMessage('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">User Profile</h2>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1 text-sm text-gray-900">{user.firstname} {user.lastname}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <p className="mt-1 text-sm text-gray-900">{user.username}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              user.role === 'admin' ? 'bg-red-100 text-red-800' :
              user.role === 'manager' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {user.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Favorites</h3>
          <p className="text-sm text-gray-600">
            Set your favorite team and player to automatically filter the Cards page.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700">Favorite Team</label>
            <select
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={favorites.favorite_team_id}
              onChange={(e) => setFavorites(prev => ({ ...prev, favorite_team_id: e.target.value }))}
            >
              <option value="">No preference</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.city} {team.mascot}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Favorite Player</label>
            <select
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={favorites.favorite_player_id}
              onChange={(e) => setFavorites(prev => ({ ...prev, favorite_player_id: e.target.value }))}
            >
              <option value="">No preference</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.firstname} {player.lastname}
                </option>
              ))}
            </select>
          </div>

          {message && (
            <div className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Save Favorites'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Password Settings</h3>
          <button
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showPasswordChange ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordChange && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                required
                minLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}