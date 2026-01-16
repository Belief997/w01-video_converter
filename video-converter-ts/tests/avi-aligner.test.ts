/**
 * Unit tests for AviAligner class
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AviAligner } from '../src/postprocess/avi-aligner.js';

// Test directory for temporary files
const TEST_DIR = path.join(__dirname, 'temp-avi-test');

/**
 * Create a minimal valid AVI file structure for testing
 * AVI structure:
 * RIFF (size) 'AVI '
 * ├── LIST (size) 'hdrl'
 * │   └── avih (size) [main header - 56 bytes]
 * ├── JUNK (size) [padding chunk]
 * ├── LIST (size) 'movi'
 * │   └── 00dc (size) [video frame - JPEG data]
 * └── idx1 (size) [index chunk]
 */
function createTestAviFile(outputPath: string, options: {
  junkSize?: number;
  frameCount?: number;
  frameSize?: number;
} = {}): void {
  const junkSize = options.junkSize ?? 4;
  const frameCount = options.frameCount ?? 2;
  const frameSize = options.frameSize ?? 100;
  
  // Create minimal JPEG data (SOI + APP0 + EOI)
  const createJpegFrame = (size: number): Buffer => {
    const jpeg = Buffer.alloc(size);
    // SOI marker
    jpeg[0] = 0xFF;
    jpeg[1] = 0xD8;
    // APP0 marker with JFIF
    jpeg[2] = 0xFF;
    jpeg[3] = 0xE0;
    jpeg.writeUInt16BE(16, 4); // APP0 length
    jpeg.write('JFIF', 6, 'ascii');
    jpeg[10] = 0x00; // null terminator
    jpeg[11] = 0x01; // version major
    jpeg[12] = 0x01; // version minor
    // Fill rest with zeros until EOI
    // EOI marker at end
    jpeg[size - 2] = 0xFF;
    jpeg[size - 1] = 0xD9;
    return jpeg;
  };

  // Create frames
  const frames: Buffer[] = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push(createJpegFrame(frameSize));
  }
  
  // Calculate sizes
  const avihSize = 56;
  const hdrlSize = 4 + 8 + avihSize; // 'hdrl' + avih header + avih data
  const junkPad = junkSize % 2; // Padding for odd-sized JUNK
  
  // Calculate movi size
  let moviDataSize = 4; // 'movi'
  for (const frame of frames) {
    moviDataSize += 8 + frame.length; // chunk header + data
    if (frame.length % 2 === 1) moviDataSize += 1; // padding
  }
  
  // idx1 size (16 bytes per entry)
  const idx1Size = frameCount * 16;
  
  // Calculate total RIFF size
  const riffSize = 4 + // 'AVI '
    8 + hdrlSize + // LIST hdrl
    8 + junkSize + junkPad + // JUNK (with padding)
    8 + moviDataSize + // LIST movi
    8 + idx1Size; // idx1
  
  // Build the file
  const totalSize = 8 + riffSize;
  const buffer = Buffer.alloc(totalSize);
  let offset = 0;
  
  // RIFF header
  buffer.write('RIFF', offset, 'ascii'); offset += 4;
  buffer.writeUInt32LE(riffSize, offset); offset += 4;
  buffer.write('AVI ', offset, 'ascii'); offset += 4;
  
  // LIST hdrl
  buffer.write('LIST', offset, 'ascii'); offset += 4;
  buffer.writeUInt32LE(hdrlSize, offset); offset += 4;
  buffer.write('hdrl', offset, 'ascii'); offset += 4;
  
  // avih chunk (minimal)
  buffer.write('avih', offset, 'ascii'); offset += 4;
  buffer.writeUInt32LE(avihSize, offset); offset += 4;
  // Fill avih with zeros (minimal valid header)
  offset += avihSize;
  
  // JUNK chunk
  buffer.write('JUNK', offset, 'ascii'); offset += 4;
  buffer.writeUInt32LE(junkSize, offset); offset += 4;
  offset += junkSize; // JUNK data (zeros)
  if (junkPad) offset += 1; // Padding for odd-sized JUNK

  // LIST movi
  const moviListOffset = offset;
  buffer.write('LIST', offset, 'ascii'); offset += 4;
  buffer.writeUInt32LE(moviDataSize, offset); offset += 4;
  const moviDataOffset = offset;
  buffer.write('movi', offset, 'ascii'); offset += 4;
  
  // Frame chunks
  const frameOffsets: number[] = [];
  for (let i = 0; i < frames.length; i++) {
    frameOffsets.push(offset - moviDataOffset); // Relative to 'movi'
    buffer.write('00dc', offset, 'ascii'); offset += 4;
    buffer.writeUInt32LE(frames[i].length, offset); offset += 4;
    frames[i].copy(buffer, offset);
    offset += frames[i].length;
    if (frames[i].length % 2 === 1) {
      offset += 1; // padding byte
    }
  }
  
  // idx1 chunk
  buffer.write('idx1', offset, 'ascii'); offset += 4;
  buffer.writeUInt32LE(idx1Size, offset); offset += 4;
  
  for (let i = 0; i < frames.length; i++) {
    buffer.write('00dc', offset, 'ascii'); offset += 4;
    buffer.writeUInt32LE(0x10, offset); offset += 4; // flags (keyframe)
    buffer.writeUInt32LE(frameOffsets[i], offset); offset += 4;
    buffer.writeUInt32LE(frames[i].length, offset); offset += 4;
  }
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, buffer);
}

