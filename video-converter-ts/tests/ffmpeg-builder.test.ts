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

  describe('buildScaleCmd', () => {
    it('should build scale command with only width (auto height)', () => {
      const cmd = builder.buildScaleCmd('/input/video.mp4', '/output/scaled.mp4', { width: 1280 });

      expect(cmd[0]).toBe('ffmpeg');
      expect(cmd).toContain('-i');
      expect(cmd).toContain('/input/video.mp4');
      expect(cmd).toContain('-vf');
      const vfIdx = cmd.indexOf('-vf');
      expect(cmd[vfIdx + 1]).toBe('scale=1280:-2');
      expect(cmd[cmd.length - 1]).toBe('/output/scaled.mp4');
    });

    it('should build scale command with only height (auto width)', () => {
      const cmd = builder.buildScaleCmd('/input/video.mp4', '/output/scaled.mp4', { height: 720 });

      const vfIdx = cmd.indexOf('-vf');
      expect(cmd[vfIdx + 1]).toBe('scale=-2:720');
    });

    it('should build scale command with both dimensions (exact resize)', () => {
      const cmd = builder.buildScaleCmd('/input/video.mp4', '/output/scaled.mp4', { width: 1280, height: 720 });

      const vfIdx = cmd.indexOf('-vf');
      expect(cmd[vfIdx + 1]).toBe('scale=1280:720');
    });

    it('should use libx264 codec with CRF 18', () => {
      const cmd = builder.buildScaleCmd('/input/video.mp4', '/output/scaled.mp4', { width: 640 });

      expect(cmd).toContain('-c:v');
      const cvIdx = cmd.indexOf('-c:v');
      expect(cmd[cvIdx + 1]).toBe('libx264');
      expect(cmd).toContain('-crf');
      const crfIdx = cmd.indexOf('-crf');
      expect(cmd[crfIdx + 1]).toBe('18');
    });

    it('should use fast preset for encoding speed', () => {
      const cmd = builder.buildScaleCmd('/input/video.mp4', '/output/scaled.mp4', { width: 640 });

      expect(cmd).toContain('-preset');
      const presetIdx = cmd.indexOf('-preset');
      expect(cmd[presetIdx + 1]).toBe('fast');
    });

    it('should set output as last argument', () => {
      const cmd = builder.buildScaleCmd('/input/video.mp4', '/output/scaled.mp4', { width: 640 });
      expect(cmd[cmd.length - 1]).toBe('/output/scaled.mp4');
    });
  });

  describe('buildCropCmd', () => {
    it('should build crop command with centered crop (no x/y)', () => {
      const cmd = builder.buildCropCmd('/input/video.mp4', '/output/cropped.mp4', { width: 640, height: 360 });

      expect(cmd[0]).toBe('ffmpeg');
      expect(cmd).toContain('-i');
      expect(cmd).toContain('/input/video.mp4');
      expect(cmd).toContain('-vf');
      const vfIdx = cmd.indexOf('-vf');
      expect(cmd[vfIdx + 1]).toBe('crop=640:360');
      expect(cmd[cmd.length - 1]).toBe('/output/cropped.mp4');
    });

    it('should build crop command with explicit x and y', () => {
      const cmd = builder.buildCropCmd('/input/video.mp4', '/output/cropped.mp4', { width: 640, height: 360, x: 100, y: 50 });

      const vfIdx = cmd.indexOf('-vf');
      expect(cmd[vfIdx + 1]).toBe('crop=640:360:100:50');
    });

    it('should build crop command with only x provided (y auto-centered)', () => {
      const cmd = builder.buildCropCmd('/input/video.mp4', '/output/cropped.mp4', { width: 640, height: 360, x: 100 });

      const vfIdx = cmd.indexOf('-vf');
      expect(cmd[vfIdx + 1]).toBe('crop=640:360:100:(in_h-360)/2');
    });

    it('should build crop command with only y provided (x auto-centered)', () => {
      const cmd = builder.buildCropCmd('/input/video.mp4', '/output/cropped.mp4', { width: 640, height: 360, y: 50 });

      const vfIdx = cmd.indexOf('-vf');
      expect(cmd[vfIdx + 1]).toBe('crop=640:360:(in_w-640)/2:50');
    });

    it('should use libx264 codec with CRF 18 and fast preset', () => {
      const cmd = builder.buildCropCmd('/input/video.mp4', '/output/cropped.mp4', { width: 640, height: 360 });

      expect(cmd).toContain('-c:v');
      expect(cmd[cmd.indexOf('-c:v') + 1]).toBe('libx264');
      expect(cmd).toContain('-crf');
      expect(cmd[cmd.indexOf('-crf') + 1]).toBe('18');
      expect(cmd).toContain('-preset');
      expect(cmd[cmd.indexOf('-preset') + 1]).toBe('fast');
    });

    it('should set crop output as last argument', () => {
      const cmd = builder.buildCropCmd('/input/video.mp4', '/output/cropped.mp4', { width: 320, height: 180 });
      expect(cmd[cmd.length - 1]).toBe('/output/cropped.mp4');
    });
  });

  describe('backgroundColor support (GIF transparency)', () => {
    describe('buildMjpegFramesCmd with backgroundColor', () => {
      it('should use filter_complex instead of -vf when backgroundColor is provided', () => {
        const cmd = builder.buildMjpegFramesCmd('/input/animation.gif', '/output/frames', 10, 5, '#FFFFFF');

        expect(cmd).toContain('-filter_complex');
        expect(cmd).not.toContain('-vf');
      });

      it('should include lavfi color source input when backgroundColor is provided', () => {
        const cmd = builder.buildMjpegFramesCmd('/input/animation.gif', '/output/frames', 10, 5, '#FFFFFF');

        expect(cmd).toContain('-f');
        expect(cmd).toContain('lavfi');
        expect(cmd).toContain('color=c=#FFFFFF');
      });

      it('should use scale2ref overlay with shortest=1 in filter_complex', () => {
        const cmd = builder.buildMjpegFramesCmd('/input/animation.gif', '/output/frames', 10, 5, '#FFFFFF');

        const fcIdx = cmd.indexOf('-filter_complex');
        const filterGraph = cmd[fcIdx + 1];
        expect(filterGraph).toContain('scale2ref');
        expect(filterGraph).toContain('overlay=shortest=1');
        expect(filterGraph).toContain('format=yuvj420p');
      });

      it('should map the composited output stream', () => {
        const cmd = builder.buildMjpegFramesCmd('/input/animation.gif', '/output/frames', 10, 5, 'white');

        expect(cmd).toContain('-map');
        expect(cmd).toContain('[out]');
      });

      it('should still include frame rate and quality parameters', () => {
        const cmd = builder.buildMjpegFramesCmd('/input/animation.gif', '/output/frames', 10, 3, '#000000');

        expect(cmd).toContain('-r');
        expect(cmd[cmd.indexOf('-r') + 1]).toBe('10');
        expect(cmd).toContain('-q:v');
        expect(cmd[cmd.indexOf('-q:v') + 1]).toBe('3');
      });

      it('should not use filter_complex without backgroundColor (standard path unchanged)', () => {
        const cmd = builder.buildMjpegFramesCmd('/input/video.mp4', '/output/frames');

        expect(cmd).toContain('-vf');
        expect(cmd).not.toContain('-filter_complex');
      });
    });

    describe('buildAviCmd with backgroundColor', () => {
      it('should use filter_complex when backgroundColor is provided', () => {
        const cmd = builder.buildAviCmd('/input/animation.gif', '/output/video.avi', 10, 5, '#FFFFFF');

        expect(cmd).toContain('-filter_complex');
        expect(cmd).not.toContain('-vf');
      });

      it('should include lavfi color source and overlay=shortest=1', () => {
        const cmd = builder.buildAviCmd('/input/animation.gif', '/output/video.avi', 10, 5, 'white');

        expect(cmd).toContain('lavfi');
        const fcIdx = cmd.indexOf('-filter_complex');
        const filterGraph = cmd[fcIdx + 1];
        expect(filterGraph).toContain('overlay=shortest=1');
      });

      it('should still include -an, -vcodec mjpeg, -pix_fmt yuvj420p', () => {
        const cmd = builder.buildAviCmd('/input/animation.gif', '/output/video.avi', 10, 5, '#FFFFFF');

        expect(cmd).toContain('-an');
        expect(cmd).toContain('-vcodec');
        expect(cmd[cmd.indexOf('-vcodec') + 1]).toBe('mjpeg');
        expect(cmd).toContain('-pix_fmt');
        expect(cmd[cmd.indexOf('-pix_fmt') + 1]).toBe('yuvj420p');
      });
    });

    describe('buildH264Cmd with backgroundColor', () => {
      it('should use filter_complex when backgroundColor is provided', () => {
        const cmd = builder.buildH264Cmd('/input/animation.gif', '/output/video.h264', 10, 23, '#FFFFFF');

        expect(cmd).toContain('-filter_complex');
      });

      it('should include lavfi color source and overlay=shortest=1', () => {
        const cmd = builder.buildH264Cmd('/input/animation.gif', '/output/video.h264', 10, 23, 'black');

        expect(cmd).toContain('lavfi');
        const fcIdx = cmd.indexOf('-filter_complex');
        const filterGraph = cmd[fcIdx + 1];
        expect(filterGraph).toContain('overlay=shortest=1');
      });

      it('should keep -r before the first -i even with backgroundColor', () => {
        const cmd = builder.buildH264Cmd('/input/animation.gif', '/output/video.h264', 10, 23, '#FFFFFF');

        const rIdx = cmd.indexOf('-r');
        const iIdx = cmd.indexOf('-i');
        expect(rIdx).toBeGreaterThan(-1);
        expect(rIdx).toBeLessThan(iIdx);
      });

      it('should still use libx264 and include x264-params with CRF', () => {
        const cmd = builder.buildH264Cmd('/input/animation.gif', '/output/video.h264', 10, 18, '#FFFFFF');

        expect(cmd).toContain('-c:v');
        expect(cmd[cmd.indexOf('-c:v') + 1]).toBe('libx264');
        const x264Idx = cmd.indexOf('-x264-params');
        expect(cmd[x264Idx + 1]).toContain('crf=18');
      });
    });
  });

  describe('buildAviMsv1Cmd', () => {
    it('should build basic MSV1 AVI command', () => {
      const cmd = builder.buildAviMsv1Cmd('/input/video.mp4', '/output/video.avi');

      expect(cmd[0]).toBe('ffmpeg');
      expect(cmd).toContain('-i');
      expect(cmd).toContain('/input/video.mp4');
      expect(cmd).toContain('-an');
      expect(cmd).toContain('-vf');
      expect(cmd[cmd.indexOf('-vf') + 1]).toContain('trunc(iw/4)*4');
      expect(cmd).toContain('-vcodec');
      expect(cmd[cmd.indexOf('-vcodec') + 1]).toBe('msvideo1');
      expect(cmd).toContain('-pix_fmt');
      expect(cmd[cmd.indexOf('-pix_fmt') + 1]).toBe('rgb555le');
      expect(cmd).toContain('-q:v');
      expect(cmd[cmd.indexOf('-q:v') + 1]).toBe('1'); // default quality
      expect(cmd[cmd.length - 1]).toBe('/output/video.avi');
    });

    it('should include -r when frameRate is specified', () => {
      const cmd = builder.buildAviMsv1Cmd('/input/video.mp4', '/output/video.avi', 15);

      expect(cmd).toContain('-r');
      expect(cmd[cmd.indexOf('-r') + 1]).toBe('15');
    });

    it('should omit -r when frameRate is undefined', () => {
      const cmd = builder.buildAviMsv1Cmd('/input/video.mp4', '/output/video.avi', undefined);

      expect(cmd).not.toContain('-r');
    });

    it('should use custom quality value', () => {
      const cmd = builder.buildAviMsv1Cmd('/input/video.mp4', '/output/video.avi', undefined, 10);

      expect(cmd[cmd.indexOf('-q:v') + 1]).toBe('10');
    });

    it('should not use filter_complex when no backgroundColor', () => {
      const cmd = builder.buildAviMsv1Cmd('/input/video.mp4', '/output/video.avi');

      expect(cmd).not.toContain('-filter_complex');
      expect(cmd).not.toContain('lavfi');
      // standard path uses -vf for dimension alignment
      expect(cmd).toContain('-vf');
    });

    describe('buildAviMsv1Cmd with backgroundColor (GIF transparency)', () => {
      it('should use filter_complex when backgroundColor is provided', () => {
        const cmd = builder.buildAviMsv1Cmd('/input/animation.gif', '/output/video.avi', 10, 1, 'white');

        expect(cmd).toContain('-filter_complex');
        expect(cmd).not.toContain('-vf');
      });

      it('should include lavfi color source with the given color', () => {
        const cmd = builder.buildAviMsv1Cmd('/input/animation.gif', '/output/video.avi', 10, 1, '#FF0000');

        const lavfiIdx = cmd.indexOf('lavfi');
        expect(lavfiIdx).toBeGreaterThan(-1);
        // cmd layout: ... '-f', 'lavfi', '-i', 'color=c=#FF0000' ...
        expect(cmd[lavfiIdx + 2]).toContain('#FF0000');
      });

      it('should include overlay=shortest=1 and msv1 scale alignment in filter_complex', () => {
        const cmd = builder.buildAviMsv1Cmd('/input/animation.gif', '/output/video.avi', 10, 1, 'white');

        const fcIdx = cmd.indexOf('-filter_complex');
        const filterGraph = cmd[fcIdx + 1];
        expect(filterGraph).toContain('overlay=shortest=1');
        expect(filterGraph).toContain('trunc(iw/4)*4');
      });

      it('should include -map [out]', () => {
        const cmd = builder.buildAviMsv1Cmd('/input/animation.gif', '/output/video.avi', 10, 1, 'white');

        const mapIdx = cmd.indexOf('-map');
        expect(mapIdx).toBeGreaterThan(-1);
        expect(cmd[mapIdx + 1]).toBe('[out]');
      });

      it('should use msvideo1 codec and rgb555le pixel format with backgroundColor', () => {
        const cmd = builder.buildAviMsv1Cmd('/input/animation.gif', '/output/video.avi', 10, 1, 'black');

        expect(cmd).toContain('-an');
        expect(cmd[cmd.indexOf('-vcodec') + 1]).toBe('msvideo1');
        expect(cmd[cmd.indexOf('-pix_fmt') + 1]).toBe('rgb555le');
      });

      it('should include -r after -map when frameRate is set with backgroundColor', () => {
        const cmd = builder.buildAviMsv1Cmd('/input/animation.gif', '/output/video.avi', 25, 1, 'white');

        expect(cmd).toContain('-r');
        // -r should appear after -map [out]
        const mapIdx = cmd.indexOf('-map');
        const rIdx = cmd.indexOf('-r');
        expect(rIdx).toBeGreaterThan(mapIdx);
      });

      it('standard path should be unchanged when no backgroundColor', () => {
        const cmd = builder.buildAviMsv1Cmd('/input/video.mp4', '/output/video.avi', 24, 5);

        expect(cmd).not.toContain('-filter_complex');
        expect(cmd).not.toContain('lavfi');
        expect(cmd[cmd.indexOf('-vcodec') + 1]).toBe('msvideo1');
        expect(cmd[cmd.indexOf('-pix_fmt') + 1]).toBe('rgb555le');
        expect(cmd).toContain('-vf');
      });
    });
  });

  describe('buildAviCinepakCmd', () => {
    it('should build basic Cinepak AVI command', () => {
      const cmd = builder.buildAviCinepakCmd('/input/video.mp4', '/output/video.avi');

      expect(cmd[0]).toBe('ffmpeg');
      expect(cmd).toContain('-i');
      expect(cmd).toContain('/input/video.mp4');
      expect(cmd).toContain('-an');
      expect(cmd).toContain('-vf');
      expect(cmd[cmd.indexOf('-vf') + 1]).toContain('trunc(iw/4)*4');
      expect(cmd).toContain('-vcodec');
      expect(cmd[cmd.indexOf('-vcodec') + 1]).toBe('cinepak');
      expect(cmd).toContain('-pix_fmt');
      expect(cmd[cmd.indexOf('-pix_fmt') + 1]).toBe('rgb24');
      expect(cmd).toContain('-q:v');
      expect(cmd[cmd.indexOf('-q:v') + 1]).toBe('1'); // default quality
      expect(cmd[cmd.length - 1]).toBe('/output/video.avi');
    });

    it('should include -r when frameRate is specified', () => {
      const cmd = builder.buildAviCinepakCmd('/input/video.mp4', '/output/video.avi', 15);

      expect(cmd).toContain('-r');
      expect(cmd[cmd.indexOf('-r') + 1]).toBe('15');
    });

    it('should omit -r when frameRate is undefined', () => {
      const cmd = builder.buildAviCinepakCmd('/input/video.mp4', '/output/video.avi', undefined);

      expect(cmd).not.toContain('-r');
    });

    it('should use custom quality value', () => {
      const cmd = builder.buildAviCinepakCmd('/input/video.mp4', '/output/video.avi', undefined, 10);

      expect(cmd[cmd.indexOf('-q:v') + 1]).toBe('10');
    });

    it('should include 4x4 dimension alignment in -vf', () => {
      const cmd = builder.buildAviCinepakCmd('/input/video.mp4', '/output/video.avi');

      const vfIdx = cmd.indexOf('-vf');
      const filterVal = cmd[vfIdx + 1];
      expect(filterVal).toBe('scale=trunc(iw/4)*4:trunc(ih/4)*4');
    });

    it('should not use filter_complex when no backgroundColor', () => {
      const cmd = builder.buildAviCinepakCmd('/input/video.mp4', '/output/video.avi');

      expect(cmd).not.toContain('-filter_complex');
      expect(cmd).not.toContain('lavfi');
      expect(cmd).toContain('-vf');
    });

    describe('buildAviCinepakCmd with backgroundColor (GIF transparency)', () => {
      it('should use filter_complex when backgroundColor is provided', () => {
        const cmd = builder.buildAviCinepakCmd('/input/animation.gif', '/output/video.avi', 10, 1, 'white');

        expect(cmd).toContain('-filter_complex');
        expect(cmd).not.toContain('-vf');
      });

      it('should include lavfi color source with the given color', () => {
        const cmd = builder.buildAviCinepakCmd('/input/animation.gif', '/output/video.avi', 10, 1, '#FF0000');

        const lavfiIdx = cmd.indexOf('lavfi');
        expect(lavfiIdx).toBeGreaterThan(-1);
        // cmd layout: ... '-f', 'lavfi', '-i', 'color=c=#FF0000' ...
        expect(cmd[lavfiIdx + 2]).toContain('#FF0000');
      });

      it('should include overlay=shortest=1 and cinepak scale alignment in filter_complex', () => {
        const cmd = builder.buildAviCinepakCmd('/input/animation.gif', '/output/video.avi', 10, 1, 'white');

        const fcIdx = cmd.indexOf('-filter_complex');
        const filterGraph = cmd[fcIdx + 1];
        expect(filterGraph).toContain('overlay=shortest=1');
        expect(filterGraph).toContain('trunc(iw/4)*4');
      });

      it('should include setsar=1 after scale to prevent SAR inheritance from color source', () => {
        const cmd = builder.buildAviCinepakCmd('/input/animation.gif', '/output/video.avi', 10, 1, 'white');

        const fcIdx = cmd.indexOf('-filter_complex');
        const filterGraph = cmd[fcIdx + 1];
        // setsar=1 prevents color=c= source SAR (4:3) from propagating to the
        // output, which causes right-side stripe artifacts in the Windows Cinepak decoder
        expect(filterGraph).toContain('setsar=1');
        expect(filterGraph).toContain('scale=trunc(iw/4)*4:trunc(ih/4)*4,setsar=1');
      });

      it('should include -map [out]', () => {
        const cmd = builder.buildAviCinepakCmd('/input/animation.gif', '/output/video.avi', 10, 1, 'white');

        const mapIdx = cmd.indexOf('-map');
        expect(mapIdx).toBeGreaterThan(-1);
        expect(cmd[mapIdx + 1]).toBe('[out]');
      });

      it('should use cinepak codec and rgb24 pixel format with backgroundColor', () => {
        const cmd = builder.buildAviCinepakCmd('/input/animation.gif', '/output/video.avi', 10, 1, 'black');

        expect(cmd).toContain('-an');
        expect(cmd[cmd.indexOf('-vcodec') + 1]).toBe('cinepak');
        expect(cmd[cmd.indexOf('-pix_fmt') + 1]).toBe('rgb24');
      });

      it('should include -r after -map when frameRate is set with backgroundColor', () => {
        const cmd = builder.buildAviCinepakCmd('/input/animation.gif', '/output/video.avi', 25, 1, 'white');

        expect(cmd).toContain('-r');
        const mapIdx = cmd.indexOf('-map');
        const rIdx = cmd.indexOf('-r');
        expect(rIdx).toBeGreaterThan(mapIdx);
      });

      it('standard path should be unchanged when no backgroundColor', () => {
        const cmd = builder.buildAviCinepakCmd('/input/video.mp4', '/output/video.avi', 24, 5);

        expect(cmd).not.toContain('-filter_complex');
        expect(cmd).not.toContain('lavfi');
        expect(cmd[cmd.indexOf('-vcodec') + 1]).toBe('cinepak');
        expect(cmd[cmd.indexOf('-pix_fmt') + 1]).toBe('rgb24');
        expect(cmd).toContain('-vf');
      });
    });
  });
});
