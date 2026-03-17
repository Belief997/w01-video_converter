/**
 * Batch Processing Example
 * 
 * This example demonstrates how to process multiple images in parallel
 * with different configurations and comprehensive error handling.
 */

import { convertToJpeg, SamplingFactor } from '../dist/index.js';
import { readdir, mkdir, stat } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join, extname, basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function batchProcess() {
  const inputDir = join(__dirname, 'sample-images');
  const outputDir = join(__dirname, 'output', 'batch');
  
  try {
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });
    
    // Read input directory
    const files = await readdir(inputDir);
    
    // Filter for image files
    const imageExtensions = ['.png', '.bmp', '.tiff', '.gif', '.webp'];
    const imageFiles = files.filter(file => 
      imageExtensions.includes(extname(file).toLowerCase())
    );
    
    if (imageFiles.length === 0) {
      console.log('📁 No image files found in sample-images directory');
      console.log('💡 Add some PNG, BMP, TIFF, GIF, or WEBP files to test batch processing');
      return;
    }
    
    console.log(`🚀 Starting batch processing of ${imageFiles.length} images...\n`);
    
    // Create conversion tasks
    const conversions = imageFiles.map(file => ({
      inputPath: join(inputDir, file),
      outputPath: join(outputDir, basename(file, extname(file)) + '.bin'),
      samplingFactor: SamplingFactor.YUV420,
      quality: 10,
      originalName: file
    }));
    
    // Process all images in parallel
    const results = await Promise.allSettled(
      conversions.map(async (config) => {
        const { originalName, ...conversionConfig } = config;
        
        // Get input file size for comparison
        const inputStats = await stat(config.inputPath);
        const inputSize = inputStats.size;
        
        const result = await convertToJpeg(conversionConfig);
        
        return {
          originalName,
          result,
          inputSize,
          compressionRatio: ((inputSize - result.jpegSize) / inputSize * 100).toFixed(1)
        };
      })
    );
    
    // Process results
    let successCount = 0;
    let failureCount = 0;
    let totalInputSize = 0;
    let totalOutputSize = 0;
    
    console.log('📊 Batch Processing Results:\n');
    console.log('File'.padEnd(20) + 'Status'.padEnd(10) + 'Input Size'.padEnd(12) + 'Output Size'.padEnd(12) + 'Compression');
    console.log('-'.repeat(70));
    
    results.forEach((result, index) => {
      const originalName = conversions[index].originalName;
      
      if (result.status === 'fulfilled') {
        successCount++;
        const data = result.value;
        totalInputSize += data.inputSize;
        totalOutputSize += data.result.jpegSize;
        
        console.log(
          originalName.padEnd(20) +
          '✅ Success'.padEnd(10) +
          formatBytes(data.inputSize).padEnd(12) +
          formatBytes(data.result.jpegSize).padEnd(12) +
          `${data.compressionRatio}%`
        );
      } else {
        failureCount++;
        const error = result.reason;
        console.log(
          originalName.padEnd(20) +
          '❌ Failed'.padEnd(10) +
          '-'.padEnd(12) +
          '-'.padEnd(12) +
          error.message.substring(0, 30)
        );
      }
    });
    
    console.log('-'.repeat(70));
    console.log(`\n📈 Summary:`);
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${failureCount}`);
    console.log(`  📏 Total input size: ${formatBytes(totalInputSize)}`);
    console.log(`  📏 Total output size: ${formatBytes(totalOutputSize)}`);
    
    if (totalInputSize > 0) {
      const overallCompression = ((totalInputSize - totalOutputSize) / totalInputSize * 100).toFixed(1);
      console.log(`  🗜️  Overall compression: ${overallCompression}%`);
    }
    
    console.log(`\n🎉 Batch processing completed!`);
    
  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Run the example
batchProcess();