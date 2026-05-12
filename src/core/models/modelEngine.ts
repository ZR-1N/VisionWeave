import * as ort from 'onnxruntime-web';
import { ImageTensor } from '../../types/image';
import { preprocess, extractTile } from './preprocess';
import { postprocess } from './postprocess';

export type AIModelType = 'zero-dce++' | 'animeganv2';

interface ModelConfig {
  path: string;
  label: string;
  tileMultiple?: number;
  minTileSize?: number;
  maxTileSize: number;
  overlap: number;
  preprocess: (input: ImageTensor) => ort.Tensor;
  postprocess: (tensor: ort.Tensor, width: number, height: number) => ImageTensor;
}

export class ModelEngine {
  private session: ort.InferenceSession | null = null;
  private modelType: AIModelType | null = null;
  private readonly configs: Record<AIModelType, ModelConfig> = {
    'zero-dce++': {
      path: '/models/zero_dce.onnx',
      label: 'Zero-DCE++',
      maxTileSize: 1024,
      overlap: 64,
      preprocess,
      postprocess,
    },
    animeganv2: {
      path: '/models/animegan/Shinkai_53.onnx',
      label: 'AnimeGANv2',
      tileMultiple: 32,
      minTileSize: 256,
      maxTileSize: 1024,
      overlap: 32,
      preprocess: preprocessAnimeGAN,
      postprocess: postprocessAnimeGAN,
    },
  };

  async init(modelType: AIModelType = 'zero-dce++'): Promise<boolean> {
    const config = this.configs[modelType];
    try {
      this.session = await ort.InferenceSession.create(config.path, {
        executionProviders: ['webgpu'],
      });
      this.modelType = modelType;
      console.log(`${config.label} model initialized with WebGPU`);
      return true;
    } catch (e) {
      console.error('Failed to initialize ONNX model with WebGPU:', e);
      try {
        console.log('Falling back to WASM...');
        this.session = await ort.InferenceSession.create(config.path, {
          executionProviders: ['wasm'],
        });
        this.modelType = modelType;
        return true;
      } catch (err) {
        console.error('Failed to initialize ONNX model with WASM fallback:', err);
        return false;
      }
    }
  }

  async run(input: ImageTensor, onProgress?: (progress: number) => void): Promise<{ output: ImageTensor; inferenceTime: number }> {
    if (!this.session) throw new Error('Model session not initialized');
    if (!this.modelType) throw new Error('Model type not initialized');

    const config = this.configs[this.modelType];
    const inputName = this.session.inputNames[0] ?? 'input';
    const outputName = this.session.outputNames[0] ?? 'output';

    const startTime = performance.now();
    const { width, height } = input;

    const TILE_SIZE = config.maxTileSize;
    const OVERLAP = config.overlap;

    // If image is small enough, run directly
    if (width <= TILE_SIZE && height <= TILE_SIZE) {
      const prepared = prepareModelInput(input, config.tileMultiple, config.minTileSize);
      const tensor = config.preprocess(prepared.image);
      const results = await this.session.run({ [inputName]: tensor });
      const outputTensor = results[outputName] ?? Object.values(results)[0];
      if (!outputTensor) throw new Error('Model returned no output tensor');
      const output = config.postprocess(outputTensor as ort.Tensor, prepared.image.width, prepared.image.height);
      const restored = restoreToOriginalSize(output, width, height);
      return { output: restored, inferenceTime: performance.now() - startTime };
    }

    // Tiling & Stitching Logic for Large Images
    console.log(`Large image detected (${width}x${height}). Using tiled processing for ${config.label}...`);

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
        const preparedTile = prepareModelInput(tileInput, config.tileMultiple, config.minTileSize);
        const tileTensor = config.preprocess(preparedTile.image);
        const tileResults = await this.session.run({ [inputName]: tileTensor });
        const tileOutputTensor = tileResults[outputName] ?? Object.values(tileResults)[0];
        if (!tileOutputTensor) throw new Error('Model returned no output tensor');
        const rawTileOutput = config.postprocess(
          tileOutputTensor as ort.Tensor,
          preparedTile.image.width,
          preparedTile.image.height
        );
        const tileOutput = restoreToOriginalSize(rawTileOutput, w, h);

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

function preprocessAnimeGAN(input: ImageTensor): ort.Tensor {
  const { width, height, data } = input;
  const size = width * height;
  const float32Data = new Float32Array(size * 3);

  for (let i = 0; i < size; i++) {
    const rgbaIndex = i * 4;
    const base = i * 3;
    float32Data[base] = data[rgbaIndex] / 127.5 - 1.0;
    float32Data[base + 1] = data[rgbaIndex + 1] / 127.5 - 1.0;
    float32Data[base + 2] = data[rgbaIndex + 2] / 127.5 - 1.0;
  }

  return new ort.Tensor('float32', float32Data, [1, height, width, 3]);
}

function postprocessAnimeGAN(tensor: ort.Tensor, width: number, height: number): ImageTensor {
  const size = width * height;
  const float32Data = tensor.data as Float32Array;
  const rgbaData = new Uint8ClampedArray(4 * size);

  for (let i = 0; i < size; i++) {
    const base = i * 3;
    const rgbaIndex = i * 4;
    rgbaData[rgbaIndex] = Math.max(0, Math.min(255, ((float32Data[base] + 1) * 0.5) * 255));
    rgbaData[rgbaIndex + 1] = Math.max(0, Math.min(255, ((float32Data[base + 1] + 1) * 0.5) * 255));
    rgbaData[rgbaIndex + 2] = Math.max(0, Math.min(255, ((float32Data[base + 2] + 1) * 0.5) * 255));
    rgbaData[rgbaIndex + 3] = 255;
  }

  return { width, height, channels: 4, data: rgbaData };
}

function prepareModelInput(input: ImageTensor, multiple?: number, minSize?: number): { image: ImageTensor } {
  if (!multiple && !minSize) {
    return { image: input };
  }

  let targetWidth = input.width;
  let targetHeight = input.height;

  if (multiple) {
    targetWidth = targetWidth < (minSize ?? 0) ? (minSize ?? targetWidth) : targetWidth - (targetWidth % multiple);
    targetHeight = targetHeight < (minSize ?? 0) ? (minSize ?? targetHeight) : targetHeight - (targetHeight % multiple);
  }

  if (minSize) {
    targetWidth = Math.max(minSize, targetWidth);
    targetHeight = Math.max(minSize, targetHeight);
  }

  targetWidth = Math.max(1, targetWidth);
  targetHeight = Math.max(1, targetHeight);

  if (targetWidth === input.width && targetHeight === input.height) {
    return { image: input };
  }

  return { image: resizeImageTensor(input, targetWidth, targetHeight) };
}

function restoreToOriginalSize(input: ImageTensor, width: number, height: number): ImageTensor {
  if (input.width === width && input.height === height) {
    return input;
  }
  return resizeImageTensor(input, width, height);
}

function resizeImageTensor(input: ImageTensor, width: number, height: number): ImageTensor {
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = input.width;
  srcCanvas.height = input.height;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) throw new Error('Failed to create source canvas context');
  srcCtx.putImageData(new ImageData(input.data, input.width, input.height), 0, 0);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = width;
  dstCanvas.height = height;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) throw new Error('Failed to create destination canvas context');
  dstCtx.imageSmoothingEnabled = true;
  dstCtx.drawImage(srcCanvas, 0, 0, input.width, input.height, 0, 0, width, height);

  return {
    width,
    height,
    channels: 4,
    data: dstCtx.getImageData(0, 0, width, height).data,
  };
}
