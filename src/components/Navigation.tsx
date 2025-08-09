'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Team } from '@/lib/types';
import { getTeamLogoColors } from '@/lib/colorUtils';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const { user, canManageUsers } = useAuth();
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  
  const handleSignOut = () => {
    // Use current host for callback URL instead of hardcoded localhost
    const baseUrl = window.location.origin;
    signOut({ callbackUrl: `${baseUrl}/auth/signin` });
  };

  // Fetch user's favorite team colors
  useEffect(() => {
    const fetchUserTeam = async () => {
      if (user?.favorite_team_id) {
        try {
          const response = await fetch(`/api/teams/${user.favorite_team_id}`);
          if (response.ok) {
            const team = await response.json();
            setUserTeam(team);
          }
        } catch (error) {
          console.error('Error fetching user team:', error);
        }
      } else {
        setUserTeam(null);
      }
    };

    fetchUserTeam();
  }, [user?.favorite_team_id]);

  // Get logo colors based on user's favorite team using utility function
  const logoColors = getTeamLogoColors(userTeam);

  return (
    <div>
      <nav className="bg-slate-800 shadow-lg">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-4">
                <div 
                  className="w-12 h-12 rounded-xl border-3 flex items-center justify-center shadow-md transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundColor: logoColors.backgroundColor,
                    borderColor: logoColors.borderColor,
                    color: logoColors.textColor,
                    boxShadow: `0 4px 12px rgba(0, 0, 0, 0.15)`
                  }}
                >
                  <span className="font-bold text-lg font-display">
                    {user ? `${user.firstname?.charAt(0)}${user.lastname?.charAt(0)}` : 'CV'}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-display text-white">CardVault</h1>
                  <p className="text-sm text-slate-300 opacity-90">Sports Card Collection</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-red-400 hover:border-red-300"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </nav>
      
      {/* User Info Bar */}
      {user && (
        <div className="bg-slate-700 border-b border-slate-600">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-slate-200">Welcome, {user.username}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium shadow-sm ${
                    user.role === 'admin' ? 'role-admin' :
                    user.role === 'manager' ? 'role-manager' :
                    'role-user'
                  }`}>
                    {user.role.toUpperCase()}
                  </span>
                  {userTeam && (
                    <span className="text-xs text-slate-300 bg-slate-600 px-2 py-1 rounded-full">
                      🏟️ {userTeam.city} {userTeam.mascot}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Navigation Menu */}
              <div className="flex space-x-3">
                <button
                  onClick={() => onPageChange('cards')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 relative ${
                    currentPage === 'cards'
                      ? 'text-white transform scale-105 shadow-lg bg-blue-600 hover:bg-blue-700'
                      : 'text-slate-300 hover:bg-slate-600 hover:text-white hover:scale-105'
                  }`}
                >
                  <span>🃏</span>
                  <span>Cards</span>
                </button>
                <button
                  onClick={() => onPageChange('reports')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 relative ${
                    currentPage === 'reports'
                      ? 'text-white transform scale-105 shadow-lg bg-emerald-600 hover:bg-emerald-700'
                      : 'text-slate-300 hover:bg-slate-600 hover:text-white hover:scale-105'
                  }`}
                >
                  <span>📊</span>
                  <span>Reports</span>
                </button>
                <button
                  onClick={() => onPageChange('manage')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 relative ${
                    currentPage === 'manage'
                      ? 'text-white transform scale-105 shadow-lg bg-orange-600 hover:bg-orange-700'
                      : 'text-slate-300 hover:bg-slate-600 hover:text-white hover:scale-105'
                  }`}
                >
                  <span>⚙️</span>
                  <span>Manage</span>
                </button>
                {canManageUsers && (
                  <button
                    onClick={() => onPageChange('users')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 relative ${
                      currentPage === 'users'
                        ? 'text-white transform scale-105 shadow-lg bg-purple-600 hover:bg-purple-700'
                        : 'text-slate-300 hover:bg-slate-600 hover:text-white hover:scale-105'
                    }`}
                  >
                    <span>👥</span>
                    <span>Users</span>
                  </button>
                )}
                {user?.role === 'admin' && (
                  <button
                    onClick={() => onPageChange('system-management')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 relative ${
                      currentPage === 'system-management'
                        ? 'text-white transform scale-105 shadow-lg bg-red-600 hover:bg-red-700'
                        : 'text-slate-300 hover:bg-slate-600 hover:text-white hover:scale-105'
                    }`}
                  >
                    <span>🔧</span>
                    <span>System</span>
                  </button>
                )}
                <button
                  onClick={() => onPageChange('profile')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 relative ${
                    currentPage === 'profile'
                      ? 'text-white transform scale-105 shadow-lg bg-indigo-600 hover:bg-indigo-700'
                      : 'text-slate-300 hover:bg-slate-600 hover:text-white hover:scale-105'
                  }`}
                >
                  <span>👤</span>
                  <span>Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}