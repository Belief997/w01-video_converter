/**
 * Basic Image to JPEG Conversion Example
 * 
 * This example demonstrates the simplest usage of the image-to-jpeg-converter library.
 * It converts a PNG image to JPEG with 4:2:0 sampling and medium quality.
 */

import { convertToJpeg, SamplingFactor } from '../dist/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function basicConversion() {
  try {
    console.log('🚀 Starting basic image conversion...');
    
    const result = await convertToJpeg({
      inputPath: join(__dirname, 'sample-images', 'input.png'),
      outputPath: join(__dirname, 'output', 'basic-output.bin'),
      samplingFactor: SamplingFactor.YUV420,
      quality: 10
    });
    
    console.log('✅ Conversion successful!');
    console.log(`📁 Output file: ${result.outputPath}`);
    console.log(`📏 JPEG size: ${result.jpegSize} bytes`);
    console.log(`📐 Dimensions: ${result.dimensions.width}x${result.dimensions.height}`);
    
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    console.error('Error type:', error.type);
    
    if (error.type === 'validation') {
      console.error('💡 Check your input file path and parameters');
    } else if (error.type === 'ffmpeg') {
      console.error('💡 Make sure FFmpeg is installed and in your PATH');
    }
  }
}

// Run the example
basicConversion();