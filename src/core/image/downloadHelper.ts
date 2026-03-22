import { ImageTensor } from '../../types/image';

export function downloadImageTensor(tensor: ImageTensor, filename: string = 'visionweave-result.png') {
  const canvas = document.createElement('canvas');
  canvas.width = tensor.width;
  canvas.height = tensor.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const imageData = new ImageData(tensor.data, tensor.width, tensor.height);
  ctx.putImageData(imageData, 0, 0);

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
