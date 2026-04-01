import { ImageTensor, NonLinearFilterParams, NonLinearFilterType } from '../../types/image';
import nonLinearShaderCode from './shaders/nonLinear.wgsl?raw';

export class WebGPUNonLinearFilter {
  private device: GPUDevice | null = null;
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
    if (!navigator.gpu) return false;

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;

    this.device = await adapter.requestDevice();

    const shaderModule = this.device.createShaderModule({
      label: 'Non-Linear Filter Shader',
      code: nonLinearShaderCode,
    });

    this.bindGroupLayout = this.device.createBindGroupLayout({
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

    this.pipeline = this.device.createComputePipeline({
      label: 'Non-Linear Pipeline',
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

  async applyFilter(
    input: ImageTensor,
    params: NonLinearFilterParams
  ): Promise<ImageTensor> {
    if (!this.device || !this.pipeline || !this.bindGroupLayout) {
      throw new Error('WebGPU Non-Linear Filter not initialized');
    }

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

    const paramsBuffer = this.device.createBuffer({
      size: 48,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(paramsBuffer, 0, paramsArray);

    const inputBuffer = this.device.createBuffer({
      size: input.data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(inputBuffer, 0, input.data);

    const outputBufferSize = input.width * input.height * 4;
    const outputBuffer = this.device.createBuffer({
      size: outputBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: paramsBuffer } },
        { binding: 1, resource: { buffer: inputBuffer } },
        { binding: 2, resource: { buffer: outputBuffer } },
      ]
    });

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, bindGroup);

    const workgroupCountX = Math.ceil(input.width / 16);
    const workgroupCountY = Math.ceil(input.height / 16);
    passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY);
    passEncoder.end();

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
