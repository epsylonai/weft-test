// LOW still refracts the actual frozen board. Three texture reads, one pass.
precision mediump float;
varying highp vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uShardNormal;
uniform sampler2D uFractureData;
uniform vec2 uResolution;
uniform vec2 uImpact;
uniform float uPropagation;
uniform float uAmount;
void main() {
  if(uAmount<=0.0001) { gl_FragColor=vec4(texture2D(uScene,vUv).rgb,1.0);return; }
  vec3 d=texture2D(uFractureData,vUv).rgb;
  vec2 n=texture2D(uShardNormal,vUv).rg*2.0-1.0;n.y=-n.y;
  float radius=length((vUv-uImpact)*uResolution)/length(uResolution*0.5);
  float reveal=(1.0-smoothstep(uPropagation-0.035,uPropagation+0.035,radius))*step(0.0001,uPropagation);
  float amount=clamp(uAmount,0.0,1.0)*reveal;
  vec2 planeOffset=floor(n*1.65+0.5);
  vec2 uv=clamp(vUv+planeOffset/uResolution*amount,vec2(0.00001),vec2(0.99999));
  vec3 c=texture2D(uScene,uv).rgb;
  c=c*(1.0-d.g*0.14*amount)+vec3(0.74,0.86,0.79)*d.g*0.180*amount;
  gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);
}
