# Integration Guide

This guide explains how to integrate the Image to JPEG Converter library into your TypeScript/JavaScript project as source code.

## Table of Contents

- [Overview](#overview)
- [Integration Methods](#integration-methods)
- [Required Dependencies](#required-dependencies)
- [TypeScript Configuration](#typescript-configuration)
- [Build and Compilation](#build-and-compilation)
- [Integration Examples](#integration-examples)
- [Troubleshooting](#troubleshooting)

## Overview

The Image to JPEG Converter is designed to be integrated as source code into your project. This approach provides:

- **Full control**: Modify the code to fit your specific needs
- **No external dependencies**: Only requires FFmpeg as an external tool
- **Type safety**: Full TypeScript support with type definitions
- **Flexibility**: Use as a library or CLI tool

## Integration Methods

### Method 1: Copy Source Files (Recommended)

This is the simplest method for integrating the library into your project.

#### Step 1: Copy Source Files

Copy the `src/` directory into your project:

```bash
# From the image-to-jpeg-converter directory
cp -r src/ /path/to/your/project/lib/image-to-jpeg/

# Or on Windows
xcopy /E /I src "C:\path\to\your\project\lib\image-to-jpeg"
```

Your project structure should look like:

```
your-project/
├── lib/
│   └── image-to-jpeg/
│       ├── cli.ts
│       ├── converter.ts
│       ├── ffmpeg-executor.ts
│       ├── file-assembler.ts
│       ├── header-generator.ts
│       ├── index.ts
│       ├── types.ts
│       └── validator.ts
├── src/
│   └── your-code.ts
├── package.json
└── tsconfig.json
```

#### Step 2: Import and Use

Import the library in your TypeScript code:

```typescript
import { convertToJpeg, SamplingFactor } from './lib/image-to-jpeg/index.js';

async function convertImage() {
  const result = await convertToJpeg({
    inputPath: 'input.png',
    outputPath: 'output.bin',
    samplingFactor: SamplingFactor.YUV420,
    quality: 10
  });
  
  console.log(`Converted: ${result.outputPath}`);
}
```

### Method 2: Git Submodule

If you want to keep the library updated with the original repository:

```bash
# Add as a submodule
git submodule add https://github.com/your-repo/image-to-jpeg-converter.git lib/image-to-jpeg

# Update submodule
git submodule update --remote lib/image-to-jpeg
```

Then import from the submodule:

```typescript
import { convertToJpeg } from './lib/image-to-jpeg/src/index.js';
```

### Method 3: NPM Link (Development)

For local development and testing:

```bash
# In the image-to-jpeg-converter directory
npm link

# In your project directory
npm link image-to-jpeg-converter
```

Then import as a regular package:

```typescript
import { convertToJpeg } from 'image-to-jpeg-converter';
```

## Required Dependencies

### External Tools

**FFmpeg** (Required)

The library uses FFmpeg for image conversion. FFmpeg must be installed and available in your system PATH.

**Installation:**

- **Ubuntu/Debian:**
  ```bash
  sudo apt-get update
  sudo apt-get install ffmpeg
  ```

- **macOS (Homebrew):**
  ```bash
  brew install ffmpeg
  ```

- **Windows (Chocolatey):**
  ```bash
  choco install ffmpeg
  ```

- **Windows (Manual):**
  1. Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  2. Extract to a directory (e.g., `C:\ffmpeg`)
  3. Add `C:\ffmpeg\bin` to your system PATH

**Verify Installation:**

```bash
ffmpeg -version
```

### Node.js Version

- **Minimum:** Node.js 18.0.0 or higher
- **Recommended:** Node.js 20.x LTS

Check your Node.js version:

```bash
node --version
```

### NPM Dependencies

The library has **no runtime dependencies**. However, for development and testing, you may want to install:

```json
{
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  }
}
```

Install in your project:

```bash
npm install --save-dev @types/node typescript
```

## TypeScript Configuration

### Minimum tsconfig.json

Your `tsconfig.json` should include these settings for compatibility:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "src/**/*",
    "lib/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### Key Configuration Options

- **`target: "ES2022"`**: Uses modern JavaScript features
- **`module: "ES2022"`**: Enables ES modules (required)
- **`moduleResolution: "node"`**: Standard Node.js module resolution
- **`strict: true`**: Enables all strict type checking
- **`declaration: true`**: Generates `.d.ts` type definition files
- **`sourceMap: true`**: Generates source maps for debugging

### Include Library Files

Make sure your `include` array includes the library directory:

```json
{
  "include": [
    "src/**/*",
    "lib/image-to-jpeg/**/*"
  ]
}
```

## Build and Compilation

### Building Your Project

Compile TypeScript to JavaScript:

```bash
# Using TypeScript compiler
npx tsc

# Or if you have a build script
npm run build
```

This will compile both your code and the library code to the `dist/` directory.

### Output Structure

After compilation, your `dist/` directory should contain:

```
dist/
├── lib/
│   └── image-to-jpeg/
│       ├── cli.js
│       ├── cli.d.ts
│       ├── converter.js
│       ├── converter.d.ts
│       ├── index.js
│       ├── index.d.ts
│       └── ... (other compiled files)
└── src/
    └── your-code.js
```

### Running Compiled Code

Execute your compiled JavaScript:

```bash
node dist/src/your-code.js
```

### Using the CLI

If you want to use the CLI tool, you can run it directly:

```bash
# From TypeScript source
npx tsx lib/image-to-jpeg/cli.ts -i input.png -o output.bin -s 420 -q 10

# From compiled JavaScript
node dist/lib/image-to-jpeg/cli.js -i input.png -o output.bin -s 420 -q 10
```

## Integration Examples

### Example 1: Express.js Web Server

Integrate the converter into an Express.js application:

```typescript
// server.ts
import express from 'express';
import multer from 'multer';
import { convertToJpeg, SamplingFactor } from './lib/image-to-jpeg/index.js';
import path from 'path';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/convert', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const outputPath = path.join('output', `${req.file.filename}.bin`);

    const result = await convertToJpeg({
      inputPath: req.file.path,
      outputPath: outputPath,
      samplingFactor: SamplingFactor.YUV420,
      quality: 10
    });

    res.json({
      success: true,
      outputPath: result.outputPath,
      size: result.jpegSize,
      dimensions: result.dimensions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Example 2: Batch Processing Script

Process multiple images in a directory:

```typescript
// batch-convert.ts
import { convertToJpeg, SamplingFactor } from './lib/image-to-jpeg/index.js';
import fs from 'fs';
import path from 'path';

async function batchConvert(inputDir: string, outputDir: string) {
  const files = fs.readdirSync(inputDir);
  const imageFiles = files.filter(f => 
    /\.(png|bmp|tiff|gif)$/i.test(f)
  );

  console.log(`Found ${imageFiles.length} images to convert`);

  for (const file of imageFiles) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, `${path.parse(file).name}.bin`);

    try {
      console.log(`Converting ${file}...`);
      const result = await convertToJpeg({
        inputPath,
        outputPath,
        samplingFactor: SamplingFactor.YUV420,
        quality: 10
      });
      console.log(`  ✓ Success: ${result.dimensions.width}x${result.dimensions.height}`);
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);
    }
  }
}

// Usage
batchConvert('./input-images', './output-images');
```

### Example 3: CLI Wrapper

Create a custom CLI tool with additional features:

```typescript
// my-converter.ts
import { convertToJpeg, SamplingFactor, ResizeOption } from './lib/image-to-jpeg/index.js';
import { program } from 'commander';

program
  .name('my-converter')
  .description('Custom image converter with presets')
  .version('1.0.0');

program
  .command('web')
  .description('Convert for web use (4:2:0, quality 10)')
  .argument('<input>', 'Input image file')
  .argument('<output>', 'Output binary file')
  .action(async (input, output) => {
    const result = await convertToJpeg({
      inputPath: input,
      outputPath: output,
      samplingFactor: SamplingFactor.YUV420,
      quality: 10,
      resize: ResizeOption.Eighty
    });
    console.log(`Converted: ${result.outputPath}`);
  });

program
  .command('print')
  .description('Convert for print use (4:4:4, quality 2)')
  .argument('<input>', 'Input image file')
  .argument('<output>', 'Output binary file')
  .action(async (input, output) => {
    const result = await convertToJpeg({
      inputPath: input,
      outputPath: output,
      samplingFactor: SamplingFactor.YUV444,
      quality: 2
    });
    console.log(`Converted: ${result.outputPath}`);
  });

program.parse();
```

### Example 4: Electron Desktop Application

Integrate into an Electron app:

```typescript
// main.ts (Electron main process)
import { app, BrowserWindow, ipcMain } from 'electron';
import { convertToJpeg, SamplingFactor } from './lib/image-to-jpeg/index.js';

ipcMain.handle('convert-image', async (event, config) => {
  try {
    const result = await convertToJpeg({
      inputPath: config.inputPath,
      outputPath: config.outputPath,
      samplingFactor: config.samplingFactor || SamplingFactor.YUV420,
      quality: config.quality || 10
    });
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// renderer.ts (Electron renderer process)
const result = await window.electron.ipcRenderer.invoke('convert-image', {
  inputPath: '/path/to/input.png',
  outputPath: '/path/to/output.bin',
  samplingFactor: 420,
  quality: 10
});

if (result.success) {
  console.log('Conversion successful:', result.result);
} else {
  console.error('Conversion failed:', result.error);
}
```

### Example 5: AWS Lambda Function

Use in a serverless function:

```typescript
// lambda-handler.ts
import { convertToJpeg, SamplingFactor } from './lib/image-to-jpeg/index.js';
import { S3 } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const s3 = new S3();

export async function handler(event: any) {
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  // Download from S3
  const inputPath = `/tmp/${path.basename(key)}`;
  const outputPath = `/tmp/${path.parse(key).name}.bin`;

  const object = await s3.getObject({ Bucket: bucket, Key: key });
  fs.writeFileSync(inputPath, await object.Body.transformToByteArray());

  // Convert
  const result = await convertToJpeg({
    inputPath,
    outputPath,
    samplingFactor: SamplingFactor.YUV420,
    quality: 10
  });

  // Upload to S3
  const outputData = fs.readFileSync(outputPath);
  await s3.putObject({
    Bucket: bucket,
    Key: `converted/${path.basename(outputPath)}`,
    Body: outputData
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Conversion successful',
      size: result.jpegSize,
      dimensions: result.dimensions
    })
  };
}
```

**Note for Lambda:** You'll need to include FFmpeg in your Lambda layer or deployment package.

## Troubleshooting

### FFmpeg Not Found

**Error:** `FFmpeg is not installed or not found in PATH`

**Solution:**
1. Verify FFmpeg is installed: `ffmpeg -version`
2. Check PATH environment variable includes FFmpeg directory
3. On Windows, restart your terminal/IDE after adding to PATH
4. In production, ensure FFmpeg is installed in the deployment environment

### Module Resolution Errors

**Error:** `Cannot find module './lib/image-to-jpeg/index.js'`

**Solution:**
1. Check the import path is correct relative to your file
2. Ensure `.js` extension is included in imports (required for ES modules)
3. Verify `tsconfig.json` includes the library directory in `include`
4. Check `moduleResolution` is set to `"node"` in `tsconfig.json`

### Type Definition Errors

**Error:** `Could not find a declaration file for module`

**Solution:**
1. Ensure `declaration: true` in `tsconfig.json`
2. Run `npm run build` to generate `.d.ts` files
3. Check `@types/node` is installed: `npm install --save-dev @types/node`

### Permission Errors

**Error:** `EACCES: permission denied`

**Solution:**
1. Check output directory is writable
2. On Linux/macOS, verify file permissions: `chmod 755 output-dir`
3. Run with appropriate permissions or change output directory

### Memory Issues with Large Images

**Error:** `JavaScript heap out of memory`

**Solution:**
1. Increase Node.js memory limit: `node --max-old-space-size=4096 your-script.js`
2. Process images in batches instead of all at once
3. Use resize option to reduce image size before conversion

### FFmpeg Conversion Failures

**Error:** `FFmpeg conversion failed`

**Solution:**
1. Check input file is a valid image format
2. Verify FFmpeg supports the input format: `ffmpeg -formats`
3. Check FFmpeg error output in the error details
4. Try converting manually with FFmpeg to diagnose: `ffmpeg -i input.png output.bin`

### Build Errors

**Error:** `Cannot compile TypeScript`

**Solution:**
1. Ensure TypeScript version is 5.0 or higher: `npm install --save-dev typescript@^5.3.0`
2. Check `tsconfig.json` is properly configured (see above)
3. Clear build cache: `rm -rf dist && npm run build`
4. Check for syntax errors in TypeScript files

## Additional Resources

- [API Reference](./API.md) - Complete API documentation
- [README](../README.md) - Quick start guide
- [Examples](../examples/) - More usage examples
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html) - FFmpeg reference

## Support

For issues, questions, or contributions:
- Check the troubleshooting section above
- Review the API documentation
- Examine the example integrations
- Consult the FFmpeg documentation for conversion issues

## License

MIT License - See LICENSE file for details
