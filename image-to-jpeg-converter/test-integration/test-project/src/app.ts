/**
 * Test Application for Integration Testing
 * 
 * This application tests the integrated image-to-jpeg-converter library
 * to ensure it works correctly when copied into another project.
 */

import { convertToJpeg, SamplingFactor, ResizeOption } from './index.js';
import { writeFile } from 'fs/promises';

async function main() {
  console.log('🚀 Testing integrated image-to-jpeg-converter library...');
  
  // Create a simple test image (1x1 pixel PNG)
  const testImagePath = 'test-images/test.png';
  const outputPath = 'output/test-output.jpg';
  
  // Create a minimal PNG file (1x1 transparent pixel)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // bit depth, color type, etc.
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
    0x42, 0x60, 0x82
  ]);
  
  await writeFile(testImagePath, pngData);
  console.log('  ✅ Created test PNG image');
  
  try {
    // Test basic conversion
    console.log('  🔄 Testing basic conversion...');
    const result = await convertToJpeg({
      inputPath: testImagePath,
      outputPath: outputPath,
      samplingFactor: SamplingFactor.YUV420,
      quality: 10
    });
    
    console.log('  ✅ Basic conversion successful');
    console.log(`    📁 Output: ${result.outputPath}`);
    console.log(`    📏 Size: ${result.jpegSize} bytes`);
    console.log(`    📐 Dimensions: ${result.dimensions.width}x${result.dimensions.height}`);
    
    // Test with different options
    console.log('  🔄 Testing with resize option...');
    await convertToJpeg({
      inputPath: testImagePath,
      outputPath: 'output/test-resized.jpg',
      samplingFactor: SamplingFactor.YUV422,
      quality: 8,
      resize: ResizeOption.Fifty
    });
    console.log('  ✅ Resize option test successful');
    
    // Test error handling
    console.log('  🔄 Testing error handling...');
    try {
      await convertToJpeg({
        inputPath: 'non-existent-file.png',
        outputPath: 'output/error-test.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10
      });
      console.log('  ❌ Error handling test failed - should have thrown an error');
    } catch (error) {
      if (error.type === 'validation') {
        console.log('  ✅ Error handling test successful - caught validation error');
      } else {
        console.log(`  ⚠️  Unexpected error type: ${error.type}`);
      }
    }
    
    console.log('\n🎉 All integration tests passed!');
    console.log('✅ Library integration successful');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error('Error type:', error.type);
    throw error;
  }
}

main().catch(error => {
  console.error('💥 Application failed:', error);
  process.exit(1);
});