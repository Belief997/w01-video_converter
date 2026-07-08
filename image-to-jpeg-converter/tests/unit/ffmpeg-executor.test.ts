/**
 * Unit tests for the FFmpegExecutor class.
 * 
 * Tests FFmpeg command construction, execution, and error handling:
 * - Command building for different sampling factors
 * - Pixel format mapping (400→gray, 420→yuvj420p, 422→yuvj422p, 444→yuvj444p)
 * - Quality parameter handling
 * - FFmpeg execution and output validation
 * - Error handling (FFmpeg not found, non-zero exit code, invalid output)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FFmpegExecutor } from '../../src/ffmpeg-executor.js';
import { ConversionConfig, SamplingFactor } from '../../src/types.js';

describe('FFmpegExecutor', () => {
  let executor: FFmpegExecutor;
  let tempDir: string;

  beforeEach(() => {
    executor = new FFmpegExecutor();
    
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ffmpeg-executor-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('buildCommand', () => {
    it('should build command for sampling factor 400 (Grayscale)', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.Grayscale,
        quality: 10,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');

      expect(command).toContain('ffmpeg');
      expect(command).toContain('-i');
      expect(command).toContain('/path/to/input.png');
      expect(command).toContain('-pix_fmt');
      expect(command).toContain('gray'); // 400 → gray
      expect(command).toContain('-q:v');
      expect(command).toContain('10');
      expect(command).toContain('-y');
      expect(command).toContain('/tmp/output.jpg');
    });

    it('should build command for sampling factor 420 (YUV420)', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');

      expect(command).toContain('ffmpeg');
      expect(command).toContain('-pix_fmt');
      expect(command).toContain('yuvj420p'); // 420 → yuvj420p
    });

    it('should build command for sampling factor 422 (YUV422)', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV422,
        quality: 10,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');

      expect(command).toContain('ffmpeg');
      expect(command).toContain('-pix_fmt');
      expect(command).toContain('yuvj422p'); // 422 → yuvj422p
    });

    it('should build command for sampling factor 444 (YUV444)', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV444,
        quality: 10,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');

      expect(command).toContain('ffmpeg');
      expect(command).toContain('-pix_fmt');
      expect(command).toContain('yuvj444p'); // 444 → yuvj444p
    });

    it('should use provided quality value', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 5,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');

      expect(command).toContain('-q:v');
      expect(command).toContain('5');
    });

    it('should use default quality when not provided', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV420,
        // quality not provided
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');

      expect(command).toContain('-q:v');
      // Default for YUV420 should be 10
      expect(command).toContain('10');
    });

    it('should include overwrite flag (-y)', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');

      expect(command).toContain('-y');
    });

    it('should include all required parameters in correct order', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');

      // Verify command structure
      expect(command[0]).toBe('ffmpeg');
      expect(command).toContain('-i');
      expect(command).toContain('-pix_fmt');
      expect(command).toContain('-q:v');
      expect(command).toContain('-y');
      
      // Verify input file comes after -i
      const inputIndex = command.indexOf('-i');
      expect(command[inputIndex + 1]).toBe('/path/to/input.png');
      
      // Verify pixel format comes after -pix_fmt
      const pixFmtIndex = command.indexOf('-pix_fmt');
      expect(command[pixFmtIndex + 1]).toBe('yuvj420p');
      
      // Verify quality comes after -q:v
      const qualityIndex = command.indexOf('-q:v');
      expect(command[qualityIndex + 1]).toBe('10');
      
      // Verify output path is last
      expect(command[command.length - 1]).toBe('/tmp/output.jpg');
    });
  });

  describe('buildCommand - MCU alignment (pad filter)', () => {
    it('adds no pad filter when alignTo is omitted (standard branch)', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.bmp', // non-transparent → -vf branch
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');

      expect(command).not.toContain('-vf');
      expect(command.join(' ')).not.toContain('pad=');
    });

    it('adds a -vf pad filter for non-transparent input when alignTo is set', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.bmp', // non-transparent → -vf branch
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg', {
        width: 688,
        height: 688,
      });

      expect(command).toContain('-vf');
      const vfIndex = command.indexOf('-vf');
      expect(command[vfIndex + 1]).toBe('pad=688:688:0:0:black');
      // Pad must come before the pixel format / quality args.
      expect(vfIndex).toBeLessThan(command.indexOf('-pix_fmt'));
    });

    it('chains the pad filter into filter_complex for transparent input', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png', // transparent → filter_complex branch
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg', {
        width: 688,
        height: 688,
      });

      const fcIndex = command.indexOf('-filter_complex');
      expect(fcIndex).toBeGreaterThan(-1);
      const filter = command[fcIndex + 1];
      expect(filter).toContain('overlay=format=auto');
      expect(filter).toContain('pad=688:688:0:0:black[out]');
      // The padded output must be mapped explicitly.
      expect(command).toContain('-map');
      expect(command[command.indexOf('-map') + 1]).toBe('[out]');
    });

    it('does not map [out] for transparent input when alignTo is omitted', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');

      expect(command).not.toContain('-map');
      expect(command.join(' ')).not.toContain('pad=');
    });

    it('uses per-factor MCU dimensions passed by the caller', () => {
      // The executor pads to exactly what it is told; here 422 → 16×8 grid.
      const config: ConversionConfig = {
        inputPath: '/path/to/input.bmp',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV422,
        quality: 10,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg', {
        width: 112,
        height: 56,
      });

      const vfIndex = command.indexOf('-vf');
      expect(command[vfIndex + 1]).toBe('pad=112:56:0:0:black');
    });
  });

  describe('convert - command construction validation', () => {
    it('should construct correct command for each sampling factor', () => {
      const testCases = [
        { factor: SamplingFactor.Grayscale, expectedFormat: 'gray' },
        { factor: SamplingFactor.YUV420, expectedFormat: 'yuvj420p' },
        { factor: SamplingFactor.YUV422, expectedFormat: 'yuvj422p' },
        { factor: SamplingFactor.YUV444, expectedFormat: 'yuvj444p' },
      ];

      testCases.forEach(({ factor, expectedFormat }) => {
        const config: ConversionConfig = {
          inputPath: '/path/to/input.png',
          outputPath: '/path/to/output.jpg',
          samplingFactor: factor,
          quality: 10,
        };

        const command = executor.buildCommand(config, '/tmp/output.jpg');
        
        expect(command).toContain('-pix_fmt');
        expect(command).toContain(expectedFormat);
      });
    });
  });

  describe('default quality values', () => {
    it('should use appropriate default quality for Grayscale (400)', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.Grayscale,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');
      
      // Default for Grayscale should be 15
      expect(command).toContain('15');
    });

    it('should use appropriate default quality for YUV420 (420)', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');
      
      // Default for YUV420 should be 10
      expect(command).toContain('10');
    });

    it('should use appropriate default quality for YUV422 (422)', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV422,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');
      
      // Default for YUV422 should be 8
      expect(command).toContain('8');
    });

    it('should use appropriate default quality for YUV444 (444)', () => {
      const config: ConversionConfig = {
        inputPath: '/path/to/input.png',
        outputPath: '/path/to/output.jpg',
        samplingFactor: SamplingFactor.YUV444,
      };

      const command = executor.buildCommand(config, '/tmp/output.jpg');
      
      // Default for YUV444 should be 5
      expect(command).toContain('5');
    });
  });

  describe('convert - output validation', () => {
    it('should reject output that does not start with 0xFFD8 marker', async () => {
      // Create a fake output file without JPEG marker
      const outputPath = path.join(tempDir, 'invalid-output.jpg');
      const config: ConversionConfig = {
        inputPath: path.join(tempDir, 'input.png'),
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      // Create a fake input file
      fs.writeFileSync(config.inputPath, 'fake input');

      // Mock the executeFFmpeg to create invalid output
      const originalExecute = (executor as any).executeFFmpeg;
      (executor as any).executeFFmpeg = vi.fn().mockImplementation(async () => {
        // Create output file without JPEG marker
        fs.writeFileSync(outputPath, Buffer.from([0x00, 0x00, 0x00, 0x00]));
      });

      try {
        await expect(executor.convert(config, outputPath)).rejects.toMatchObject({
          message: expect.stringContaining('0xFFD8'),
        });
      } finally {
        // Restore original method
        (executor as any).executeFFmpeg = originalExecute;
      }
    });

    it('should reject when output file is not created', async () => {
      const outputPath = path.join(tempDir, 'missing-output.jpg');
      const config: ConversionConfig = {
        inputPath: path.join(tempDir, 'input.png'),
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      // Create a fake input file
      fs.writeFileSync(config.inputPath, 'fake input');

      // Mock the executeFFmpeg to not create output
      const originalExecute = (executor as any).executeFFmpeg;
      (executor as any).executeFFmpeg = vi.fn().mockResolvedValue(undefined);

      try {
        await expect(executor.convert(config, outputPath)).rejects.toMatchObject({
          message: expect.stringContaining('output file was not created'),
        });
      } finally {
        // Restore original method
        (executor as any).executeFFmpeg = originalExecute;
      }
    });

    it('should accept valid JPEG output with 0xFFD8 marker', async () => {
      const outputPath = path.join(tempDir, 'valid-output.jpg');
      const config: ConversionConfig = {
        inputPath: path.join(tempDir, 'input.png'),
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      // Create a fake input file
      fs.writeFileSync(config.inputPath, 'fake input');

      // Mock the executeFFmpeg to create valid JPEG output
      const originalExecute = (executor as any).executeFFmpeg;
      (executor as any).executeFFmpeg = vi.fn().mockImplementation(async () => {
        // Create output file with JPEG marker
        const jpegData = Buffer.from([
          0xff, 0xd8, // SOI marker
          0xff, 0xe0, // APP0 marker
          0x00, 0x10, // Length
          0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
          // ... rest of JPEG data
          0xff, 0xd9, // EOI marker
        ]);
        fs.writeFileSync(outputPath, jpegData);
      });

      try {
        const result = await executor.convert(config, outputPath);
        
        expect(result).toBeDefined();
        expect(result.jpegData).toBeDefined();
        expect(result.jpegData.length).toBeGreaterThan(0);
        expect(result.jpegData[0]).toBe(0xff);
        expect(result.jpegData[1]).toBe(0xd8);
        expect(result.outputPath).toBe(outputPath);
      } finally {
        // Restore original method
        (executor as any).executeFFmpeg = originalExecute;
      }
    });
  });

  describe('error handling', () => {
    it('should provide descriptive error for FFmpeg not found', async () => {
      const outputPath = path.join(tempDir, 'output.jpg');
      const config: ConversionConfig = {
        inputPath: path.join(tempDir, 'input.png'),
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      // Create a fake input file
      fs.writeFileSync(config.inputPath, 'fake input');

      // Mock the executeFFmpeg to simulate ENOENT error
      const originalExecute = (executor as any).executeFFmpeg;
      (executor as any).executeFFmpeg = vi.fn().mockRejectedValue({
        message: 'FFmpeg is not installed or not found in PATH. Please install FFmpeg to use this converter.',
        stderr: 'spawn ffmpeg ENOENT',
      });

      try {
        await expect(executor.convert(config, outputPath)).rejects.toMatchObject({
          message: expect.stringContaining('FFmpeg is not installed'),
        });
      } finally {
        // Restore original method
        (executor as any).executeFFmpeg = originalExecute;
      }
    });

    it('should provide descriptive error for non-zero exit code', async () => {
      const outputPath = path.join(tempDir, 'output.jpg');
      const config: ConversionConfig = {
        inputPath: path.join(tempDir, 'input.png'),
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      // Create a fake input file
      fs.writeFileSync(config.inputPath, 'fake input');

      // Mock the executeFFmpeg to simulate non-zero exit
      const originalExecute = (executor as any).executeFFmpeg;
      (executor as any).executeFFmpeg = vi.fn().mockRejectedValue({
        message: 'FFmpeg exited with code 1',
        exitCode: 1,
        stderr: 'Error: Invalid input format',
        stdout: '',
      });

      try {
        await expect(executor.convert(config, outputPath)).rejects.toMatchObject({
          message: expect.stringContaining('exited with code'),
          exitCode: 1,
        });
      } finally {
        // Restore original method
        (executor as any).executeFFmpeg = originalExecute;
      }
    });
  });

  describe('pixel format mapping', () => {
    it('should map all sampling factors to correct pixel formats', () => {
      const mappings = [
        { factor: SamplingFactor.Grayscale, format: 'gray' },
        { factor: SamplingFactor.YUV420, format: 'yuvj420p' },
        { factor: SamplingFactor.YUV422, format: 'yuvj422p' },
        { factor: SamplingFactor.YUV444, format: 'yuvj444p' },
      ];

      mappings.forEach(({ factor, format }) => {
        const config: ConversionConfig = {
          inputPath: '/path/to/input.png',
          outputPath: '/path/to/output.jpg',
          samplingFactor: factor,
          quality: 10,
        };

        const command = executor.buildCommand(config, '/tmp/output.jpg');
        const pixFmtIndex = command.indexOf('-pix_fmt');
        
        expect(pixFmtIndex).toBeGreaterThan(-1);
        expect(command[pixFmtIndex + 1]).toBe(format);
      });
    });
  });
});
