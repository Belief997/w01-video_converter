# Examples Directory

This directory contains practical examples demonstrating how to use the Image to JPEG Converter library in various scenarios.

## 📁 Files Overview

### JavaScript Examples

- **`basic-conversion.js`** - Simple image conversion with minimal configuration
- **`advanced-options.js`** - Demonstrates all available options (sampling factors, resize, compression)
- **`batch-processing.js`** - Process multiple images in parallel with progress reporting
- **`error-handling.js`** - Comprehensive error handling for different failure scenarios

### Documentation

- **`cli-usage.md`** - Complete CLI usage examples and shell scripts
- **`README.md`** - This file

## 🚀 Running the Examples

### Prerequisites

1. **Set up the project:**
   ```bash
   cd image-to-jpeg-converter
   npm install
   npm run build
   ```

2. **Install FFmpeg:**
   - Windows: `choco install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

3. **Prepare sample images:**
   ```bash
   mkdir examples/sample-images
   mkdir examples/output
   
   # Copy some test images to examples/sample-images/
   # Supported formats: PNG, BMP, TIFF, GIF, WEBP
   ```

### Running Individual Examples

```bash
# Basic conversion example
node examples/basic-conversion.js

# Advanced options example
node examples/advanced-options.js

# Batch processing example
node examples/batch-processing.js

# Error handling demonstration
node examples/error-handling.js
```

## 📖 Example Descriptions

### 1. Basic Conversion (`basic-conversion.js`)

**What it demonstrates:**
- Simple image conversion
- Basic error handling
- Result inspection

**Key concepts:**
- Using `convertToJpeg()` function
- Configuring sampling factor and quality
- Handling conversion results

**Sample output:**
```
🚀 Starting basic image conversion...
✅ Conversion successful!
📁 Output file: /path/to/output/basic-output.jpg
📏 JPEG size: 45231 bytes
📐 Dimensions: 800x600
```

### 2. Advanced Options (`advanced-options.js`)

**What it demonstrates:**
- Different sampling factors (400, 420, 422, 444)
- Resize options (50%, 70%, 80%)
- Compression flag usage
- Multiple conversions with different settings

**Key concepts:**
- Quality vs. file size trade-offs
- When to use different sampling factors
- Resize functionality for thumbnails

**Sample output:**
```
🚀 Starting advanced conversions...

📸 Converting: High Quality (4:4:4)
  ✅ Success: /path/to/output/high-quality.jpg
  📏 Size: 89456 bytes
  📐 Dimensions: 800x600

📸 Converting: Grayscale
  ✅ Success: /path/to/output/grayscale.jpg
  📏 Size: 23145 bytes
  📐 Dimensions: 800x600
```

### 3. Batch Processing (`batch-processing.js`)

**What it demonstrates:**
- Processing multiple images in parallel
- Progress reporting and statistics
- File size comparison and compression ratios
- Robust error handling for batch operations

**Key concepts:**
- Using `Promise.allSettled()` for parallel processing
- Calculating compression ratios
- Handling mixed success/failure scenarios

**Sample output:**
```
🚀 Starting batch processing of 5 images...

📊 Batch Processing Results:

File                Status    Input Size  Output Size Compression
----------------------------------------------------------------------
photo1.png          ✅ Success 234.5 KB    89.2 KB     62.0%
photo2.bmp          ✅ Success 1.2 MB      456.7 KB    62.2%
photo3.tiff         ✅ Success 2.8 MB      1.1 MB      60.7%

📈 Summary:
  ✅ Successful: 3
  ❌ Failed: 0
  📏 Total input size: 4.2 MB
  📏 Total output size: 1.6 MB
  🗜️  Overall compression: 61.9%
```

### 4. Error Handling (`error-handling.js`)

**What it demonstrates:**
- Different types of errors (validation, ffmpeg, io, header)
- Proper error categorization and handling
- User-friendly error messages
- Debugging and logging strategies

**Key concepts:**
- Using `ConversionError` type checking
- Providing helpful error messages
- Logging errors for debugging

**Sample output:**
```
🔍 Demonstrating error handling scenarios...

🧪 Testing: Non-existent input file
  ✅ Caught expected error type: validation
  📝 Message: Input file does not exist: /path/to/non-existent-file.png
  🎯 Error type matches expectation

🧪 Testing: Invalid quality value (too high)
  ✅ Caught expected error type: validation
  📝 Message: Quality must be between 1 and 31, got: 50
  🎯 Error type matches expectation
```

## 🛠️ Customizing Examples

### Modifying Input/Output Paths

Edit the file paths in each example:

```javascript
// Change these paths to match your setup
const inputPath = join(__dirname, 'your-images', 'input.png');
const outputPath = join(__dirname, 'your-output', 'output.jpg');
```

### Adjusting Conversion Settings

Experiment with different settings:

```javascript
// High quality, large file size
samplingFactor: SamplingFactor.YUV444,
quality: 2

// Balanced quality and size
samplingFactor: SamplingFactor.YUV420,
quality: 10

// High compression, smaller file
samplingFactor: SamplingFactor.Grayscale,
quality: 20
```

### Adding Custom Logic

Extend the examples with your own logic:

```javascript
// Add custom file filtering
const imageFiles = files.filter(file => {
  const ext = extname(file).toLowerCase();
  const size = statSync(join(inputDir, file)).size;
  return imageExtensions.includes(ext) && size < 10 * 1024 * 1024; // < 10MB
});

// Add custom naming conventions
const outputPath = join(outputDir, `${timestamp}-${basename(file, ext)}.jpg`);

// Add progress callbacks
console.log(`Processing ${index + 1}/${total}: ${file}`);
```

## 🔧 Integration Examples

### Express.js Web Server

```javascript
import express from 'express';
import multer from 'multer';
import { convertToJpeg, SamplingFactor } from './image-to-jpeg-converter';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/convert', upload.single('image'), async (req, res) => {
  try {
    const result = await convertToJpeg({
      inputPath: req.file.path,
      outputPath: `converted/${req.file.filename}.jpg`,
      samplingFactor: SamplingFactor.YUV420,
      quality: parseInt(req.body.quality) || 10
    });
    
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Build Tool Integration

```javascript
// webpack.config.js
const { convertToJpeg, SamplingFactor } = require('./image-to-jpeg-converter');

class ImageConverterPlugin {
  apply(compiler) {
    compiler.hooks.emit.tapAsync('ImageConverterPlugin', async (compilation, callback) => {
      // Convert images during build process
      await convertToJpeg({
        inputPath: 'src/assets/hero.png',
        outputPath: 'dist/assets/hero.jpg',
        samplingFactor: SamplingFactor.YUV420,
        quality: 8
      });
      
      callback();
    });
  }
}
```

## 📚 Additional Resources

- **[API Reference](../docs/API.md)** - Complete API documentation
- **[Integration Guide](../docs/INTEGRATION.md)** - How to integrate into your project
- **[CLI Usage](cli-usage.md)** - Command-line interface examples

## 🤝 Contributing Examples

Have a useful example? Contributions are welcome!

1. Create a new `.js` file with a descriptive name
2. Follow the existing code style and documentation format
3. Include comprehensive comments and error handling
4. Add a description to this README
5. Test your example thoroughly

## 📝 Notes

- All examples use ES modules (`import`/`export`)
- Examples assume the library is built (`npm run build`)
- Sample images should be placed in `examples/sample-images/`
- Output files are created in `examples/output/`
- Examples include both success and error scenarios for learning