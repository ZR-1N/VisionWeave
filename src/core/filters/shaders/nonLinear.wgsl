struct Params {
  width: f32,
  height: f32,
  outWidth: f32,
  outHeight: f32,
  filterType: f32,
  radius: f32,
  sigmaS: f32,
  sigmaR: f32,
  constant: f32,
  amount: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> inputData: array<u32>;
@group(0) @binding(2) var<storage, read_write> outputData: array<u32>;

fn getPixel(x: i32, y: i32) -> vec4<f32> {
  let clampedX = u32(clamp(x, 0, i32(params.width) - 1));
  let clampedY = u32(clamp(y, 0, i32(params.height) - 1));
  let index = clampedY * u32(params.width) + clampedX;
  let pixel = inputData[index];
  
  // Extract bytes from u32 (0xAABBGGRR)
  let r = f32(pixel & 0xFFu);
  let g = f32((pixel >> 8u) & 0xFFu);
  let b = f32((pixel >> 16u) & 0xFFu);
  let a = f32((pixel >> 24u) & 0xFFu);
  
  return vec4<f32>(r, g, b, a);
}

fn packPixel(color: vec4<f32>) -> u32 {
  let r = u32(clamp(color.r, 0.0, 255.0));
  let g = u32(clamp(color.g, 0.0, 255.0));
  let b = u32(clamp(color.b, 0.0, 255.0));
  let a = 255u; // Force 100% opacity
  return r | (g << 8u) | (b << 16u) | (a << 24u);
}

fn median3x3(x: i32, y: i32) -> vec4<f32> {
  var valsR: array<f32, 9>;
  var valsG: array<f32, 9>;
  var valsB: array<f32, 9>;

  var count = 0u;
  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      let p = getPixel(x + i, y + j);
      valsR[count] = p.r;
      valsG[count] = p.g;
      valsB[count] = p.b;
      count++;
    }
  }

  for (var i = 0u; i < 8u; i++) {
    for (var j = 0u; j < 8u - i; j++) {
      if (valsR[j] > valsR[j+1u]) { let temp = valsR[j]; valsR[j] = valsR[j+1u]; valsR[j+1u] = temp; }
      if (valsG[j] > valsG[j+1u]) { let temp = valsG[j]; valsG[j] = valsG[j+1u]; valsG[j+1u] = temp; }
      if (valsB[j] > valsB[j+1u]) { let temp = valsB[j]; valsB[j] = valsB[j+1u]; valsB[j+1u] = temp; }
    }
  }
  return vec4<f32>(valsR[4], valsG[4], valsB[4], 255.0);
}

fn bilateral(x: i32, y: i32) -> vec4<f32> {
  let centerP = getPixel(x, y);
  var sumColor = vec3<f32>(0.0);
  var sumWeight = 0.0;
  let r = i32(params.radius);
  let s2 = 2.0 * params.sigmaS * params.sigmaS;
  let r2 = 2.0 * params.sigmaR * params.sigmaR;

  for (var j = -r; j <= r; j++) {
    for (var i = -r; i <= r; i++) {
      let p = getPixel(x + i, y + j);
      let ds = f32(i*i + j*j);
      let dc = dot(p.rgb - centerP.rgb, p.rgb - centerP.rgb);
      let w = exp(-(ds / s2)) * exp(-(dc / r2));
      sumColor += p.rgb * w;
      sumWeight += w;
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
      if (isDilation) { res = max(res, p.rgb); } else { res = min(res, p.rgb); }
    }
  }
  return vec4<f32>(res, 255.0);
}

fn adaptiveThreshold(x: i32, y: i32) -> vec4<f32> {
  let centerP = getPixel(x, y);
  var sum = 0.0;
  let r = i32(params.radius);
  for (var j = -r; j <= r; j++) {
    for (var i = -r; i <= r; i++) {
      let p = getPixel(x + i, y + j);
      sum += p.r * 0.299 + p.g * 0.587 + p.b * 0.114;
    }
  }
  let mean = sum / f32((2 * r + 1) * (2 * r + 1));
  let cur = centerP.r * 0.299 + centerP.g * 0.587 + centerP.b * 0.114;
  let val = select(0.0, 255.0, cur > (mean - params.constant));
  return vec4<f32>(val, val, val, 255.0);
}

fn detailEnhance(x: i32, y: i32) -> vec4<f32> {
  let centerP = getPixel(x, y);
  var sum = vec3<f32>(0.0);
  let r = i32(params.radius);
  for (var j = -r; j <= r; j++) {
    for (var i = -r; i <= r; i++) {
      sum += getPixel(x + i, y + j).rgb;
    }
  }
  let mean = sum / f32((2 * r + 1) * (2 * r + 1));
  return vec4<f32>(centerP.rgb + (centerP.rgb - mean) * params.amount, 255.0);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = i32(gid.x); let y = i32(gid.y);
  if (x >= i32(params.outWidth) || y >= i32(params.outHeight)) { return; }
  var res: vec4<f32>;
  let t = u32(params.filterType);
  if (t == 0u) { res = median3x3(x, y); }
  else if (t == 1u) { res = bilateral(x, y); }
  else if (t == 2u) { res = morphological(x, y, true); }
  else if (t == 3u) { res = morphological(x, y, false); }
  else if (t == 4u) { res = adaptiveThreshold(x, y); }
  else if (t == 5u) { res = detailEnhance(x, y); }
  else { res = getPixel(x, y); }
  outputData[u32(y) * u32(params.outWidth) + u32(x)] = packPixel(res);
}
