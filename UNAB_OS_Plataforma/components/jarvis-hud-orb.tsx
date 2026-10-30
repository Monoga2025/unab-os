"use client";

import React, { useEffect, useRef, useState } from "react";

export type JarvisOrbMode = "alpha" | "screen" | "multiply" | "lighten";

export interface JarvisHudOrbProps {
  size?: number;
  className?: string;
  videoSrc?: string;
  fallbackPoster?: string;
  mode?: JarvisOrbMode;
}

const VS_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const FS_SOURCE_ALPHA = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;
  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    
    // Radial circular feathering to remove any macroblock edge seams:
    float dist = distance(v_texCoord, vec2(0.5, 0.5));
    float radialMask = 1.0 - smoothstep(0.35, 0.47, dist);
    
    // Clean luma threshold: completely removes dark gray fringe & black background
    float alpha = smoothstep(0.14, 0.35, luma) * radialMask;
    
    if (alpha <= 0.001) {
      discard;
    }
    
    // Warm gold color boosting to eliminate any gray fringe on white surfaces:
    vec3 cleanGold = max(color.rgb * 1.25, vec3(0.96, 0.72, 0.20) * luma);
    
    gl_FragColor = vec4(cleanGold, alpha);
  }
`;

const FS_SOURCE_DIRECT = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;
  void main() {
    gl_FragColor = texture2D(u_image, v_texCoord);
  }
`;

export function JarvisHudOrb({
  size = 200,
  className = "",
  videoSrc = "/videos/jarvis-hud-loop-1x1.mp4",
  fallbackPoster = "/videos/jarvis-hud-thumb-1x1.jpg",
  mode = "alpha",
}: JarvisHudOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    let animId: number;
    let gl: WebGLRenderingContext | null = null;
    let useWebGL = false;

    try {
      gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
      if (gl) useWebGL = true;
    } catch {
      useWebGL = false;
    }

    if (useWebGL && gl) {
      // Setup WebGL Shader Program
      const compileShader = (type: number, src: string) => {
        const s = gl!.createShader(type);
        if (!s) return null;
        gl!.shaderSource(s, src);
        gl!.compileShader(s);
        return s;
      };

      const vs = compileShader(gl.VERTEX_SHADER, VS_SOURCE);
      const fsSource = mode === "alpha" ? FS_SOURCE_ALPHA : FS_SOURCE_DIRECT;
      const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
      const program = gl.createProgram();

      if (vs && fs && program) {
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.useProgram(program);

        // Quad geometry
        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          gl.STATIC_DRAW
        );
        const posLoc = gl.getAttribLocation(program, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        // Texture coordinates (flip Y for video)
        const texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]),
          gl.STATIC_DRAW
        );
        const texLoc = gl.getAttribLocation(program, "a_texCoord");
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

        // Texture
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const renderGL = () => {
          if (video.readyState >= 2 && !video.paused && !video.ended) {
            gl!.clear(gl!.COLOR_BUFFER_BIT);
            gl!.bindTexture(gl!.TEXTURE_2D, texture);
            gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, video);
            gl!.drawArrays(gl!.TRIANGLES, 0, 6);
          }
          animId = requestAnimationFrame(renderGL);
        };

        video.play().then(() => setIsPlaying(true)).catch(() => {});
        animId = requestAnimationFrame(renderGL);

        return () => {
          cancelAnimationFrame(animId);
          if (gl && program) {
            gl.deleteProgram(program);
            if (vs) gl.deleteShader(vs);
            if (fs) gl.deleteShader(fs);
          }
        };
      }
    }

    // 2D Canvas Fallback
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const render2D = () => {
      if (video.readyState >= 2 && !video.paused && !video.ended) {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(video, 0, 0, size, size);
        const frame = ctx.getImageData(0, 0, size, size);
        const d = frame.data;
        const len = d.length;
        const center = size / 2;
        const maxDist = size * 0.47;
        const startFade = size * 0.35;

        if (mode === "alpha") {
          for (let i = 0; i < len; i += 4) {
            const pixelIndex = i / 4;
            const px = pixelIndex % size;
            const py = Math.floor(pixelIndex / size);
            const dist = Math.hypot(px - center, py - center);

            let radialMask = 1.0;
            if (dist >= maxDist) {
              radialMask = 0.0;
            } else if (dist > startFade) {
              radialMask = 1.0 - (dist - startFade) / (maxDist - startFade);
            }

            const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            if (luma < 35 || radialMask <= 0) {
              d[i + 3] = 0; // 100% transparent black
            } else {
              const alphaFactor = Math.min(1, Math.max(0, (luma - 35) / 55)) * radialMask;
              d[i + 3] = Math.round(alphaFactor * 255);
              d[i] = Math.min(255, Math.round(d[i] * 1.25));
              d[i + 1] = Math.min(255, Math.round(d[i + 1] * 1.25));
            }
          }
          ctx.putImageData(frame, 0, 0);
        }
      }
      animId = requestAnimationFrame(render2D);
    };

    video.play().then(() => setIsPlaying(true)).catch(() => {});
    animId = requestAnimationFrame(render2D);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [size, mode]);

  return (
    <div
      className={`jarvis-hud-orb-root ${className}`}
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Hidden Offscreen Video Decoder */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={fallbackPoster}
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Transparent Canvas with Black Background Filtered Out & Smoothed Edges */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: "block",
          objectFit: "contain",
          borderRadius: "50%",
          maskImage: "radial-gradient(circle at 50% 50%, black 65%, transparent 95%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 65%, transparent 95%)",
          filter: "drop-shadow(0 0 16px rgba(245, 158, 11, 0.45))",
          background: "transparent",
          mixBlendMode: mode === "alpha" ? "normal" : mode,
        }}
      />
    </div>
  );
}
