/**
 * VideoParser unit tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VideoParser } from '../src/parser.js';
import { VideoFormatError, FFmpegNotFoundError } from '../src/errors.js';
import * as fs from 'fs';
import * as childProcess from 'child_process';

// Mock child_process.execFile
vi.mock('child_process', async () => {
  const actual = await vi.importActual('child_process');
  return {
    ...actual,
    execFile: vi.fn()
  };
});

// Mock fs.existsSync
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn()
  };
});

describe('VideoParser', () => {
  let parser: VideoParser;
  const mockExecFile = vi.mocked(childProcess.execFile);
  const mockExistsSync = vi.mocked(fs.existsSync);

  beforeEach(() => {
    parser = new VideoParser();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create mock execFile implementation
  const mockExecFileSuccess = (stdout: string) => {
    mockExecFile.mockImplementation(((
      _cmd: string,
      _args: string[],
      _options: object,
      callback?: (error: Error | null, result: { stdout: string; stderr: string }) => void
    ) => {
      if (callback) {
        callback(null, { stdout, stderr: '' });
      }
      return {} as childProcess.ChildProcess;
    }) as typeof childProcess.execFile);
  };

  const mockExecFileError = (error: Error) => {
    mockExecFile.mockImplementation(((
      _cmd: string,
      _args: string[],
      _options: object,
      callback?: (error: Error | null, result: { stdout: string; stderr: string }) => void
    ) => {
      if (callback) {
        callback(error, { stdout: '', stderr: '' });
      }
      return {} as childProcess.ChildProcess;
    }) as typeof childProcess.execFile);
  };

  describe('parse()', () => {
    it('should throw error for non-existent file', async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(parser.parse('/path/to/nonexistent.mp4')).rejects.toThrow('文件不存在');
    });

    it('should throw FFmpegNotFoundError when ffprobe is not available', async () => {
      mockExistsSync.mockReturnValue(true);
      
      // First call for version check fails
      const enoentError = new Error('ENOENT') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockExecFileError(enoentError);

      await expect(parser.parse('/path/to/video.mp4')).rejects.toThrow(FFmpegNotFoundError);
    });

    it('should parse valid video file with fraction frame rate', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          avg_frame_rate: '30000/1001',
          nb_frames: '300',
          duration: '10.0'
        }],
        format: {
          duration: '10.0'
        }
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      const info = await parser.parse('/path/to/video.mp4');

      expect(info.width).toBe(1920);
      expect(info.height).toBe(1080);
      expect(info.frameRate).toBeCloseTo(29.97, 2);
      expect(info.frameCount).toBe(300);
      expect(info.codec).toBe('h264');
    });

    it('should parse valid video file with decimal frame rate', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'mjpeg',
          width: 640,
          height: 480,
          avg_frame_rate: '25',
          nb_frames: '250',
          duration: '10.0'
        }],
        format: {
          duration: '10.0'
        }
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      const info = await parser.parse('/path/to/video.avi');

      expect(info.width).toBe(640);
      expect(info.height).toBe(480);
      expect(info.frameRate).toBe(25);
      expect(info.frameCount).toBe(250);
      expect(info.codec).toBe('mjpeg');
    });

    it('should calculate frame count from duration when nb_frames is not available', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 1280,
          height: 720,
          avg_frame_rate: '30/1',
          duration: '10.0'
          // nb_frames is not present
        }],
        format: {
          duration: '10.0'
        }
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      const info = await parser.parse('/path/to/video.mp4');

      expect(info.frameCount).toBe(300); // 30 fps * 10 seconds
    });

    it('should use r_frame_rate when avg_frame_rate is invalid', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 1280,
          height: 720,
          avg_frame_rate: '0/0',
          r_frame_rate: '24000/1001',
          nb_frames: '240',
          duration: '10.0'
        }],
        format: {
          duration: '10.0'
        }
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      const info = await parser.parse('/path/to/video.mp4');

      expect(info.frameRate).toBeCloseTo(23.976, 2);
    });

    it('should throw VideoFormatError when no video stream is found', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'audio',
          codec_name: 'aac'
        }],
        format: {
          duration: '10.0'
        }
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      await expect(parser.parse('/path/to/audio.mp3')).rejects.toThrow(VideoFormatError);
      await expect(parser.parse('/path/to/audio.mp3')).rejects.toThrow('未找到视频流');
    });

    it('should throw VideoFormatError for invalid video dimensions', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 0,
          height: 0,
          avg_frame_rate: '30/1',
          nb_frames: '300'
        }],
        format: {}
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      await expect(parser.parse('/path/to/invalid.mp4')).rejects.toThrow(VideoFormatError);
      await expect(parser.parse('/path/to/invalid.mp4')).rejects.toThrow('无效的视频尺寸');
    });

    it('should throw VideoFormatError for invalid frame rate', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          avg_frame_rate: '0/0',
          r_frame_rate: '0/0',
          nb_frames: '300'
        }],
        format: {}
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      await expect(parser.parse('/path/to/invalid.mp4')).rejects.toThrow(VideoFormatError);
      await expect(parser.parse('/path/to/invalid.mp4')).rejects.toThrow('无效的帧率');
    });

    it('should throw VideoFormatError for invalid frame count', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          avg_frame_rate: '30/1',
          nb_frames: '0'
          // No duration to calculate from
        }],
        format: {}
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      await expect(parser.parse('/path/to/invalid.mp4')).rejects.toThrow(VideoFormatError);
      await expect(parser.parse('/path/to/invalid.mp4')).rejects.toThrow('无效的帧数');
    });

    describe('GIF input handling', () => {
      it('should derive frame rate from nb_frames/duration when avg_frame_rate is "0/0" and r_frame_rate is bogus "100/1"', async () => {
        mockExistsSync.mockReturnValue(true);

        const ffprobeOutput = {
          streams: [{
            codec_type: 'video',
            codec_name: 'gif',
            width: 320,
            height: 240,
            avg_frame_rate: '0/0',
            r_frame_rate: '100/1',  // GIF centisecond-based bogus value
            nb_frames: '30',
            duration: '3.0'
          }],
          format: { duration: '3.0' }
        };

        mockExecFileSuccess(JSON.stringify(ffprobeOutput));

        const info = await parser.parse('/path/to/animation.gif');
        expect(info.frameRate).toBeCloseTo(10, 5);  // 30 / 3.0
        expect(info.frameCount).toBe(30);
        expect(info.codec).toBe('gif');
        expect(info.width).toBe(320);
        expect(info.height).toBe(240);
      });

      it('should derive frame rate from nb_frames/duration when avg_frame_rate is absent', async () => {
        mockExistsSync.mockReturnValue(true);

        const ffprobeOutput = {
          streams: [{
            codec_type: 'video',
            codec_name: 'gif',
            width: 200,
            height: 150,
            r_frame_rate: '100/1',
            nb_frames: '50',
            duration: '5.0'
          }],
          format: { duration: '5.0' }
        };

        mockExecFileSuccess(JSON.stringify(ffprobeOutput));

        const info = await parser.parse('/path/to/animation.gif');
        expect(info.frameRate).toBeCloseTo(10, 5);  // 50 / 5.0
        expect(info.frameCount).toBe(50);
      });

      it('should use valid avg_frame_rate when present for GIF', async () => {
        mockExistsSync.mockReturnValue(true);

        const ffprobeOutput = {
          streams: [{
            codec_type: 'video',
            codec_name: 'gif',
            width: 480,
            height: 270,
            avg_frame_rate: '25/1',
            r_frame_rate: '100/1',
            nb_frames: '250',
            duration: '10.0'
          }],
          format: { duration: '10.0' }
        };

        mockExecFileSuccess(JSON.stringify(ffprobeOutput));

        const info = await parser.parse('/path/to/animation.gif');
        expect(info.frameRate).toBe(25);  // Should use avg_frame_rate when valid
        expect(info.frameCount).toBe(250);
      });

      it('should throw VideoFormatError for GIF with no usable frame rate metadata', async () => {
        mockExistsSync.mockReturnValue(true);

        const ffprobeOutput = {
          streams: [{
            codec_type: 'video',
            codec_name: 'gif',
            width: 100,
            height: 100,
            avg_frame_rate: '0/0',
            r_frame_rate: '100/1',
            // No nb_frames, no duration
          }],
          format: {}
        };

        mockExecFileSuccess(JSON.stringify(ffprobeOutput));

        await expect(parser.parse('/path/to/bad.gif')).rejects.toThrow(VideoFormatError);
      });
    });
  });

  describe('parseFrameRate()', () => {
    // Test frame rate parsing through the parse method
    it('should handle simple fraction format (30/1)', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          avg_frame_rate: '30/1',
          nb_frames: '300',
          duration: '10.0'
        }],
        format: { duration: '10.0' }
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      const info = await parser.parse('/path/to/video.mp4');
      expect(info.frameRate).toBe(30);
    });

    it('should handle NTSC fraction format (30000/1001)', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          avg_frame_rate: '30000/1001',
          nb_frames: '300',
          duration: '10.0'
        }],
        format: { duration: '10.0' }
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      const info = await parser.parse('/path/to/video.mp4');
      expect(info.frameRate).toBeCloseTo(29.97, 2);
    });

    it('should handle 24fps film format (24000/1001)', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          avg_frame_rate: '24000/1001',
          nb_frames: '240',
          duration: '10.0'
        }],
        format: { duration: '10.0' }
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      const info = await parser.parse('/path/to/video.mp4');
      expect(info.frameRate).toBeCloseTo(23.976, 2);
    });
  });

  describe('parseFrameCount()', () => {
    it('should prefer nb_frames when available', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          avg_frame_rate: '30/1',
          nb_frames: '500',  // Explicit frame count
          duration: '10.0'   // Would calculate to 300 frames
        }],
        format: { duration: '10.0' }
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      const info = await parser.parse('/path/to/video.mp4');
      expect(info.frameCount).toBe(500);  // Should use nb_frames, not calculated
    });

    it('should calculate from duration * fps when nb_frames is missing', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          avg_frame_rate: '25/1',
          duration: '12.0'
          // nb_frames not present
        }],
        format: { duration: '12.0' }
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      const info = await parser.parse('/path/to/video.mp4');
      expect(info.frameCount).toBe(300);  // 25 fps * 12 seconds = 300
    });

    it('should use format duration when stream duration is missing', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const ffprobeOutput = {
        streams: [{
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          avg_frame_rate: '30/1'
          // No stream duration or nb_frames
        }],
        format: { duration: '5.0' }
      };

      mockExecFileSuccess(JSON.stringify(ffprobeOutput));

      const info = await parser.parse('/path/to/video.mp4');
      expect(info.frameCount).toBe(150);  // 30 fps * 5 seconds = 150
    });
  });
});
