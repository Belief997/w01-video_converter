# API Reference

## Overview

The Image to JPEG Converter provides a TypeScript/JavaScript API for converting images to JPEG format with custom binary headers. This document describes all public interfaces, types, and functions.

## Installation

```bash
# Copy source files to your project
cp -r image-to-jpeg-converter/src/* your-project/src/
```

## Quick Start

```typescript
import { convertToJpeg, SamplingFactor } from './image-to-jpeg-converter';

const result = await convertToJpeg({
  inputPath: 'input.png',
  outputPath: 'output.bin',
  samplingFactor: SamplingFactor.YUV420,
  quality: 10
});

console.log(`Converted: ${result.outputPath}`);
```

## Main Functions

### convertToJpeg(config: ConversionConfig): Promise<ConversionResult>

Converts an image to JPEG format with custom binary headers.

**Parameters:**
- `config` - Configuration object specifying conversion parameters

**Returns:**
- `Promise<ConversionResult>` - Result object with conversion details

**Throws:**
- `ConversionError` - When conversion fails

**Example:**
```typescript
import { convertToJpeg, SamplingFactor, ResizeOption } from './image-to-jpeg-converter';

try {
  const result = await convertToJpeg({
    inputPath: 'photo.png',
    outputPath: 'photo.bin',
    samplingFactor: SamplingFactor.YUV420,
    quality: 10,
    resize: ResizeOption.Fifty,
    compress: true,
    backgroundColor: 'white'  // For transparent images
  });
    outputPath: 'photo.bin',
    samplingFactor: SamplingFactor.YUV422,
    quality: 5,
    resize: ResizeOption.Fifty,
    compress: true
  });
  
  console.log(`Success: ${result.outputPath}`);
  console.log(`JPEG size: ${result.jpegSize} bytes`);
  console.log(`Dimensions: ${result.dimensions.width}x${result.dimensions.height}`);
} catch (error) {
  console.error(`Conversion failed: ${error.message}`);
}
```

## Types and Interfaces

### ConversionConfig

Configuration object for image conversion.

```typescript
interface ConversionConfig {
  /** Path to input image file */
  inputPath: string;
  
  /** Path for output binary file with .bin extension */
  outputPath: string;
  
  /** Chroma sampling factor */
  samplingFactor: SamplingFactor;
  
  /** JPEG quality (1-31, lower is higher quality) */
  quality?: number;
  
  /** Resize option */
  resize?: ResizeOption;
  
  /** Enable compression flag in header */
  compress?: boolean;
  
  /** Version field in header (default: 0) */
  version?: number;
  
  /** Background color for transparent images (default: 'black') */
  backgroundColor?: string;
}
```

### ConversionResult

Result object returned by successful conversion.

```typescript
interface ConversionResult {
  /** Whether conversion was successful */
  success: boolean;
  
  /** Path to output file */
  outputPath: string;
  
  /** Size of JPEG data in bytes */
  jpegSize: number;
  
  /** Image dimensions */
  dimensions: {
    width: number;
    height: number;
  };
}
```

### ConversionError

Error object thrown when conversion fails.

```typescript
interface ConversionError extends Error {
  /** Error type category */
  type: 'validation' | 'ffmpeg' | 'io' | 'header';
  
  /** Error message */
  message: string;
  
  /** Additional error details */
  details?: any;
}
```

## Enums

### SamplingFactor

Chroma subsampling factors for JPEG encoding.

```typescript
enum SamplingFactor {
  /** Grayscale (Y channel only) */
  Grayscale = 400,
  
  /** 4:2:0 subsampling (most common) */
  YUV420 = 420,
  
  /** 4:2:2 subsampling (better quality) */
  YUV422 = 422,
  
  /** 4:4:4 subsampling (best quality) */
  YUV444 = 444
}
```

**Usage:**
```typescript
// Use enum values
samplingFactor: SamplingFactor.YUV420

// Or use numeric values
samplingFactor: 420
```

### ResizeOption

Resize options for image scaling.

```typescript
enum ResizeOption {
  /** No resize */
  None = 0,
  
  /** Resize to 50% */
  Fifty = 1,
  
  /** Resize to 70% */
  Seventy = 2,
  
  /** Resize to 80% */
  Eighty = 3
}
```

**Usage:**
```typescript
// Use enum values
resize: ResizeOption.Fifty

// Or use numeric values
resize: 1
```

## Binary Header Structures

### RgbDataHeader

8-byte header structure containing image metadata.

```typescript
interface RgbDataHeader {
  /** Bit fields (scan, align, resize, compress, jpeg, idu, rsvd) */
  bitFields: number;
  
  /** Image type (12 for JPEG) */
  type: number;
  
  /** Image width in pixels */
  width: number;
  
  /** Image height in pixels */
  height: number;
  
  /** Version field */
  version: number;
  
  /** Reserved field */
  reserved: number;
}
```

### JpegFileHeader

Complete header structure including RGB header and JPEG data.

