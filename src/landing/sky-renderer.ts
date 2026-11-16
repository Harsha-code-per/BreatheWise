/**
 * A tiny WebGL renderer for the sky shader: one full-screen triangle, four uniforms.
 * Returns null when WebGL is unavailable so the page can fall back to a CSS gradient.
 */
import { FRAGMENT_SHADER, VERTEX_SHADER } from './sky-shader.js';

/** Inputs for one frame. */
interface SkyFrame {
  time: number;
  clarity: number;
  night: boolean;
}

/** Draws frames onto a canvas until disposed. */
export interface SkyRenderer {
  draw: (frame: SkyFrame) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

/** Device pixel ratio is capped: smog is soft, so extra pixels only cost battery. */
export const MAX_PIXEL_RATIO = 1.5;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

function link(gl: WebGLRenderingContext): WebGLProgram | null {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

/** Sets up the sky on a canvas, or returns null if the device cannot render it. */
export function createSkyRenderer(canvas: HTMLCanvasElement): SkyRenderer | null {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    powerPreference: 'low-power',
  });
  const program = gl ? link(gl) : null;
  if (!gl || !program) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const at = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = {
    res: at('u_res'),
    time: at('u_time'),
    clear: at('u_clear'),
    night: at('u_night'),
  };

  return {
    draw(frame) {
      gl.uniform2f(uniforms.res, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, frame.time);
      gl.uniform1f(uniforms.clear, frame.clarity);
      gl.uniform1f(uniforms.night, frame.night ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    resize(width, height) {
      const ratio = Math.min(Math.max(window.devicePixelRatio, 1), MAX_PIXEL_RATIO);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    dispose() {
      gl.deleteProgram(program);
    },
  };
}
