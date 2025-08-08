'use client';

import { useState, useEffect } from 'react';

interface AppInfo {
  version: string;
  installDate: string | null;
}

export default function Footer() {
  const [appInfo, setAppInfo] = useState<AppInfo>({ version: '1.0.0', installDate: null });

  useEffect(() => {
    // Fetch app info from API
    fetch('/api/app-info')
      .then(res => res.json())
      .then(data => setAppInfo(data))
      .catch(() => {
        // Fallback if API fails
        setAppInfo({ version: '1.0.0', installDate: null });
      });
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-6">
              <span>Card Catalog v{appInfo.version}</span>
              <span className="hidden sm:inline">•</span>
              <span>Installed: {formatDate(appInfo.installDate)}</span>
            </div>
            <div>
              <span>© 2025 Card Catalog. All rights reserved.</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}