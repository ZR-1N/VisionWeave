import { useState, useEffect, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { KernelEditor } from './components/KernelEditor';
import { ConvolutionControls } from './components/ConvolutionControls';
import { PresetKernelSelector } from './components/PresetKernelSelector';
import { NonLinearFilterSelector } from './components/NonLinearFilterSelector';
import { ImagePreview } from './components/ImagePreview';
import { ImageCompareSlider } from './components/ImageCompareSlider';
import { ProcessInfoPanel } from './components/ProcessInfoPanel';
import { ModelSelector } from './components/ModelSelector';
import { OCRResultOverlay } from './components/OCRResultOverlay';
import { ImageTensor, ConvolutionParams, NonLinearFilterParams, OCRResult } from './types/image';
import { imageToTensor } from './core/image/imageConvert';
import { WebGPUConvolution } from './core/filters/webgpuConvolution';
import { WebGPUNonLinearFilter } from './core/filters/webgpuNonLinear';
import { ModelEngine } from './core/models/modelEngine';
import { OCREngine } from './core/models/ocrEngine';
import { GPUManager } from './core/runtime/gpuSupport';
import { downloadImageTensor } from './core/image/downloadHelper';
import { Play, Download, AlertTriangle, Columns, LayoutGrid } from 'lucide-react';
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
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);
  const [params, setParams] = useState<ConvolutionParams>(defaultParams);
  const [nonLinearParams, setNonLinearParams] = useState<NonLinearFilterParams>(defaultNonLinearParams);
  const [activeMode, setActiveMode] = useState<'convolution' | 'nonlinear' | 'model'>('convolution');

  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid');
  const [processingProgress, setProcessingProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inferenceTime, setInferenceTime] = useState<number | null>(null);

  const [filterEngine] = useState(() => new WebGPUConvolution());
  const [nonLinearEngine] = useState(() => new WebGPUNonLinearFilter());
  const [modelEngine] = useState(() => new ModelEngine());
  const [ocrEngine] = useState(() => new OCREngine());

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

      const [mSupp, oSupp] = await Promise.all([
        modelEngine.init(),
        ocrEngine.init()
      ]);
      setModelReady(mSupp && oSupp);
    };

    initGPU().catch(err => {
      setWebgpuSupported(false);
      console.error(err);
    });
  }, [filterEngine, nonLinearEngine, modelEngine, ocrEngine]);

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    try {
      const tensor = imageToTensor(img);
      setOriginalImage(tensor);
      setResultImage(null);
      setOcrResults([]);
      setInferenceTime(null);
      setProcessingProgress(null);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError('Failed to load image: ' + message);
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
    setProcessingProgress(null);
    setOcrResults([]);

    try {
      const start = performance.now();
      let result: ImageTensor;

      if (activeMode === 'convolution') {
        result = await filterEngine.applyConvolution(originalImage, params);
      } else if (activeMode === 'nonlinear') {
        result = await nonLinearEngine.applyFilter(originalImage, nonLinearParams);
      } else {
        const res = await modelEngine.run(originalImage, (p) => setProcessingProgress(p));
        result = res.output;
        setInferenceTime(res.inferenceTime);
      }

      const end = performance.now();
      if (activeMode !== 'model') setInferenceTime(end - start);

      console.log(`${activeMode} took ${end - start}ms`);
      setResultImage(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError('Processing failed: ' + message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModelApply = async (modelType: string) => {
    setActiveMode('model');
    if (!originalImage) return;
    if (!modelReady) {
      setError('Models not ready');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessingProgress(null);
    setOcrResults([]);

    try {
      const startTime = performance.now();
      if (modelType === 'ocr') {
        const results = await ocrEngine.runOCR(originalImage, (p) => setProcessingProgress(p));
        setOcrResults(results);
        setInferenceTime(performance.now() - startTime);
      } else {
        const res = await modelEngine.run(originalImage, (p) => setProcessingProgress(p));
        setResultImage(res.output);
        setInferenceTime(res.inferenceTime);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError('Model inference failed: ' + message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRedact = (box: [number, number, number, number]) => {
    if (!originalImage) return;

    // Perform redaction on the current active image (resultImage or originalImage)
    const targetImage = resultImage || originalImage;
    const newData = new Uint8ClampedArray(targetImage.data);
    const [x1, y1, x2, y2] = box;

    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const idx = (y * targetImage.width + x) * 4;
        // Fill with black or white (simple privacy erase)
        newData[idx] = 0;
        newData[idx + 1] = 0;
        newData[idx + 2] = 0;
        newData[idx + 3] = 255;
      }
    }

    setResultImage({ ...targetImage, data: newData });
  };

  const handleUpdateOCRText = (index: number, newText: string) => {
    setOcrResults(prev => {
      const next = [...prev];
      next[index] = { ...next[index], text: newText };
      return next;
    });
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError('Processing failed: ' + message);
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

      <main className="flex-1 p-6 flex gap-6 overflow-hidden bg-gray-50/50">
        {/* Left Column: Controls */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 pb-10 custom-scrollbar shrink-0">
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

          <div className={activeMode === 'convolution' ? 'ring-2 ring-blue-500 rounded-xl p-1 transition-all bg-white shadow-sm' : ''}>
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

          <div className={activeMode === 'nonlinear' ? 'ring-2 ring-blue-500 rounded-xl p-1 transition-all bg-white shadow-sm' : ''}>
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

        {/* Right Area: Previews and Info */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Action Bar */}
          <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Grid View"
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`p-2 rounded-md transition-all ${viewMode === 'split' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Split View"
              >
                <Columns size={20} />
              </button>
            </div>

            <button
              onClick={handleApply}
              disabled={!originalImage || isProcessing || !webgpuSupported}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 px-6 rounded-lg shadow-md transition-all font-semibold text-lg"
            >
              {isProcessing ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-6 h-6" />
              )}
              {activeMode === 'convolution' ? 'Apply Convolution' :
                activeMode === 'nonlinear' ? 'Apply Non-Linear Filter' : 'Run AI Model'}
            </button>
            <button
              onClick={handleDownload}
              disabled={!resultImage}
              className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-100 disabled:text-gray-400 text-white py-3 px-6 rounded-lg shadow-md transition-all font-semibold"
              title="Download Result"
            >
              <Download className="w-6 h-6" />
              Download
            </button>
          </div>

          {/* Status and Messages */}
          {(error || inferenceTime || processingProgress) && (
            <div className="flex flex-col gap-2">
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm flex items-center gap-2">
                  <AlertTriangle size={18} />
                  {error}
                </div>
              )}
              {processingProgress !== null && processingProgress < 1 && (
                <div className="px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <div className="flex justify-between items-center mb-1 text-xs text-indigo-700 font-bold uppercase tracking-wider">
                    <span>Tiled Processing</span>
                    <span>{Math.round(processingProgress * 100)}%</span>
                  </div>
                  <div className="w-full bg-indigo-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                      style={{ width: `${processingProgress * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {inferenceTime && (
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Performance:</span>
                    <span className="px-2 py-0.5 bg-blue-100 rounded-md font-mono font-bold">{inferenceTime.toFixed(2)} ms</span>
                  </div>
                  <span className="text-xs text-blue-500 opacity-80 uppercase tracking-wider font-bold">Inference Speed</span>
                </div>
              )}
            </div>
          )}

          {/* Image Area */}
          <div className="flex-1 min-h-0">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-6 h-full">
                <div className="flex flex-col gap-4 min-h-0">
                  <div className="shrink-0">
                    <ImageUploader onImageLoad={handleImageLoad} />
                  </div>
                  <div className="flex-1 min-h-0">
                    <ImagePreview title="Input Source" image={originalImage} />
                  </div>
                </div>
                <div className="flex flex-col gap-4 min-h-0">
                  <div className="flex-1 min-h-0">
                    <ImagePreview
                      title="Processed Output"
                      image={resultImage || (activeMode === 'model' ? originalImage : null)}
                      overlay={ocrResults.length > 0 && originalImage && (
                        <OCRResultOverlay
                          results={ocrResults}
                          imageWidth={originalImage.width}
                          imageHeight={originalImage.height}
                          onRedact={handleRedact}
                          onUpdateText={handleUpdateOCRText}
                        />
                      )}
                    />
                  </div>
                  <div className="shrink-0">
                    <ProcessInfoPanel
                      params={params}
                      nonLinearParams={nonLinearParams}
                      mode={activeMode}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6 h-full">
                {originalImage && resultImage ? (
                  <div className="flex-1 min-h-0">
                    <ImageCompareSlider original={originalImage} processed={resultImage} />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-400 gap-4">
                    <div className="text-center">
                      <p className="font-medium text-gray-600">Split-View requires both input and output</p>
                      <p className="text-sm">Upload an image and apply a filter to enable this view.</p>
                    </div>
                    {!originalImage && (
                      <div className="w-64">
                        <ImageUploader onImageLoad={handleImageLoad} />
                      </div>
                    )}
                  </div>
                )}
                <div className="shrink-0">
                  <ProcessInfoPanel
                    params={params}
                    nonLinearParams={nonLinearParams}
                    mode={activeMode}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
