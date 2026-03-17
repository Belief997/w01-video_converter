/**
 * Unit tests for the InputValidator class.
 * 
 * Tests validation of:
 * - Input file existence and readability
 * - Quality parameter range (1-31)
 * - Sampling factor validity
 * - Output path writability
 * - Error aggregation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { InputValidator } from '../../src/validator.js';
import { ConversionConfig, SamplingFactor, ResizeOption } from '../../src/types.js';

describe('InputValidator', () => {
  let validator: InputValidator;
  let tempDir: string;
  let testInputFile: string;

  beforeEach(() => {
    validator = new InputValidator();
    
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-test-'));
    
    // Create a test input file
    testInputFile = path.join(tempDir, 'test-input.png');
    fs.writeFileSync(testInputFile, 'fake image data');
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validate', () => {
    it('should return valid for a correct configuration', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should aggregate multiple validation errors', () => {
      const config: ConversionConfig = {
        inputPath: '/nonexistent/file.png',
        outputPath: '/nonexistent/output.jpg',
        samplingFactor: 999 as SamplingFactor, // Invalid
        quality: 50, // Out of range
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(1);
        
        // Check that we have errors for multiple fields
        const fields = result.errors.map(e => e.field);
        expect(fields).toContain('inputPath');
        expect(fields).toContain('quality');
        expect(fields).toContain('samplingFactor');
      }
    });
  });

  describe('validateInputFile', () => {
    it('should accept an existing readable file', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should reject a non-existent file', () => {
      const config: ConversionConfig = {
        inputPath: path.join(tempDir, 'nonexistent.png'),
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const inputError = result.errors.find(e => e.field === 'inputPath');
        expect(inputError).toBeDefined();
        expect(inputError?.message).toContain('does not exist');
      }
    });

    it('should reject an empty input path', () => {
      const config: ConversionConfig = {
        inputPath: '',
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const inputError = result.errors.find(e => e.field === 'inputPath');
        expect(inputError).toBeDefined();
        expect(inputError?.message).toContain('required');
      }
    });

    it('should reject a directory as input', () => {
      const config: ConversionConfig = {
        inputPath: tempDir, // Directory, not a file
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const inputError = result.errors.find(e => e.field === 'inputPath');
        expect(inputError).toBeDefined();
        expect(inputError?.message).toContain('not a file');
      }
    });
  });

  describe('validateQuality', () => {
    it('should accept quality value of 1 (minimum)', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 1,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should accept quality value of 31 (maximum)', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 31,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should accept quality value in the middle of range', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 15,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should accept undefined quality (optional parameter)', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        // quality is undefined
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should reject quality value of 0 (below minimum)', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 0,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const qualityError = result.errors.find(e => e.field === 'quality');
        expect(qualityError).toBeDefined();
        expect(qualityError?.message).toContain('1-31');
      }
    });

    it('should reject quality value of 32 (above maximum)', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 32,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const qualityError = result.errors.find(e => e.field === 'quality');
        expect(qualityError).toBeDefined();
        expect(qualityError?.message).toContain('1-31');
      }
    });

    it('should reject negative quality values', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: -5,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const qualityError = result.errors.find(e => e.field === 'quality');
        expect(qualityError).toBeDefined();
        expect(qualityError?.message).toContain('1-31');
      }
    });

    it('should reject non-integer quality values', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 10.5,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const qualityError = result.errors.find(e => e.field === 'quality');
        expect(qualityError).toBeDefined();
        expect(qualityError?.message).toContain('integer');
      }
    });

    it('should reject NaN quality values', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: NaN,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const qualityError = result.errors.find(e => e.field === 'quality');
        expect(qualityError).toBeDefined();
        expect(qualityError?.message).toContain('number');
      }
    });
  });

  describe('validateSamplingFactor', () => {
    it('should accept SamplingFactor.Grayscale (400)', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.Grayscale,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should accept SamplingFactor.YUV420 (420)', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should accept SamplingFactor.YUV422 (422)', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV422,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should accept SamplingFactor.YUV444 (444)', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV444,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid sampling factor values', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: 999 as SamplingFactor,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const samplingError = result.errors.find(e => e.field === 'samplingFactor');
        expect(samplingError).toBeDefined();
        expect(samplingError?.message).toContain('400');
        expect(samplingError?.message).toContain('420');
        expect(samplingError?.message).toContain('422');
        expect(samplingError?.message).toContain('444');
      }
    });

    it('should reject NaN sampling factor', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: NaN as SamplingFactor,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const samplingError = result.errors.find(e => e.field === 'samplingFactor');
        expect(samplingError).toBeDefined();
        expect(samplingError?.message).toContain('number');
      }
    });
  });

  describe('validateOutputPath', () => {
    it('should accept a valid output path in existing directory', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should accept overwriting an existing file', () => {
      // Create an existing output file
      const outputPath = path.join(tempDir, 'existing-output.jpg');
      fs.writeFileSync(outputPath, 'existing data');

      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: outputPath,
        samplingFactor: SamplingFactor.YUV420,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should reject an empty output path', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: '',
        samplingFactor: SamplingFactor.YUV420,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const outputError = result.errors.find(e => e.field === 'outputPath');
        expect(outputError).toBeDefined();
        expect(outputError?.message).toContain('required');
      }
    });

    it('should reject output path in non-existent directory', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'nonexistent', 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const outputError = result.errors.find(e => e.field === 'outputPath');
        expect(outputError).toBeDefined();
        expect(outputError?.message).toContain('does not exist');
      }
    });

    it('should reject output path where parent is a file', () => {
      // Create a file that we'll try to use as a directory
      const notADir = path.join(tempDir, 'not-a-dir.txt');
      fs.writeFileSync(notADir, 'content');

      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(notADir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const outputError = result.errors.find(e => e.field === 'outputPath');
        expect(outputError).toBeDefined();
        expect(outputError?.message).toContain('not a directory');
      }
    });

    it('should reject output path that is an existing directory', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: tempDir, // Directory, not a file
        samplingFactor: SamplingFactor.YUV420,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const outputError = result.errors.find(e => e.field === 'outputPath');
        expect(outputError).toBeDefined();
        expect(outputError?.message).toContain('not a file');
      }
    });
  });

  describe('error aggregation', () => {
    it('should report all validation errors together', () => {
      const config: ConversionConfig = {
        inputPath: '/nonexistent/input.png',
        outputPath: '/nonexistent/output.jpg',
        samplingFactor: 123 as SamplingFactor,
        quality: 100,
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        // Should have at least 4 errors (input, output, sampling, quality)
        expect(result.errors.length).toBeGreaterThanOrEqual(4);

        // Verify each field has an error
        const fields = result.errors.map(e => e.field);
        expect(fields).toContain('inputPath');
        expect(fields).toContain('outputPath');
        expect(fields).toContain('samplingFactor');
        expect(fields).toContain('quality');

        // Each error should have a message
        result.errors.forEach(error => {
          expect(error.message).toBeTruthy();
          expect(error.message.length).toBeGreaterThan(0);
        });
      }
    });

    it('should include the invalid value in error details', () => {
      const config: ConversionConfig = {
        inputPath: testInputFile,
        outputPath: path.join(tempDir, 'output.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 50, // Invalid
      };

      const result = validator.validate(config);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        const qualityError = result.errors.find(e => e.field === 'quality');
        expect(qualityError).toBeDefined();
        expect(qualityError?.value).toBe(50);
      }
    });
  });
});
