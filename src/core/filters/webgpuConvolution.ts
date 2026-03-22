import { ImageTensor, ConvolutionParams } from '../../types/image';
import convolutionShaderCode from './shaders/convolution.wgsl?raw';

export class WebGPUConvolution {
  private device: GPUDevice | null = null;
  private pipeline: GPUComputePipeline | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;

  async init(): Promise<boolean> {
    if (!navigator.gpu) {
      console.error('WebGPU is not supported on this browser.');
      return false;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.error('Failed to get GPU adapter.');
      return false;
    }

    this.device = await adapter.requestDevice();

    const shaderModule = this.device.createShaderModule({
      label: 'Convolution Shader',
      code: convolutionShaderCode,
    });

    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0, // params
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' }
        },
        {
          binding: 1, // kernel
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        {
          binding: 2, // input texture (buffer)
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        {
          binding: 3, // output texture (buffer)
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        }
      ]
    });

    this.pipeline = this.device.createComputePipeline({
      label: 'Convolution Pipeline',
      layout: this.device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout]
      }),
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      }
    });

    return true;
  }

  async applyConvolution(
    input: ImageTensor,
    params: ConvolutionParams
  ): Promise<ImageTensor> {
    if (!this.device || !this.pipeline || !this.bindGroupLayout) {
      throw new Error('WebGPU Convolution not initialized');
    }

    // Calculate output dimensions
    const outWidth = Math.floor((input.width + 2 * params.padding - params.kernelSize) / params.stride) + 1;
    const outHeight = Math.floor((input.height + 2 * params.padding - params.kernelSize) / params.stride) + 1;

    if (outWidth <= 0 || outHeight <= 0) {
      throw new Error('Invalid convolution parameters leading to zero or negative dimensions');
    }

    // Prepare Uniform Params Buffer
    // struct Params {
    //   width: u32,
    //   height: u32,
    //   outWidth: u32,
    //   outHeight: u32,
    //   kernelSize: u32,
    //   stride: u32,
    //   padding: u32,
    //   bias: f32,
    //   normalize: u32, // 1 or 0
    //   clip: u32,      // 1 or 0
    //   grayscale: u32, // 1 or 0
    // } -> 11 * 4 = 44 bytes, align to 48
    const paramsArray = new ArrayBuffer(48);
    const paramsViewU32 = new Uint32Array(paramsArray);
    const paramsViewF32 = new Float32Array(paramsArray);
    
    paramsViewU32[0] = input.width;
    paramsViewU32[1] = input.height;
    paramsViewU32[2] = outWidth;
    paramsViewU32[3] = outHeight;
    paramsViewU32[4] = params.kernelSize;
    paramsViewU32[5] = params.stride;
    paramsViewU32[6] = params.padding;
    paramsViewF32[7] = params.bias;
    paramsViewU32[8] = params.normalize ? 1 : 0;
    paramsViewU32[9] = params.clip ? 1 : 0;
    paramsViewU32[10] = params.grayscale ? 1 : 0;

    const paramsBuffer = this.device.createBuffer({
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(paramsBuffer, 0, paramsArray);

    // Prepare Kernel Buffer
    const kernelSum = params.kernel.reduce((a, b) => a + b, 0);
    const actualKernel = params.normalize && kernelSum !== 0 
      ? params.kernel.map(v => v / kernelSum) 
      : params.kernel;
    
    const kernelArray = new Float32Array(actualKernel);
    const kernelBuffer = this.device.createBuffer({
      size: kernelArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(kernelBuffer, 0, kernelArray);

    // Prepare Input Buffer
    const inputBuffer = this.device.createBuffer({
      size: input.data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(inputBuffer, 0, input.data);

    // Prepare Output Buffer
    const outputBufferSize = outWidth * outHeight * 4; // 4 channels (RGBA)
    const outputBuffer = this.device.createBuffer({
      size: outputBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: kernelBuffer } },
        { binding: 2, resource: { buffer: inputBuffer } },
        { binding: 3, resource: { buffer: outputBuffer } },
      ]
    });

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    
    // Workgroup size is 16x16
    const workgroupCountX = Math.ceil(outWidth / 16);
    const workgroupCountY = Math.ceil(outHeight / 16);
    passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY);
    passEncoder.end();

    // Copy result to read buffer
    const readBuffer = this.device.createBuffer({
      size: outputBufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputBufferSize);

    this.device.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const copyArrayBuffer = readBuffer.getMappedRange();
    const data = new Uint8ClampedArray(copyArrayBuffer.slice(0));
    readBuffer.unmap();

    // Clean up
    paramsBuffer.destroy();
    kernelBuffer.destroy();
    inputBuffer.destroy();
    outputBuffer.destroy();
    readBuffer.destroy();

    return {
      width: outWidth,
      height: outHeight,
      channels: 4,
      data
    };
  }
}
