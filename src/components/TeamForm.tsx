'use client';

import { useState, useEffect } from 'react';
import { Team } from '@/lib/types';

// MLB team colors extracted from official team data
const MLB_TEAM_COLORS = [
  { name: 'Atlanta Braves', primary: '#ce1141', secondary: '#13274f', accent: '#eaaa00' },
  { name: 'Miami Marlins', primary: '#ff6600', secondary: '#0077c8', accent: '#ffd100' },
  { name: 'New York Mets', primary: '#002f6c', secondary: '#ffa500', accent: '#ffffff' },
  { name: 'Philadelphia Phillies', primary: '#e81828', secondary: '#002d72', accent: '#ffffff' },
  { name: 'Washington Nationals', primary: '#ab0003', secondary: '#14225a', accent: '#ffffff' },
  { name: 'Chicago Cubs', primary: '#0e3386', secondary: '#cc3433', accent: '#ffffff' },
  { name: 'Cincinnati Reds', primary: '#c6011f', secondary: '#000000', accent: '#ffffff' },
  { name: 'Milwaukee Brewers', primary: '#0a2351', secondary: '#b6922e', accent: '#ffffff' },
  { name: 'Pittsburgh Pirates', primary: '#000000', secondary: '#fdb827', accent: '#ffffff' },
  { name: 'St. Louis Cardinals', primary: '#c41e3a', secondary: '#0c2340', accent: '#ffd200' },
  { name: 'Arizona Diamondbacks', primary: '#a71930', secondary: '#e3d4ad', accent: '#000000' },
  { name: 'Colorado Rockies', primary: '#33006f', secondary: '#c4ced4', accent: '#000000' },
  { name: 'Los Angeles Dodgers', primary: '#005a9c', secondary: '#c4ced4', accent: '#ef3e42' },
  { name: 'San Diego Padres', primary: '#0c2340', secondary: '#ffc62f', accent: '#ffffff' },
  { name: 'San Francisco Giants', primary: '#fd5a1e', secondary: '#000000', accent: '#c4ced4' },
  { name: 'Baltimore Orioles', primary: '#df4601', secondary: '#000000', accent: '#ffffff' },
  { name: 'Boston Red Sox', primary: '#bd3039', secondary: '#192c55', accent: '#ffffff' },
  { name: 'New York Yankees', primary: '#0c2340', secondary: '#ffffff', accent: '#c4ced4' },
  { name: 'Tampa Bay Rays', primary: '#092c5c', secondary: '#8fbce6', accent: '#f5d130' },
  { name: 'Toronto Blue Jays', primary: '#134a8e', secondary: '#1d2d5c', accent: '#e8291c' },
  { name: 'Chicago White Sox', primary: '#000000', secondary: '#c4ced4', accent: '#ffffff' },
  { name: 'Cleveland Guardians', primary: '#00385d', secondary: '#e50022', accent: '#ffffff' },
  { name: 'Detroit Tigers', primary: '#182d55', secondary: '#f26722', accent: '#ffffff' },
  { name: 'Kansas City Royals', primary: '#174885', secondary: '#c0995a', accent: '#ffffff' },
  { name: 'Minnesota Twins', primary: '#002b5c', secondary: '#d31145', accent: '#cfac7a' },
  { name: 'Houston Astros', primary: '#002d62', secondary: '#eb6e1f', accent: '#e7e9ea' },
  { name: 'Los Angeles Angels', primary: '#ba0021', secondary: '#003263', accent: '#ffffff' },
  { name: 'Oakland Athletics', primary: '#003831', secondary: '#ebb742', accent: '#c4ced4' },
  { name: 'Seattle Mariners', primary: '#0c2c56', secondary: '#005c5c', accent: '#d50032' },
  { name: 'Texas Rangers', primary: '#003278', secondary: '#c0111f', accent: '#ffffff' }
];

interface TeamFormProps {
  team?: Team | null;
  onSubmit: (team: Omit<Team, 'id'>) => void;
  onCancel: () => void;
}

