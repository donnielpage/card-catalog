'use client';

import { useState, useRef, useEffect } from 'react';

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (imageUrl: string) => void;
  disabled?: boolean;
  allowDelete?: boolean;
}

export default function ImageUpload({ currentImage, onImageChange, disabled, allowDelete = true }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentImage || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when currentImage prop changes (for editing existing cards)
  useEffect(() => {
    setPreviewUrl(currentImage || '');
  }, [currentImage]);

  const deleteOldImage = async (imageUrl: string) => {
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
    
    try {
      await fetch('/api/upload/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });
    } catch (error) {
      console.error('Failed to delete old image:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Store old image URL for cleanup
    const oldImageUrl = currentImage;

    // Upload file
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        // Delete old image if it exists and is different from new one
        if (oldImageUrl && oldImageUrl !== result.imageUrl && allowDelete) {
          await deleteOldImage(oldImageUrl);
        }
        onImageChange(result.imageUrl);
      } else {
        alert(result.error || 'Failed to upload image');
        setPreviewUrl(currentImage || '');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
      setPreviewUrl(currentImage || '');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    const oldImageUrl = previewUrl || currentImage;
    
    // Delete the file if it's an uploaded image and deletion is allowed
    if (oldImageUrl && oldImageUrl.startsWith('/uploads/') && allowDelete) {
      await deleteOldImage(oldImageUrl);
    }
    
    setPreviewUrl('');
    onImageChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Card Image
      </label>
      
      {/* Preview */}
      {previewUrl && (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Card preview"
            className="w-32 h-48 object-cover rounded-lg border border-gray-300"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              disabled={uploading}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Upload button */}
      {!disabled && (
        <div className="flex items-center space-x-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : previewUrl ? 'Change Image' : 'Upload Image'}
          </button>
          
          {uploading && (
            <div className="text-sm text-gray-500">Uploading image...</div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Supported formats: JPG, PNG, GIF. Max size: 5MB
      </p>
    </div>
  );
}