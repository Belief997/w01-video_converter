/**
 * FFmpegBuilder unit tests
 */

import { describe, it, expect } from 'vitest';
import { FFmpegBuilder } from '../src/ffmpeg-builder.js';
import * as path from 'path';

describe('FFmpegBuilder', () => {
  const builder = new FFmpegBuilder();

  describe('buildMjpegFramesCmd', () => {
    it('should build MJPEG frames command without frame rate', () => {
      const cmd = builder.buildMjpegFramesCmd('/input/video.mp4', '/output/frames');
      
      expect(cmd[0]).toBe('ffmpeg');
      expect(cmd).toContain('-i');
      expect(cmd).toContain('/input/video.mp4');
      expect(cmd).toContain('-vf');
      expect(cmd).toContain('format=yuvj420p');
      expect(cmd).toContain('-q:v');
      expect(cmd).toContain('5'); // default quality
      expect(cmd[cmd.length - 1]).toBe(path.join('/output/frames', 'frame_%04d.jpg'));
    });

    it('should build MJPEG frames command with frame rate', () => {
      const cmd = builder.buildMjpegFramesCmd('/input/video.mp4', '/output/frames', 24);
      
      expect(cmd).toContain('-r');
      expect(cmd).toContain('24');
    });

    it('should build MJPEG frames command with custom quality', () => {
      const cmd = builder.buildMjpegFramesCmd('/input/video.mp4', '/output/frames', undefined, 10);
      
      const qvIndex = cmd.indexOf('-q:v');
      expect(qvIndex).toBeGreaterThan(-1);
      expect(cmd[qvIndex + 1]).toBe('10');
    });
  });

  describe('buildAviCmd', () => {
    it('should build AVI command without frame rate', () => {
      const cmd = builder.buildAviCmd('/input/video.mp4', '/output/video.avi');
      
      expect(cmd[0]).toBe('ffmpeg');
      expect(cmd).toContain('-i');
      expect(cmd).toContain('/input/video.mp4');
      expect(cmd).toContain('-an');
      expect(cmd).toContain('-vcodec');
      expect(cmd).toContain('mjpeg');
      expect(cmd).toContain('-pix_fmt');
      expect(cmd).toContain('yuvj420p');
      expect(cmd).toContain('-q:v');
      expect(cmd).toContain('5'); // default quality
      expect(cmd[cmd.length - 1]).toBe('/output/video.avi');
    });

    it('should build AVI command with frame rate', () => {
      const cmd = builder.buildAviCmd('/input/video.mp4', '/output/video.avi', 25);
      
      expect(cmd).toContain('-r');
      expect(cmd).toContain('25');
    });

    it('should build AVI command with custom quality', () => {
      const cmd = builder.buildAviCmd('/input/video.mp4', '/output/video.avi', undefined, 3);
      
      const qvIndex = cmd.indexOf('-q:v');
      expect(qvIndex).toBeGreaterThan(-1);
      expect(cmd[qvIndex + 1]).toBe('3');
    });

    it('should have -an flag before frame rate', () => {
      const cmd = builder.buildAviCmd('/input/video.mp4', '/output/video.avi', 25);
      
      const anIndex = cmd.indexOf('-an');
      const rIndex = cmd.indexOf('-r');
      expect(anIndex).toBeLessThan(rIndex);
    });
  });

  describe('buildH264Cmd', () => {
    it('should build H264 command without frame rate', () => {
      const cmd = builder.buildH264Cmd('/input/video.mp4', '/output/video.h264');
      
      expect(cmd[0]).toBe('ffmpeg');
      expect(cmd).toContain('-i');
      expect(cmd).toContain('/input/video.mp4');
      expect(cmd).toContain('-c:v');
      expect(cmd).toContain('libx264');
      expect(cmd).toContain('-x264-params');
      expect(cmd).toContain('-an');
      expect(cmd).toContain('-f');
      expect(cmd).toContain('rawvideo');
      expect(cmd[cmd.length - 1]).toBe('/output/video.h264');
    });

    it('should build H264 command with frame rate before input', () => {
      const cmd = builder.buildH264Cmd('/input/video.mp4', '/output/video.h264', 30);
      
      const rIndex = cmd.indexOf('-r');
      const iIndex = cmd.indexOf('-i');
      expect(rIndex).toBeLessThan(iIndex);
      expect(cmd[rIndex + 1]).toBe('30');
    });

    it('should include CRF in x264-params', () => {
      const cmd = builder.buildH264Cmd('/input/video.mp4', '/output/video.h264', undefined, 18);
      
      const x264Index = cmd.indexOf('-x264-params');
      expect(x264Index).toBeGreaterThan(-1);
      const x264Params = cmd[x264Index + 1];
      expect(x264Params).toContain('crf=18');
    });

    it('should use default CRF of 23', () => {
      const cmd = builder.buildH264Cmd('/input/video.mp4', '/output/video.h264');
      
      const x264Index = cmd.indexOf('-x264-params');
      const x264Params = cmd[x264Index + 1];
      expect(x264Params).toContain('crf=23');
    });

    it('should have x264-params matching Python version format', () => {
      const cmd = builder.buildH264Cmd('/input/video.mp4', '/output/video.h264', undefined, 23);
      
      const x264Index = cmd.indexOf('-x264-params');
      const x264Params = cmd[x264Index + 1];
      
      // Verify key parameters from Python version
      expect(x264Params).toContain('cabac=0');
      expect(x264Params).toContain('ref=3');
      expect(x264Params).toContain('bframes=0');
      expect(x264Params).toContain('keyint=40');
      expect(x264Params).toContain('threads=11');
      expect(x264Params).toContain('aq-mode=1');
    });
  });
});
