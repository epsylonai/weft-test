// Original B-042 design reference: real frozen-scene sampling, not a line overlay.
precision highp float;
varying highp vec2 vUv;
uniform sampler2D uScene;         // Exact frozen board snapshot, display sRGB.
uniform sampler2D uShardNormal;   // Linear DATA: signed XY shard-plane tilt.
uniform sampler2D uFractureData;  // Linear DATA: R height; G edge; B microfractures.
uniform sampler2D uClawData;      // Linear DATA: R groove height; G edge.
uniform vec2 uResolution;        // CSS pixels, e.g. vec2(393.0, 852.0), not DPR.
uniform vec2 uImpact;            // vec2(0.5, 0.5), UV bottom-left origin.
uniform float uPropagation;     // 0..1 over 250 ms; centre to all four edges.
uniform float uAmount;          // 0..1 glass strength; fade also restores pixels.
uniform float uClawAmount;      // 0 for approved hatch-only; optional attack study.

vec3 toLinear(vec3 c) {
  return mix(c/12.92, pow((c+0.055)/1.055, vec3(2.4)), step(vec3(0.04045),c));
}
vec3 toSrgb(vec3 c) {
  c=max(c,vec3(0.0));
  return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(vec3(0.0031308),c));
}
vec2 clampUv(vec2 uv) { return clamp(uv,vec2(0.00001),vec2(0.99999)); }
void main() {
  vec2 px = 1.0/uResolution;
  vec3 originalSrgb = texture2D(uScene,vUv).rgb;
  if(uAmount<=0.0001) { gl_FragColor=vec4(originalSrgb,1.0);return; }
  vec3 original = toLinear(originalSrgb);
  vec3 d = texture2D(uFractureData,vUv).rgb;
  vec2 n = texture2D(uShardNormal,vUv).rg*2.0-1.0;
  n.y=-n.y; // maps use screen-Y down; UV-Y points up.
  float radius=length((vUv-uImpact)*uResolution)/length(uResolution*0.5);
  float reveal=(1.0-smoothstep(uPropagation-0.025,uPropagation+0.025,radius));
  reveal*=step(0.0001,uPropagation);
  float amount=reveal*clamp(uAmount,0.0,1.0);
  vec2 grad=vec2(
    texture2D(uFractureData,vUv+vec2(px.x,0.0)).r-texture2D(uFractureData,vUv-vec2(px.x,0.0)).r,
    texture2D(uFractureData,vUv+vec2(0.0,px.y)).r-texture2D(uFractureData,vUv-vec2(0.0,px.y)).r);
  vec2 clawGrad=vec2(0.0);float clawEdge=0.0;
  float clawAmount=uClawAmount*clamp(uAmount,0.0,1.0);
  if(clawAmount>0.001) {
    clawGrad=vec2(
      texture2D(uClawData,vUv+vec2(px.x,0.0)).r-texture2D(uClawData,vUv-vec2(px.x,0.0)).r,
      texture2D(uClawData,vUv+vec2(0.0,px.y)).r-texture2D(uClawData,vUv-vec2(0.0,px.y)).r);
    clawEdge=texture2D(uClawData,vUv).g*clawAmount;
  }
  // Shards shift the photographed/painted board itself. Thin ridges bend it locally.
  // Sharp shard interiors: whole CSS-pixel plane shifts preserve small indices.
  // Only the fractured ridges perform subpixel bending.
  vec2 planeOffset=floor(n*1.65+0.5);
  vec2 offset=(planeOffset+grad*2.2)*px*amount+clawGrad*4.5*px*clawAmount;
  vec2 dispersion=(grad+n*0.13)*px*0.34*d.g*amount;
  vec2 uv=clampUv(vUv+offset);
  vec3 transmitted=vec3(
    texture2D(uScene,clampUv(uv+dispersion)).r,
    texture2D(uScene,uv).g,
    texture2D(uScene,clampUv(uv-dispersion)).b);
  transmitted=toLinear(transmitted);
  float facing=clamp(dot(normalize(vec3(grad*2.0,0.7)),normalize(vec3(-0.45,0.70,0.55))),0.0,1.0);
  float glint=d.g*(0.045+0.180*facing)+d.b*0.022;
  vec3 glass=transmitted*(1.0-d.g*0.22)+vec3(0.79,0.92,0.87)*glint;
  // No global flash, coloured wash, backdrop blur, moving dust or camera shake.
  vec3 result=mix(original,glass,amount);
  result=result*(1.0-clawEdge*0.10)+vec3(0.90,0.84,0.65)*clawEdge*0.055;
  gl_FragColor=vec4(toSrgb(clamp(result,0.0,1.0)),1.0);
}
