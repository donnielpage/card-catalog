'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Navigation from '@/components/Navigation';
import CardList from '@/components/CardList';
import CardForm from '@/components/CardForm';
import CardReports from '@/components/CardReports';
import ManageData from '@/components/ManageData';
import UserManagement from '@/components/UserManagement';
import UserProfile from '@/components/UserProfile';
import SystemManagement from '@/components/SystemManagement';
import CardFilters from '@/components/CardFilters';
import FeaturePopup from '@/components/FeaturePopup';
import { Card, CardWithDetails } from '@/lib/types';
import { useAuth } from '@/lib/hooks/useAuth';

export default function Dashboard() {
  const { data: session } = useSession();
  const { canCreate, canModify, canManageUsers } = useAuth();
  const [currentPage, setCurrentPage] = useState('cards');
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CardWithDetails | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allCards, setAllCards] = useState<CardWithDetails[]>([]);
  const [filteredCards, setFilteredCards] = useState<CardWithDetails[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [appVersion, setAppVersion] = useState('1.1.1-rc');

  const fetchCards = useCallback(async () => {
    setCardsLoading(true);
    try {
      const response = await fetch('/api/cards');
      const data = await response.json();
      setAllCards(data);
      setFilteredCards(data); // Initially show all cards
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setCardsLoading(false);
    }
  }, []);

  const handleFilterChange = useCallback((filtered: CardWithDetails[]) => {
    setFilteredCards(filtered);
  }, []);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setShowForm(false);
    setEditingCard(null);
  };

  const handleAddCard = () => {
    if (!canCreate) {
      alert('You do not have permission to add cards.');
      return;
    }
    setEditingCard(null);
    setShowForm(true);
  };

  const handleEditCard = (card: CardWithDetails) => {
    if (!canModify) {
      alert('You do not have permission to edit cards.');
      return;
    }
    setEditingCard(card);
    setShowForm(true);
  };

  const handleDeleteCard = async (id: number) => {
    if (!canModify) {
      alert('You do not have permission to delete cards.');
      return;
    }
    if (!confirm('Are you sure you want to delete this card?')) {
      return;
    }

    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert('Failed to delete card');
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Error deleting card');
    }
  };

  const handleFormSubmit = async (cardData: Omit<Card, 'id'>) => {
    try {
      const url = editingCard ? `/api/cards/${editingCard.id}` : '/api/cards';
      const method = editingCard ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      });

      if (response.ok) {
        setShowForm(false);
        setEditingCard(null);
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert('Failed to save card');
      }
    } catch (error) {
      console.error('Error saving card:', error);
      alert('Error saving card');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingCard(null);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'cards':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">My Cards</h2>
              {canCreate && (
                <button
                  onClick={handleAddCard}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add New Card
                </button>
              )}
            </div>
            <CardFilters
              cards={allCards}
              onFilterChange={handleFilterChange}
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {filteredCards.length} of {allCards.length} cards
              </p>
            </div>
            <CardList
              cards={filteredCards}
              onEdit={canModify ? handleEditCard : undefined}
              onDelete={canModify ? handleDeleteCard : undefined}
              loading={cardsLoading}
              emptyMessage={filteredCards.length === 0 && allCards.length > 0 ? "No cards match the current filters." : "No cards found. Add your first card!"}
            />
          </div>
        );
      case 'reports':
        return <CardReports />;
      case 'manage':
        return <ManageData />;
      case 'users':
        return canManageUsers ? <UserManagement /> : <div className="text-center py-8 text-red-600">Access denied. Admin privileges required.</div>;
      case 'system-management':
        return session?.user?.role === 'admin' ? <SystemManagement /> : <div className="text-center py-8 text-red-600">Access denied. Admin privileges required.</div>;
      case 'profile':
        return <UserProfile />;
      default:
        return null;
    }
  };

  // Fetch cards data
  useEffect(() => {
    fetchCards();
  }, [refreshTrigger, fetchCards]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onPageChange={handlePageChange} />
      
      <div className="container mx-auto px-4 py-8">
        {renderCurrentPage()}

        {showForm && canCreate && (
          <CardForm
            card={editingCard}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        )}
      </div>

      {/* Feature Popup */}
      <FeaturePopup currentVersion={appVersion} />
    </div>
  );
}