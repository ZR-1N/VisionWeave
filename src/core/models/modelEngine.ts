import * as ort from 'onnxruntime-web';
import { ImageTensor } from '../../types/image';
import { preprocess } from './preprocess';
import { postprocess } from './postprocess';

export class ModelEngine {
  private session: ort.InferenceSession | null = null;
  private modelPath: string = '/models/zero_dce.onnx';

  async init(): Promise<boolean> {
    try {
      // Use WebGPU EP for performance
      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['webgpu'],
      });
      console.log('Zero-DCE++ model initialized with WebGPU');
      return true;
    } catch (e) {
      console.error('Failed to initialize ONNX model with WebGPU:', e);
      try {
        // Fallback to CPU/WASM if WebGPU fails
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

  async run(input: ImageTensor): Promise<{ output: ImageTensor; inferenceTime: number }> {
    if (!this.session) {
      throw new Error('Model session not initialized');
    }

    const startTime = performance.now();
    
    // Pre-process: ImageData -> NCHW Float32 Tensor
    const inputTensor = preprocess(input);
    
    // Run inference
    const feeds: Record<string, ort.Tensor> = {
      input: inputTensor,
    };
    
    const results = await this.session.run(feeds);
    const outputTensor = results.output; // Zero-DCE++ output name is 'output'
    
    // Post-process: NCHW Float32 Tensor -> RGBA ImageTensor
    const output = postprocess(outputTensor, input.width, input.height);
    
    const endTime = performance.now();
    const inferenceTime = endTime - startTime;

    return {
      output,
      inferenceTime,
    };
  }
}
