'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CardWithDetails } from '@/lib/types';
import ImageModal from './ImageModal';

interface CardListProps {
  cards: CardWithDetails[];
  onEdit?: (card: CardWithDetails) => void;
  onDelete?: (id: number) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export default function CardList({ cards, onEdit, onDelete, loading = false, emptyMessage = "No cards found. Add your first card!" }: CardListProps) {
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
              className="relative w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer group overflow-hidden rounded-t-lg"
              onClick={() => openImageModal(card.imageurl!, card.cardnumber)}
            >
              <Image
                src={card.imageurl}
                alt={`Card #${card.cardnumber}`}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                <span className="text-white opacity-0 group-hover:opacity-100 font-medium bg-black bg-opacity-50 px-3 py-2 rounded-lg transition-opacity duration-300">
                  🔍 View Full Size
                </span>
              </div>
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