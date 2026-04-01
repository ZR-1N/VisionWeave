struct Params {
  width: u32,
  height: u32,
  outWidth: u32,
  outHeight: u32,
  type: u32, // 0: median, 1: bilateral, 2: dilation, 3: erosion, 4: adaptive_threshold, 5: detail_enhance
  radius: u32,
  sigmaS: f32,
  sigmaR: f32,
  constant: f32,
  amount: f32,
  _padding1: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> inputData: array<u32>;
@group(0) @binding(2) var<storage, read_write> outputData: array<u32>;

fn getPixel(x: i32, y: i32) -> vec4<f32> {
  let clampedX = clamp(x, 0, i32(params.width) - 1);
  let clampedY = clamp(y, 0, i32(params.height) - 1);
  let index = u32(clampedY) * params.width + u32(clampedX);
  let pixel = inputData[index];
  
  return vec4<f32>(
    f32(pixel & 0xFFu),
    f32((pixel >> 8u) & 0xFFu),
    f32((pixel >> 16u) & 0xFFu),
    f32((pixel >> 24u) & 0xFFu)
  );
}

fn packPixel(color: vec4<f32>) -> u32 {
  let r = u32(clamp(color.r, 0.0, 255.0));
  let g = u32(clamp(color.g, 0.0, 255.0));
  let b = u32(clamp(color.b, 0.0, 255.0));
  // Force alpha to 255 if it's 0 or invalid, but typically use original alpha or 255
  let a = u32(clamp(color.a, 0.0, 255.0));
  let finalA = select(a, 255u, a == 0u); 
  return r | (g << 8u) | (b << 16u) | (finalA << 24u);
}

// Simple bubble sort for median filter (unrolled for 3x3 window)
fn median3x3(x: i32, y: i32) -> vec4<f32> {
  var valsR: array<f32, 9>;
  var valsG: array<f32, 9>;
  var valsB: array<f32, 9>;
  var alpha: f32 = 255.0;

  var count = 0u;
  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      let p = getPixel(x + i, y + j);
      valsR[count] = p.r;
      valsG[count] = p.g;
      valsB[count] = p.b;
      if (i == 0 && j == 0) { alpha = p.a; }
      count++;
    }
  }

  // Sort R, G, B channels independently
  for (var i = 0u; i < 8u; i++) {
    for (var j = 0u; j < 8u - i; j++) {
      if (valsR[j] > valsR[j+1u]) {
        let temp = valsR[j]; valsR[j] = valsR[j+1u]; valsR[j+1u] = temp;
      }
      if (valsG[j] > valsG[j+1u]) {
        let temp = valsG[j]; valsG[j] = valsG[j+1u]; valsG[j+1u] = temp;
      }
      if (valsB[j] > valsB[j+1u]) {
        let temp = valsB[j]; valsB[j] = valsB[j+1u]; valsB[j+1u] = temp;
      }
    }
  }

  return vec4<f32>(valsR[4], valsG[4], valsB[4], alpha);
}

fn bilateral(x: i32, y: i32) -> vec4<f32> {
  let centerP = getPixel(x, y);
  var sumColor = vec3<f32>(0.0);
  var sumWeight = 0.0;
  
  let r = i32(params.radius);
  let sigmaS2 = 2.0 * params.sigmaS * params.sigmaS;
  let sigmaR2 = 2.0 * params.sigmaR * params.sigmaR;

  for (var j = -r; j <= r; j++) {
    for (var i = -r; i <= r; i++) {
      let p = getPixel(x + i, y + j);
      
      let spatialDist2 = f32(i*i + j*j);
      let colorDist2 = dot(p.rgb - centerP.rgb, p.rgb - centerP.rgb);
      
      let weight = exp(-(spatialDist2 / sigmaS2)) * exp(-(colorDist2 / sigmaR2));
      
      sumColor += p.rgb * weight;
      sumWeight += weight;
    }
  }
  
  return vec4<f32>(sumColor / max(sumWeight, 0.0001), 255.0);
}

fn morphological(x: i32, y: i32, isDilation: bool) -> vec4<f32> {
  let centerP = getPixel(x, y);
  var res = centerP.rgb;
  let r = i32(params.radius);

  for (var j = -r; j <= r; j++) {
    for (var i = -r; i <= r; i++) {
      let p = getPixel(x + i, y + j);
      if (isDilation) {
        res = max(res, p.rgb);
      } else {
        res = min(res, p.rgb);
      }
    }
  }
  return vec4<f32>(res, centerP.a);
}

fn adaptiveThreshold(x: i32, y: i32) -> vec4<f32> {
  let centerP = getPixel(x, y);
  var sum = 0.0;
  let r = i32(params.radius);
  let count = f32((2 * r + 1) * (2 * r + 1));

  for (var j = -r; j <= r; j++) {
    for (var i = -r; i <= r; i++) {
      let p = getPixel(x + i, y + j);
      // Grayscale intensity
      sum += p.r * 0.299 + p.g * 0.587 + p.b * 0.114;
    }
  }
  
  let mean = sum / count;
  let currentIntensity = centerP.r * 0.299 + centerP.g * 0.587 + centerP.b * 0.114;
  
  let val = select(0.0, 255.0, currentIntensity > (mean - params.constant));
  return vec4<f32>(val, val, val, 255.0);
}

fn detailEnhance(x: i32, y: i32) -> vec4<f32> {
  let centerP = getPixel(x, y);
  var sum = vec3<f32>(0.0);
  let r = i32(params.radius);
  let count = f32((2 * r + 1) * (2 * r + 1));

  for (var j = -r; j <= r; j++) {
    for (var i = -r; i <= r; i++) {
      let p = getPixel(x + i, y + j);
      sum += p.rgb;
    }
  }
  
  let mean = sum / count;
  let enhanced = centerP.rgb + (centerP.rgb - mean) * params.amount;
  return vec4<f32>(enhanced, 255.0);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let outX = i32(global_id.x);
  let outY = i32(global_id.y);
  
  if (outX >= i32(params.outWidth) || outY >= i32(params.outHeight)) {
    return;
  }

  var result: vec4<f32>;
  
  switch (params.type) {
    case 0u: { result = median3x3(outX, outY); }
    case 1u: { result = bilateral(outX, outY); }
    case 2u: { result = morphological(outX, outY, true); }
    case 3u: { result = morphological(outX, outY, false); }
    case 4u: { result = adaptiveThreshold(outX, outY); }
    case 5u: { result = detailEnhance(outX, outY); }
    default: { result = getPixel(outX, outY); }
  }
  
  let outIndex = u32(outY) * params.outWidth + u32(outX);
  outputData[outIndex] = packPixel(result);
}
