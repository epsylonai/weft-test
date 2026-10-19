// HUGO_IMPACT_CRACK_SEED_4_2 — full-strength owner reference, shared by ALL tiers.
// Derived from Claude/assets/B-042/hugo-crack-shader.html SHA256 fc4c2146d4e16b0654bdf5e4bee2ab5134ef367d4a20032dd25ef56d72aab5da.
// Widths and contact coordinates are CSS pixels, independent of backing-store DPR.
// Main line diameter tapers from4.0px at contact to2.9px; fork/ring field,
// crushed core, shard refraction and white/dark light-catching edges remain present.
precision highp float;
varying highp vec2 vUv;
uniform sampler2D uScene;
uniform vec2 uResolution;      // CSS pixels, not backing-store DPR
uniform vec2 uImpact;          // normalized UV, y up
uniform float uPropagation;    // 0..1 propagation
uniform float uAmount;    // 1 visible .. 0 gone
const float seed = 4.2;
#define SPOKES 17
#define RINGS 3
float h1(float n){ return fract(sin(n*127.1+seed*31.7)*43758.5453); }
float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7))+seed*17.3)*43758.5453); }
float noise(float x){ float i=floor(x), f=fract(x); return mix(h1(i),h1(i+1.),f*f*(3.-2.*f)); }
const float TAU = 6.2831853;
float spokeAng(int i){ float fi=float(i); return (fi + 0.15 + 0.7*h1(fi*3.1))/float(SPOKES)*TAU; }
// wobble so spokes are slightly jagged, not perfect rays
float wob(int i, float r){ float fi=float(i); return (noise(r*0.018+fi*7.3)-0.5)*0.10 + (noise(r*0.09+fi*2.1)-0.5)*0.025; }
float spokeLen(int i, float maxR){ return maxR*(0.45+0.55*h1(float(i)*9.7)); }
float ringR(int k, int cell){ float base = 24.*pow(2.15, float(k)); return base*(0.85+0.3*h1(float(k)*13.+float(cell)*1.7)); }
float distSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float t=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*t); }
void main(){
  vec4 base=texture2D(uScene,vUv);
  if(uAmount<=0.0001||uPropagation<=0.0001){gl_FragColor=vec4(base.rgb,1.0);return;}
  vec2 px = vec2(vUv.x*uResolution.x, (1.-vUv.y)*uResolution.y);
  vec2 impactPx=vec2(uImpact.x*uResolution.x,(1.0-uImpact.y)*uResolution.y);
  vec2 d = px - impactPx; float r = length(d);
  float ang = atan(d.y, d.x); if (ang<0.) ang += TAU;
  float maxR = max(length(uResolution)*0.62,length(max(uImpact,vec2(1.0)-uImpact)*uResolution));
  float front = maxR * (1. - pow(1.-clamp(uPropagation,0.,1.), 3.)); // ease-out propagation

  // --- find the spoke cell this pixel is in and nearest spoke distance
  float lineD = 1e5; float shadowD=1e5;vec2 shadowP=d-vec2(1.6,1.6);float shadowR=length(shadowP);float shadowAng=atan(shadowP.y,shadowP.x);if(shadowAng<0.0)shadowAng+=TAU;int cell = 0; float best = 1e5;
  for (int i=0;i<SPOKES;i++){
    float a = spokeAng(i) + wob(i, r);
    float da = abs(mod(ang - a + TAU*1.5, TAU) - TAU*0.5);
    float dpx = da * r;                  // arc distance in px
    float L = min(spokeLen(i,maxR), front);
    if (r < L) lineD = min(lineD, dpx);
    float shadowDa=abs(mod(shadowAng-a+TAU*1.5,TAU)-TAU*0.5);if(shadowR<L)shadowD=min(shadowD,shadowDa*shadowR);
    float signedAngle = mod(ang - spokeAng(i) + TAU, TAU);
    if (signedAngle < best){ best = signedAngle; cell = i; }
  }
  // --- branches: secondary cracks forking off the spokes
  for (int i=0;i<SPOKES;i++){
    for (int j=0;j<2;j++){
      float fj=float(j), fi=float(i);
      float L = spokeLen(i,maxR);
      float rb = L*(0.25+0.45*h1(fi*4.7+fj*9.1));
      float a = spokeAng(i) + wob(i, rb);
      vec2 P0 = vec2(cos(a),sin(a))*rb;
      float side = (h1(fi*2.3+fj*5.5) < 0.5) ? -1. : 1.;
      float ab = a + side*(0.22+0.38*h1(fi*8.1+fj*1.3));
      float lb = L*(0.18+0.25*h1(fi*6.6+fj*3.9));
      vec2 P1 = P0 + vec2(cos(ab),sin(ab))*lb;
      if (length(P1) < front || (length(P0) < front)) {
        float dd = distSeg(d, P0, P0 + (P1-P0)*clamp((front-length(P0))/max(lb,1.),0.,1.));
        lineD = min(lineD, dd + 0.35);
        shadowD=min(shadowD,distSeg(shadowP,P0,P0+(P1-P0)*clamp((front-length(P0))/max(lb,1.),0.,1.))+0.35);
      }
    }
  }
  // --- polygonal rings: straight chords between neighbouring spokes
  int ringIdx = 0;
  int nxt = cell+1; if (nxt>=SPOKES) nxt=0;
  float a0 = spokeAng(cell), a1 = spokeAng(nxt);
  for (int k=0;k<RINGS;k++){
    float R0 = ringR(k, cell), R1 = ringR(k, nxt);
    vec2 P0 = vec2(cos(a0),sin(a0))*R0, P1 = vec2(cos(a1),sin(a1))*R1;
    float present = step(h1(float(k)*5.+float(cell)*11.), 0.62 - 0.12*float(k));   // some chords missing
    float rk = max(R0,R1);
    if (rk < front && present > 0.5){lineD=min(lineD,distSeg(d,P0,P1));shadowD=min(shadowD,distSeg(shadowP,P0,P1));}
    // ring index = how many chords lie inside this pixel (rough shard id)
    vec2 n = normalize(vec2(-(P1-P0).y, (P1-P0).x));
    if (dot(d - P0, n) * dot(-P0, n) < 0.) ringIdx = k+1;
  }
  bool inside = r < front;
  // --- per-shard tilt -> refraction + lighting
  vec2 sid = vec2(float(cell), float(ringIdx));
  float tiltA = h2(sid)*TAU; float tiltM = (0.6+0.8*h2(sid+3.1)) * (inside ? 1. : 0.);
  float strength = 7.0 / (1.0 + float(ringIdx)*0.55);             // inner shards bend more
  vec2 off = vec2(cos(tiltA), sin(tiltA)) * tiltM * strength;      // px
  vec2 suv = (px + off) / uResolution; suv.y = 1. - suv.y;
  vec3 col = texture2D(uScene, suv).rgb;
  // chromatic split near edges
  float edgeNear = (1.0-smoothstep(0.0,18.0,lineD)) * (inside?1.:0.);
  col.r = mix(col.r, texture2D(uScene, suv + vec2(1.5,0.)/uResolution).r, edgeNear*0.6);
  col.b = mix(col.b, texture2D(uScene, suv - vec2(1.5,0.)/uResolution).b, edgeNear*0.6);
  // shard lighting from upper-left
  vec2 L = normalize(vec2(-0.6,-0.8));
  float lit = dot(vec2(cos(tiltA),sin(tiltA)), L) * tiltM;
  col *= 1.0 + 0.07*lit*(inside?1.:0.);
  // --- crack lines: bright core + dark offset shadow + glint
  float w = 1.45 + 0.55*(1.0-smoothstep(0.0,260.0,r));                     // thicker near impact
  float core = (1.0-smoothstep(0.0,w,lineD)) * mix(1., 0.5, smoothstep(160., 800., r));
  float halo = (1.0-smoothstep(w,w*4.5,lineD)) * 0.35;
  float shadow=(1.0-smoothstep(w*0.65,w+1.5,shadowD))*(inside?1.0:0.0);
  float glint = pow(max(0., sin(ang*3.0 + r*0.02 + seed)), 12.) ;
  col = mix(col,col*0.40,shadow*0.72);
  col = mix(col, col*0.55, halo*0.7);                                // darkened groove
  col += vec3(0.95,0.97,1.0) * core * (0.55 + 0.45*glint);
  // --- crushed core at impact: white powder + micro fractures
  float coreR = 16. + 6.*noise(ang*6.);
  float crushed = (1.0-smoothstep(coreR*0.55,coreR,r)) * step(0.001, uPropagation);
  float grit = h2(floor(px/2.));
  col = mix(col, vec3(0.92) - 0.25*grit, crushed*0.85);
  float micro = (1.0-smoothstep(0.0,0.6,abs(fract(r*0.22+noise(ang*20.)*2.)-0.5))) * (1.0-smoothstep(18.0,60.0,r)) * step(0.001, uPropagation);
  col += micro*0.25;
  // impact flash (first ~0.15 of propagation)
  float flash = (1.0-smoothstep(0.0,0.25,uPropagation)) * step(0.001, uPropagation) * (1.0-smoothstep(0.0,140.0,r));
  col += flash*0.6;
  // --- final mix with uAmount
  gl_FragColor = vec4(mix(base.rgb, col, uAmount), 1.);
}