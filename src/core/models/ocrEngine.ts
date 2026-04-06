import * as ort from 'onnxruntime-web';
import { ImageTensor } from '../../types/image';
import { preprocessDetection, decodeCTC } from './ocrUtils';
import { extractTile } from './preprocess';

export interface OCRResult {
  box: [number, number, number, number]; // [x1, y1, x2, y2] relative to original image
  text: string;
  confidence: number;
}

export class OCREngine {
  private detSession: ort.InferenceSession | null = null;
  private recoSession: ort.InferenceSession | null = null;
  private vocab: string[] = [];

  private detModelPath = '/models/doctr/db_mobilenet_v3_large.onnx';
  private recoModelPath = '/models/doctr/crnn_mobilenet_v3_small.onnx';
  private vocabPath = '/models/doctr/vocab.json';

  private getInputName(session: ort.InferenceSession): string {
    return session.inputNames[0] ?? 'input';
  }

  private getOutputTensor(results: ort.InferenceSession.ReturnType, preferredKey?: string): ort.Tensor {
    if (preferredKey && preferredKey in results) {
      return results[preferredKey] as ort.Tensor;
    }

    const first = Object.values(results)[0] as ort.Tensor | undefined;
    if (!first) {
      throw new Error('ONNX inference returned no outputs');
    }
    return first;
  }

  private toHeatmap(tensor: ort.Tensor): { heatmap: Float32Array; w: number; h: number } {
    const dims = tensor.dims as number[];
    if (dims.length < 2) {
      throw new Error(`Unexpected detection output dims: [${dims.join(', ')}]`);
    }

    const h = dims[dims.length - 2];
    const w = dims[dims.length - 1];
    const size = h * w;
    const data = tensor.data as Float32Array;

    if (data.length < size) {
      throw new Error(`Detection output too small: got ${data.length}, expected at least ${size}`);
    }

    // DBNet output is usually [1, 1, H, W], we take the first map.
    return { heatmap: data.subarray(0, size), w, h };
  }

  private async createSessionWithFallback(modelPath: string): Promise<ort.InferenceSession> {
    try {
      return await ort.InferenceSession.create(modelPath, {
        executionProviders: ['webgpu'],
      });
    } catch (webgpuErr) {
      console.warn(`WebGPU init failed for ${modelPath}, falling back to WASM`, webgpuErr);
      return await ort.InferenceSession.create(modelPath, {
        executionProviders: ['wasm'],
      });
    }
  }

  async init(): Promise<boolean> {
    try {
      // 1. Load Vocabulary
      const response = await fetch(this.vocabPath);
      if (!response.ok) {
        throw new Error(`Failed to load OCR vocab: ${response.status}`);
      }

      const vocab = await response.json();
      if (!Array.isArray(vocab) || vocab.length === 0) {
        throw new Error('OCR vocab is invalid or empty');
      }
      this.vocab = vocab as string[];

      // 2. Initialize Sessions
      const [detSession, recoSession] = await Promise.all([
        this.createSessionWithFallback(this.detModelPath),
        this.createSessionWithFallback(this.recoModelPath),
      ]);
      this.detSession = detSession;
      this.recoSession = recoSession;

      console.log('OCR Engine (Detection + Recognition) initialized');
      return true;
    } catch (e) {
      console.error('Failed to initialize OCR Engine:', e);
      return false;
    }
  }

  async runOCR(input: ImageTensor, onProgress?: (progress: number) => void): Promise<OCRResult[]> {
    if (!this.detSession || !this.recoSession) throw new Error('Sessions not initialized');

    // --- STEP 1: Detection ---
    const { tensor: detTensor, scale, padding } = preprocessDetection(input);
    const detInputName = this.getInputName(this.detSession);
    const detResults = await this.detSession.run({ [detInputName]: detTensor });
    const detOutput = this.getOutputTensor(detResults, 'out_map');
    const { heatmap, h, w } = this.toHeatmap(detOutput);
    if (onProgress) onProgress(0.2);

    // --- STEP 2: Box Extraction (Simplified Connected Components) ---
    // In a real scenario, we'd use a more robust box detection logic.
    // For MVP, we'll find high-confidence clusters.
    const boxes = this.extractBoxes(heatmap, w, h, scale, padding, input.width, input.height);
    if (boxes.length === 0) {
      if (onProgress) onProgress(1);
      return [];
    }
    
    // --- STEP 3: Recognition ---
    const results: OCRResult[] = [];
    const recoInputName = this.getInputName(this.recoSession);
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      // Crop the word from the original image
      const [x1, y1, x2, y2] = box;
      const cropW = Math.max(1, x2 - x1);
      const cropH = Math.max(1, y2 - y1);
      
      const tile = extractTile(input, x1, y1, cropW, cropH);
      const recoTensor = this.preprocessRecognition(tile);
      
      const recoResults = await this.recoSession.run({ [recoInputName]: recoTensor });
      const recoOutput = this.getOutputTensor(recoResults, 'logits');
      const logits = recoOutput.data as Float32Array;
      const text = decodeCTC(logits, recoOutput.dims as number[], this.vocab);
      
      if (text.length > 0) {
        results.push({ box, text, confidence: 0.9 }); // Confidence is placeholder
      }
      
      if (onProgress) {
        const recogProgress = (i + 1) / boxes.length;
        onProgress(0.2 + recogProgress * 0.8);
      }
    }

