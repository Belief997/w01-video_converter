/**
 * Unit tests for the HeaderGenerator class.
 * 
 * Tests RGB data header generation, JPEG file header generation,
 * binary encoding, and dimension extraction.
 */

import { describe, it, expect } from 'vitest';
import { HeaderGenerator } from '../../src/header-generator.js';
import { ConversionConfig, SamplingFactor, ResizeOption } from '../../src/types.js';

describe('HeaderGenerator', () => {
  describe('generateRgbHeader', () => {
    it('should create an 8-field RGB header with correct defaults', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      const header = generator.generateRgbHeader(640, 480, config);

      // Verify all bit fields are initialized to 0 (Requirement 4.5)
      expect(header.scan).toBe(0);
      expect(header.align).toBe(0);
      expect(header.jpeg).toBe(0);
      expect(header.idu).toBe(0);
      expect(header.rsvd).toBe(0);

      // Verify type is set to 12 for JPEG (Requirement 4.2)
      expect(header.type).toBe(12);

      // Verify dimensions (Requirements 4.3, 4.4)
      expect(header.w).toBe(640);
      expect(header.h).toBe(480);

      // Verify version and reserved fields are 0 (Requirement 4.8)
      expect(header.version).toBe(0);
      expect(header.rsvd2).toBe(0);

      // Verify default resize is None (Requirement 4.6)
      expect(header.resize).toBe(ResizeOption.None);

      // Verify default compress is 0 (Requirement 4.7)
      expect(header.compress).toBe(0);
    });

    it('should set resize option correctly', () => {
      const generator = new HeaderGenerator();

      // Test all resize options (Requirement 4.6)
      const resizeOptions = [
        { option: ResizeOption.None, expected: 0 },
        { option: ResizeOption.Fifty, expected: 1 },
        { option: ResizeOption.Seventy, expected: 2 },
        { option: ResizeOption.Eighty, expected: 3 },
      ];

      resizeOptions.forEach(({ option, expected }) => {
        const config: ConversionConfig = {
          inputPath: 'test.png',
          outputPath: 'test.jpg',
          samplingFactor: SamplingFactor.YUV420,
          resize: option,
        };

        const header = generator.generateRgbHeader(100, 100, config);
        expect(header.resize).toBe(expected);
      });
    });

    it('should set compress flag correctly', () => {
      const generator = new HeaderGenerator();

      // Test compress disabled (Requirement 4.7)
      const configNoCompress: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
        compress: false,
      };

      const headerNoCompress = generator.generateRgbHeader(100, 100, configNoCompress);
      expect(headerNoCompress.compress).toBe(0);

      // Test compress enabled (Requirement 4.7)
      const configCompress: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
        compress: true,
      };

      const headerCompress = generator.generateRgbHeader(100, 100, configCompress);
      expect(headerCompress.compress).toBe(1);
    });

    it('should handle various image dimensions', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      // Test small dimensions
      const small = generator.generateRgbHeader(10, 10, config);
      expect(small.w).toBe(10);
      expect(small.h).toBe(10);

      // Test medium dimensions
      const medium = generator.generateRgbHeader(640, 480, config);
      expect(medium.w).toBe(640);
      expect(medium.h).toBe(480);

      // Test large dimensions
      const large = generator.generateRgbHeader(4096, 4096, config);
      expect(large.w).toBe(4096);
      expect(large.h).toBe(4096);
    });

    it('should set custom version if provided', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
        version: 5,
      };

      const header = generator.generateRgbHeader(100, 100, config);
      expect(header.version).toBe(5);
    });
  });

  describe('generateJpegHeader', () => {
    it('should create JPEG file header with RGB header', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      const rgbHeader = generator.generateRgbHeader(72, 72, config);

      // Create valid JPEG data (starts with 0xFFD8)
      const jpegData = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

      const jpegHeader = generator.generateJpegHeader(rgbHeader, jpegData);

      // Verify RGB header is included (Requirement 5.1)
      expect(jpegHeader.img_header).toBe(rgbHeader);

      // Verify size is calculated from JPEG data (Requirement 5.2)
      expect(jpegHeader.size).toBe(jpegData.length);

      // Verify dummy field is 0 (Requirement 5.4)
      expect(jpegHeader.dummy).toBe(0);

      // Verify JPEG data is included (Requirement 5.5)
      expect(jpegHeader.jpeg).toBe(jpegData);
    });

    it('should validate JPEG data starts with 0xFFD8', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      const rgbHeader = generator.generateRgbHeader(72, 72, config);

      // Test invalid JPEG data (doesn't start with 0xFFD8)
      const invalidData = Buffer.from([0x00, 0x00, 0xff, 0xe0]);

      expect(() => {
        generator.generateJpegHeader(rgbHeader, invalidData);
      }).toThrow('Invalid JPEG data: must start with 0xFFD8 SOI marker');
    });

    it('should handle empty JPEG data', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      const rgbHeader = generator.generateRgbHeader(72, 72, config);
      const emptyData = Buffer.alloc(0);

      expect(() => {
        generator.generateJpegHeader(rgbHeader, emptyData);
      }).toThrow('Invalid JPEG data: must start with 0xFFD8 SOI marker');
    });

    it('should handle JPEG data with only one byte', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      const rgbHeader = generator.generateRgbHeader(72, 72, config);
      const oneByteData = Buffer.from([0xff]);

      expect(() => {
        generator.generateJpegHeader(rgbHeader, oneByteData);
      }).toThrow('Invalid JPEG data: must start with 0xFFD8 SOI marker');
    });
  });

  describe('encodeToBytes', () => {
    it('should encode RGB header to exactly 8 bytes', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      const rgbHeader = generator.generateRgbHeader(72, 72, config);
      const jpegData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const jpegHeader = generator.generateJpegHeader(rgbHeader, jpegData);

      const encoded = generator.encodeToBytes(jpegHeader);

      // Total size should be 16 (header) + JPEG data length
      expect(encoded.length).toBe(16 + jpegData.length);

      // Verify RGB header is exactly 8 bytes (Requirement 4.1)
      // Byte 0: bit fields
      // Byte 1: type
      // Bytes 2-3: width
      // Bytes 4-5: height
      // Byte 6: version
      // Byte 7: rsvd2
    });

    it('should encode bit fields correctly in byte 0', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
        resize: ResizeOption.Fifty, // 1 in bits 2-3
        compress: true, // 1 in bit 4
      };

      const rgbHeader = generator.generateRgbHeader(72, 72, config);
      const jpegData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const jpegHeader = generator.generateJpegHeader(rgbHeader, jpegData);

      const encoded = generator.encodeToBytes(jpegHeader);

      // Byte 0 should have:
      // Bit 0: scan = 0
      // Bit 1: align = 0
      // Bits 2-3: resize = 1 (binary: 01)
      // Bit 4: compress = 1
      // Bit 5: jpeg = 0
      // Bit 6: idu = 0
      // Bit 7: rsvd = 0
      // Binary: 0001 0100 = 0x14
      expect(encoded[0]).toBe(0x14);
    });

    it('should encode type field correctly in byte 1', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      const rgbHeader = generator.generateRgbHeader(72, 72, config);
      const jpegData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const jpegHeader = generator.generateJpegHeader(rgbHeader, jpegData);

      const encoded = generator.encodeToBytes(jpegHeader);

      // Byte 1 should be type = 12 (0x0C) (Requirement 4.2)
      expect(encoded[1]).toBe(12);
    });

    it('should encode width and height in little-endian', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      // Use 72x72 as in the example (72 = 0x0048)
      const rgbHeader = generator.generateRgbHeader(72, 72, config);
      const jpegData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const jpegHeader = generator.generateJpegHeader(rgbHeader, jpegData);

      const encoded = generator.encodeToBytes(jpegHeader);

      // Bytes 2-3: width = 72 (0x0048 in little-endian: 0x48, 0x00)
      expect(encoded[2]).toBe(0x48);
      expect(encoded[3]).toBe(0x00);

      // Bytes 4-5: height = 72 (0x0048 in little-endian: 0x48, 0x00)
      expect(encoded[4]).toBe(0x48);
      expect(encoded[5]).toBe(0x00);
    });

    it('should encode version and reserved fields', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
        version: 3,
      };

      const rgbHeader = generator.generateRgbHeader(72, 72, config);
      const jpegData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const jpegHeader = generator.generateJpegHeader(rgbHeader, jpegData);

      const encoded = generator.encodeToBytes(jpegHeader);

      // Byte 6: version = 3
      expect(encoded[6]).toBe(3);

      // Byte 7: rsvd2 = 0 (Requirement 4.8)
      expect(encoded[7]).toBe(0);
    });

    it('should encode size field in little-endian', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      const rgbHeader = generator.generateRgbHeader(72, 72, config);
      
      // Create JPEG data with known size (1797 bytes as in example)
      const jpegData = Buffer.alloc(1797);
      jpegData[0] = 0xff;
      jpegData[1] = 0xd8;

      const jpegHeader = generator.generateJpegHeader(rgbHeader, jpegData);
      const encoded = generator.encodeToBytes(jpegHeader);

      // Bytes 8-11: size = 1797 (0x00000705 in little-endian: 0x05, 0x07, 0x00, 0x00)
      expect(encoded[8]).toBe(0x05);
      expect(encoded[9]).toBe(0x07);
      expect(encoded[10]).toBe(0x00);
      expect(encoded[11]).toBe(0x00);
    });

    it('should encode dummy field as 0', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      const rgbHeader = generator.generateRgbHeader(72, 72, config);
      const jpegData = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const jpegHeader = generator.generateJpegHeader(rgbHeader, jpegData);

      const encoded = generator.encodeToBytes(jpegHeader);

      // Bytes 12-15: dummy = 0 (Requirement 5.4)
      expect(encoded[12]).toBe(0x00);
      expect(encoded[13]).toBe(0x00);
      expect(encoded[14]).toBe(0x00);
      expect(encoded[15]).toBe(0x00);
    });

    it('should include JPEG data after header', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      const rgbHeader = generator.generateRgbHeader(72, 72, config);
      const jpegData = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      const jpegHeader = generator.generateJpegHeader(rgbHeader, jpegData);

      const encoded = generator.encodeToBytes(jpegHeader);

      // JPEG data should start at byte 16 (Requirement 6.2)
      expect(encoded[16]).toBe(0xff);
      expect(encoded[17]).toBe(0xd8);
      expect(encoded[18]).toBe(0xff);
      expect(encoded[19]).toBe(0xe0);
    });

    it('should match the example output format', () => {
      const generator = new HeaderGenerator();
      const config: ConversionConfig = {
        inputPath: 'test.png',
        outputPath: 'test.jpg',
        samplingFactor: SamplingFactor.YUV420,
      };

      // Create 72x72 image with 1797 bytes of JPEG data
      const rgbHeader = generator.generateRgbHeader(72, 72, config);
      const jpegData = Buffer.alloc(1797);
      jpegData[0] = 0xff;
      jpegData[1] = 0xd8;
      jpegData[2] = 0xff;
      jpegData[3] = 0xe0;

      const jpegHeader = generator.generateJpegHeader(rgbHeader, jpegData);
      const encoded = generator.encodeToBytes(jpegHeader);

      // Verify header matches example:
      // 00 0c 48 00 48 00 00 00 05 07 00 00 00 00 00 00 ff d8 ff e0 ...
      expect(encoded[0]).toBe(0x00); // bit fields (all 0)
      expect(encoded[1]).toBe(0x0c); // type = 12
      expect(encoded[2]).toBe(0x48); // width low byte
      expect(encoded[3]).toBe(0x00); // width high byte
      expect(encoded[4]).toBe(0x48); // height low byte
      expect(encoded[5]).toBe(0x00); // height high byte
      expect(encoded[6]).toBe(0x00); // version
      expect(encoded[7]).toBe(0x00); // rsvd2
      expect(encoded[8]).toBe(0x05); // size low byte
      expect(encoded[9]).toBe(0x07); // size byte 2
      expect(encoded[10]).toBe(0x00); // size byte 3
      expect(encoded[11]).toBe(0x00); // size high byte
      expect(encoded[12]).toBe(0x00); // dummy
      expect(encoded[13]).toBe(0x00); // dummy
      expect(encoded[14]).toBe(0x00); // dummy
      expect(encoded[15]).toBe(0x00); // dummy
      expect(encoded[16]).toBe(0xff); // JPEG SOI
      expect(encoded[17]).toBe(0xd8); // JPEG SOI
      expect(encoded[18]).toBe(0xff); // JPEG marker
      expect(encoded[19]).toBe(0xe0); // JPEG marker
    });
  });

  describe('extractDimensions', () => {
    it('should extract dimensions from valid JPEG data', () => {
      const generator = new HeaderGenerator();

      // Create minimal JPEG with SOF0 marker
      // SOI (0xFFD8) + SOF0 (0xFFC0) + length (9) + precision (8) + height (480) + width (640)
      const jpegData = Buffer.from([
        0xff, 0xd8, // SOI marker
        0xff, 0xc0, // SOF0 marker
        0x00, 0x11, // Length (17 bytes)
        0x08,       // Precision (8 bits)
        0x01, 0xe0, // Height (480 in big-endian)
        0x02, 0x80, // Width (640 in big-endian)
        0x03,       // Number of components
        // Component data would follow...
      ]);

      const dimensions = generator.extractDimensions(jpegData);

      expect(dimensions).not.toBeNull();
      expect(dimensions?.width).toBe(640);
      expect(dimensions?.height).toBe(480);
    });

    it('should return null for invalid JPEG data', () => {
      const generator = new HeaderGenerator();

      // Data without SOI marker
      const invalidData = Buffer.from([0x00, 0x00, 0xff, 0xe0]);

      const dimensions = generator.extractDimensions(invalidData);

      expect(dimensions).toBeNull();
    });

    it('should return null for JPEG without SOF0 marker', () => {
      const generator = new HeaderGenerator();

      // JPEG with SOI but no SOF0
      const jpegData = Buffer.from([
        0xff, 0xd8, // SOI marker
        0xff, 0xe0, // APP0 marker
        0x00, 0x10, // Length
        // No SOF0 marker
      ]);

      const dimensions = generator.extractDimensions(jpegData);

      expect(dimensions).toBeNull();
    });

    it('should handle empty buffer', () => {
      const generator = new HeaderGenerator();
      const emptyData = Buffer.alloc(0);

      const dimensions = generator.extractDimensions(emptyData);

      expect(dimensions).toBeNull();
    });
  });
});
