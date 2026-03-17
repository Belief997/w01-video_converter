/**
 * Advanced Options Example
 * 
 * This example demonstrates advanced features including:
 * - Different sampling factors
 * - Resize options
 * - Compression flag
 * - Error handling
 */

import { convertToJpeg, SamplingFactor, ResizeOption } from '../dist/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function advancedConversion() {
  const outputDir = join(__dirname, 'output');
  
  // Ensure output directory exists
  try {
    await mkdir(outputDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  const conversions = [
    {
      name: 'High Quality (4:4:4)',
      config: {
        inputPath: join(__dirname, 'sample-images', 'input.png'),
        outputPath: join(outputDir, 'high-quality.bin'),
        samplingFactor: SamplingFactor.YUV444,
        quality: 2
      }
    },
    {
      name: 'Grayscale',
      config: {
        inputPath: join(__dirname, 'sample-images', 'input.png'),
        outputPath: join(outputDir, 'grayscale.bin'),
        samplingFactor: SamplingFactor.Grayscale,
        quality: 15
      }
    },
    {
      name: 'Resized to 50%',
      config: {
        inputPath: join(__dirname, 'sample-images', 'input.png'),
        outputPath: join(outputDir, 'resized-50.bin'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 10,
        resize: ResizeOption.Fifty
      }
    },
    {
      name: 'With Compression Flag',
      config: {
        inputPath: join(__dirname, 'sample-images', 'input.png'),
        outputPath: join(outputDir, 'compressed.bin'),
        samplingFactor: SamplingFactor.YUV422,
        quality: 8,
        compress: true
      }
    }
  ];
  
  console.log('🚀 Starting advanced conversions...\n');
  
  for (const conversion of conversions) {
    try {
      console.log(`📸 Converting: ${conversion.name}`);
      
      const result = await convertToJpeg(conversion.config);
      
      console.log(`  ✅ Success: ${result.outputPath}`);
      console.log(`  📏 Size: ${result.jpegSize} bytes`);
      console.log(`  📐 Dimensions: ${result.dimensions.width}x${result.dimensions.height}\n`);
      
    } catch (error) {
      console.error(`  ❌ Failed: ${error.message}`);
      console.error(`  🔍 Type: ${error.type}\n`);
    }
  }
  
  console.log('🎉 All conversions completed!');
}

// Run the example
advancedConversion();