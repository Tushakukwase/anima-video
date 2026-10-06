import { StyleParameters } from '../types';

/**
 * High-performance WebGL 2.0 / WebGL 1.0 hardware-accelerated video shader engine
 * Transforms live video frames into stylized anime, cartoon, comic, cyberpunk, and watercolor art.
 */
export class VideoShaderEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private customPaletteTexture: WebGLTexture | null = null;
  private isWebGL = false;

  // Uniform locations
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initGL();
  }

  private initGL() {
    try {
      this.gl =
        (this.canvas.getContext('webgl2', { preserveDrawingBuffer: true, alpha: false }) as WebGL2RenderingContext) ||
        (this.canvas.getContext('webgl', { preserveDrawingBuffer: true, alpha: false }) as WebGLRenderingContext);

      if (this.gl) {
        this.isWebGL = true;
        this.setupShaders();
        this.setupBuffers();
        this.setupTextures();
      }
    } catch (e) {
      console.warn('WebGL initialization failed, falling back to 2D Canvas context', e);
      this.isWebGL = false;
    }
  }

  private setupShaders() {
    if (!this.gl) return;
    const gl = this.gl;

    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      
      // Style Parameters
      uniform float u_edgeThreshold;   // 0.0 to 1.0
      uniform float u_edgeThickness;   // 1.0 to 5.0
      uniform float u_edgeDarkness;    // 0.0 to 1.0
      uniform float u_colorBands;       // 2.0 to 16.0
      uniform float u_smoothing;        // 0.0 to 10.0
      uniform float u_saturation;       // 0.0 to 2.0
      uniform float u_contrast;         // 0.5 to 2.0
      uniform float u_brightness;       // -0.3 to 0.5
      uniform float u_bloomGlow;        // 0.0 to 1.0
      uniform float u_halftoneDotSize;  // 0.0 to 20.0
      uniform float u_pixelBlockSize;   // 1.0 to 30.0
      uniform float u_sketchHatch;      // 0.0 to 1.0
      uniform float u_paperGrain;       // 0.0 to 0.5
      uniform float u_invertEdges;      // 0.0 or 1.0 (for neon)
      uniform vec3 u_neonTint;          // RGB tint
      uniform float u_useCustomPalette; // 0.0 or 1.0
      uniform vec3 u_palette[6];

      varying vec2 v_texCoord;

      // Pseudo-random noise for paper grain
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      // Convert RGB to Luminance
      float luma(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }

      // RGB to HSV and back for vibrance and saturation
      vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
      }

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        vec2 uv = v_texCoord;

        // 1. Pixelation Blockiness
        if (u_pixelBlockSize > 1.5) {
          vec2 blocks = u_resolution / u_pixelBlockSize;
          uv = floor(uv * blocks) / blocks;
        }

        vec2 onePixel = vec2(1.0) / u_resolution;
        vec2 offset = onePixel * max(1.0, u_edgeThickness);

        // Sample center
        vec4 centerSample = texture2D(u_image, uv);
        vec3 color = centerSample.rgb;

        // 2. Kuwahara / Bilateral Painterly Smoothing (approximated for real-time WebGL)
        if (u_smoothing > 0.5) {
          float radius = clamp(u_smoothing * 0.7, 1.0, 4.0);
          vec3 avg = vec3(0.0);
          float totalWeight = 0.0;
          for (float x = -3.0; x <= 3.0; x += 1.0) {
            if (abs(x) > radius) continue;
            for (float y = -3.0; y <= 3.0; y += 1.0) {
              if (abs(y) > radius) continue;
              vec2 sampleUv = uv + vec2(x, y) * onePixel * 1.5;
              vec3 c = texture2D(u_image, sampleUv).rgb;
              float diff = distance(c, color);
              float w = exp(-diff * 3.5);
              avg += c * w;
              totalWeight += w;
            }
          }
          if (totalWeight > 0.0) {
            color = avg / totalWeight;
          }
        }

        // 3. Sobel Edge Detection (Contour ink lines)
        vec3 tleft = texture2D(u_image, uv + vec2(-offset.x, -offset.y)).rgb;
        vec3 top = texture2D(u_image, uv + vec2(0.0, -offset.y)).rgb;
        vec3 tright = texture2D(u_image, uv + vec2(offset.x, -offset.y)).rgb;
        vec3 left = texture2D(u_image, uv + vec2(-offset.x, 0.0)).rgb;
        vec3 right = texture2D(u_image, uv + vec2(offset.x, 0.0)).rgb;
        vec3 bleft = texture2D(u_image, uv + vec2(-offset.x, offset.y)).rgb;
        vec3 bottom = texture2D(u_image, uv + vec2(0.0, offset.y)).rgb;
        vec3 bright = texture2D(u_image, uv + vec2(offset.x, offset.y)).rgb;

        float gx = -luma(tleft) - 2.0 * luma(left) - luma(bleft) + luma(tright) + 2.0 * luma(right) + luma(bright);
        float gy = -luma(tleft) - 2.0 * luma(top) - luma(tright) + luma(bleft) + 2.0 * luma(bottom) + luma(bright);
        float edge = sqrt(gx * gx + gy * gy);

        // Normalize edge according to threshold
        float edgeStrength = smoothstep(u_edgeThreshold * 0.5, u_edgeThreshold * 1.5 + 0.1, edge);

        // 4. Color Quantization & Cel Shading Bands
        if (u_colorBands > 1.5) {
          float bands = floor(u_colorBands);
          color = floor(color * bands + 0.5) / bands;
        }

        // 5. Custom Palette Transfer
        if (u_useCustomPalette > 0.5) {
          float lum = luma(color);
          float indexF = lum * 5.0;
          int idx = int(clamp(floor(indexF), 0.0, 4.0));
          float frac = fract(indexF);
          
          vec3 cA = u_palette[0];
          vec3 cB = u_palette[1];
          if (idx == 1) { cA = u_palette[1]; cB = u_palette[2]; }
          else if (idx == 2) { cA = u_palette[2]; cB = u_palette[3]; }
          else if (idx == 3) { cA = u_palette[3]; cB = u_palette[4]; }
          else if (idx == 4) { cA = u_palette[4]; cB = u_palette[5]; }
          
          color = mix(cA, cB, frac);
        }

        // 6. Halftone Dots (Comic Pop-Art)
        if (u_halftoneDotSize > 1.5) {
          vec2 dotCoord = uv * u_resolution / u_halftoneDotSize;
          vec2 dotCenter = fract(dotCoord) - 0.5;
          float dist = length(dotCenter);
          float brightnessL = luma(color);
          float dotRadius = 0.7 * (1.0 - brightnessL);
          float dotMask = smoothstep(dotRadius - 0.1, dotRadius + 0.1, dist);
          color = mix(color * 0.1, color * 1.25, dotMask);
        }

        // 7. Pencil Sketch Hatching
        if (u_sketchHatch > 0.1) {
          float l = luma(color);
          vec2 screenPos = gl_FragCoord.xy;
          float hatch1 = mod(screenPos.x + screenPos.y, 8.0) < 1.8 ? 1.0 : 0.0;
          float hatch2 = mod(screenPos.x - screenPos.y, 8.0) < 1.8 ? 1.0 : 0.0;
          float hatch3 = mod(screenPos.y, 6.0) < 1.5 ? 1.0 : 0.0;
          
          float paper = 1.0;
          if (l < 0.8) paper -= hatch1 * 0.35;
          if (l < 0.55) paper -= hatch2 * 0.4;
          if (l < 0.25) paper -= hatch3 * 0.45;
          color = vec3(clamp(paper, 0.05, 1.0));
        }

        // 8. Contrast and Brightness
        color = (color - 0.5) * u_contrast + 0.5 + u_brightness;

        // 9. Saturation & Vibrance
        if (u_sketchHatch < 0.1) {
          vec3 hsv = rgb2hsv(clamp(color, 0.0, 1.0));
          hsv.y = clamp(hsv.y * u_saturation, 0.0, 1.0);
          color = hsv2rgb(hsv);
        }

        // 10. Ink Lines or Neon Outline Application
        if (u_invertEdges > 0.5) {
          // Neon glow outlines!
          vec3 neonColor = u_neonTint * (edgeStrength * 2.5);
          color = color * 0.4 + neonColor;
        } else {
          // Traditional anime / comic ink lines
          float inkFactor = 1.0 - (edgeStrength * u_edgeDarkness);
          color *= clamp(inkFactor, 0.0, 1.0);
        }

        // 11. Dreamy Anime Bloom / Glow
        if (u_bloomGlow > 0.05) {
          float brightPass = max(0.0, luma(color) - 0.6);
          color += color * (brightPass * u_bloomGlow * 0.8);
        }

        // 12. Paper / Film Grain
        if (u_paperGrain > 0.01) {
          float noise = (hash(uv + fract(gl_FragCoord.xy * 0.01)) - 0.5) * u_paperGrain;
          color += vec3(noise);
        }

        gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
      }
    `;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) return;

    this.program = gl.createProgram();
    if (!this.program) return;

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Shader link error:', gl.getProgramInfoLog(this.program));
      return;
    }

    gl.useProgram(this.program);

    // Cache uniforms
    const uniformNames = [
      'u_image',
      'u_resolution',
      'u_edgeThreshold',
      'u_edgeThickness',
      'u_edgeDarkness',
      'u_colorBands',
      'u_smoothing',
      'u_saturation',
      'u_contrast',
      'u_brightness',
      'u_bloomGlow',
      'u_halftoneDotSize',
      'u_pixelBlockSize',
      'u_sketchHatch',
      'u_paperGrain',
      'u_invertEdges',
      'u_neonTint',
      'u_useCustomPalette',
      'u_palette',
    ];

    uniformNames.forEach((name) => {
      this.uniforms[name] = gl.getUniformLocation(this.program!, name);
    });
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private setupBuffers() {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    // Fullscreen quad
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Texture coords (inverted Y for canvas/video orientation)
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      0, 0,
      1, 1,
      1, 0,
    ]);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
  }

  private setupTextures() {
    if (!this.gl) return;
    const gl = this.gl;

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  public renderFrame(
    source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
    params: StyleParameters,
    width: number,
    height: number
  ) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    if (!this.isWebGL || !this.gl || !this.program) {
      // 2D fallback
      this.render2DFallback(source, params, width, height);
      return;
    }

    const gl = this.gl;
    gl.viewport(0, 0, width, height);
    gl.useProgram(this.program);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform1i(this.uniforms['u_image'], 0);

    // Pass uniforms
    gl.uniform2f(this.uniforms['u_resolution'], width, height);
    gl.uniform1f(this.uniforms['u_edgeThreshold'], (params.edgeThreshold || 40) / 100);
    gl.uniform1f(this.uniforms['u_edgeThickness'], params.edgeThickness || 2);
    gl.uniform1f(this.uniforms['u_edgeDarkness'], (params.edgeDarkness || 80) / 100);
    gl.uniform1f(this.uniforms['u_colorBands'], params.colorBands || 6);
    gl.uniform1f(this.uniforms['u_smoothing'], params.smoothing || 4);
    gl.uniform1f(this.uniforms['u_saturation'], (params.saturation ?? 130) / 100);
    gl.uniform1f(this.uniforms['u_contrast'], (params.contrast ?? 120) / 100);
    gl.uniform1f(this.uniforms['u_brightness'], (params.brightness ?? 0) / 100);
    gl.uniform1f(this.uniforms['u_bloomGlow'], (params.bloomGlow ?? 20) / 100);
    gl.uniform1f(this.uniforms['u_halftoneDotSize'], params.halftoneDotSize || 0);
    gl.uniform1f(this.uniforms['u_pixelBlockSize'], params.pixelBlockSize || 1);
    gl.uniform1f(this.uniforms['u_sketchHatch'], (params.sketchHatch || 0) / 100);
    gl.uniform1f(this.uniforms['u_paperGrain'], (params.paperGrain || 0) / 100);
    gl.uniform1f(this.uniforms['u_invertEdges'], params.invertEdges ? 1.0 : 0.0);

    // Neon tint
    const tintHex = params.colorTint && params.colorTint !== 'none' ? params.colorTint : '#06b6d4';
    const rgb = hexToRgb(tintHex);
    gl.uniform3f(this.uniforms['u_neonTint'], rgb[0], rgb[1], rgb[2]);

    // Custom palette
    if (params.paletteExtract && params.paletteExtract.length >= 2) {
      gl.uniform1f(this.uniforms['u_useCustomPalette'], 1.0);
      const flatPalette: number[] = [];
      for (let i = 0; i < 6; i++) {
        const hex = params.paletteExtract[i % params.paletteExtract.length];
        const [r, g, b] = hexToRgb(hex);
        flatPalette.push(r, g, b);
      }
      gl.uniform3fv(this.uniforms['u_palette'], new Float32Array(flatPalette));
    } else {
      gl.uniform1f(this.uniforms['u_useCustomPalette'], 0.0);
    }

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private render2DFallback(
    source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap,
    params: StyleParameters,
    width: number,
    height: number
  ) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.filter = `contrast(${params.contrast}%) saturate(${params.saturation}%) brightness(${100 + params.brightness}%)`;
    ctx.drawImage(source, 0, 0, width, height);
  }

  public destroy() {
    if (this.gl && this.program) {
      this.gl.deleteProgram(this.program);
    }
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return [r, g, b];
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [1, 1, 1];
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}
