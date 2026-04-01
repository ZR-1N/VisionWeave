struct Params {
  width: u32,
  height: u32,
  outWidth: u32,
  outHeight: u32,
  @align(16) kernelSize: u32,
  stride: u32,
  padding: u32,
  bias: f32,
  @align(16) normalize: u32,
  clip: u32,
  grayscale: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> kernel: array<f32>;
@group(0) @binding(2) var<storage, read> inputData: array<u32>; // RGBA packed in u32 or byte array. Wait, Uint8Array is 4 bytes. We can read as array<u32> to get 4 bytes at a time (1 pixel).
// Actually, JS side passes Uint8ClampedArray. It's 4 bytes per pixel.
// array<u32> where each u32 is a pixel: 0xAABBGGRR in little endian.
@group(0) @binding(3) var<storage, read_write> outputData: array<u32>;

fn getPixel(x: i32, y: i32) -> vec4<f32> {
  if (x < 0 || x >= i32(params.width) || y < 0 || y >= i32(params.height)) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }
  let index = u32(y) * params.width + u32(x);
  let pixel = inputData[index];
  
  let r = f32(pixel & 0xFFu);
  let g = f32((pixel >> 8u) & 0xFFu);
  let b = f32((pixel >> 16u) & 0xFFu);
  let a = f32((pixel >> 24u) & 0xFFu);
  
  return vec4<f32>(r, g, b, a);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let outX = global_id.x;
  let outY = global_id.y;
  
  if (outX >= params.outWidth || outY >= params.outHeight) {
    return;
  }

  let inXBase = i32(outX * params.stride) - i32(params.padding);
  let inYBase = i32(outY * params.stride) - i32(params.padding);
  
  var sumR = 0.0;
  var sumG = 0.0;
  var sumB = 0.0;
  var centerA = 255.0; // Preserve alpha of the center pixel or just keep it 255
  
  let halfK = i32(params.kernelSize) / 2;
  
  for (var ky = 0u; ky < params.kernelSize; ky++) {
    for (var kx = 0u; kx < params.kernelSize; kx++) {
      let inX = inXBase + i32(kx);
      let inY = inYBase + i32(ky);
      
      let kIndex = ky * params.kernelSize + kx;
      let kValue = kernel[kIndex];
      
      let p = getPixel(inX, inY);
      
      sumR += p.r * kValue;
      sumG += p.g * kValue;
      sumB += p.b * kValue;
      
      if (kx == u32(halfK) && ky == u32(halfK)) {
        centerA = p.a; // Use original alpha
      }
    }
  }
  
  sumR += params.bias;
  sumG += params.bias;
  sumB += params.bias;
  
  if (params.grayscale == 1u) {
    let gray = sumR * 0.299 + sumG * 0.587 + sumB * 0.114;
    sumR = gray;
    sumG = gray;
    sumB = gray;
  }
  
  if (params.clip == 1u) {
    sumR = clamp(sumR, 0.0, 255.0);
    sumG = clamp(sumG, 0.0, 255.0);
    sumB = clamp(sumB, 0.0, 255.0);
  } else {
    sumR = abs(sumR);
    sumG = abs(sumG);
    sumB = abs(sumB);
    sumR = clamp(sumR, 0.0, 255.0);
    sumG = clamp(sumG, 0.0, 255.0);
    sumB = clamp(sumB, 0.0, 255.0);
  }
  
  let outIndex = outY * params.outWidth + outX;
  
  let finalR = u32(clamp(sumR, 0.0, 255.0));
  let finalG = u32(clamp(sumG, 0.0, 255.0));
  let finalB = u32(clamp(sumB, 0.0, 255.0));
  var finalA = u32(clamp(centerA, 0.0, 255.0));
  if (finalA == 0u) { finalA = 255u; }
  
  outputData[outIndex] = finalR | (finalG << 8u) | (finalB << 16u) | (finalA << 24u);
}
