import React, { useState, useRef, useEffect } from 'react';
import { ImageTensor } from '../types/image';

interface Props {
  original: ImageTensor;
  processed: ImageTensor;
}

export const ImageCompareSlider: React.FC<Props> = ({ original, processed }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasOriginalRef = useRef<HTMLCanvasElement>(null);
  const canvasProcessedRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const draw = (image: ImageTensor, canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = image.width;
      canvas.height = image.height;
      const imageData = new ImageData(image.data, image.width, image.height);
      ctx.putImageData(imageData, 0, 0);
    };

    draw(original, canvasOriginalRef.current);
    draw(processed, canvasProcessedRef.current);
  }, [original, processed]);

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, position)));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/50">
        <span className="font-semibold text-gray-700">Split-View Comparison</span>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="text-blue-600">Left: Original</span>
          <span className="text-indigo-600">Right: Enhanced</span>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-100 select-none cursor-ew-resize"
        onMouseMove={handleMove}
        onTouchMove={handleMove}
      >
        {/* Container for both images to keep them centered and scaled */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full aspect-auto shadow-2xl">
            
            {/* Original Image (Bottom Layer) */}
            <canvas 
              ref={canvasOriginalRef}
              className="max-w-full max-h-[70vh] block object-contain bg-white rounded-sm"
            />

            {/* Processed Image (Top Layer with Clipping) */}
            <div 
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
            >
              <canvas 
                ref={canvasProcessedRef}
                className="max-w-full max-h-[70vh] block object-contain bg-white rounded-sm"
              />
            </div>

            {/* Slider Bar */}
            <div 
              className="absolute inset-y-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)] pointer-events-none"
              style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200">
                <div className="flex gap-1">
                  <div className="w-0.5 h-3 bg-gray-400 rounded-full"></div>
                  <div className="w-0.5 h-3 bg-gray-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-2 text-center text-[10px] text-gray-400 border-t border-gray-100 bg-gray-50/30">
        Drag or move mouse across the image to compare
      </div>
    </div>
  );
};
