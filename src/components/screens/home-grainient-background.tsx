"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

out vec4 fragColor;

#define S(a,b,t) smoothstep(a,b,t)

mat2 Rot(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(2127.1, 81.17)), dot(p, vec2(1269.5, 283.37)));
  return fract(sin(p) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(
      dot(-1.0 + 2.0 * hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
      dot(-1.0 + 2.0 * hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)),
      u.x
    ),
    mix(
      dot(-1.0 + 2.0 * hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
      dot(-1.0 + 2.0 * hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)),
      u.x
    ),
    u.y
  );
  return 0.5 + 0.5 * n;
}

void mainImage(out vec4 o, vec2 C) {
  float t = iTime * uTimeSpeed;
  vec2 uv = C / iResolution.xy;
  float ratio = iResolution.x / iResolution.y;
  vec2 tuv = uv - 0.5 + uCenterOffset;
  tuv /= max(uZoom, 0.001);

  float degree = noise(vec2(t * 0.1, tuv.x * tuv.y) * uNoiseScale);
  tuv.y *= 1.0 / ratio;
  tuv *= Rot(radians((degree - 0.5) * uRotationAmount + 180.0));
  tuv.y *= ratio;

  float frequency = uWarpFrequency;
  float ws = max(uWarpStrength, 0.001);
  float amplitude = uWarpAmplitude / ws;
  float warpTime = t * uWarpSpeed;
  tuv.x += sin(tuv.y * frequency + warpTime) / amplitude;
  tuv.y += sin(tuv.x * (frequency * 1.5) + warpTime) / (amplitude * 0.5);

  float balance = uColorBalance;
  float softness = max(uBlendSoftness, 0.001);
  mat2 blendRot = Rot(radians(uBlendAngle));
  float blendX = (tuv * blendRot).x;
  float edge0 = -0.3 - balance - softness;
  float edge1 = 0.2 - balance + softness;

  vec3 layer1 = mix(uColor3, uColor2, S(edge0, edge1, blendX));
  vec3 layer2 = mix(uColor2, uColor1, S(edge0, edge1, blendX));
  float verticalMix = 1.0 - S(-0.3 - balance - softness, 0.5 - balance + softness, tuv.y);
  vec3 col = mix(layer1, layer2, verticalMix);

  float cloud = noise((uv + vec2(t * 0.018, -t * 0.012)) * 3.1);
  float haze = 0.08 + 0.05 * cloud;
  col = mix(col, vec3(1.0), haze);

  vec2 grainUv = uv * max(uGrainScale, 0.001);
  if (uGrainAnimated > 0.5) {
    grainUv += vec2(iTime * 0.035);
  }
  float grain = fract(sin(dot(grainUv, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * uGrainAmount;

  col = (col - 0.5) * uContrast + 0.5;
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uSaturation);
  col = pow(max(col, 0.0), vec3(1.0 / max(uGamma, 0.001)));
  col = clamp(col, 0.0, 1.0);

  o = vec4(col, 1.0);
}

void main() {
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);
  fragColor = o;
}
`;

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1] as const;
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ] as const;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Shader creation failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || "Shader compilation failed");
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const program = gl.createProgram();
  if (!program) throw new Error("Program creation failed");
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(message || "Program link failed");
  }
  return program;
}

export function HomeGrainientBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const canvas = document.createElement("canvas");
    canvas.className = "absolute inset-0 h-full w-full";
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });

    if (!gl) return undefined;

    let program: WebGLProgram;
    try {
      program = createProgram(gl);
    } catch {
      return undefined;
    }

    container.appendChild(canvas);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniforms = {
      iResolution: gl.getUniformLocation(program, "iResolution"),
      iTime: gl.getUniformLocation(program, "iTime"),
      uTimeSpeed: gl.getUniformLocation(program, "uTimeSpeed"),
      uColorBalance: gl.getUniformLocation(program, "uColorBalance"),
      uWarpStrength: gl.getUniformLocation(program, "uWarpStrength"),
      uWarpFrequency: gl.getUniformLocation(program, "uWarpFrequency"),
      uWarpSpeed: gl.getUniformLocation(program, "uWarpSpeed"),
      uWarpAmplitude: gl.getUniformLocation(program, "uWarpAmplitude"),
      uBlendAngle: gl.getUniformLocation(program, "uBlendAngle"),
      uBlendSoftness: gl.getUniformLocation(program, "uBlendSoftness"),
      uRotationAmount: gl.getUniformLocation(program, "uRotationAmount"),
      uNoiseScale: gl.getUniformLocation(program, "uNoiseScale"),
      uGrainAmount: gl.getUniformLocation(program, "uGrainAmount"),
      uGrainScale: gl.getUniformLocation(program, "uGrainScale"),
      uGrainAnimated: gl.getUniformLocation(program, "uGrainAnimated"),
      uContrast: gl.getUniformLocation(program, "uContrast"),
      uGamma: gl.getUniformLocation(program, "uGamma"),
      uSaturation: gl.getUniformLocation(program, "uSaturation"),
      uCenterOffset: gl.getUniformLocation(program, "uCenterOffset"),
      uZoom: gl.getUniformLocation(program, "uZoom"),
      uColor1: gl.getUniformLocation(program, "uColor1"),
      uColor2: gl.getUniformLocation(program, "uColor2"),
      uColor3: gl.getUniformLocation(program, "uColor3"),
    };

    const color1 = hexToRgb("#93c2ff");
    const color2 = hexToRgb("#F9D871");
    const color3 = hexToRgb("#F9F9F9");

    gl.uniform1f(uniforms.uTimeSpeed, 0.16);
    gl.uniform1f(uniforms.uColorBalance, -0.03);
    gl.uniform1f(uniforms.uWarpStrength, 1.08);
    gl.uniform1f(uniforms.uWarpFrequency, 4.2);
    gl.uniform1f(uniforms.uWarpSpeed, 0.42);
    gl.uniform1f(uniforms.uWarpAmplitude, 58);
    gl.uniform1f(uniforms.uBlendAngle, -20);
    gl.uniform1f(uniforms.uBlendSoftness, 0.22);
    gl.uniform1f(uniforms.uRotationAmount, 96);
    gl.uniform1f(uniforms.uNoiseScale, 1.85);
    gl.uniform1f(uniforms.uGrainAmount, 0.014);
    gl.uniform1f(uniforms.uGrainScale, 1.25);
    gl.uniform1f(uniforms.uGrainAnimated, 1);
    gl.uniform1f(uniforms.uContrast, 1.12);
    gl.uniform1f(uniforms.uGamma, 1);
    gl.uniform1f(uniforms.uSaturation, 1.22);
    gl.uniform2f(uniforms.uCenterOffset, 0.02, -0.04);
    gl.uniform1f(uniforms.uZoom, 1.05);
    gl.uniform3f(uniforms.uColor1, color1[0], color1[1], color1[2]);
    gl.uniform3f(uniforms.uColor2, color2[0], color2[1], color2[2]);
    gl.uniform3f(uniforms.uColor3, color3[0], color3[1], color3[2]);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniforms.iResolution, width, height);
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    const start = performance.now();

    const render = (time: number) => {
      resize();
      gl.uniform1f(uniforms.iTime, (time - start) * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const stopLoop = () => {
      if (!raf) return;
      window.cancelAnimationFrame(raf);
      raf = 0;
    };

    const loop = (time: number) => {
      render(time);
      raf = window.requestAnimationFrame(loop);
    };

    const startLoop = () => {
      if (reducedMotion) {
        render(performance.now());
        return;
      }
      if (!raf && visible && pageVisible) {
        raf = window.requestAnimationFrame(loop);
      }
    };

    const handleVisibilityChange = () => {
      pageVisible = !document.hidden;
      if (pageVisible) startLoop();
      else stopLoop();
    };

    const resizeObserver = new ResizeObserver(() => render(performance.now()));
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startLoop();
      else stopLoop();
    });
    intersectionObserver.observe(container);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startLoop();

    return () => {
      stopLoop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      canvas.remove();
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[linear-gradient(180deg,#FBFDFF_0%,#F6FBFF_45%,#FFFDF6_100%)]"
    />
  );
}
