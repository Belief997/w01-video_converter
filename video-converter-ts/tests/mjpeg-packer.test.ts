/**
 * MjpegPacker unit tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MjpegPacker } from '../src/postprocess/mjpeg-packer.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('MjpegPacker', () => {
  let packer: MjpegPacker;
  let tempDir: string;

  beforeEach(() => {
    packer = new MjpegPacker();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mjpeg-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('calculatePadding', () => {
    it('should return 0 when size is already 8-byte aligned', () => {
      // Access private method via any cast for testing
      const packerAny = packer as any;
      expect(packerAny.calculatePadding(0)).toBe(0);
      expect(packerAny.calculatePadding(8)).toBe(0);
      expect(packerAny.calculatePadding(16)).toBe(0);
      expect(packerAny.calculatePadding(24)).toBe(0);
      expect(packerAny.calculatePadding(1024)).toBe(0);
    });

    it('should return correct padding for non-aligned sizes', () => {
      const packerAny = packer as any;
      expect(packerAny.calculatePadding(1)).toBe(7);
      expect(packerAny.calculatePadding(2)).toBe(6);
      expect(packerAny.calculatePadding(3)).toBe(5);
      expect(packerAny.calculatePadding(4)).toBe(4);
      expect(packerAny.calculatePadding(5)).toBe(3);
      expect(packerAny.calculatePadding(6)).toBe(2);
      expect(packerAny.calculatePadding(7)).toBe(1);
      expect(packerAny.calculatePadding(9)).toBe(7);
      expect(packerAny.calculatePadding(15)).toBe(1);
    });
  });

  describe('isBaselineJpeg', () => {
    it('should return true for baseline JPEG with SOF0 marker', () => {
      const packerAny = packer as any;
      // Minimal baseline JPEG structure: SOI + SOF0 marker
      // SOI (FFD8) + APP0 (FFE0) with length + SOF0 (FFC0) with length
      const baselineJpeg = Buffer.from([
        0xFF, 0xD8,                     // SOI
        0xFF, 0xE0, 0x00, 0x10,         // APP0 marker with length 16
        0x4A, 0x46, 0x49, 0x46, 0x00,   // JFIF identifier
        0x01, 0x01, 0x00, 0x00, 0x01,   // JFIF data
        0x00, 0x01, 0x00, 0x00,         // More JFIF data
        0xFF, 0xC0, 0x00, 0x0B,         // SOF0 marker with length 11
        0x08, 0x00, 0x10, 0x00, 0x10,   // SOF0 data
        0x01, 0x01, 0x11, 0x00,         // More SOF0 data
        0xFF, 0xD9                      // EOI
      ]);
      expect(packerAny.isBaselineJpeg(baselineJpeg)).toBe(true);
    });

    it('should return false for progressive JPEG with SOF2 marker', () => {
      const packerAny = packer as any;
      // Progressive JPEG with SOF2 marker
      const progressiveJpeg = Buffer.from([
        0xFF, 0xD8,                     // SOI
        0xFF, 0xE0, 0x00, 0x10,         // APP0 marker with length 16
        0x4A, 0x46, 0x49, 0x46, 0x00,   // JFIF identifier
        0x01, 0x01, 0x00, 0x00, 0x01,   // JFIF data
        0x00, 0x01, 0x00, 0x00,         // More JFIF data
        0xFF, 0xC2, 0x00, 0x0B,         // SOF2 marker (progressive)
        0x08, 0x00, 0x10, 0x00, 0x10,   // SOF2 data
        0x01, 0x01, 0x11, 0x00,         // More SOF2 data
        0xFF, 0xD9                      // EOI
      ]);
      expect(packerAny.isBaselineJpeg(progressiveJpeg)).toBe(false);
    });

    it('should return false for JPEG without SOF marker', () => {
      const packerAny = packer as any;
      // JPEG without SOF marker
      const noSofJpeg = Buffer.from([
        0xFF, 0xD8,                     // SOI
        0xFF, 0xE0, 0x00, 0x04,         // APP0 marker with length 4
        0x00, 0x00,                     // APP0 data
        0xFF, 0xD9                      // EOI
      ]);
      expect(packerAny.isBaselineJpeg(noSofJpeg)).toBe(false);
    });
  });

  describe('findApp1InsertPosition', () => {
    it('should find existing APP1 segment', () => {
      const packerAny = packer as any;
      // JPEG with APP1 segment
      const jpegWithApp1 = Buffer.from([
        0xFF, 0xD8,                     // SOI
        0xFF, 0xE1, 0x00, 0x08,         // APP1 marker with length 8
        0x45, 0x78, 0x69, 0x66,         // EXIF
        0x00, 0x00,                     // Padding
        0xFF, 0xDA,                     // SOS
        0x00, 0x00                      // Data
      ]);
      const result = packerAny.findApp1InsertPosition(jpegWithApp1);
      expect(result.type).toBe('exist');
      expect(result.start).toBe(2);
      // end = start (2) + marker (2) + length value (8) = 12
      expect(result.end).toBe(12);
    });

    it('should return new position when APP1 does not exist', () => {
      const packerAny = packer as any;
      // JPEG without APP1 segment
      const jpegWithoutApp1 = Buffer.from([
        0xFF, 0xD8,                     // SOI
        0xFF, 0xE0, 0x00, 0x04,         // APP0 marker with length 4
        0x00, 0x00,                     // APP0 data
        0xFF, 0xDA,                     // SOS
        0x00, 0x00                      // Data
      ]);
      const result = packerAny.findApp1InsertPosition(jpegWithoutApp1);
      expect(result.type).toBe('new');
      expect(result.start).toBe(8); // After APP0 segment
    });

    it('should handle JPEG with only SOI and SOS', () => {
      const packerAny = packer as any;
      const minimalJpeg = Buffer.from([
        0xFF, 0xD8,                     // SOI
        0xFF, 0xDA,                     // SOS
        0x00, 0x00                      // Data
      ]);
      const result = packerAny.findApp1InsertPosition(minimalJpeg);
      expect(result.type).toBe('new');
      expect(result.start).toBe(2); // Right after SOI
    });
  });

  describe('padJpegViaApp1', () => {
    it('should not modify already aligned JPEG', () => {
      const packerAny = packer as any;
      // Create a JPEG that is already 8-byte aligned (8 bytes)
      const alignedJpeg = Buffer.from([
        0xFF, 0xD8,                     // SOI
        0xFF, 0xDA,                     // SOS
        0x00, 0x00,                     // Data
        0xFF, 0xD9                      // EOI (total 8 bytes)
      ]);
      const result = packerAny.padJpegViaApp1(alignedJpeg);
      expect(result.length).toBe(8);
      expect(result.equals(alignedJpeg)).toBe(true);
    });

    it('should extend existing APP1 segment for padding', () => {
      const packerAny = packer as any;
      // JPEG with APP1 segment, not aligned (13 bytes, needs 3 padding)
      const jpegWithApp1 = Buffer.from([
        0xFF, 0xD8,                     // SOI (2)
        0xFF, 0xE1, 0x00, 0x06,         // APP1 marker with length 6 (4)
        0x45, 0x58, 0x49, 0x46,         // EXIF (4)
        0xFF, 0xDA,                     // SOS (2)
        0x00                            // Data (1) - total 13 bytes
      ]);
      const result = packerAny.padJpegViaApp1(jpegWithApp1);
      expect(result.length % 8).toBe(0);
      expect(result.length).toBe(16); // 13 + 3 padding
      // Check APP1 marker is still present
      expect(result[2]).toBe(0xFF);
      expect(result[3]).toBe(0xE1);
    });

    it('should insert new APP1 segment when none exists', () => {
      const packerAny = packer as any;
      // JPEG without APP1 segment (6 bytes, needs 2 padding)
      // But inserting APP1 adds 8 bytes minimum (marker + length + EXIF)
      const jpegWithoutApp1 = Buffer.from([
        0xFF, 0xD8,                     // SOI (2)
        0xFF, 0xDA,                     // SOS (2)
        0x00, 0x00                      // Data (2) - total 6 bytes
      ]);
      const result = packerAny.padJpegViaApp1(jpegWithoutApp1);
      expect(result.length % 8).toBe(0);
      // Check APP1 marker was inserted
      expect(result[2]).toBe(0xFF);
      expect(result[3]).toBe(0xE1);
      // Check EXIF identifier
      expect(result.toString('ascii', 6, 10)).toBe('EXIF');
    });

    it('should produce 8-byte aligned output for various sizes', () => {
      const packerAny = packer as any;
      // Test various sizes
      for (let extraBytes = 0; extraBytes < 8; extraBytes++) {
        const baseJpeg = Buffer.alloc(10 + extraBytes);
        baseJpeg[0] = 0xFF;
        baseJpeg[1] = 0xD8; // SOI
        baseJpeg[2] = 0xFF;
        baseJpeg[3] = 0xE1; // APP1
        baseJpeg[4] = 0x00;
        baseJpeg[5] = 0x04; // Length 4
        baseJpeg[6] = 0x00;
        baseJpeg[7] = 0x00;
        baseJpeg[8] = 0xFF;
        baseJpeg[9] = 0xD9; // EOI
        
        const result = packerAny.padJpegViaApp1(baseJpeg);
        expect(result.length % 8).toBe(0);
      }
    });
  });

  describe('pack', () => {
    it('should throw error when input directory does not exist', async () => {
      const nonExistentDir = path.join(tempDir, 'non-existent');
      const outputPath = path.join(tempDir, 'output.mjpeg');
      
      await expect(packer.pack(nonExistentDir, outputPath)).rejects.toThrow(
        'Input directory does not exist'
      );
    });

    it('should create empty output file when input directory is empty', async () => {
      const inputDir = path.join(tempDir, 'input');
      fs.mkdirSync(inputDir);
      const outputPath = path.join(tempDir, 'output.mjpeg');
      
      await packer.pack(inputDir, outputPath);
      
      expect(fs.existsSync(outputPath)).toBe(true);
      expect(fs.statSync(outputPath).size).toBe(0);
    });

    it('should pack baseline JPEG files in sorted order', async () => {
      const inputDir = path.join(tempDir, 'input');
      fs.mkdirSync(inputDir);
      const outputPath = path.join(tempDir, 'output.mjpeg');
      
      // Create minimal baseline JPEG files
      const createBaselineJpeg = (id: number): Buffer => {
        // Create a baseline JPEG with SOF0 marker
        const jpeg = Buffer.from([
          0xFF, 0xD8,                     // SOI
          0xFF, 0xE0, 0x00, 0x04,         // APP0 with length 4
          0x00, id,                       // APP0 data with ID
          0xFF, 0xC0, 0x00, 0x04,         // SOF0 with length 4
          0x00, 0x00,                     // SOF0 data
          0xFF, 0xD9                      // EOI
        ]);
        return jpeg;
      };
      
      // Write files in reverse order to test sorting
      fs.writeFileSync(path.join(inputDir, 'frame_003.jpg'), createBaselineJpeg(3));
      fs.writeFileSync(path.join(inputDir, 'frame_001.jpg'), createBaselineJpeg(1));
      fs.writeFileSync(path.join(inputDir, 'frame_002.jpg'), createBaselineJpeg(2));
      
      await packer.pack(inputDir, outputPath);
      
      expect(fs.existsSync(outputPath)).toBe(true);
      const output = fs.readFileSync(outputPath);
      
      // Output should be 8-byte aligned
      expect(output.length % 8).toBe(0);
      
      // Should contain 3 JPEG frames (look for SOI markers)
      let soiCount = 0;
      for (let i = 0; i < output.length - 1; i++) {
        if (output[i] === 0xFF && output[i + 1] === 0xD8) {
          soiCount++;
        }
      }
      expect(soiCount).toBe(3);
    });

    it('should skip non-baseline JPEG files', async () => {
      const inputDir = path.join(tempDir, 'input');
      fs.mkdirSync(inputDir);
      const outputPath = path.join(tempDir, 'output.mjpeg');
      
      // Create baseline JPEG
      const baselineJpeg = Buffer.from([
        0xFF, 0xD8,                     // SOI
        0xFF, 0xC0, 0x00, 0x04,         // SOF0 (baseline)
        0x00, 0x00,                     // SOF0 data
        0xFF, 0xD9                      // EOI
      ]);
      
      // Create progressive JPEG (SOF2)
      const progressiveJpeg = Buffer.from([
        0xFF, 0xD8,                     // SOI
        0xFF, 0xC2, 0x00, 0x04,         // SOF2 (progressive)
        0x00, 0x00,                     // SOF2 data
        0xFF, 0xD9                      // EOI
      ]);
      
      fs.writeFileSync(path.join(inputDir, 'baseline.jpg'), baselineJpeg);
      fs.writeFileSync(path.join(inputDir, 'progressive.jpg'), progressiveJpeg);
      
      await packer.pack(inputDir, outputPath);
      
      const output = fs.readFileSync(outputPath);
      
      // Should only contain 1 JPEG frame (the baseline one)
      let soiCount = 0;
      for (let i = 0; i < output.length - 1; i++) {
        if (output[i] === 0xFF && output[i + 1] === 0xD8) {
          soiCount++;
        }
      }
      expect(soiCount).toBe(1);
    });

    it('should create output directory if it does not exist', async () => {
      const inputDir = path.join(tempDir, 'input');
      fs.mkdirSync(inputDir);
      const outputPath = path.join(tempDir, 'nested', 'dir', 'output.mjpeg');
      
      // Create a baseline JPEG
      const baselineJpeg = Buffer.from([
        0xFF, 0xD8,                     // SOI
        0xFF, 0xC0, 0x00, 0x04,         // SOF0
        0x00, 0x00,
        0xFF, 0xD9                      // EOI
      ]);
      fs.writeFileSync(path.join(inputDir, 'frame.jpg'), baselineJpeg);
      
      await packer.pack(inputDir, outputPath);
      
      expect(fs.existsSync(outputPath)).toBe(true);
    });
  });
});
