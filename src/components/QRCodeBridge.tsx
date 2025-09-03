'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface QRCodeBridgeProps {
  onImageReceived: (imageUrl: string) => void;
  disabled?: boolean;
}

interface QRSession {
  sessionId: string;
  qrCode: string;
  mobileUrl: string;
  expiresAt: string;
}

export default function QRCodeBridge({ onImageReceived, disabled }: QRCodeBridgeProps) {
  const [showQR, setShowQR] = useState(false);
  const [qrSession, setQRSession] = useState<QRSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string>('');

  // Poll for image upload
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (polling && qrSession) {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/mobile-upload/qr?sessionId=${qrSession.sessionId}`);
          if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'uploaded' && data.imageUrl) {
              onImageReceived(data.imageUrl);
              setPolling(false);
              setShowQR(false);
              setQRSession(null);
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [polling, qrSession, onImageReceived]);

  // Generate QR code
  const generateQRCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/mobile-upload/qr', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setQRSession(data);
        setShowQR(true);
        setPolling(true);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('QR generation error:', error);
      setError('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  // Close QR modal
  const closeQR = () => {
    setShowQR(false);
    setPolling(false);
    setQRSession(null);
    setError('');
  };

  if (!showQR) {
    return (
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={generateQRCode}
          disabled={disabled || loading}
          className="px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-1 border-blue-600 inline-block mr-1"></div>
              Generating...
            </>
          ) : (
            <>
              📱 Mobile Upload
            </>
          )}
        </button>
        {error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Mobile Upload</h3>
          <button
            onClick={closeQR}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600 mb-3">
            Scan this QR code with your phone to upload an image:
          </p>
          
          {/* QR Code */}
          {qrSession && (
            <div className="inline-block p-2 bg-white border-2 border-gray-200 rounded-lg">
              <Image
                src={qrSession.qrCode}
                alt="QR Code for mobile upload"
                width={200}
                height={200}
                className="mx-auto"
              />
            </div>
          )}
        </div>

        {/* Status */}
        <div className="text-center">
          {polling ? (
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Waiting for upload...</span>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Ready to scan
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Session expires in 10 minutes
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Max file size: 5MB • Formats: JPG, PNG, GIF
          </p>
        </div>

        {/* Manual URL for testing */}
        {qrSession && process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-2 bg-gray-50 rounded text-xs">
            <p className="text-gray-600 mb-1">Dev Mode - Direct Link:</p>
            <a 
              href={qrSession.mobileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 break-all"
            >
              {qrSession.mobileUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}