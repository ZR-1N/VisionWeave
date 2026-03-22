import { useState, useEffect, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { KernelEditor } from './components/KernelEditor';
import { ConvolutionControls } from './components/ConvolutionControls';
import { PresetKernelSelector } from './components/PresetKernelSelector';
import { ImagePreview } from './components/ImagePreview';
import { ProcessInfoPanel } from './components/ProcessInfoPanel';
import { ModelSelector } from './components/ModelSelector';
import { ImageTensor, ConvolutionParams } from './types/image';
import { imageToTensor } from './core/image/imageConvert';
import { WebGPUConvolution } from './core/filters/webgpuConvolution';
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

function App() {
  const [originalImage, setOriginalImage] = useState<ImageTensor | null>(null);
  const [resultImage, setResultImage] = useState<ImageTensor | null>(null);
  const [params, setParams] = useState<ConvolutionParams>(defaultParams);

  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterEngine] = useState(() => new WebGPUConvolution());

  useEffect(() => {
    filterEngine.init()
      .then(supported => setWebgpuSupported(supported))
      .catch(err => {
        setWebgpuSupported(false);
        console.error(err);
      });
  }, [filterEngine]);

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
      setError('WebGPU is not supported. Cannot run convolution.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const start = performance.now();
      const result = await filterEngine.applyConvolution(originalImage, params);
      const end = performance.now();
      console.log(`Convolution took ${end - start}ms`);
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
              setParams(p => ({
                ...p,
                kernel: preset.kernel,
                kernelSize: preset.size,
                normalize: preset.normalize ?? p.normalize
              }));
            }}
          />

          <KernelEditor
            kernel={params.kernel}
            size={params.kernelSize}
            onChange={(k) => setParams(p => ({ ...p, kernel: k }))}
            onSizeChange={(s) => setParams(p => ({ ...p, kernelSize: s }))}
          />

          <ConvolutionControls
            params={params}
            onChange={setParams}
          />

          <ModelSelector />
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
              Apply Convolution
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

          <div className="flex-1 min-h-0">
            <ImagePreview title="Result Image" image={resultImage} />
          </div>

          <div className="mt-4">
            <ProcessInfoPanel params={params} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
