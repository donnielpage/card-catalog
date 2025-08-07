'use client';

import { useState, useEffect } from 'react';
import { CardWithDetails } from '@/lib/types';
import { useAuth } from '@/lib/hooks/useAuth';

interface CardFiltersProps {
  cards: CardWithDetails[];
  onFilterChange: (filteredCards: CardWithDetails[]) => void;
}

export default function CardFilters({ cards, onFilterChange }: CardFiltersProps) {
  const { user } = useAuth();
  const [selectedManufacturerYear, setSelectedManufacturerYear] = useState<string>('');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  
  // Initialize favoritesEnabled from localStorage, default to true
  const [favoritesEnabled, setFavoritesEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cardFilters_favoritesEnabled');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  // Generate filter options from cards data
  const manufacturerYearOptions = Array.from(
    new Set(
      cards.map(card => {
        const manufacturer = card.manufacturer_company || 'Unknown';
        const year = card.manufacturer_year || 'Unknown';
        const subset = card.manufacturer_subsetname ? ` - ${card.manufacturer_subsetname}` : '';
        return `${manufacturer} (${year})${subset}`;
      }).filter(Boolean)
    )
  ).sort();

  const playerOptions = Array.from(
    new Set(
      cards.map(card => {
        const firstName = card.player_firstname || '';
        const lastName = card.player_lastname || '';
        return `${firstName} ${lastName}`.trim();
      }).filter(name => name.length > 0)
    )
  ).sort();

  const teamOptions = Array.from(
    new Set(
      cards.map(card => {
        const city = card.team_city || '';
        return city;
      }).filter(name => name.length > 0)
    )
  ).sort();

  // Save favoritesEnabled to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cardFilters_favoritesEnabled', JSON.stringify(favoritesEnabled));
    }
  }, [favoritesEnabled]);

  // Apply default filters based on user favorites
  useEffect(() => {
    if (user && cards.length > 0 && !defaultsApplied && favoritesEnabled) {
      console.log('Applying favorite filters for user:', user.username, {
        favorite_team_id: user.favorite_team_id,
        favorite_player_id: user.favorite_player_id
      });

      // Set default team filter if user has a favorite team
      if (user.favorite_team_id) {
        const favoriteTeamCard = cards.find(card => card.teamid === user.favorite_team_id);
        console.log('Looking for team card with teamid:', user.favorite_team_id, 'found:', favoriteTeamCard);
        if (favoriteTeamCard?.team_city) {
          console.log('Setting team filter to:', favoriteTeamCard.team_city);
          setSelectedTeam(favoriteTeamCard.team_city);
        }
      }

      // Set default player filter if user has a favorite player
      if (user.favorite_player_id) {
        const favoritePlayerCard = cards.find(card => card.playerid === user.favorite_player_id);
        console.log('Looking for player card with playerid:', user.favorite_player_id, 'found:', favoritePlayerCard);
        if (favoritePlayerCard) {
          const firstName = favoritePlayerCard.player_firstname || '';
          const lastName = favoritePlayerCard.player_lastname || '';
          const playerName = `${firstName} ${lastName}`.trim();
          if (playerName) {
            console.log('Setting player filter to:', playerName);
            setSelectedPlayer(playerName);
          }
        }
      }

      setDefaultsApplied(true);
    }
  }, [user, cards, defaultsApplied, favoritesEnabled]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    let filtered = [...cards];

    // Filter by manufacturer+year
    if (selectedManufacturerYear) {
      filtered = filtered.filter(card => {
        const manufacturer = card.manufacturer_company || 'Unknown';
        const year = card.manufacturer_year || 'Unknown';
        const subset = card.manufacturer_subsetname ? ` - ${card.manufacturer_subsetname}` : '';
        const cardManufacturerYear = `${manufacturer} (${year})${subset}`;
        return cardManufacturerYear === selectedManufacturerYear;
      });
    }

    // Filter by player
    if (selectedPlayer) {
      filtered = filtered.filter(card => {
        const firstName = card.player_firstname || '';
        const lastName = card.player_lastname || '';
        const cardPlayer = `${firstName} ${lastName}`.trim();
        return cardPlayer === selectedPlayer;
      });
    }

    // Filter by team
    if (selectedTeam) {
      filtered = filtered.filter(card => {
        const city = card.team_city || '';
        return city === selectedTeam;
      });
    }

    // Filter by search text (searches across multiple fields)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(card => {
        const searchFields = [
          card.cardnumber,
          card.player_firstname,
          card.player_lastname,
          card.team_city,
          card.manufacturer_company,
          card.manufacturer_year?.toString(),
          card.manufacturer_subsetname,
          card.year?.toString(),
          card.condition,
          card.notes
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchFields.includes(searchLower);
      });
    }

    onFilterChange(filtered);
  }, [cards, selectedManufacturerYear, selectedPlayer, selectedTeam, searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAllFilters = () => {
    setSelectedManufacturerYear('');
    setSelectedPlayer('');
    setSelectedTeam('');
    setSearchText('');
    setDefaultsApplied(true); // Prevent defaults from being reapplied immediately
    setFavoritesEnabled(false); // Disable favorites when clearing all filters
  };

  const toggleFavorites = () => {
    const newFavoritesEnabled = !favoritesEnabled;
    setFavoritesEnabled(newFavoritesEnabled);
    
    if (newFavoritesEnabled) {
      // Re-enable favorites, clear current filters and allow defaults to be reapplied
      setSelectedManufacturerYear('');
      setSelectedPlayer('');
      setSelectedTeam('');
      setSearchText('');
      setDefaultsApplied(false); // Allow defaults to be reapplied
    } else {
      // Disable favorites, clear current filters completely
      setSelectedManufacturerYear('');
      setSelectedPlayer('');
      setSelectedTeam('');
      setSearchText('');
      setDefaultsApplied(true); // Prevent reapplication
    }
  };

  const hasActiveFilters = selectedManufacturerYear || selectedPlayer || selectedTeam || searchText;

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filter Cards</h3>
        <div className="flex items-center space-x-4">
          {user && (user.favorite_team_id || user.favorite_player_id) && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={favoritesEnabled}
                onChange={toggleFavorites}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Apply my favorites</span>
            </label>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search all fields..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Manufacturer + Year Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Manufacturer & Year
          </label>
          <select
            value={selectedManufacturerYear}
            onChange={(e) => setSelectedManufacturerYear(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">All Manufacturers</option>
            {manufacturerYearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Player Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Player
          </label>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">All Players</option>
            {playerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Team Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Team
          </label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">All Teams</option>
            {teamOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          {favoritesEnabled && (selectedPlayer || selectedTeam) && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              ⭐ Favorites Applied
            </span>
          )}
          {selectedManufacturerYear && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {selectedManufacturerYear}
              <button
                onClick={() => setSelectedManufacturerYear('')}
                className="ml-1 hover:text-blue-600"
              >
                ×
              </button>
            </span>
          )}
          {selectedPlayer && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {selectedPlayer}
              <button
                onClick={() => setSelectedPlayer('')}
                className="ml-1 hover:text-green-600"
              >
                ×
              </button>
            </span>
          )}
          {selectedTeam && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {selectedTeam}
              <button
                onClick={() => setSelectedTeam('')}
                className="ml-1 hover:text-purple-600"
              >
                ×
              </button>
            </span>
          )}
          {searchText && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              Search: &quot;{searchText}&quot;
              <button
                onClick={() => setSearchText('')}
                className="ml-1 hover:text-gray-600"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}