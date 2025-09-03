'use client';

import { useState, useEffect } from 'react';
import { Card, Player, Team, Manufacturer, CardWithDetails } from '@/lib/types';
import PlayerForm from './PlayerForm';
import TeamForm from './TeamForm';
import ManufacturerForm from './ManufacturerForm';
import ImageUpload from './ImageUpload';
import { useAuth } from '@/lib/hooks/useAuth';

interface CardFormProps {
  card?: CardWithDetails | null;
  onSubmit: (card: Omit<Card, 'id'>) => void;
  onCancel: () => void;
}

export default function CardForm({ card, onSubmit, onCancel }: CardFormProps) {
  const { canCreate, canModify } = useAuth();
  const isEditing = !!card;
  const canEditImage = isEditing ? canModify : canCreate;
  
  const [formData, setFormData] = useState<Omit<Card, 'id'>>({
    cardnumber: '',
    playerid: undefined,
    teamid: undefined,
    manufacturerid: undefined,
    year: undefined,
    imageurl: '',
    condition: '',
    notes: ''
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  
  // Inline editing states
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showManufacturerForm, setShowManufacturerForm] = useState(false);

  useEffect(() => {
    fetchOptions();
    if (card) {
      setFormData({
        cardnumber: card.cardnumber || '',
        playerid: card.playerid,
        teamid: card.teamid,
        manufacturerid: card.manufacturerid,
        year: card.year,
        imageurl: card.imageurl || '',
        condition: card.condition || '',
        notes: card.notes || ''
      });
    }
  }, [card]);

  const fetchOptions = async () => {
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
      console.error('Error fetching options:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'notes' || name === 'condition') ? value : (value === '' ? undefined : (name === 'year') ? parseInt(value) || undefined : value)
    }));
  };

  // Handle inline player creation
  const handlePlayerSubmit = async (playerData: Omit<Player, 'id'>) => {
    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerData)
      });
      
      if (response.ok) {
        const newPlayer = await response.json();
        setPlayers(prev => [...prev, newPlayer]);
        setFormData(prev => ({ ...prev, playerid: newPlayer.id }));
        setShowPlayerForm(false);
      }
    } catch (error) {
      console.error('Error creating player:', error);
    }
  };

  // Handle inline team creation
  const handleTeamSubmit = async (teamData: Omit<Team, 'id'>) => {
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData)
      });
      
      if (response.ok) {
        const newTeam = await response.json();
        setTeams(prev => [...prev, newTeam]);
        setFormData(prev => ({ ...prev, teamid: newTeam.id }));
        setShowTeamForm(false);
      }
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  // Handle inline manufacturer creation
  const handleManufacturerSubmit = async (manufacturerData: Omit<Manufacturer, 'id'>) => {
    try {
      const response = await fetch('/api/manufacturers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manufacturerData)
      });
      
      if (response.ok) {
        const newManufacturer = await response.json();
        setManufacturers(prev => [...prev, newManufacturer]);
        setFormData(prev => ({ ...prev, manufacturerid: newManufacturer.id }));
        setShowManufacturerForm(false);
      }
    } catch (error) {
      console.error('Error creating manufacturer:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {card ? 'Edit Card' : 'Add New Card'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card Number *
            </label>
            <input
              type="text"
              name="cardnumber"
              value={formData.cardnumber}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Player
            </label>
            <div className="flex space-x-2">
              <select
                name="playerid"
                value={formData.playerid || ''}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a player</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.firstname} {player.lastname}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowPlayerForm(true)}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 whitespace-nowrap"
              >
                + New
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team
            </label>
            <div className="flex space-x-2">
              <select
                name="teamid"
                value={formData.teamid || ''}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.city} {team.mascot ? `(${team.mascot})` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowTeamForm(true)}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 whitespace-nowrap"
              >
                + New
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manufacturer
            </label>
            <div className="flex space-x-2">
              <select
                name="manufacturerid"
                value={formData.manufacturerid || ''}
                onChange={handleChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a manufacturer</option>
                {manufacturers.map((manufacturer) => (
                  <option key={manufacturer.id} value={manufacturer.id}>
                    {manufacturer.company} {manufacturer.year && `(${manufacturer.year})`}{manufacturer.subsetname && ` - ${manufacturer.subsetname}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowManufacturerForm(true)}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 whitespace-nowrap"
              >
                + New
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <input
              type="number"
              name="year"
              value={formData.year?.toString() || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <ImageUpload
              currentImage={formData.imageurl || ''}
              onImageChange={(imageUrl) => setFormData(prev => ({ ...prev, imageurl: imageUrl }))}
              disabled={!canEditImage}
            />
            {!canEditImage && (
              <p className="text-sm text-gray-500 mt-2">
                {isEditing ? 'You need manager permissions to modify images' : 'You need user permissions to upload images'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              name="condition"
              value={formData.condition || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select condition</option>
              <option value="Mint">Mint</option>
              <option value="Near Mint">Near Mint</option>
              <option value="Excellent">Excellent</option>
              <option value="Very Good">Very Good</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {card ? 'Update' : 'Add'} Card
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
      
      {/* Inline Player Form */}
      {showPlayerForm && (
        <PlayerForm
          onSubmit={handlePlayerSubmit}
          onCancel={() => setShowPlayerForm(false)}
        />
      )}
      
      {/* Inline Team Form */}
      {showTeamForm && (
        <TeamForm
          onSubmit={handleTeamSubmit}
          onCancel={() => setShowTeamForm(false)}
        />
      )}
      
      {/* Inline Manufacturer Form */}
      {showManufacturerForm && (
        <ManufacturerForm
          onSubmit={handleManufacturerSubmit}
          onCancel={() => setShowManufacturerForm(false)}
        />
      )}
    </div>
  );
}