'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';

export default function MobileUploadPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string>('');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  // Load session info on mount
  useEffect(() => {
    const loadSessionInfo = async () => {
      try {
        const response = await fetch(`/api/mobile-upload/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setSessionInfo(data);
          
          if (data.status === 'uploaded') {
            setUploadComplete(true);
            setPreviewUrl(data.imageUrl);
          }
        } else {
          setError('Session not found or expired');
        }
      } catch (error) {
        setError('Failed to load session');
      }
    };

    if (sessionId) {
      loadSessionInfo();
    }
  }, [sessionId]);

  // Check camera permission status
  const checkCameraPermission = async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return permission.state;
      }
    } catch (error) {
      console.log('Permission API not supported');
    }
    return 'unknown';
  };

  // Start camera
  const startCamera = async () => {
    setPermissionError('');
    setShowPermissionHelp(false);
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setShowCamera(true);
    } catch (error: any) {
      console.error('Camera access error:', error);
      
      let errorMessage = '';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please enable camera access to take photos.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device. Please use file upload instead.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another app. Please close other camera apps and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported in this browser. Please use file upload instead.';
      } else {
        errorMessage = 'Unable to access camera. Please try file upload instead.';
      }
      
      setPermissionError(errorMessage);
      setShowPermissionHelp(error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            await uploadFile(blob, 'camera-capture.jpg');
          }
        }, 'image/jpeg', 0.8);
      }
    }
    
    stopCamera();
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadFile(file, file.name);
    }
  };

  // Upload file to server
  const uploadFile = async (file: Blob, filename: string) => {
    setUploading(true);
    setError('');
    
    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);
      
      const formData = new FormData();
      formData.append('image', file, filename);

      const response = await fetch(`/api/mobile-upload/${sessionId}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadComplete(true);
        // Clean up preview URL since we now have the real image URL
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(result.imageUrl);
      } else {
        setError(result.error || 'Failed to upload image');
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload image');
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please try scanning the QR code again or contact support.
          </p>
        </div>
      </div>
    );
  }

  if (!sessionInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (uploadComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-green-500 text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">Upload Complete!</h1>
          
          {previewUrl && (
            <div className="mb-4">
              <Image
                src={previewUrl}
                alt="Uploaded image"
                width={200}
                height={300}
                className="object-cover rounded-lg border border-gray-300 mx-auto"
              />
            </div>
          )}
          
          <p className="text-gray-600 mb-4">
            Your image has been uploaded successfully. You can now return to your desktop to continue working on your card.
          </p>
          
          <div className="text-sm text-gray-500">
            Session ID: {sessionId}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-900">Card Image Upload</h1>
          <p className="text-sm text-gray-600">CardVault Mobile Bridge</p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4">
        {!showCamera ? (
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h2 className="text-sm font-medium text-blue-900 mb-2">📱 Mobile Upload</h2>
              <p className="text-sm text-blue-800">
                Take a photo with your camera or select an existing image from your device.
              </p>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  width={200}
                  height={300}
                  className="object-cover rounded-lg border border-gray-300 mx-auto"
                />
              </div>
            )}

            {/* Camera Permission Error */}
            {permissionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400 text-xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Camera Access Issue</h3>
                    <p className="text-sm text-red-700 mt-1">{permissionError}</p>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      {showPermissionHelp ? (
                        <button
                          onClick={() => setShowPermissionHelp(false)}
                          className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                        >
                          📖 Hide instructions
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowPermissionHelp(true)}
                          className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                        >
                          📖 Show permission instructions
                        </button>
                      )}
                      <button
                        onClick={startCamera}
                        className="text-sm font-medium text-red-800 hover:text-red-900 underline"
                      >
                        🔄 Try camera again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Permission Help Modal */}
            {showPermissionHelp && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="font-medium text-gray-900 mb-3">Enable Camera Permissions</h3>
                
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <p className="font-medium text-gray-800">📱 On iPhone/iPad (Safari):</p>
                    <ol className="list-decimal list-inside space-y-1 mt-1 ml-2">
                      <li>Go to Settings app → Safari → Camera</li>
                      <li>Select "Allow" for camera access</li>
                      <li>Return to Safari and refresh this page</li>
                      <li><strong>Alternative:</strong> Use "Choose File" which opens camera directly</li>
                    </ol>
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-800">🤖 On Android (Chrome):</p>
                    <ol className="list-decimal list-inside space-y-1 mt-1 ml-2">
                      <li>Tap the lock/camera icon in address bar</li>
                      <li>Tap "Permissions"</li>
                      <li>Set "Camera" to "Allow"</li>
                      <li>Refresh this page and try again</li>
                    </ol>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-blue-800 text-xs">
                      💡 <strong>Alternative:</strong> Use "Choose File" below to select photos from your device gallery instead.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowPermissionHelp(false)}
                  className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                >
                  ✕ Close
                </button>
              </div>
            )}

            {/* Upload Options */}
            <div className="space-y-3">
              <button
                onClick={startCamera}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={uploading}
              >
                <span className="mr-2">📷</span>
                Use Camera
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={uploading}
              >
                <span className="mr-2">📁</span>
                Choose File {permissionError ? '(Recommended)' : ''}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
            </div>

            {uploading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Uploading image...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Camera View */}
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                playsInline
                muted
              />
            </div>

            {/* Camera Controls */}
            <div className="flex space-x-3">
              <button
                onClick={capturePhoto}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                📸 Capture Photo
              </button>
              
              <button
                onClick={stopCamera}
                className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Session expires in 10 minutes</p>
          <p>Max file size: 5MB • Supported: JPG, PNG, GIF</p>
        </div>
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}