import { ImageTensor } from '../../types/image';

export function imageToTensor(img: HTMLImageElement): ImageTensor {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  
  return {
    width: img.width,
    height: img.height,
    channels: 4, // RGBA
    data: imageData.data
  };
}
