'use client';

import { useState, useEffect } from 'react';
import { Team } from '@/lib/types';

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