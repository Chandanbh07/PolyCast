import { useEffect, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";

/**
 * Unizen-style flowing orange→gold ribbon on black (live WebGL).
 * Domain-warped fbm gives folding/looping ribbon shapes instead of a
 * single sine-wave band. Dark mode only. Falls back to a static frame
 * for reduced-motion.
 */
export function UnizenBackground() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (theme !== "dark") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dprMax = 2;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

    const FS = `
      precision highp float;
      uniform vec2 res;
      uniform float t;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        vec2 u = f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),
                   mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y);
      }

      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < 6; i++) {
          v += a * noise(p);
          p = m * p;
          a *= 0.5;
        }
        return v;
      }

      // Domain-warped fbm (Inigo Quilez style) — produces folding,
      // looping flow shapes instead of a plain wave.
      float warpedFbm(vec2 p){
        vec2 q = vec2(fbm(p + vec2(0.0, 0.0)), fbm(p + vec2(5.2, 1.3)));
        vec2 r = vec2(fbm(p + 4.0*q + vec2(1.7, 9.2)), fbm(p + 4.0*q + vec2(8.3, 2.8)));
        return fbm(p + 4.0*r);
      }

      void main(){
        vec2 uv = gl_FragCoord.xy / res.xy;

        vec2 p = vec2(uv.x * 2.2 - t * 0.05, uv.y * 1.6);
        float w = warpedFbm(p + vec2(t * 0.02, 0.0));

        // Ribbon centerline is driven by the warped field, so it folds
        // and loops instead of tracing one clean sine curve.
        float center = 0.5
                     + 0.28 * sin(uv.x * 1.6 + t * 0.12 + w * 2.0)
                     + 0.12 * sin(uv.x * 3.4 - t * 0.2 + w * 3.0)
                     - uv.x * 0.10;
        float d = abs(uv.y - center);

        // Thickness itself breathes with the flow field, so the band
        // widens/narrows along its length instead of a fixed stroke.
        float thickness = 0.045 + 0.05 * w;
        float core = smoothstep(thickness, 0.0, d);
        float glow = pow(smoothstep(0.34, 0.0, d), 1.6);

        vec3 orange = vec3(1.0, 0.30, 0.0);
        vec3 gold   = vec3(0.98, 0.73, 0.0);
        vec3 col = mix(orange, gold, clamp(uv.x * 0.6 + w * 0.5, 0.0, 1.0));

        vec3 outc = col * glow * 0.9 + col * core * 0.6;
        outc += (hash(gl_FragCoord.xy + t) - 0.5) * 0.025;

        gl_FragColor = vec4(max(outc, 0.0), 1.0);
      }`;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "res");
    const uT = gl.getUniformLocation(prog, "t");

    resize();
    window.addEventListener("resize", resize);

    const start = performance.now();
    const render = (nowT: number) => {
      const t = (nowT - start) / 1000 + 3.0;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) rafRef.current = requestAnimationFrame(render);
    };

    if (reduce) render(start + 3000);
    else rafRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [theme]);

  if (theme !== "dark") return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 bg-black overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}