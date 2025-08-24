'use client';

import { useState } from 'react';
// import Image from 'next/image'; // Temporarily using regular img tag
import { CardWithDetails } from '@/lib/types';
import ImageModal from './ImageModal';

interface CardListProps {
  cards: CardWithDetails[];
  onEdit?: (card: CardWithDetails) => void;
  onDelete?: (id: string | number) => void; // Support both UUID and number IDs
  loading?: boolean;
  viewMode?: 'grid' | 'list';
  emptyMessage?: string;
}

export default function CardList({ cards, onEdit, onDelete, loading = false, viewMode = 'grid', emptyMessage = "No cards found. Add your first card!" }: CardListProps) {
  const [modalImage, setModalImage] = useState<{ url: string; alt: string } | null>(null);

  const openImageModal = (imageUrl: string, cardNumber: string) => {
    setModalImage({ url: imageUrl, alt: `Card #${cardNumber}` });
  };

  const closeImageModal = () => {
    setModalImage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600 font-medium">Loading cards...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🃏</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cards Found</h3>
          <p className="text-gray-600">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {cards.map((card, index) => (
          <div 
            key={card.id} 
            className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 animate-slide-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="p-4 flex items-center space-x-4">
              {/* Card Image */}
              <div className="flex-shrink-0">
                {card.imageurl ? (
                  <div 
                    className="w-16 h-24 bg-white cursor-pointer rounded border border-gray-300 overflow-hidden"
                    onClick={() => openImageModal(card.imageurl!, card.cardnumber)}
                  >
                    <img
                      src={card.imageurl}
                      alt={`Card #${card.cardnumber}`}
                      className="w-full h-full object-cover"
                      style={{ 
                        backgroundColor: 'white',
                        display: 'block'
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-16 h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded border border-gray-300">
                    <span className="text-gray-400 text-sm">🃏</span>
                  </div>
                )}
              </div>

              {/* Card Details */}
              <div className="flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">#{card.cardnumber}</h3>
                    {card.year && <span className="text-sm text-gray-500">{card.year}</span>}
                  </div>
                  <div className="flex space-x-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(card)}
                        className="btn text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                      >
                        ✏️ Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(card.id!)}
                        className="btn text-xs px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                  {/* Player Info */}
                  {(card.player_firstname || card.player_lastname) && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-1">⚾</span>
                      <span className="font-medium">
                        {card.player_firstname} {card.player_lastname}
                      </span>
                    </div>
                  )}
                  
                  {/* Team Info */}
                  {card.team_city && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-1">🏟️</span>
                      <span>
                        {card.team_city}{card.team_mascot && ` ${card.team_mascot}`}
                      </span>
                    </div>
                  )}
                  
                  {/* Manufacturer Info */}
                  {card.manufacturer_company && (
                    <div className="flex items-center text-gray-600">
                      <span className="mr-1">🏭</span>
                      <span className="truncate">
                        {card.manufacturer_company}
                        {card.manufacturer_year && ` (${card.manufacturer_year})`}
                      </span>
                    </div>
                  )}
                  
                  {/* Condition */}
                  {card.condition && (
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        ✨ {card.condition}
                      </span>
                    </div>
                  )}
                  
                  {/* Manufacturer Subset */}
                  {card.manufacturer_subsetname && (
                    <div className="flex items-center text-gray-500 text-xs col-span-full">
                      <span className="mr-1">📦</span>
                      <span>{card.manufacturer_subsetname}</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {card.notes && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-gray-600 text-sm italic">
                      💭 {card.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Image Modal */}
        {modalImage && (
          <ImageModal
            isOpen={true}
            imageUrl={modalImage.url}
            alt={modalImage.alt}
            onClose={closeImageModal}
          />
        )}
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div 
          key={card.id} 
          className="baseball-card card-hover animate-slide-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {/* Card Image */}
          {card.imageurl ? (
            <div 
              className="w-full h-56 bg-white cursor-pointer rounded-t-lg overflow-hidden"
              onClick={() => openImageModal(card.imageurl!, card.cardnumber)}
            >
              <img
                src={card.imageurl}
                alt={`Card #${card.cardnumber}`}
                className="w-full h-full object-cover"
                style={{ 
                  backgroundColor: 'white',
                  display: 'block'
                }}
              />
            </div>
          ) : (
            <div className="w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-t-lg">
              <div className="text-center text-gray-400">
                <span className="text-4xl block mb-2">🃏</span>
                <span className="text-sm">No Image</span>
              </div>
            </div>
          )}
          
          <div className="p-5">
            {/* Card Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 font-display">#{card.cardnumber}</h3>
                {card.year && <span className="text-sm text-gray-500 font-medium">{card.year}</span>}
              </div>
              <div className="flex space-x-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(card)}
                    className="btn text-xs px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                  >
                    ✏️ Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(card.id!)}
                    className="btn text-xs px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
            
            {/* Player Info */}
            {(card.player_firstname || card.player_lastname) && (
              <div className="mb-3">
                <h4 className="text-lg font-semibold text-gray-800 flex items-center">
                  <span className="mr-2">⚾</span>
                  {card.player_firstname} {card.player_lastname}
                </h4>
              </div>
            )}
            
            {/* Team Info */}
            {card.team_city && (
              <div className="mb-3 flex items-center">
                <span className="mr-2">🏟️</span>
                <span className="font-medium text-gray-700">
                  {card.team_city}{card.team_mascot && ` ${card.team_mascot}`}
                </span>
              </div>
            )}
            
            {/* Manufacturer Info */}
            {card.manufacturer_company && (
              <div className="mb-3 flex items-center">
                <span className="mr-2">🏭</span>
                <span className="text-gray-600 text-sm">
                  {card.manufacturer_company}
                  {card.manufacturer_year && ` (${card.manufacturer_year})`}
                  {card.manufacturer_subsetname && (
                    <span className="block text-xs text-gray-500 ml-6">
                      {card.manufacturer_subsetname}
                    </span>
                  )}
                </span>
              </div>
            )}
            
            {/* Condition */}
            {card.condition && (
              <div className="mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                  ✨ {card.condition}
                </span>
              </div>
            )}
            
            {/* Notes */}
            {card.notes && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-gray-600 text-sm italic leading-relaxed">
                  💭 {card.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {/* Image Modal */}
      {modalImage && (
        <ImageModal
          isOpen={true}
          imageUrl={modalImage.url}
          alt={modalImage.alt}
          onClose={closeImageModal}
        />
      )}
    </div>
  );
}