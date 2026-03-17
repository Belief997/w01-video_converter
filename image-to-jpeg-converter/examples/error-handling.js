/**
 * Error Handling Example
 * 
 * This example demonstrates comprehensive error handling for different
 * types of failures that can occur during image conversion.
 */

import { convertToJpeg, SamplingFactor, ConversionError } from '../dist/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function demonstrateErrorHandling() {
  console.log('🔍 Demonstrating error handling scenarios...\n');
  
  const errorScenarios = [
    {
      name: 'Non-existent input file',
      config: {
        inputPath: join(__dirname, 'non-existent-file.png'),
        outputPath: join(__dirname, 'output', 'test.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 10
      },
      expectedError: 'validation'
    },
    {
      name: 'Invalid quality value (too high)',
      config: {
        inputPath: join(__dirname, 'sample-images', 'input.png'),
        outputPath: join(__dirname, 'output', 'test.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 50  // Invalid: should be 1-31
      },
      expectedError: 'validation'
    },
    {
      name: 'Invalid quality value (too low)',
      config: {
        inputPath: join(__dirname, 'sample-images', 'input.png'),
        outputPath: join(__dirname, 'output', 'test.jpg'),
        samplingFactor: SamplingFactor.YUV420,
        quality: 0  // Invalid: should be 1-31
      },
      expectedError: 'validation'
    },
    {
      name: 'Invalid sampling factor',
      config: {
        inputPath: join(__dirname, 'sample-images', 'input.png'),
        outputPath: join(__dirname, 'output', 'test.jpg'),
        samplingFactor: 123,  // Invalid: should be 400, 420, 422, or 444
        quality: 10
      },
      expectedError: 'validation'
    },
    {
      name: 'Invalid output directory',
      config: {
        inputPath: join(__dirname, 'sample-images', 'input.png'),
        outputPath: '/invalid/path/that/does/not/exist/test.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 10
      },
      expectedError: 'io'
    }
  ];
  
  for (const scenario of errorScenarios) {
    console.log(`🧪 Testing: ${scenario.name}`);
    
    try {
      await convertToJpeg(scenario.config);
      console.log(`  ⚠️  Unexpected success - this should have failed!\n`);
    } catch (error) {
      if (error instanceof ConversionError) {
        console.log(`  ✅ Caught expected error type: ${error.type}`);
        console.log(`  📝 Message: ${error.message}`);
        
        if (error.type === scenario.expectedError) {
          console.log(`  🎯 Error type matches expectation\n`);
        } else {
          console.log(`  ⚠️  Expected ${scenario.expectedError}, got ${error.type}\n`);
        }
      } else {
        console.log(`  ❌ Unexpected error type:`, error);
      }
    }
  }
  
  // Demonstrate proper error handling in application code
  console.log('💡 Proper error handling in application code:\n');
  
  await demonstrateProperErrorHandling();
}

async function demonstrateProperErrorHandling() {
  const config = {
    inputPath: join(__dirname, 'non-existent.png'),
    outputPath: join(__dirname, 'output', 'test.jpg'),
    samplingFactor: SamplingFactor.YUV420,
    quality: 10
  };
  
  try {
    console.log('🚀 Attempting conversion...');
    const result = await convertToJpeg(config);
    
    // Success handling
    console.log('✅ Conversion successful!');
    console.log(`📁 Output: ${result.outputPath}`);
    console.log(`📏 Size: ${result.jpegSize} bytes`);
    
  } catch (error) {
    // Comprehensive error handling
    if (error instanceof ConversionError) {
      console.log(`❌ Conversion failed: ${error.message}`);
      
      switch (error.type) {
        case 'validation':
          console.log('🔧 Validation Error - Check your input parameters:');
          console.log('   • Ensure input file exists');
          console.log('   • Verify quality is between 1-31');
          console.log('   • Check sampling factor is valid (400, 420, 422, 444)');
          console.log('   • Ensure output directory is writable');
          break;
          
        case 'ffmpeg':
          console.log('🛠️  FFmpeg Error - Check your FFmpeg installation:');
          console.log('   • Ensure FFmpeg is installed');
          console.log('   • Verify FFmpeg is in your system PATH');
          console.log('   • Check if input file format is supported');
          console.log(`   • FFmpeg details: ${error.details}`);
          break;
          
        case 'io':
          console.log('💾 I/O Error - File system issue:');
          console.log('   • Check file permissions');
          console.log('   • Ensure sufficient disk space');
          console.log('   • Verify output directory exists');
          break;
          
        case 'header':
          console.log('🏗️  Header Generation Error:');
          console.log('   • JPEG data might be corrupted');
          console.log('   • Image dimensions might be invalid');
          break;
          
        default:
          console.log('❓ Unknown error type:', error.type);
      }
    } else {
      // Handle unexpected errors
      console.log('💥 Unexpected error:', error.message);
      console.log('🔍 Stack trace:', error.stack);
    }
    
    // Log error for monitoring/debugging
    console.log('\n📊 Error details for logging:');
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      errorType: error.type || 'unknown',
      message: error.message,
      config: config,
      stack: error.stack
    }, null, 2));
  }
}

// Run the example
demonstrateErrorHandling();