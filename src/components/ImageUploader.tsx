import React, { ChangeEvent } from 'react';
import { Upload } from 'lucide-react';

interface Props {
  onImageLoad: (image: HTMLImageElement) => void;
}

export const ImageUploader: React.FC<Props> = ({ onImageLoad }) => {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => onImageLoad(img);
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <Upload className="w-8 h-8 text-gray-400 mb-2" />
      <p className="text-sm text-gray-600 mb-4">Upload an image to get started</p>
      <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-colors">
        Choose File
        <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleFileChange} />
      </label>
    </div>
  );
};
