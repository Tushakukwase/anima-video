/**
 * Procedural sample video generators with audio for instant testing
 * Users don't need to hunt for video files to try the app.
 */

export interface SampleVideoMeta {
  id: string;
  title: string;
  titleHi: string;
  category: string;
  duration: number;
  previewColor: string;
}

export const SAMPLE_VIDEOS: SampleVideoMeta[] = [
  {
    id: 'cyber-runner',
    title: 'Cyber City Action & Vehicles',
    titleHi: 'साइबर सिटी एक्शन और कार्स',
    category: 'Action & Sci-Fi',
    duration: 5,
    previewColor: '#6366f1',
  },
  {
    id: 'neon-dance',
    title: 'Neon Dancer & Light Beams',
    titleHi: 'नियॉन डांसर और लाइट बीम्स',
    category: 'Dance & Beats',
    duration: 4,
    previewColor: '#ec4899',
  },
  {
    id: 'ghibli-nature',
    title: 'Nature Waterfall & Sakura',
    titleHi: 'नेचर वॉटरफॉल और चेरी ब्लॉसम',
    category: 'Cinematic Nature',
    duration: 6,
    previewColor: '#10b981',
  },
];

export async function generateSampleVideo(
  sampleId: string,
  onProgress?: (progress: number) => void
): Promise<{ blobUrl: string; width: number; height: number; duration: number }> {
  const width = 640;
  const height = 360;
  const fps = 30;

  const sample = SAMPLE_VIDEOS.find((s) => s.id === sampleId) || SAMPLE_VIDEOS[0];
  const duration = sample.duration;
  const totalFrames = duration * fps;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Create AudioContext for subtle ambient beat
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;

  try {
    audioCtx = new AudioContextClass();
    audioDest = audioCtx.createMediaStreamDestination();

    // Synth tone
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioDest);
    osc.start();
  } catch (e) {
    console.warn('Audio synthesis fallback', e);
  }

  const stream = canvas.captureStream(fps);
  if (audioDest) {
    audioDest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  }

  // Setup MediaRecorder
  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
    videoBitsPerSecond: 3_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start();

  // Render frames sequentially
  return new Promise((resolve) => {
    let currentFrame = 0;

    const interval = setInterval(() => {
      currentFrame++;
      const time = currentFrame / fps;
      const t = currentFrame;

      if (sampleId === 'cyber-runner') {
        drawCyberRunner(ctx, width, height, t, time);
      } else if (sampleId === 'neon-dance') {
        drawNeonDance(ctx, width, height, t, time);
      } else {
        drawGhibliNature(ctx, width, height, t, time);
      }

      if (onProgress) {
        onProgress(Math.min(100, Math.round((currentFrame / totalFrames) * 100)));
      }

      if (currentFrame >= totalFrames) {
        clearInterval(interval);
        setTimeout(() => {
          recorder.stop();
          if (audioCtx) {
            audioCtx.close().catch(() => {});
          }
        }, 150);
      }
    }, 1000 / fps);

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      resolve({ blobUrl, width, height, duration });
    };
  });
}

