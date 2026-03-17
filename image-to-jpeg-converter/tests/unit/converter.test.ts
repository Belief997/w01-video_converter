/**
 * Unit tests for the Converter class.
 * 
 * Tests the main orchestration logic, error handling, and cleanup behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Converter } from '../../src/converter.js';
import { SamplingFactor, ResizeOption } from '../../src/types.js';

describe('Converter', () => {
  let converter: Converter;
  const testOutputDir = path.join(process.cwd(), 'test-output');
  const testInputPath = path.join(process.cwd(), 'tests', 'fixtures', 'test-image.png');

  beforeEach(() => {
    converter = new Converter();
    
    // Ensure test output directory exists
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test output files
    if (fs.existsSync(testOutputDir)) {
      const files = fs.readdirSync(testOutputDir);
      for (const file of files) {
        const filePath = path.join(testOutputDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
    }
  });

  describe('convert', () => {
    it('should successfully convert an image to JPEG with custom header', async () => {
      // Skip if test image doesn't exist
      if (!fs.existsSync(testInputPath)) {
        console.warn('Test image not found, skipping test');
        return;
      }

      const outputPath = path.join(testOutputDir, 'output-basic.jpg');

      const result = await converter.convert({
        inputPath: testInputPath,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      });

      // Verify result
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.jpegSize).toBeGreaterThan(0);
      expect(result.dimensions.width).toBeGreaterThan(0);
      expect(result.dimensions.height).toBeGreaterThan(0);

      // Verify output file exists
      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify file structure
      const fileData = fs.readFileSync(outputPath);
      
      // Check minimum size (16 bytes header + JPEG data)
      expect(fileData.length).toBeGreaterThan(16);

      // Check that JPEG data starts at byte 16 with 0xFFD8 marker
      expect(fileData[16]).toBe(0xff);
      expect(fileData[17]).toBe(0xd8);

      // Check RGB header type field (byte 1) is 12 for JPEG
      expect(fileData[1]).toBe(12);
    });

    it('should handle different sampling factors', async () => {
      if (!fs.existsSync(testInputPath)) {
        console.warn('Test image not found, skipping test');
        return;
      }

      const samplingFactors = [
        SamplingFactor.Grayscale,
        SamplingFactor.YUV420,
        SamplingFactor.YUV422,
        SamplingFactor.YUV444,
      ];

      for (const samplingFactor of samplingFactors) {
        const outputPath = path.join(testOutputDir, `output-${samplingFactor}.jpg`);

        const result = await converter.convert({
          inputPath: testInputPath,
          outputPath,
          samplingFactor,
          quality: 10,
        });

        expect(result.success).toBe(true);
        expect(fs.existsSync(outputPath)).toBe(true);
      }
    });

    it('should handle resize options', async () => {
      if (!fs.existsSync(testInputPath)) {
        console.warn('Test image not found, skipping test');
        return;
      }

      const outputPath = path.join(testOutputDir, 'output-resize.jpg');

      const result = await converter.convert({
        inputPath: testInputPath,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
        resize: ResizeOption.Fifty,
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify resize field in header (byte 0, bits 2-3)
      const fileData = fs.readFileSync(outputPath);
      const byte0 = fileData[0];
      const resizeField = (byte0 >> 2) & 0x03;
      expect(resizeField).toBe(ResizeOption.Fifty);
    });

    it('should handle compress flag', async () => {
      if (!fs.existsSync(testInputPath)) {
        console.warn('Test image not found, skipping test');
        return;
      }

      const outputPath = path.join(testOutputDir, 'output-compress.jpg');

      const result = await converter.convert({
        inputPath: testInputPath,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
        compress: true,
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      // Verify compress bit in header (byte 0, bit 4)
      const fileData = fs.readFileSync(outputPath);
      const byte0 = fileData[0];
      const compressBit = (byte0 >> 4) & 0x01;
      expect(compressBit).toBe(1);
    });

    it('should throw validation error for non-existent input file', async () => {
      const outputPath = path.join(testOutputDir, 'output-invalid.jpg');

      await expect(
        converter.convert({
          inputPath: '/non/existent/file.png',
          outputPath,
          samplingFactor: SamplingFactor.YUV420,
          quality: 10,
        })
      ).rejects.toMatchObject({
        success: false,
        type: 'validation',
      });

      // Verify no output file was created
      expect(fs.existsSync(outputPath)).toBe(false);
    });

    it('should throw validation error for invalid quality', async () => {
      if (!fs.existsSync(testInputPath)) {
        console.warn('Test image not found, skipping test');
        return;
      }

      const outputPath = path.join(testOutputDir, 'output-invalid-quality.jpg');

      await expect(
        converter.convert({
          inputPath: testInputPath,
          outputPath,
          samplingFactor: SamplingFactor.YUV420,
          quality: 50, // Invalid: must be 1-31
        })
      ).rejects.toMatchObject({
        success: false,
        type: 'validation',
      });

      // Verify no output file was created
      expect(fs.existsSync(outputPath)).toBe(false);
    });

    it('should throw validation error for invalid output directory', async () => {
      if (!fs.existsSync(testInputPath)) {
        console.warn('Test image not found, skipping test');
        return;
      }

      const outputPath = '/non/existent/directory/output.jpg';

      await expect(
        converter.convert({
          inputPath: testInputPath,
          outputPath,
          samplingFactor: SamplingFactor.YUV420,
          quality: 10,
        })
      ).rejects.toMatchObject({
        success: false,
        type: 'validation',
      });
    });

    it('should clean up temporary files on success', async () => {
      if (!fs.existsSync(testInputPath)) {
        console.warn('Test image not found, skipping test');
        return;
      }

      const outputPath = path.join(testOutputDir, 'output-cleanup.jpg');

      // Get temp directory before conversion
      const tempDir = require('os').tmpdir();
      const beforeFiles = fs.readdirSync(tempDir);

      await converter.convert({
        inputPath: testInputPath,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      });

      // Check that no new temp files remain
      const afterFiles = fs.readdirSync(tempDir);
      const newTempFiles = afterFiles.filter(
        (file) => file.startsWith('image-to-jpeg-') && !beforeFiles.includes(file)
      );

      expect(newTempFiles.length).toBe(0);
    });

    it('should encode dimensions correctly in header', async () => {
      if (!fs.existsSync(testInputPath)) {
        console.warn('Test image not found, skipping test');
        return;
      }

      const outputPath = path.join(testOutputDir, 'output-dimensions.jpg');

      const result = await converter.convert({
        inputPath: testInputPath,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      });

      // Read header from output file
      const fileData = fs.readFileSync(outputPath);

      // Extract width from bytes 2-3 (little-endian)
      const width = fileData[2] | (fileData[3] << 8);

      // Extract height from bytes 4-5 (little-endian)
      const height = fileData[4] | (fileData[5] << 8);

      // Verify dimensions match result
      expect(width).toBe(result.dimensions.width);
      expect(height).toBe(result.dimensions.height);
    });

    it('should encode JPEG size correctly in header', async () => {
      if (!fs.existsSync(testInputPath)) {
        console.warn('Test image not found, skipping test');
        return;
      }

      const outputPath = path.join(testOutputDir, 'output-size.jpg');

      const result = await converter.convert({
        inputPath: testInputPath,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      });

      // Read header from output file
      const fileData = fs.readFileSync(outputPath);

      // Extract size from bytes 8-11 (little-endian, uint32)
      const size =
        fileData[8] |
        (fileData[9] << 8) |
        (fileData[10] << 16) |
        (fileData[11] << 24);

      // Verify size matches JPEG data length
      expect(size).toBe(result.jpegSize);

      // Verify size matches actual JPEG data in file
      const actualJpegSize = fileData.length - 16; // Total size - header size
      expect(size).toBe(actualJpegSize);
    });

    it('should set dummy field to 0', async () => {
      if (!fs.existsSync(testInputPath)) {
        console.warn('Test image not found, skipping test');
        return;
      }

      const outputPath = path.join(testOutputDir, 'output-dummy.jpg');

      await converter.convert({
        inputPath: testInputPath,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      });

      // Read header from output file
      const fileData = fs.readFileSync(outputPath);

      // Extract dummy field from bytes 12-15 (little-endian, uint32)
      const dummy =
        fileData[12] |
        (fileData[13] << 8) |
        (fileData[14] << 16) |
        (fileData[15] << 24);

      // Verify dummy is 0
      expect(dummy).toBe(0);
    });
  });
});
