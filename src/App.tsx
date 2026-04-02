import { useState, useEffect, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { KernelEditor } from './components/KernelEditor';
import { ConvolutionControls } from './components/ConvolutionControls';
import { PresetKernelSelector } from './components/PresetKernelSelector';
import { NonLinearFilterSelector } from './components/NonLinearFilterSelector';
import { ImagePreview } from './components/ImagePreview';
import { ProcessInfoPanel } from './components/ProcessInfoPanel';
import { ModelSelector } from './components/ModelSelector';
import { ImageTensor, ConvolutionParams, NonLinearFilterParams } from './types/image';
import { imageToTensor } from './core/image/imageConvert';
import { WebGPUConvolution } from './core/filters/webgpuConvolution';
import { WebGPUNonLinearFilter } from './core/filters/webgpuNonLinear';
import { ModelEngine } from './core/models/modelEngine';
import { GPUManager } from './core/runtime/gpuSupport';
import { downloadImageTensor } from './core/image/downloadHelper';
import { Play, Download, AlertTriangle } from 'lucide-react';
import { KERNEL_PRESETS } from './core/filters/presets';

const defaultParams: ConvolutionParams = {
  kernel: KERNEL_PRESETS[0].kernel,
  kernelSize: KERNEL_PRESETS[0].size,
  stride: 1,
  padding: 1,
  bias: 0,
  normalize: false,
  clip: true,
  grayscale: false,
};

const defaultNonLinearParams: NonLinearFilterParams = {
  type: 'median',
  radius: 1,
  sigmaS: 5.0,
  sigmaR: 25.0,
  constant: 10.0
};

function App() {
  const [originalImage, setOriginalImage] = useState<ImageTensor | null>(null);
  const [resultImage, setResultImage] = useState<ImageTensor | null>(null);
  const [params, setParams] = useState<ConvolutionParams>(defaultParams);
  const [nonLinearParams, setNonLinearParams] = useState<NonLinearFilterParams>(defaultNonLinearParams);
  const [activeMode, setActiveMode] = useState<'convolution' | 'nonlinear' | 'model'>('convolution');

  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferenceTime, setInferenceTime] = useState<number | null>(null);

  const [filterEngine] = useState(() => new WebGPUConvolution());
  const [nonLinearEngine] = useState(() => new WebGPUNonLinearFilter());
  const [modelEngine] = useState(() => new ModelEngine());

  useEffect(() => {
    const initGPU = async () => {
      const gpuManager = GPUManager.getInstance();
      const success = await gpuManager.init();
      if (!success) {
        setWebgpuSupported(false);
        return;
      }

      const fSupp = await filterEngine.init();
      const nSupp = await nonLinearEngine.init();
      setWebgpuSupported(fSupp && nSupp);

      const mSupp = await modelEngine.init();
      setModelReady(mSupp);
    };

    initGPU().catch(err => {
      setWebgpuSupported(false);
      console.error(err);
    });
  }, [filterEngine, nonLinearEngine]);

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    try {
      const tensor = imageToTensor(img);
      setOriginalImage(tensor);
      setResultImage(null);
      setError(null);
    } catch (err: any) {
      setError('Failed to load image: ' + err.message);
    }
  }, []);

  const handleApply = async () => {
    if (!originalImage) return;
    if (!webgpuSupported) {
      setError('WebGPU is not supported.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setInferenceTime(null);

    try {
      const start = performance.now();
      let result: ImageTensor;

      if (activeMode === 'convolution') {
        result = await filterEngine.applyConvolution(originalImage, params);
      } else if (activeMode === 'nonlinear') {
        result = await nonLinearEngine.applyFilter(originalImage, nonLinearParams);
      } else {
        const res = await modelEngine.run(originalImage);
        result = res.output;
        setInferenceTime(res.inferenceTime);
      }

      const end = performance.now();
      if (activeMode !== 'model') setInferenceTime(end - start);

      console.log(`${activeMode} took ${end - start}ms`);
      setResultImage(result);
    } catch (err: any) {
      setError('Processing failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModelApply = async () => {
    setActiveMode('model');
    if (!originalImage) return;
    if (!modelReady) {
      setError('Model not ready');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const res = await modelEngine.run(originalImage);
      setResultImage(res.output);
      setInferenceTime(res.inferenceTime);
    } catch (err: any) {
      setError('Model inference failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNonLinearApply = async (fParams: NonLinearFilterParams) => {
    // Sync local params and trigger global apply
    setNonLinearParams(fParams);
    setActiveMode('nonlinear');
    // We can't use the updated state immediately, so pass fParams directly
    if (!originalImage || !webgpuSupported) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await nonLinearEngine.applyFilter(originalImage, fParams);
      setResultImage(result);
    } catch (err: any) {
      setError('Processing failed: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (resultImage) {
      downloadImageTensor(resultImage, 'visionweave-output.png');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm z-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">VisionWeave</h1>
          <p className="text-sm text-gray-500">WebGPU Image Processing & Learning Platform</p>
        </div>

        {webgpuSupported === false && (
          <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full text-sm border border-amber-200">
            <AlertTriangle className="w-4 h-4 mr-2" />
            WebGPU Not Supported
          </div>
        )}
        {webgpuSupported === true && (
          <div className="flex items-center text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-sm border border-green-200">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
            WebGPU Ready
          </div>
        )}
      </header>

      <main className="flex-1 p-6 flex gap-6 overflow-hidden">
        {/* Left Column: Controls */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 pb-10 custom-scrollbar">
          <PresetKernelSelector
            onSelect={(preset) => {
              setActiveMode('convolution');
              setParams(p => ({
                ...p,
                kernel: preset.kernel,
                kernelSize: preset.size,
                normalize: preset.normalize ?? p.normalize
              }));
            }}
          />

          <div className={activeMode === 'convolution' ? 'ring-2 ring-blue-500 rounded-lg p-1 transition-all' : ''}>
            <KernelEditor
              kernel={params.kernel}
              size={params.kernelSize}
              onChange={(k) => {
                setActiveMode('convolution');
                setParams(p => ({ ...p, kernel: k }));
              }}
              onSizeChange={(s) => {
                setActiveMode('convolution');
                setParams(p => ({ ...p, kernelSize: s }));
              }}
            />

            <ConvolutionControls
              params={params}
              onChange={(p) => {
                setActiveMode('convolution');
                setParams(p);
              }}
            />
          </div>

          <div className={activeMode === 'nonlinear' ? 'ring-2 ring-blue-500 rounded-lg p-1 transition-all' : ''}>
            <NonLinearFilterSelector
              params={nonLinearParams}
              onChange={(p) => {
                setActiveMode('nonlinear');
                setNonLinearParams(p);
              }}
              onApply={handleNonLinearApply}
            />
          </div>

          <ModelSelector
            onApply={handleModelApply}
            isProcessing={isProcessing && activeMode === 'model'}
            active={activeMode === 'model'}
          />
        </div>

        {/* Middle Column: Original Image */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="mb-4">
            <ImageUploader onImageLoad={handleImageLoad} />
          </div>
          <div className="flex-1 min-h-0">
            <ImagePreview title="Original Image" image={originalImage} />
          </div>
        </div>

        {/* Right Column: Result & Info */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="mb-4 flex gap-3 h-[116px] items-end pb-1">
            <button
              onClick={handleApply}
              disabled={!originalImage || isProcessing || !webgpuSupported}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 px-4 rounded-lg shadow transition-colors font-medium text-lg"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              {activeMode === 'convolution' ? 'Apply Convolution' :
                activeMode === 'nonlinear' ? 'Apply Non-Linear Filter' : 'Run AI Model'}
            </button>
            <button
              onClick={handleDownload}
              disabled={!resultImage}
              className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg shadow transition-colors font-medium"
              title="Download Result"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
              {error}
            </div>
          )}

          {inferenceTime && (
            <div className="mb-4 flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 text-xs">
              <span className="font-medium">Execution Time:</span>
              <span className="font-mono">{inferenceTime.toFixed(2)} ms</span>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <ImagePreview title="Result Image" image={resultImage} />
          </div>

          <div className="mt-4">
            <ProcessInfoPanel 
              params={params} 
              nonLinearParams={nonLinearParams}
              mode={activeMode}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