    if (onProgress) onProgress(1);
    return results;
  }

  private extractBoxes(heatmap: Float32Array, w: number, h: number, scale: number, padding: { x: number, y: number }, origW: number, origH: number): [number, number, number, number][] {
    const threshold = 0.3;
    const minPixels = 20;
    const maxBoxes = 200;
    const boxes: [number, number, number, number][] = [];
    const visited = new Uint8Array(w * h);

    // Basic BFS to find connected components in the heatmap
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (heatmap[idx] > threshold && !visited[idx]) {
          let minX = x, maxX = x, minY = y, maxY = y;
          const queue = [[x, y]];
          let qHead = 0;
          let pixels = 0;
          visited[idx] = 1;

          while (qHead < queue.length) {
            const [cx, cy] = queue[qHead++];
            pixels++;
            minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
            minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);

            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = cx + dx, ny = cy + dy;
                const nIdx = ny * w + nx;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h && heatmap[nIdx] > threshold && !visited[nIdx]) {
                  visited[nIdx] = 1;
                  queue.push([nx, ny]);
                }
              }
            }
          }

          // Convert back to original image coordinates
          const bx1 = Math.floor((minX - padding.x) / scale);
          const by1 = Math.floor((minY - padding.y) / scale);
          const bx2 = Math.ceil((maxX - padding.x) / scale);
          const by2 = Math.ceil((maxY - padding.y) / scale);

          // Filtering tiny boxes
          if (pixels >= minPixels && (bx2 - bx1) > 4 && (by2 - by1) > 4) {
            const x1 = Math.max(0, bx1);
            const y1 = Math.max(0, by1);
            const x2 = Math.min(origW, bx2);
            const y2 = Math.min(origH, by2);

            if (x2 > x1 && y2 > y1) {
              boxes.push([x1, y1, x2, y2]);
            }
          }
        }
      }
    }

    // Keep ordering stable for UI overlay and avoid pathological counts.
    boxes.sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
    return boxes.slice(0, maxBoxes);
  }

  private preprocessRecognition(tile: ImageTensor): ort.Tensor {
    // Recognition input: [1, 3, 32, W]
    const targetH = 32;
    const scale = targetH / tile.height;
    const targetW = Math.max(32, Math.round(tile.width * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = tile.width;
    tempCanvas.height = tile.height;
    tempCanvas.getContext('2d')!.putImageData(new ImageData(tile.data, tile.width, tile.height), 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, tile.width, tile.height, 0, 0, targetW, targetH);
    const data = ctx.getImageData(0, 0, targetW, targetH).data;

    const float32Data = new Float32Array(3 * targetH * targetW);
    // CRNN normalization usually 0.5 mean/std or similar, but doctr preprocessor logic
    const mean = [0.694, 0.695, 0.693];
    const std = [0.299, 0.296, 0.301];

    for (let i = 0; i < targetH * targetW; i++) {
      const r = data[i * 4] / 255.0;
      const g = data[i * 4 + 1] / 255.0;
      const b = data[i * 4 + 2] / 255.0;

      float32Data[i] = (r - mean[0]) / std[0];
      float32Data[i + targetH * targetW] = (g - mean[1]) / std[1];
      float32Data[i + 2 * targetH * targetW] = (b - mean[2]) / std[2];
    }

    return new ort.Tensor('float32', float32Data, [1, 3, targetH, targetW]);
  }
}