function drawCyberRunner(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: number,
  time: number
) {
  // Deep night sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#090a18');
  skyGrad.addColorStop(0.6, '#180e2b');
  skyGrad.addColorStop(1, '#2c124d');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Distant glowing skyscrapers
  for (let i = 0; i < 14; i++) {
    const bx = ((i * 55 - (frame * 1.5) % 55 + w) % (w + 60)) - 30;
    const bh = 100 + ((i * 37) % 130);
    const by = h * 0.65 - bh;
    const bw = 35 + ((i * 17) % 25);

    ctx.fillStyle = i % 2 === 0 ? '#1b1433' : '#140e28';
    ctx.fillRect(bx, by, bw, bh);

    // Glowing windows
    ctx.fillStyle = i % 3 === 0 ? '#f43f5e' : i % 2 === 0 ? '#06b6d4' : '#fbbf24';
    for (let wy = by + 10; wy < by + bh - 10; wy += 14) {
      if ((i + wy) % 5 !== 0) {
        ctx.fillRect(bx + 6, wy, 4, 6);
        ctx.fillRect(bx + 16, wy, 4, 6);
      }
    }
  }

  // Perspective road
  const horizonY = h * 0.65;
  ctx.fillStyle = '#0f0b1a';
  ctx.beginPath();
  ctx.moveTo(w * 0.35, horizonY);
  ctx.lineTo(w * 0.65, horizonY);
  ctx.lineTo(w + 100, h);
  ctx.lineTo(-100, h);
  ctx.closePath();
  ctx.fill();

  // Moving neon road grid lines
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2;
  const numGrid = 10;
  for (let g = 0; g < numGrid; g++) {
    const prog = ((frame * 0.04 + g / numGrid) % 1);
    const gy = horizonY + Math.pow(prog, 2) * (h - horizonY);
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // Running athletic silhouette
  const runnerX = w * 0.45;
  const runnerY = h * 0.72 + Math.sin(time * 12) * 5;
  const legCycle = Math.sin(time * 12);

  ctx.fillStyle = '#f8fafc';
  // Head
  ctx.beginPath();
  ctx.arc(runnerX, runnerY - 32, 7, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  ctx.beginPath();
  ctx.moveTo(runnerX - 3, runnerY - 25);
  ctx.lineTo(runnerX + 6, runnerY - 10);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();

  // Running legs
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 4;
  // Leg 1
  ctx.beginPath();
  ctx.moveTo(runnerX + 2, runnerY - 10);
  ctx.lineTo(runnerX - 12 * legCycle, runnerY + 6);
  ctx.lineTo(runnerX - 16 * legCycle, runnerY + 18);
  ctx.stroke();

  // Leg 2
  ctx.beginPath();
  ctx.moveTo(runnerX + 2, runnerY - 10);
  ctx.lineTo(runnerX + 12 * legCycle, runnerY + 6);
  ctx.lineTo(runnerX + 16 * legCycle, runnerY + 18);
  ctx.stroke();

  // Speeding hover vehicle in the background
  const carX = ((frame * 8) % (w + 200)) - 100;
  const carY = horizonY + 22;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(carX, carY, 40, 10);
  // Red tail flare
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(carX - 12, carY + 2, 12, 6);
}

function drawNeonDance(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: number,
  time: number
) {
  // Dark club room
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, w, h);

  // Rotating neon spotlight beams
  ctx.save();
  ctx.translate(w / 2, h * 0.1);
  for (let b = 0; b < 6; b++) {
    const angle = Math.sin(time * 2 + (b * Math.PI) / 3) * 0.8 + ((b * Math.PI) / 3) * 0.5;
    ctx.rotate(angle * 0.1);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, b % 2 === 0 ? 'rgba(236,72,153,0.3)' : 'rgba(14,165,233,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.lineTo(180, h);
    ctx.lineTo(-180, h);
    ctx.fill();
  }
  ctx.restore();

  // Equalizer floor waves
  ctx.fillStyle = 'rgba(168,85,247,0.15)';
  for (let i = 0; i < 20; i++) {
    const barH = 20 + Math.abs(Math.sin(time * 6 + i * 0.5)) * 90;
    const bx = (w / 20) * i;
    ctx.fillRect(bx, h - barH, w / 22, barH);
  }

  // Dancing Figure (dynamic rhythmic poses)
  const cx = w / 2;
  const cy = h * 0.62;
  const beat = Math.sin(time * 8);

  ctx.save();
  ctx.translate(cx, cy + beat * 6);

  // Glowing outline aura
  ctx.shadowColor = '#06b6d4';
  ctx.shadowBlur = 18;

  // Head
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -50, 11, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  ctx.strokeStyle = '#ec4899';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, -38);
  ctx.lineTo(beat * 4, -8);
  ctx.stroke();

  // Raised dancing arms
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5;
  // Left arm
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(-24, -45 + Math.cos(time * 6) * 16);
  ctx.lineTo(-38, -65 + Math.sin(time * 6) * 20);
  ctx.stroke();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(24, -45 - Math.cos(time * 6) * 16);
  ctx.lineTo(38, -65 - Math.sin(time * 6) * 20);
  ctx.stroke();

  // Legs dancing
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(beat * 4, -8);
  ctx.lineTo(-16 + beat * 8, 22);
  ctx.lineTo(-22, 48);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(beat * 4, -8);
  ctx.lineTo(16 - beat * 8, 22);
  ctx.lineTo(22, 48);
  ctx.stroke();

  ctx.restore();
}

function drawGhibliNature(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  frame: number,
  time: number
) {
  // Blue peaceful sky
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, '#38bdf8');
  sky.addColorStop(0.5, '#7dd3fc');
  sky.addColorStop(1, '#e0f2fe');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Soft moving Ghibli clouds
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (let c = 0; c < 3; c++) {
    const cx = ((time * 12 + c * 220) % (w + 200)) - 100;
    const cy = 40 + c * 35;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.arc(cx + 25, cy - 8, 35, 0, Math.PI * 2);
    ctx.arc(cx + 55, cy, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant mountains
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.65);
  ctx.lineTo(w * 0.25, h * 0.35);
  ctx.lineTo(w * 0.55, h * 0.6);
  ctx.lineTo(w * 0.8, h * 0.38);
  ctx.lineTo(w, h * 0.65);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  // Green hills
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.6);
  ctx.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.6, h * 0.7);
  ctx.quadraticCurveTo(w * 0.85, h * 0.55, w, h * 0.65);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();

  // Cascading Waterfall in the center
  const wX = w * 0.48;
  const wY = h * 0.52;
  const wWidth = 28;
  const gradWater = ctx.createLinearGradient(wX, wY, wX, h);
  gradWater.addColorStop(0, '#e0f2fe');
  gradWater.addColorStop(0.5, '#38bdf8');
  gradWater.addColorStop(1, '#0284c7');
  ctx.fillStyle = gradWater;
  ctx.fillRect(wX, wY, wWidth, h - wY);

  // Flowing waterfall foam lines
  ctx.fillStyle = '#ffffff';
  for (let l = 0; l < 8; l++) {
    const ly = wY + ((frame * 6 + l * 28) % (h - wY));
    ctx.fillRect(wX + 3 + ((l * 7) % (wWidth - 8)), ly, 4, 14);
  }

  // Sakura cherry blossom tree on left
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.88);
  ctx.quadraticCurveTo(w * 0.16, h * 0.68, w * 0.22, h * 0.55);
  ctx.stroke();

  // Sakura pink foliage clusters
  ctx.fillStyle = '#f472b6';
  ctx.beginPath();
  ctx.arc(w * 0.22, h * 0.5, 34, 0, Math.PI * 2);
  ctx.arc(w * 0.18, h * 0.44, 28, 0, Math.PI * 2);
  ctx.arc(w * 0.28, h * 0.46, 32, 0, Math.PI * 2);
  ctx.fill();

  // Falling pink petals in the breeze
  ctx.fillStyle = '#fbcfe8';
  for (let p = 0; p < 18; p++) {
    const px = ((time * 30 + p * 45) % w);
    const py = (h * 0.4 + Math.sin(time * 2 + p) * 50 + (p * 22)) % h;
    ctx.beginPath();
    ctx.ellipse(px, py, 4, 2, Math.sin(time + p), 0, Math.PI * 2);
    ctx.fill();
  }
}
