export class GPUManager {
  private static instance: GPUManager;
  private device: GPUDevice | null = null;
  private adapter: GPUAdapter | null = null;
  private initPromise: Promise<boolean> | null = null;

  private constructor() { }

  public static getInstance(): GPUManager {
    if (!GPUManager.instance) {
      GPUManager.instance = new GPUManager();
    }
    return GPUManager.instance;
  }

  async init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!navigator.gpu) {
        console.error('WebGPU is not supported');
        return false;
      }

      this.adapter = await navigator.gpu.requestAdapter();
      if (!this.adapter) {
        console.error('Failed to get GPU adapter');
        return false;
      }

      this.device = await this.adapter.requestDevice();
      return true;
    })();

    return this.initPromise;
  }

  getDevice(): GPUDevice {
    if (!this.device) {
      throw new Error('GPU Device not initialized');
    }
    return this.device;
  }

  isSupported(): boolean {
    return !!this.device;
  }
}
