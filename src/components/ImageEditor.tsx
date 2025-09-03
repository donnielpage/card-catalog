'use client';

import { useState, useRef, useEffect } from 'react';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedImageBlob: Blob) => void;
  onCancel: () => void;
}

export default function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 1, height: 1 });
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setOriginalImage(img);
      // Initialize crop to full image
      setCrop({ x: 0, y: 0, width: 1, height: 1 });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    if (originalImage && canvasRef.current) {
      redrawCanvas();
    }
  }, [originalImage, rotation, crop, scale]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !originalImage) return;

    // Set canvas size
    const size = 400;
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, size, size);

    // Save context state
    ctx.save();

    // Move to center for rotation
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate image dimensions
    const imageAspect = originalImage.width / originalImage.height;
    let drawWidth = size * scale;
    let drawHeight = size * scale;

    if (imageAspect > 1) {
      drawHeight = drawHeight / imageAspect;
    } else {
      drawWidth = drawWidth * imageAspect;
    }

    // Draw the cropped image
    const sourceX = crop.x * originalImage.width;
    const sourceY = crop.y * originalImage.height;
    const sourceWidth = crop.width * originalImage.width;
    const sourceHeight = crop.height * originalImage.height;

    ctx.drawImage(
      originalImage,
      sourceX, sourceY, sourceWidth, sourceHeight,
      -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
    );

    // Restore context state
    ctx.restore();

    // Draw crop overlay
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      crop.x * size,
      crop.y * size,
      crop.width * size,
      crop.height * size
    );
  };

  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.offsetWidth;
    const y = (e.clientY - rect.top) / canvas.offsetHeight;

    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.offsetWidth;
    const y = (e.clientY - rect.top) / canvas.offsetHeight;

    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;

    // Update crop selection
    setCrop(prev => ({
      x: Math.max(0, Math.min(1 - prev.width, prev.x + deltaX)),
      y: Math.max(0, Math.min(1 - prev.height, prev.y + deltaY)),
      width: prev.width,
      height: prev.height
    }));

    setDragStart({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create final canvas with proper dimensions
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx || !originalImage) return;

    // Set output size (you can adjust this)
    const outputSize = 800;
    finalCanvas.width = outputSize;
    finalCanvas.height = outputSize;

    // Fill with white background
    finalCtx.fillStyle = '#ffffff';
    finalCtx.fillRect(0, 0, outputSize, outputSize);

    // Save context state
    finalCtx.save();

    // Apply transformations
    finalCtx.translate(outputSize / 2, outputSize / 2);
    finalCtx.rotate((rotation * Math.PI) / 180);

    // Calculate final image dimensions
    const imageAspect = originalImage.width / originalImage.height;
    let drawWidth = outputSize;
    let drawHeight = outputSize;

    if (imageAspect > 1) {
      drawHeight = drawHeight / imageAspect;
    } else {
      drawWidth = drawWidth * imageAspect;
    }

    // Draw the final cropped and rotated image
    const sourceX = crop.x * originalImage.width;
    const sourceY = crop.y * originalImage.height;
    const sourceWidth = crop.width * originalImage.width;
    const sourceHeight = crop.height * originalImage.height;

    finalCtx.drawImage(
      originalImage,
      sourceX, sourceY, sourceWidth, sourceHeight,
      -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight
    );

    finalCtx.restore();

    // Convert to blob
    finalCanvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <h2 className="text-xl font-bold mb-4">Edit Image</h2>
        
        <div className="mb-4">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="border border-gray-300 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        <div className="space-y-4">
          {/* Rotation Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rotation: {rotation}°
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRotate(-90);
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                ↺ -90°
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRotate(90);
                }}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                ↻ +90°
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setRotation(0);
                }}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Scale Controls */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scale: {Math.round(scale * 100)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

        </div>

        <div className="flex space-x-3 pt-6">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>• Use rotation buttons to rotate the image</p>
          <p>• Drag on the canvas to move the crop area</p>
          <p>• Adjust scale slider to resize the image</p>
        </div>
      </div>
    </div>
  );
}