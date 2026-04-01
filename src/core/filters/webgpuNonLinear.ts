import { ImageTensor, NonLinearFilterParams, NonLinearFilterType } from '../../types/image';
import { GPUManager } from '../runtime/gpuSupport';
import nonLinearShaderCode from './shaders/nonLinear.wgsl?raw';

export class WebGPUNonLinearFilter {
  private pipeline: GPUComputePipeline | null = null;
  private bindGroupLayout: GPUBindGroupLayout | null = null;

  private typeMap: Record<NonLinearFilterType, number> = {
    'median': 0,
    'bilateral': 1,
    'dilation': 2,
    'erosion': 3,
    'adaptive_threshold': 4,
    'detail_enhance': 5
  };

  async init(): Promise<boolean> {
    const gpuManager = GPUManager.getInstance();
    const success = await gpuManager.init();
    if (!success) return false;

    const device = gpuManager.getDevice();

    const shaderModule = device.createShaderModule({
      label: 'Non-Linear Filter Shader',
      code: nonLinearShaderCode,
    });

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0, // params
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'uniform' }
        },
        {
          binding: 1, // input texture (buffer)
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'read-only-storage' }
        },
        {
          binding: 2, // output texture (buffer)
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: 'storage' }
        }
      ]
    });

    this.pipeline = device.createComputePipeline({
      label: 'Non-Linear Pipeline',
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

  async applyFilter(
    input: ImageTensor,
    params: NonLinearFilterParams
  ): Promise<ImageTensor> {
    const device = GPUManager.getInstance().getDevice();
    if (!this.pipeline || !this.bindGroupLayout) {
      throw new Error('WebGPU Non-Linear Filter not initialized');
    }
    // ... remaining code using `device` ...

    // struct Params {
    //   width: u32,
    //   height: u32,
    //   outWidth: u32,
    //   outHeight: u32,
    //   type: u32,
    //   radius: u32,
    //   sigmaS: f32,
    //   sigmaR: f32,
    //   constant: f32,
    //   _padding1: u32,
    //   _padding2: u32,
    // } -> 11 * 4 = 44 bytes, align to 48
    const paramsArray = new ArrayBuffer(48);
    const paramsViewU32 = new Uint32Array(paramsArray);
    const paramsViewF32 = new Float32Array(paramsArray);

    paramsViewU32[0] = input.width;
    paramsViewU32[1] = input.height;
    paramsViewU32[2] = input.width;
    paramsViewU32[3] = input.height;
    paramsViewU32[4] = this.typeMap[params.type];
    paramsViewU32[5] = params.radius;
    paramsViewF32[6] = params.sigmaS ?? 1.0;
    paramsViewF32[7] = params.sigmaR ?? 1.0;
    paramsViewF32[8] = params.constant ?? 0.0;
    paramsViewF32[9] = params.amount ?? 0.0;

    const paramsBuffer = device.createBuffer({
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(paramsBuffer, 0, paramsArray);

    const inputBuffer = device.createBuffer({
      size: input.data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(inputBuffer, 0, input.data);

    const outputBufferSize = input.width * input.height * 4;
    const outputBuffer = device.createBuffer({
      size: outputBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const bindGroup = device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: inputBuffer } },
        { binding: 2, resource: { buffer: outputBuffer } },
      ]
    });

    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, bindGroup);

    const workgroupCountX = Math.ceil(input.width / 16);
    const workgroupCountY = Math.ceil(input.height / 16);
    passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY);
    passEncoder.end();

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

    paramsBuffer.destroy();
    inputBuffer.destroy();
    outputBuffer.destroy();
    readBuffer.destroy();

    return {
      width: input.width,
      height: input.height,
      channels: 4,
      data
    };
  }
}
