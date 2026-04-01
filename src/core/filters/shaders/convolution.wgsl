struct Params {
  width: f32,
  height: f32,
  outWidth: f32,
  outHeight: f32,
  kernelSize: f32,
  stride: f32,
  padding: f32,
  bias: f32,
  normalize: f32,
  clip: f32,
  grayscale: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> kernel: array<f32>;
@group(0) @binding(2) var<storage, read> inputData: array<u32>;
@group(0) @binding(3) var<storage, read_write> outputData: array<u32>;

fn getPixel(x: i32, y: i32) -> vec4<f32> {
  let clampedX = u32(clamp(x, 0, i32(params.width) - 1));
  let clampedY = u32(clamp(y, 0, i32(params.height) - 1));
  let index = clampedY * u32(params.width) + clampedX;
  let pixel = inputData[index];
  let r = f32(pixel & 0xFFu);
  let g = f32((pixel >> 8u) & 0xFFu);
  let b = f32((pixel >> 16u) & 0xFFu);
  let a = f32((pixel >> 24u) & 0xFFu);
  return vec4<f32>(r, g, b, a);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let outX = i32(gid.x);
  let outY = i32(gid.y);
  if (outX >= i32(params.outWidth) || outY >= i32(params.outHeight)) { return; }

  let inXBase = i32(f32(outX) * params.stride) - i32(params.padding);
  let inYBase = i32(f32(outY) * params.stride) - i32(params.padding);
  
  var sumR = 0.0; var sumG = 0.0; var sumB = 0.0;
  var centerA = 255.0;
  
  let kSize = u32(params.kernelSize);
  let halfK = i32(kSize / 2u);
  
  for (var ky = 0u; ky < kSize; ky++) {
    for (var kx = 0u; kx < kSize; kx++) {
      let p = getPixel(inXBase + i32(kx), inYBase + i32(ky));
      let kValue = kernel[ky * kSize + kx];
      sumR += p.r * kValue; sumG += p.g * kValue; sumB += p.b * kValue;
      if (kx == u32(halfK) && ky == u32(halfK)) { centerA = p.a; }
    }
  }
  
  sumR += params.bias; sumG += params.bias; sumB += params.bias;
  
  if (params.grayscale > 0.5) {
    let gray = sumR * 0.299 + sumG * 0.587 + sumB * 0.114;
    sumR = gray; sumG = gray; sumB = gray;
  }
  
  var finalR = sumR; var finalG = sumG; var finalB = sumB;
  if (params.clip < 0.5) {
    finalR = abs(finalR); finalG = abs(finalG); finalB = abs(finalB);
  }
  
  let r = u32(clamp(finalR, 0.0, 255.0));
  let g = u32(clamp(finalG, 0.0, 255.0));
  let b = u32(clamp(finalB, 0.0, 255.0));
  var a = u32(clamp(centerA, 0.0, 255.0));
  if (a == 0u) { a = 255u; }
  
  outputData[u32(outY) * u32(params.outWidth) + u32(outX)] = r | (g << 8u) | (b << 16u) | (a << 24u);
}