```typescript
interface JpegFileHeader {
  /** RGB data header (8 bytes) */
  rgbHeader: RgbDataHeader;
  
  /** JPEG data size (excluding header) */
  size: number;
  
  /** Alignment dummy field (always 0) */
  dummy: number;
  
  /** JPEG data starting with 0xFFD8 */
  jpegData: Buffer;
}
```

## Error Handling

### Error Types

The library throws `ConversionError` objects with specific types:

- **validation**: Invalid input parameters or file paths
- **ffmpeg**: FFmpeg execution errors
- **io**: File I/O errors
- **header**: Binary header generation errors

### Error Handling Patterns

```typescript
import { convertToJpeg, ConversionError } from './image-to-jpeg-converter';

try {
  const result = await convertToJpeg(config);
  // Handle success
} catch (error) {
  if (error instanceof ConversionError) {
    switch (error.type) {
      case 'validation':
        console.error('Invalid input:', error.message);
        break;
      case 'ffmpeg':
        console.error('FFmpeg error:', error.details);
        break;
      case 'io':
        console.error('File I/O error:', error.message);
        break;
      case 'header':
        console.error('Header generation error:', error.message);
        break;
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Advanced Usage

### Custom Quality Settings

Different sampling factors have different recommended quality ranges:

```typescript
// High quality settings
const highQuality = {
  samplingFactor: SamplingFactor.YUV444,
  quality: 2  // Very high quality
};

// Balanced settings
const balanced = {
  samplingFactor: SamplingFactor.YUV420,
  quality: 10  // Good quality, reasonable size
};

// Compressed settings
const compressed = {
  samplingFactor: SamplingFactor.Grayscale,
  quality: 20  // Lower quality, smaller size
};
```

### Batch Processing

```typescript
import { convertToJpeg, SamplingFactor } from './image-to-jpeg-converter';
import { readdir } from 'fs/promises';
import { join } from 'path';

async function convertDirectory(inputDir: string, outputDir: string) {
  const files = await readdir(inputDir);
  const imageFiles = files.filter(f => /\.(png|bmp|tiff|gif)$/i.test(f));
  
  for (const file of imageFiles) {
    const inputPath = join(inputDir, file);
    const outputPath = join(outputDir, file.replace(/\.[^.]+$/, '.bin'));
    
    try {
      await convertToJpeg({
        inputPath,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 10
      });
      console.log(`Converted: ${file}`);
    } catch (error) {
      console.error(`Failed to convert ${file}:`, error.message);
    }
  }
}
```

### Integration with Express.js

```typescript
import express from 'express';
import multer from 'multer';
import { convertToJpeg, SamplingFactor } from './image-to-jpeg-converter';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/convert', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  
  try {
    const result = await convertToJpeg({
      inputPath: req.file.path,
      outputPath: `converted/${req.file.filename}.bin`,
      samplingFactor: SamplingFactor.YUV420,
      quality: parseInt(req.body.quality) || 10
    });
    
    res.json({
      success: true,
      outputPath: result.outputPath,
      size: result.jpegSize,
      dimensions: result.dimensions
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      type: error.type
    });
  }
});
```

## Requirements

### System Requirements

- **Node.js**: Version 18.0.0 or higher
- **FFmpeg**: Must be installed and available in system PATH
- **TypeScript**: Version 5.0 or higher (for development)

### FFmpeg Installation

The library requires FFmpeg to be installed on the system:

**Windows:**
```bash
# Using chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**macOS:**
```bash
# Using homebrew
brew install ffmpeg
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg
```

### Supported Input Formats

The library supports any image format that FFmpeg can read:
- PNG
- BMP
- TIFF
- GIF
- WEBP
- And many others

## Performance Considerations

### Memory Usage

- Header generation: < 1KB memory
- FFmpeg conversion: Depends on image size
- File assembly: Minimal additional memory

### Processing Time

- Small images (< 1MB): < 1 second
- Medium images (1-10MB): 1-5 seconds
- Large images (> 10MB): 5+ seconds

### Optimization Tips

1. **Use appropriate quality settings**: Lower quality = faster processing
2. **Choose optimal sampling factor**: 420 provides good balance
3. **Resize large images**: Use resize option for better performance
4. **Batch processing**: Process multiple images in parallel

```typescript
// Parallel processing example
const conversions = imageFiles.map(file => 
  convertToJpeg({
    inputPath: file.input,
    outputPath: file.output,
    samplingFactor: SamplingFactor.YUV420,
    quality: 10
  })
);

const results = await Promise.allSettled(conversions);
```

## Troubleshooting

### Common Issues

**FFmpeg not found:**
```
Error: FFmpeg not found in system PATH
```
Solution: Install FFmpeg and ensure it's in your system PATH.

**Invalid input file:**
```
Error: Input file does not exist: /path/to/file.png
```
Solution: Check file path and ensure file exists.

**Quality out of range:**
```
Error: Quality must be between 1 and 31, got: 50
```
Solution: Use quality values between 1-31.

**Unsupported sampling factor:**
```
Error: Invalid sampling factor: 123
```
Solution: Use valid sampling factors (400, 420, 422, 444).

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG=image-to-jpeg-converter node your-app.js
```

## License

MIT License - see LICENSE file for details.