export default function TeamForm({ team, onSubmit, onCancel }: TeamFormProps) {
  const [formData, setFormData] = useState<Omit<Team, 'id'>>({
    city: '',
    mascot: '',
    teamname: '',
    primary_color: '#3b82f6',
    secondary_color: '#ffffff', 
    accent_color: '#06b6d4'
  });

  useEffect(() => {
    if (team) {
      setFormData({
        city: team.city || '',
        mascot: team.mascot || '',
        teamname: team.teamname || '',
        primary_color: team.primary_color || '#3b82f6',
        secondary_color: team.secondary_color || '#ffffff',
        accent_color: team.accent_color || '#06b6d4'
      });
    }
  }, [team]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? undefined : value
    }));
  };

  const applyMLBColors = (mlbTeam: typeof MLB_TEAM_COLORS[0]) => {
    setFormData(prev => ({
      ...prev,
      primary_color: mlbTeam.primary,
      secondary_color: mlbTeam.secondary,
      accent_color: mlbTeam.accent
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {team ? 'Edit Team' : 'Add New Team'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              type="text"
              name="city"
              value={formData.city || ''}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mascot
            </label>
            <input
              type="text"
              name="mascot"
              value={formData.mascot || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Name *
            </label>
            <input
              type="text"
              name="teamname"
              value={formData.teamname || ''}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-800 border-b pb-2">Team Colors</h4>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Quick Select MLB Team Colors</h5>
              <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                {MLB_TEAM_COLORS.map((mlbTeam, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applyMLBColors(mlbTeam)}
                    className="flex items-center space-x-2 p-2 text-left hover:bg-blue-100 rounded text-xs"
                    title={`Apply ${mlbTeam.name} colors`}
                  >
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 rounded-full border" style={{backgroundColor: mlbTeam.primary}}></div>
                      <div className="w-3 h-3 rounded-full border" style={{backgroundColor: mlbTeam.secondary}}></div>
                      <div className="w-3 h-3 rounded-full border" style={{backgroundColor: mlbTeam.accent}}></div>
                    </div>
                    <span className="truncate">{mlbTeam.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="space-y-2">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color || '#3b82f6'}
                    onChange={handleChange}
                    className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    name="primary_color"
                    value={formData.primary_color || '#3b82f6'}
                    onChange={handleChange}
                    placeholder="#3b82f6"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="space-y-2">
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color || '#ffffff'}
                    onChange={handleChange}
                    className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    name="secondary_color"
                    value={formData.secondary_color || '#ffffff'}
                    onChange={handleChange}
                    placeholder="#ffffff"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="space-y-2">
                  <input
                    type="color"
                    name="accent_color"
                    value={formData.accent_color || '#06b6d4'}
                    onChange={handleChange}
                    className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    name="accent_color"
                    value={formData.accent_color || '#06b6d4'}
                    onChange={handleChange}
                    placeholder="#06b6d4"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Color Preview</h4>
            <div className="flex items-center space-x-3">
              <div 
                className="w-12 h-12 rounded-xl border-2 flex items-center justify-center shadow-sm font-bold text-white"
                style={{
                  backgroundColor: formData.primary_color || '#3b82f6',
                  borderColor: formData.secondary_color || '#ffffff'
                }}
              >
                CV
              </div>
              <div>
                <p className="text-sm text-gray-600">Logo preview with team colors</p>
                <div className="flex space-x-2 mt-1">
                  <span className="text-xs px-2 py-1 rounded" style={{backgroundColor: formData.primary_color || '#3b82f6', color: 'white'}}>Primary</span>
                  <span className="text-xs px-2 py-1 rounded border" style={{backgroundColor: formData.secondary_color || '#ffffff', color: '#374151', borderColor: '#d1d5db'}}>Secondary</span>
                  <span className="text-xs px-2 py-1 rounded" style={{backgroundColor: formData.accent_color || '#06b6d4', color: 'white'}}>Accent</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {team ? 'Update' : 'Add'} Team
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}