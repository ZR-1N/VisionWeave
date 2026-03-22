import React, { useEffect, useRef } from 'react';
import { ImageTensor } from '../types/image';

interface Props {
  title: string;
  image: ImageTensor | null;
}

export const ImagePreview: React.FC<Props> = ({ title, image }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = image.width;
    canvas.height = image.height;

    const imageData = new ImageData(image.data, image.width, image.height);
    ctx.putImageData(imageData, 0, 0);
  }, [image]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-3 border-b border-gray-100 bg-gray-50 font-semibold text-gray-700">
        {title} {image && <span className="text-sm font-normal text-gray-500 ml-2">({image.width}x{image.height})</span>}
      </div>
      <div className="flex-1 p-4 flex items-center justify-center bg-gray-100/50 overflow-auto min-h-[300px]">
        {image ? (
          <canvas 
            ref={canvasRef} 
            className="max-w-full max-h-full object-contain shadow-sm bg-white"
          />
        ) : (
          <p className="text-gray-400">No image</p>
        )}
      </div>
    </div>
  );
};
