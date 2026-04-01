import { ImageTensor, ConvolutionParams } from '../../types/image';
import { GPUManager } from '../runtime/gpuSupport';
import convolutionShaderCode from './shaders/convolution.wgsl?raw';

export class WebGPUConvolution {
  private pipeline: GPUComputePipeline | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;

  async init(): Promise<boolean> {
    const gpuManager = GPUManager.getInstance();
    const success = await gpuManager.init();
    if (!success) return false;

    const device = gpuManager.getDevice();

    const shaderModule = device.createShaderModule({
      label: 'Convolution Shader',
      code: convolutionShaderCode,
    });

    this.bindGroupLayout = device.createBindGroupLayout({
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

    this.pipeline = device.createComputePipeline({
      label: 'Convolution Pipeline',
      layout: device.createPipelineLayout({
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
    const device = GPUManager.getInstance().getDevice();
    if (!this.pipeline || !this.bindGroupLayout) {
      throw new Error('WebGPU Convolution not initialized');
    }
    // ... remaining code using `device` ...

    // Calculate output dimensions
    const outWidth = Math.floor((input.width + 2 * params.padding - params.kernelSize) / params.stride) + 1;
    const outHeight = Math.floor((input.height + 2 * params.padding - params.kernelSize) / params.stride) + 1;

    if (outWidth <= 0 || outHeight <= 0) {
      throw new Error('Invalid convolution parameters leading to zero or negative dimensions');
    }

    // Prepare Uniform Params Buffer
    // struct Params {
    //   width: f32,
    //   height: f32,
    //   outWidth: f32,
    //   outHeight: f32,
    //   kernelSize: f32,
    //   stride: f32,
    //   padding: f32,
    //   bias: f32,
    //   normalize: f32,
    //   clip: f32,
    //   grayscale: f32,
    //   _padding: f32,
    // } -> 13 * 4 = 52 bytes, align to 64
    const paramsArray = new ArrayBuffer(64);
    const paramsViewF32 = new Float32Array(paramsArray);

    paramsViewF32[0] = input.width;
    paramsViewF32[1] = input.height;
    paramsViewF32[2] = outWidth;
    paramsViewF32[3] = outHeight;
    paramsViewF32[4] = params.kernelSize;
    paramsViewF32[5] = params.stride;
    paramsViewF32[6] = params.padding;
    paramsViewF32[7] = params.bias;
    paramsViewF32[8] = params.normalize ? 1.0 : 0.0;
    paramsViewF32[9] = params.clip ? 1.0 : 0.0;
    paramsViewF32[10] = params.grayscale ? 1.0 : 0.0;

    const paramsBuffer = device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(paramsBuffer, 0, paramsArray);

    // Prepare Kernel Buffer
    const kernelSum = params.kernel.reduce((a, b) => a + b, 0);
    const actualKernel = params.normalize && kernelSum !== 0
      ? params.kernel.map(v => v / kernelSum)
      : params.kernel;

    const kernelArray = new Float32Array(actualKernel);
    const kernelBuffer = device.createBuffer({
      size: kernelArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(kernelBuffer, 0, kernelArray);

    // Prepare Input Buffer
    const inputBuffer = device.createBuffer({
      size: input.data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(inputBuffer, 0, input.data);

    // Prepare Output Buffer
    const outputBufferSize = outWidth * outHeight * 4; // 4 channels (RGBA)
    const outputBuffer = device.createBuffer({
      size: outputBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const bindGroup = device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: kernelBuffer } },
        { binding: 2, resource: { buffer: inputBuffer } },
        { binding: 3, resource: { buffer: outputBuffer } },
      ]
    });

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, bindGroup);

    // Workgroup size is 16x16
    const workgroupCountX = Math.ceil(outWidth / 16);
    const workgroupCountY = Math.ceil(outHeight / 16);
    passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY);
    passEncoder.end();

    // Copy result to read buffer
    const readBuffer = device.createBuffer({
      size: outputBufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    commandEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, outputBufferSize);

    device.queue.submit([commandEncoder.finish()]);

    await readBuffer.mapAsync(GPUMapMode.READ);
    const copyArrayBuffer = readBuffer.getMappedRange();
    const data = new Uint8ClampedArray(copyArrayBuffer.slice(0));
    readBuffer.unmap();

    // The buffers can be destroyed now that mapAsync has resolved,
    // which implies all previous commands involving these buffers are complete.
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
