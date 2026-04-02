import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { ImageTensor } from '../types/image';

interface ModalProps {
  image: ImageTensor;
  title: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ModalProps> = ({ image, title, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;
    const imageData = new ImageData(image.data, image.width, image.height);
    ctx.putImageData(imageData, 0, 0);

    // Initial scale to fit screen
    const windowWidth = window.innerWidth * 0.8;
    const windowHeight = window.innerHeight * 0.8;
    const scaleW = windowWidth / image.width;
    const scaleH = windowHeight / image.height;
    setScale(Math.min(scaleW, scaleH, 1));
  }, [image]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (delta: number) => {
    setScale(prev => Math.max(0.1, Math.min(prev + delta, 5)));
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
    const windowWidth = window.innerWidth * 0.8;
    const windowHeight = window.innerHeight * 0.8;
    const scaleW = windowWidth / image.width;
    const scaleH = windowHeight / image.height;
    setScale(Math.min(scaleW, scaleH, 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
      <div className="flex justify-between items-center p-4 text-white border-b border-white/10">
        <h3 className="text-lg font-medium">{title}</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/10 rounded-lg px-2 py-1">
            <button onClick={() => handleZoom(-0.1)} className="p-2 hover:bg-white/10 rounded-md"><ZoomOut size={20} /></button>
            <span className="text-sm font-mono w-16 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => handleZoom(0.1)} className="p-2 hover:bg-white/10 rounded-md"><ZoomIn size={20} /></button>
            <button onClick={reset} className="p-2 hover:bg-white/10 rounded-md ml-2" title="Reset View"><RotateCcw size={18} /></button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
        </div>
      </div>

      <div
        className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="absolute transition-transform duration-75 ease-out origin-center"
          style={{
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale})`,
            left: '50%',
            top: '50%'
          }}
        >
          <canvas ref={canvasRef} className="shadow-2xl bg-white" />
        </div>
      </div>

      <div className="p-4 text-white/50 text-xs text-center border-t border-white/10 bg-black/20">
        Drag to move • Scroll or use buttons to zoom • {image.width} x {image.height} pixels
      </div>
    </div>
  );
};

interface Props {
  title: string;
  image: ImageTensor | null;
  overlay?: React.ReactNode;
}

export const ImagePreview: React.FC<Props> = ({ title, image, overlay }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use a fixed small internal canvas for preview to save memory and handle responsiveness
    const MAX_PREVIEW_SIZE = 800;
    const scale = Math.min(1, MAX_PREVIEW_SIZE / Math.max(image.width, image.height));
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;

    const offscreen = document.createElement('canvas');
    offscreen.width = image.width;
    offscreen.height = image.height;
    offscreen.getContext('2d')?.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);

    ctx.drawImage(offscreen, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
  }, [image]);

  return (
    <>
      <div className="group relative flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
        <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/50">
          <span className="font-semibold text-gray-700">{title}</span>
          {image && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-400">{image.width} × {image.height}</span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                title="Full Screen / Zoom"
              >
                <Maximize2 size={16} />
              </button>
            </div>
          )}
        </div>
        <div
          className="flex-1 p-4 flex items-center justify-center bg-gray-50/30 overflow-hidden cursor-zoom-in relative"
          onClick={() => image && setIsModalOpen(true)}
        >
          {image ? (
            <div className="relative max-w-full max-h-full">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain shadow-sm bg-white rounded-sm"
              />
              {overlay}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-300">
              <div className="w-12 h-12 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-xl">?</span>
              </div>
              <p className="text-xs">No image loaded</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && image && (
        <ImageViewerModal
          image={image}
          title={title}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};
