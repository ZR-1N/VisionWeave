import * as ort from 'onnxruntime-web';
import { ImageTensor } from '../../types/image';
import { preprocess, extractTile } from './preprocess';
import { postprocess } from './postprocess';

export class ModelEngine {
  private session: ort.InferenceSession | null = null;
  private modelPath: string = '/models/zero_dce.onnx';

  async init(): Promise<boolean> {
    try {
      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['webgpu'],
      });
      console.log('Zero-DCE++ model initialized with WebGPU');
      return true;
    } catch (e) {
      console.error('Failed to initialize ONNX model with WebGPU:', e);
      try {
        console.log('Falling back to WASM...');
        this.session = await ort.InferenceSession.create(this.modelPath, {
          executionProviders: ['wasm'],
        });
        return true;
      } catch (err) {
        console.error('Failed to initialize ONNX model with WASM fallback:', err);
        return false;
      }
    }
  }

  async run(input: ImageTensor, onProgress?: (progress: number) => void): Promise<{ output: ImageTensor; inferenceTime: number }> {
    if (!this.session) throw new Error('Model session not initialized');

    const startTime = performance.now();
    const { width, height } = input;

    // WebGPU safe tile size. 1024 is generally safe for VRAM.
    const TILE_SIZE = 1024;
    const OVERLAP = 64; // Pixels to overlap to hide seams

    // If image is small enough, run directly
    if (width <= TILE_SIZE && height <= TILE_SIZE) {
      const tensor = preprocess(input);
      const results = await this.session.run({ input: tensor });
      const output = postprocess(results.output, width, height);
      return { output, inferenceTime: performance.now() - startTime };
    }

    // Tiling & Stitching Logic for Large Images
    console.log(`Large image detected (${width}x${height}). Using tiled processing...`);

    const resultRGBA = new Uint8ClampedArray(width * height * 4);
    const stride = TILE_SIZE - OVERLAP;

    const tilesX = Math.ceil((width - OVERLAP) / stride);
    const tilesY = Math.ceil((height - OVERLAP) / stride);
    const totalTiles = tilesX * tilesY;
    let processedTiles = 0;

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        // Calculate tile boundaries
        const x = tx * stride;
        const y = ty * stride;
        const w = Math.min(TILE_SIZE, width - x);
        const h = Math.min(TILE_SIZE, height - y);

        // Extract and process tile
        const tileInput = extractTile(input, x, y, w, h);
        const tileTensor = preprocess(tileInput);
        const tileResults = await this.session.run({ input: tileTensor });
        const tileOutput = postprocess(tileResults.output, w, h);

        // Stitch back to final buffer
        // Simple copy for now, but we only copy the non-overlapping part if not last tile
        // to avoid visible seams, or we can just overwrite. 
        // Zero-DCE++ is stable enough that simple overwrite often works.
        for (let row = 0; row < h; row++) {
          const srcOffset = row * w * 4;
          const destOffset = ((y + row) * width + x) * 4;
          resultRGBA.set(tileOutput.data.subarray(srcOffset, srcOffset + w * 4), destOffset);
        }

        processedTiles++;
        if (onProgress) onProgress(processedTiles / totalTiles);
      }
    }

    const endTime = performance.now();
    return {
      output: { width, height, channels: 4, data: resultRGBA },
      inferenceTime: endTime - startTime,
    };
  }
}
