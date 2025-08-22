'use client';

import { useState, useEffect } from 'react';
import { CardWithDetails } from '@/lib/types';

export default function CardReports() {
  const [cards, setCards] = useState<CardWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'year-manufacturer' | 'player'>('year-manufacturer');

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await fetch('/api/cards');
      const data = await response.json();
      setCards(data);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedCards = () => {
    if (sortBy === 'year-manufacturer') {
      return [...cards].sort((a, b) => {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        if (yearA !== yearB) return yearB - yearA; // Descending by year
        const manufacturerA = a.manufacturer_company || '';
        const manufacturerB = b.manufacturer_company || '';
        return manufacturerA.localeCompare(manufacturerB);
      });
    } else {
      return [...cards].sort((a, b) => {
        const playerA = `${a.player_lastname || ''} ${a.player_firstname || ''}`.trim();
        const playerB = `${b.player_lastname || ''} ${b.player_firstname || ''}`.trim();
        return playerA.localeCompare(playerB);
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  const sorted = sortedCards();

  // Calculate manufacturer+year statistics
  const getManufacturerYearStats = () => {
    const stats = new Map<string, number>();
    cards.forEach(card => {
      const manufacturer = card.manufacturer_company || 'Unknown';
      const year = card.manufacturer_year || 'Unknown';
      const subset = card.manufacturer_subsetname ? ` - ${card.manufacturer_subsetname}` : '';
      const key = `${manufacturer} (${year})${subset}`;
      stats.set(key, (stats.get(key) || 0) + 1);
    });
    
    return Array.from(stats.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({ key, count }));
  };

  const manufacturerYearStats = getManufacturerYearStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Card Reports</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setSortBy('year-manufacturer')}
            className={`px-4 py-2 rounded-md transition-colors ${
              sortBy === 'year-manufacturer'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            By Year & Manufacturer
          </button>
          <button
            onClick={() => setSortBy('player')}
            className={`px-4 py-2 rounded-md transition-colors ${
              sortBy === 'player'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            By Player
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          {sortBy === 'year-manufacturer' ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manufacturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Card Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Players
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {manufacturerYearStats.map(({ key, count }) => {
                  const cardsInGroup = cards.filter(card => {
                    const manufacturer = card.manufacturer_company || 'Unknown';
                    const year = card.manufacturer_year || 'Unknown';
                    const subset = card.manufacturer_subsetname ? ` - ${card.manufacturer_subsetname}` : '';
                    return `${manufacturer} (${year})${subset}` === key;
                  });
                  const uniquePlayers = new Set(cardsInGroup.map(card => 
                    `${card.player_firstname || ''} ${card.player_lastname || ''}`.trim()
                  ).filter(name => name));
                  
                  const [manufacturerYear, subset] = key.includes(' - ') ? key.split(' - ') : [key, ''];
                  const manufacturerMatch = manufacturerYear.match(/^(.+) \((.+)\)$/);
                  const manufacturer = manufacturerMatch ? manufacturerMatch[1] : manufacturerYear;
                  const year = manufacturerMatch ? manufacturerMatch[2] : 'Unknown';
                  
                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {manufacturer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subset || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {count} cards
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs">
                          <span className="text-gray-600">{uniquePlayers.size} unique:</span>
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {Array.from(uniquePlayers).slice(0, 3).join(', ')}
                            {uniquePlayers.size > 3 && ` +${uniquePlayers.size - 3} more`}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Card #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manufacturer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sorted.map((card) => (
                  <tr key={card.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{card.cardnumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {card.player_firstname} {card.player_lastname}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {card.team_city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {card.year || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {card.manufacturer_company && (
                        <>
                          {card.manufacturer_company} {card.manufacturer_year && `(${card.manufacturer_year})`}{card.manufacturer_subsetname && ` - ${card.manufacturer_subsetname}`}
                        </>
                      ) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        card.condition === 'Mint' ? 'bg-green-100 text-green-800' :
                        card.condition === 'Near Mint' ? 'bg-blue-100 text-blue-800' :
                        card.condition === 'Excellent' ? 'bg-yellow-100 text-yellow-800' :
                        card.condition === 'Very Good' ? 'bg-orange-100 text-orange-800' :
                        card.condition === 'Good' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {card.condition || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {card.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Summary Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{cards.length}</div>
            <div className="text-sm text-blue-800">Total Cards</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {new Set(cards.map(c => c.playerid).filter(Boolean)).size}
            </div>
            <div className="text-sm text-green-800">Unique Players</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {new Set(cards.map(c => c.teamid).filter(Boolean)).size}
            </div>
            <div className="text-sm text-purple-800">Different Teams</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {new Set(cards.map(c => c.year).filter(Boolean)).size}
            </div>
            <div className="text-sm text-orange-800">Different Years</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Cards by Manufacturer & Year</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {manufacturerYearStats.map(({ key, count }) => (
            <div
              key={key}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg"
            >
              <div className="text-xl font-bold text-blue-700">{count}</div>
              <div className="text-sm text-blue-600 font-medium">{key}</div>
            </div>
          ))}
        </div>
        {manufacturerYearStats.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            No manufacturer/year data available
          </div>
        )}
      </div>
    </div>
  );
}