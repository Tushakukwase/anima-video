import JSZip from 'jszip';
import { ExportSettings, StyleParameters } from '../types';
import { VideoShaderEngine } from './videoShaderEngine';

export interface RenderProgress {
  currentFrame: number;
  totalFrames: number;
  percent: number;
  fps: number;
  elapsedSec: number;
  remainingSec: number;
  status: 'rendering' | 'encoding' | 'completed' | 'cancelled' | 'error';
}

export class VideoExportPipeline {
  private isCancelled = false;
  private isPaused = false;

  public cancel() {
    this.isCancelled = true;
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
  }

  /**
   * High-fidelity frame-by-frame export engine with audio preservation
   */
  public async renderVideo(
    sourceVideo: HTMLVideoElement,
    params: StyleParameters,
    settings: ExportSettings,
    onProgress: (p: RenderProgress) => void
  ): Promise<{ blob: Blob; url: string; filename: string }> {
    this.isCancelled = false;
    this.isPaused = false;

    // Calculate dimensions
    let targetWidth = sourceVideo.videoWidth || 640;
    let targetHeight = sourceVideo.videoHeight || 360;

    switch (settings.resolution) {
      case '1080p':
        targetWidth = 1920;
        targetHeight = 1080;
        break;
      case '720p':
        targetWidth = 1280;
        targetHeight = 720;
        break;
      case '480p':
        targetWidth = 854;
        targetHeight = 480;
        break;
      case 'square':
        targetWidth = 1080;
        targetHeight = 1080;
        break;
      case 'vertical':
        targetWidth = 1080;
        targetHeight = 1920;
        break;
      default:
        // original
        break;
    }

    const duration = sourceVideo.duration || 5;
    const exportFps = settings.fps || 24;
    const totalFrames = Math.max(1, Math.floor(duration * exportFps));

    // Offscreen render canvas
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = targetWidth;
    offscreenCanvas.height = targetHeight;
    const shaderEngine = new VideoShaderEngine(offscreenCanvas);

    // If exporting frame sequence ZIP
    if (settings.format === 'frames_zip') {
      return this.renderFrameSequenceZip(
        sourceVideo,
        shaderEngine,
        offscreenCanvas,
        params,
        totalFrames,
        exportFps,
        onProgress
      );
    }

    // Video stream recording
    const startTime = performance.now();
    const stream = offscreenCanvas.captureStream(exportFps);

    // Preserve audio if requested
    if (settings.preserveAudio) {
      try {
        const audioStream = (sourceVideo as unknown as { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }).captureStream?.() ||
          (sourceVideo as unknown as { mozCaptureStream?: () => MediaStream }).mozCaptureStream?.();
        if (audioStream) {
          const audioTracks = audioStream.getAudioTracks();
          audioTracks.forEach((track) => stream.addTrack(track));
        }
      } catch (err) {
        console.warn('Audio capture note:', err);
      }
    }

    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
      videoBitsPerSecond: settings.bitrateKbps * 1000,
    });

    const recordedChunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.start();

    // Step through video frame by frame
    const originalTime = sourceVideo.currentTime;
    const wasPaused = sourceVideo.paused;
    sourceVideo.pause();

    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.isCancelled) {
        mediaRecorder.stop();
        shaderEngine.destroy();
        sourceVideo.currentTime = originalTime;
        if (!wasPaused) sourceVideo.play().catch(() => {});
        throw new Error('Render cancelled by user');
      }

      while (this.isPaused) {
        await new Promise((r) => setTimeout(r, 100));
        if (this.isCancelled) break;
      }

      const targetTime = frame / exportFps;
      await this.seekVideoToTime(sourceVideo, targetTime);

      // Render frame with shader
      shaderEngine.renderFrame(sourceVideo, params, targetWidth, targetHeight);

      // Progress reporting
      const now = performance.now();
      const elapsedSec = (now - startTime) / 1000;
      const currentFps = frame > 0 ? frame / elapsedSec : 0;
      const remainingFrames = totalFrames - frame;
      const remainingSec = currentFps > 0 ? remainingFrames / currentFps : 0;

      onProgress({
        currentFrame: frame + 1,
        totalFrames,
        percent: Math.min(99, Math.round(((frame + 1) / totalFrames) * 100)),
        fps: Math.round(currentFps * 10) / 10,
        elapsedSec: Math.round(elapsedSec),
        remainingSec: Math.max(0, Math.round(remainingSec)),
        status: 'rendering',
      });

      // Small tick for stream encoding
      await new Promise((r) => setTimeout(r, 1000 / exportFps / 1.5));
    }

    // Wrap up recording
    onProgress({
      currentFrame: totalFrames,
      totalFrames,
      percent: 99,
      fps: 0,
      elapsedSec: Math.round((performance.now() - startTime) / 1000),
      remainingSec: 0,
      status: 'encoding',
    });

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        const blobUrl = URL.createObjectURL(finalBlob);
        shaderEngine.destroy();
        sourceVideo.currentTime = originalTime;
        if (!wasPaused) sourceVideo.play().catch(() => {});

        const extension = 'webm';
        const filename = `animastudio_export_${Date.now()}.${extension}`;

        onProgress({
          currentFrame: totalFrames,
          totalFrames,
          percent: 100,
          fps: 0,
          elapsedSec: Math.round((performance.now() - startTime) / 1000),
          remainingSec: 0,
          status: 'completed',
        });

        resolve({ blob: finalBlob, url: blobUrl, filename });
      };

      mediaRecorder.stop();
    });
  }

  private async renderFrameSequenceZip(
    sourceVideo: HTMLVideoElement,
    shaderEngine: VideoShaderEngine,
    canvas: HTMLCanvasElement,
    params: StyleParameters,
    totalFrames: number,
    fps: number,
    onProgress: (p: RenderProgress) => void
  ): Promise<{ blob: Blob; url: string; filename: string }> {
    const zip = new JSZip();
    const framesFolder = zip.folder('animastudio_frames');
    const startTime = performance.now();

    for (let frame = 0; frame < totalFrames; frame++) {
      if (this.isCancelled) throw new Error('Render cancelled');

      const targetTime = frame / fps;
      await this.seekVideoToTime(sourceVideo, targetTime);
      shaderEngine.renderFrame(sourceVideo, params, canvas.width, canvas.height);

      // Extract image data
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const base64Data = dataUrl.split(',')[1];
      const frameNumberPadded = String(frame + 1).padStart(5, '0');
      framesFolder?.file(`frame_${frameNumberPadded}.jpg`, base64Data, { base64: true });

      const now = performance.now();
      const elapsedSec = (now - startTime) / 1000;
      const currentFps = frame > 0 ? frame / elapsedSec : 0;
      const remainingSec = currentFps > 0 ? (totalFrames - frame) / currentFps : 0;

      onProgress({
        currentFrame: frame + 1,
        totalFrames,
        percent: Math.min(95, Math.round(((frame + 1) / totalFrames) * 100)),
        fps: Math.round(currentFps * 10) / 10,
        elapsedSec: Math.round(elapsedSec),
        remainingSec: Math.max(0, Math.round(remainingSec)),
        status: 'rendering',
      });
    }

    // Add metadata info file
    zip.file(
      'metadata.json',
      JSON.stringify(
        {
          generator: 'AnimaStudio AI Video to Anime Studio',
          totalFrames,
          fps,
          resolution: `${canvas.width}x${canvas.height}`,
          renderedAt: new Date().toISOString(),
          parameters: params,
        },
        null,
        2
      )
    );

    onProgress({
      currentFrame: totalFrames,
      totalFrames,
      percent: 98,
      fps: 0,
      elapsedSec: Math.round((performance.now() - startTime) / 1000),
      remainingSec: 0,
      status: 'encoding',
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const filename = `animastudio_frames_${Date.now()}.zip`;

    onProgress({
      currentFrame: totalFrames,
      totalFrames,
      percent: 100,
      fps: 0,
      elapsedSec: Math.round((performance.now() - startTime) / 1000),
      remainingSec: 0,
      status: 'completed',
    });

    return { blob: zipBlob, url, filename };
  }

  private seekVideoToTime(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve) => {
      const handleSeeked = () => {
        video.removeEventListener('seeked', handleSeeked);
        resolve();
      };
      video.addEventListener('seeked', handleSeeked);
      video.currentTime = Math.min(video.duration || time, Math.max(0, time));
    });
  }
}