describe('AviAligner', () => {
  let aligner: AviAligner;
  
  beforeEach(() => {
    aligner = new AviAligner();
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });
  
  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('alignFirstFrame', () => {
    it('should align first frame data offset to 8-byte boundary', async () => {
      const inputPath = path.join(TEST_DIR, 'input.avi');
      const outputPath = path.join(TEST_DIR, 'output.avi');
      
      // Create test AVI with JUNK size that causes misalignment
      createTestAviFile(inputPath, { junkSize: 5, frameCount: 2, frameSize: 100 });
      
      await aligner.alignFirstFrame(inputPath, outputPath);
      
      // Verify output file exists
      expect(fs.existsSync(outputPath)).toBe(true);
      
      // Read output and verify first frame data is 8-byte aligned
      const fd = fs.openSync(outputPath, 'r');
      try {
        // Find movi chunk and first frame
        const riffHeader = Buffer.alloc(12);
        fs.readSync(fd, riffHeader, 0, 12, 0);
        
        // Parse chunks to find movi
        let offset = 12;
        const riffSize = riffHeader.readUInt32LE(4);
        const riffEnd = 8 + riffSize;
        
        while (offset + 8 <= riffEnd) {
          const chunkHeader = Buffer.alloc(8);
          fs.readSync(fd, chunkHeader, 0, 8, offset);
          const chunkId = chunkHeader.subarray(0, 4).toString('ascii');
          const chunkSize = chunkHeader.readUInt32LE(4);
          
          if (chunkId === 'LIST') {
            const typeBuf = Buffer.alloc(4);
            fs.readSync(fd, typeBuf, 0, 4, offset + 8);
            const listType = typeBuf.toString('ascii');
            
            if (listType === 'movi') {
              // Find first frame in movi
              let moviOffset = offset + 12; // Skip LIST header + 'movi'
              const moviEnd = offset + 8 + chunkSize;
              
              while (moviOffset + 8 <= moviEnd) {
                const frameHeader = Buffer.alloc(8);
                fs.readSync(fd, frameHeader, 0, 8, moviOffset);
                const frameId = frameHeader.subarray(0, 4).toString('ascii');
                
                if (frameId !== 'JUNK' && frameId !== 'LIST') {
                  // First frame found - check data offset alignment
                  const dataOffset = moviOffset + 8;
                  expect(dataOffset % 8).toBe(0);
                  break;
                }
                
                const frameSize = frameHeader.readUInt32LE(4);
                moviOffset += 8 + frameSize + (frameSize % 2);
              }
              break;
            }
          }
          
          offset += 8 + chunkSize + (chunkSize % 2);
        }
      } finally {
        fs.closeSync(fd);
      }
    });

    it('should copy file unchanged if already aligned', async () => {
      const inputPath = path.join(TEST_DIR, 'input.avi');
      const outputPath = path.join(TEST_DIR, 'output.avi');
      
      // Create test AVI with JUNK size that results in 8-byte alignment
      // Need to calculate the right JUNK size for alignment
      createTestAviFile(inputPath, { junkSize: 8, frameCount: 2, frameSize: 100 });
      
      await aligner.alignFirstFrame(inputPath, outputPath);
      
      // Verify output file exists
      expect(fs.existsSync(outputPath)).toBe(true);
    });
    
    it('should throw error if input file does not exist', async () => {
      const inputPath = path.join(TEST_DIR, 'nonexistent.avi');
      const outputPath = path.join(TEST_DIR, 'output.avi');
      
      await expect(aligner.alignFirstFrame(inputPath, outputPath))
        .rejects.toThrow();
    });
  });
  
  describe('alignAllFrames', () => {
    it('should process AVI file and produce valid output', async () => {
      const inputPath = path.join(TEST_DIR, 'input.avi');
      const tempPath = path.join(TEST_DIR, 'temp.avi');
      const outputPath = path.join(TEST_DIR, 'output.avi');
      
      // Create test AVI with multiple frames
      createTestAviFile(inputPath, { junkSize: 8, frameCount: 3, frameSize: 101 });
      
      // First run alignFirstFrame to ensure first frame is aligned
      await aligner.alignFirstFrame(inputPath, tempPath);
      
      // Then run alignAllFrames
      await aligner.alignAllFrames(tempPath, outputPath);
      
      // Verify output file exists
      expect(fs.existsSync(outputPath)).toBe(true);
      
      // Verify output file is a valid RIFF/AVI file
      const fd = fs.openSync(outputPath, 'r');
      try {
        const riffHeader = Buffer.alloc(12);
        fs.readSync(fd, riffHeader, 0, 12, 0);
        
        const riffId = riffHeader.subarray(0, 4).toString('ascii');
        const riffType = riffHeader.subarray(8, 12).toString('ascii');
        
        expect(riffId).toBe('RIFF');
        expect(riffType).toBe('AVI ');
        
        // Verify movi chunk exists and contains frames
        let offset = 12;
        const riffSize = riffHeader.readUInt32LE(4);
        const riffEnd = 8 + riffSize;
        let moviFound = false;
        let frameCount = 0;
        
        while (offset + 8 <= riffEnd) {
          const chunkHeader = Buffer.alloc(8);
          fs.readSync(fd, chunkHeader, 0, 8, offset);
          const chunkId = chunkHeader.subarray(0, 4).toString('ascii');
          const chunkSize = chunkHeader.readUInt32LE(4);
          
          if (chunkId === 'LIST') {
            const typeBuf = Buffer.alloc(4);
            fs.readSync(fd, typeBuf, 0, 4, offset + 8);
            const listType = typeBuf.toString('ascii');
            
            if (listType === 'movi') {
              moviFound = true;
              // Count frames in movi
              let moviOffset = offset + 12;
              const moviEnd = offset + 8 + chunkSize;
              
              while (moviOffset + 8 <= moviEnd) {
                const frameHeader = Buffer.alloc(8);
                fs.readSync(fd, frameHeader, 0, 8, moviOffset);
                const frameId = frameHeader.subarray(0, 4).toString('ascii');
                const frameSize = frameHeader.readUInt32LE(4);
                
                if (frameId !== 'JUNK' && frameId !== 'LIST') {
                  frameCount++;
                }
                
                moviOffset += 8 + frameSize + (frameSize % 2);
              }
              break;
            }
          }
          
          offset += 8 + chunkSize + (chunkSize % 2);
        }
        
        expect(moviFound).toBe(true);
        expect(frameCount).toBe(3);
      } finally {
        fs.closeSync(fd);
      }
      
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    });
  });

  describe('process', () => {
    it('should perform complete alignment (both passes)', async () => {
      const inputPath = path.join(TEST_DIR, 'input.avi');
      const outputPath = path.join(TEST_DIR, 'output.avi');
      
      // Create test AVI with misaligned frames
      createTestAviFile(inputPath, { junkSize: 5, frameCount: 3, frameSize: 101 });
      
      await aligner.process(inputPath, outputPath);
      
      // Verify output file exists
      expect(fs.existsSync(outputPath)).toBe(true);
      
      // Verify temp file is cleaned up
      expect(fs.existsSync(outputPath + '.temp.avi')).toBe(false);
      
      // Verify output file is a valid RIFF/AVI file with correct frame count
      const fd = fs.openSync(outputPath, 'r');
      try {
        const riffHeader = Buffer.alloc(12);
        fs.readSync(fd, riffHeader, 0, 12, 0);
        
        const riffId = riffHeader.subarray(0, 4).toString('ascii');
        const riffType = riffHeader.subarray(8, 12).toString('ascii');
        
        expect(riffId).toBe('RIFF');
        expect(riffType).toBe('AVI ');
        
        // Verify movi chunk exists and contains frames
        let offset = 12;
        const riffSize = riffHeader.readUInt32LE(4);
        const riffEnd = 8 + riffSize;
        let moviFound = false;
        let frameCount = 0;
        
        while (offset + 8 <= riffEnd) {
          const chunkHeader = Buffer.alloc(8);
          fs.readSync(fd, chunkHeader, 0, 8, offset);
          const chunkId = chunkHeader.subarray(0, 4).toString('ascii');
          const chunkSize = chunkHeader.readUInt32LE(4);
          
          if (chunkId === 'LIST') {
            const typeBuf = Buffer.alloc(4);
            fs.readSync(fd, typeBuf, 0, 4, offset + 8);
            const listType = typeBuf.toString('ascii');
            
            if (listType === 'movi') {
              moviFound = true;
              // Count frames in movi
              let moviOffset = offset + 12;
              const moviEnd = offset + 8 + chunkSize;
              
              while (moviOffset + 8 <= moviEnd) {
                const frameHeader = Buffer.alloc(8);
                fs.readSync(fd, frameHeader, 0, 8, moviOffset);
                const frameId = frameHeader.subarray(0, 4).toString('ascii');
                const frameSize = frameHeader.readUInt32LE(4);
                
                if (frameId !== 'JUNK' && frameId !== 'LIST') {
                  frameCount++;
                }
                
                moviOffset += 8 + frameSize + (frameSize % 2);
              }
              break;
            }
          }
          
          offset += 8 + chunkSize + (chunkSize % 2);
        }
        
        expect(moviFound).toBe(true);
        expect(frameCount).toBe(3);
      } finally {
        fs.closeSync(fd);
      }
    });
    
    it('should throw error if input file does not exist', async () => {
      const inputPath = path.join(TEST_DIR, 'nonexistent.avi');
      const outputPath = path.join(TEST_DIR, 'output.avi');
      
      await expect(aligner.process(inputPath, outputPath))
        .rejects.toThrow('Input file does not exist');
    });
    
    it('should create output directory if it does not exist', async () => {
      const inputPath = path.join(TEST_DIR, 'input.avi');
      const outputPath = path.join(TEST_DIR, 'subdir', 'output.avi');
      
      createTestAviFile(inputPath, { junkSize: 8, frameCount: 2, frameSize: 100 });
      
      await aligner.process(inputPath, outputPath);
      
      expect(fs.existsSync(outputPath)).toBe(true);
    });
  });
});
