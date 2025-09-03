'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import QRCodeBridge from './QRCodeBridge';
import ImageEditor from './ImageEditor';

interface ImageUploadProps {
  currentImage?: string;
  onImageChange: (imageUrl: string) => void;
  disabled?: boolean;
  allowDelete?: boolean;
}

export default function ImageUpload({ currentImage, onImageChange, disabled, allowDelete = true }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(currentImage || '');
  const [showEditor, setShowEditor] = useState(false);
  const [imageToEdit, setImageToEdit] = useState<string>('');
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

  const handleMobileImageReceived = async (imageUrl: string) => {
    // Store old image URL for cleanup
    const oldImageUrl = currentImage;
    
    // Update preview and notify parent
    setPreviewUrl(imageUrl);
    onImageChange(imageUrl);
    
    // Delete old image if it exists and is different from new one
    if (oldImageUrl && oldImageUrl !== imageUrl && allowDelete) {
      await deleteOldImage(oldImageUrl);
    }
  };

  const handleEditImage = () => {
    if (previewUrl) {
      setImageToEdit(previewUrl);
      setShowEditor(true);
    }
  };

  const handleEditorSave = async (editedImageBlob: Blob) => {
    setUploading(true);
    try {
      // Create FormData with the edited image blob
      const formData = new FormData();
      formData.append('image', editedImageBlob, 'edited-image.jpg');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        // Store old image URL for cleanup
        const oldImageUrl = previewUrl || currentImage;
        
        // Update preview and notify parent
        setPreviewUrl(result.imageUrl);
        onImageChange(result.imageUrl);
        
        // Delete old image if it exists and is different from new one
        if (oldImageUrl && oldImageUrl !== result.imageUrl && allowDelete) {
          await deleteOldImage(oldImageUrl);
        }
      } else {
        alert(result.error || 'Failed to save edited image');
      }
    } catch (error) {
      console.error('Edit save error:', error);
      alert('Failed to save edited image');
    } finally {
      setUploading(false);
      setShowEditor(false);
    }
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setImageToEdit('');
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Card Image
      </label>
      
      {/* Preview */}
      {previewUrl && (
        <div className="relative inline-block">
          <Image
            src={previewUrl}
            alt="Card preview"
            width={128}
            height={192}
            className="object-cover rounded-lg border border-gray-300"
          />
          {!disabled && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemoveImage();
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                disabled={uploading}
                title="Remove image"
              >
                ×
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEditImage();
                }}
                className="absolute -top-2 -left-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-blue-600"
                disabled={uploading}
                title="Edit image (rotate/crop)"
              >
                ✎
              </button>
            </>
          )}
        </div>
      )}

      {/* Upload options */}
      {!disabled && (
        <div className="space-y-3">
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
          
          {/* QR Code Bridge for mobile upload */}
          <div className="border-t pt-3">
            <QRCodeBridge
              onImageReceived={handleMobileImageReceived}
              disabled={uploading}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Supported formats: JPG, PNG, GIF. Max size: 5MB
      </p>

      {/* Image Editor Modal */}
      {showEditor && (
        <ImageEditor
          imageUrl={imageToEdit}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}
    </div>
  );
}