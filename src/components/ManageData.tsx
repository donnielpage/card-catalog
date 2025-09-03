'use client';

import { useState, useEffect } from 'react';
import { Player, Team, Manufacturer } from '@/lib/types';
import PlayerForm from './PlayerForm';
import TeamForm from './TeamForm';
import ManufacturerForm from './ManufacturerForm';

export default function ManageData() {
  const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'manufacturers'>('players');
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Player | Team | Manufacturer | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [playersRes, teamsRes, manufacturersRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/teams'),
        fetch('/api/manufacturers')
      ]);

      setPlayers(await playersRes.json());
      setTeams(await teamsRes.json());
      setManufacturers(await manufacturersRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: Player | Team | Manufacturer) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id: number, type: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/${type}s/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchAllData();
      } else {
        alert(`Failed to delete ${type}`);
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert(`Error deleting ${type}`);
    }
  };

  const handleFormSubmit = async (data: Omit<Player, 'id'> | Omit<Team, 'id'> | Omit<Manufacturer, 'id'>) => {
    try {
      const endpoint = `${activeTab}`;
      const url = editingItem ? `/api/${endpoint}/${editingItem.id}` : `/api/${endpoint}`;
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setShowForm(false);
        setEditingItem(null);
        fetchAllData();
      } else {
        alert('Failed to save data');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Error saving data');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  if (loading) {
    return <div className="text-center py-8">Loading data...</div>;
  }

  const getCurrentData = () => {
    switch (activeTab) {
      case 'players': return players;
      case 'teams': return teams;
      case 'manufacturers': return manufacturers;
    }
  };

  const renderTable = () => {
    const data = getCurrentData();
    
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {activeTab === 'players' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                  </>
                )}
                {activeTab === 'teams' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mascot</th>
                  </>
                )}
                {activeTab === 'manufacturers' && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subset Name</th>
                  </>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item: Player | Team | Manufacturer) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {activeTab === 'players' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(item as Player).firstname}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(item as Player).lastname}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(item as Player).dob ? new Date((item as Player).dob!).toLocaleDateString() : 'N/A'}
                      </td>
                    </>
                  )}
                  {activeTab === 'teams' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(item as Team).city}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(item as Team).mascot || 'N/A'}</td>
                    </>
                  )}
                  {activeTab === 'manufacturers' && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(item as Manufacturer).company}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(item as Manufacturer).year || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(item as Manufacturer).subsetname || 'N/A'}</td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id!, activeTab.slice(0, -1))}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Manage Data</h2>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add New {activeTab.slice(0, -1)}
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('players')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'players'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Players ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'teams'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('manufacturers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'manufacturers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Manufacturers ({manufacturers.length})
          </button>
        </nav>
      </div>

      {renderTable()}

      {showForm && (
        <>
          {activeTab === 'players' && (
            <PlayerForm
              player={editingItem as Player | null}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          )}
          {activeTab === 'teams' && (
            <TeamForm
              team={editingItem as Team | null}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          )}
          {activeTab === 'manufacturers' && (
            <ManufacturerForm
              manufacturer={editingItem as Manufacturer | null}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          )}
        </>
      )}
    </div>
  );
}