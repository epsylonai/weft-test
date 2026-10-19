// Original B-042 design reference. A full-screen quad; no game integration.
attribute vec2 aPosition;
varying highp vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
