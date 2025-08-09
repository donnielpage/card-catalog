'use client';

import { useState, useEffect } from 'react';

interface FeatureAnnouncement {
  id: string;
  version: string;
  title: string;
  description: string;
  features: string[];
  icon: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
}

const FEATURE_ANNOUNCEMENTS: FeatureAnnouncement[] = [
  {
    id: 'system-management-v1.1.0',
    version: '1.1.0',
    title: 'New System Management Interface',
    description: 'Administrators can now manage the system directly from the web interface!',
    features: [
      'Create database, image, and full system backups',
      'Monitor server status and system information',
      'Check for version updates',
      'View backup history and system metrics',
      'No more command line required for system tasks'
    ],
    icon: '🔧',
    date: '2025-08-09',
    priority: 'high'
  }
];

interface FeaturePopupProps {
  currentVersion: string;
}

export default function FeaturePopup({ currentVersion }: FeaturePopupProps) {
  const [currentAnnouncement, setCurrentAnnouncement] = useState<FeatureAnnouncement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check for unviewed feature announcements
    const viewedFeatures = JSON.parse(localStorage.getItem('viewedFeatures') || '[]');
    
    // Find the latest unviewed announcement
    const latestUnviewed = FEATURE_ANNOUNCEMENTS
      .filter(announcement => !viewedFeatures.includes(announcement.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (latestUnviewed) {
      setCurrentAnnouncement(latestUnviewed);
      setIsVisible(true);
    }
  }, [currentVersion]);

  const handleClose = () => {
    if (currentAnnouncement) {
      // Mark as viewed
      const viewedFeatures = JSON.parse(localStorage.getItem('viewedFeatures') || '[]');
      if (!viewedFeatures.includes(currentAnnouncement.id)) {
        viewedFeatures.push(currentAnnouncement.id);
        localStorage.setItem('viewedFeatures', JSON.stringify(viewedFeatures));
      }
    }
    setIsVisible(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible || !currentAnnouncement) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in duration-300">
        {/* Header */}
        <div className={`px-6 py-4 text-white relative overflow-hidden ${
          currentAnnouncement.priority === 'high' ? 'bg-gradient-to-r from-blue-600 to-purple-600' :
          currentAnnouncement.priority === 'medium' ? 'bg-gradient-to-r from-green-600 to-blue-600' :
          'bg-gradient-to-r from-gray-600 to-gray-700'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{currentAnnouncement.icon}</span>
                <div>
                  <div className="text-xs opacity-90 font-medium">Version {currentAnnouncement.version}</div>
                  <h2 className="text-xl font-bold">{currentAnnouncement.title}</h2>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                <span className="text-lg">×</span>
              </button>
            </div>
            <p className="text-sm mt-2 opacity-95">{currentAnnouncement.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">New Features:</h3>
            <ul className="space-y-2">
              {currentAnnouncement.features.map((feature, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <span className="text-green-500 text-sm font-bold mt-0.5">✓</span>
                  <span className="text-gray-700 text-sm leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Released {new Date(currentAnnouncement.date).toLocaleDateString()}
            </span>
            <button
              onClick={handleClose}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}