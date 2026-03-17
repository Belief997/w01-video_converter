# CLI Usage Examples

This document provides comprehensive examples of using the Image to JPEG Converter command-line interface.

## Basic Usage

### Simple Conversion

Convert a PNG image to binary format with embedded JPEG and custom headers:

```bash
# Basic conversion with 4:2:0 sampling and quality 10
node dist/cli.js -i input.png -o output.bin -s 420 -q 10
```

### Different Sampling Factors

```bash
# Grayscale conversion (400)
node dist/cli.js -i photo.png -o photo-gray.bin -s 400 -q 15

# 4:2:2 sampling for better quality
node dist/cli.js -i photo.png -o photo-422.bin -s 422 -q 8

# 4:4:4 sampling for best quality
node dist/cli.js -i photo.png -o photo-444.bin -s 444 -q 2
```

### Quality Settings

```bash
# Very high quality (low compression)
node dist/cli.js -i input.png -o high-quality.bin -s 444 -q 2

# Medium quality (balanced)
node dist/cli.js -i input.png -o medium-quality.bin -s 420 -q 10

# Low quality (high compression)
node dist/cli.js -i input.png -o low-quality.bin -s 420 -q 25
```

## Advanced Options

### Resize Options

```bash
# Resize to 50% of original size
node dist/cli.js -i large-image.png -o small-image.bin -s 420 -q 10 -r 50

# Resize to 70% of original size
node dist/cli.js -i image.png -o resized.bin -s 422 -q 8 -r 70

# Resize to 80% of original size
node dist/cli.js -i image.png -o resized.bin -s 420 -q 10 -r 80
```

### Compression Flag

```bash
# Enable compression flag in header
node dist/cli.js -i input.png -o compressed.bin -s 420 -q 10 -c

# Combine resize and compression
node dist/cli.js -i input.png -o output.bin -s 422 -q 8 -r 50 -c
```

## Batch Processing with Shell Scripts

### Windows Batch Script (batch-convert.bat)

```batch
@echo off
echo Converting images in current directory...

for %%f in (*.png *.bmp *.tiff *.gif) do (
    echo Converting %%f...
    node dist/cli.js -i "%%f" -o "converted\%%~nf.bin" -s 420 -q 10
)

echo Batch conversion completed!
pause
```

### Linux/macOS Shell Script (batch-convert.sh)

```bash
#!/bin/bash

echo "Converting images in current directory..."

# Create output directory
mkdir -p converted

# Convert all image files
for file in *.png *.bmp *.tiff *.gif; do
    if [ -f "$file" ]; then
        echo "Converting $file..."
        filename=$(basename "$file" | cut -d. -f1)
        node dist/cli.js -i "$file" -o "converted/${filename}.bin" -s 420 -q 10
    fi
done

echo "Batch conversion completed!"
```

### PowerShell Script (batch-convert.ps1)

```powershell
Write-Host "Converting images in current directory..."

# Create output directory
New-Item -ItemType Directory -Force -Path "converted" | Out-Null

# Get all image files
$imageFiles = Get-ChildItem -Path "." -Include "*.png", "*.bmp", "*.tiff", "*.gif"

foreach ($file in $imageFiles) {
    Write-Host "Converting $($file.Name)..."
    $outputName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name) + ".bin"
    $outputPath = Join-Path "converted" $outputName
    
    node dist/cli.js -i $file.FullName -o $outputPath -s 420 -q 10
}

Write-Host "Batch conversion completed!"
```

## Different Input Formats

```bash
# Convert PNG
node dist/cli.js -i photo.png -o photo.bin -s 420 -q 10

# Convert BMP
node dist/cli.js -i image.bmp -o image.bin -s 422 -q 8

# Convert TIFF
node dist/cli.js -i scan.tiff -o scan.bin -s 444 -q 5

# Convert GIF
node dist/cli.js -i animation.gif -o frame.bin -s 420 -q 12

# Convert WEBP
node dist/cli.js -i modern.webp -o legacy.bin -s 420 -q 10
```

## Quality Comparison Examples

Create multiple versions with different quality settings:

```bash
# Very high quality
node dist/cli.js -i input.png -o output-q2.bin -s 444 -q 2

# High quality
node dist/cli.js -i input.png -o output-q5.bin -s 422 -q 5

# Medium quality
node dist/cli.js -i input.png -o output-q10.bin -s 420 -q 10

# Low quality
node dist/cli.js -i input.png -o output-q20.bin -s 420 -q 20
```

## Error Handling in Scripts

### Robust Batch Script with Error Handling

```bash
#!/bin/bash

convert_image() {
    local input="$1"
    local output="$2"
    
    echo "Converting $input..."
    
    if node dist/cli.js -i "$input" -o "$output" -s 420 -q 10; then
        echo "✅ Successfully converted $input"
        return 0
    else
        echo "❌ Failed to convert $input"
        return 1
    fi
}

# Create output directory
mkdir -p converted

success_count=0
failure_count=0

# Process all image files
for file in *.png *.bmp *.tiff *.gif; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" | cut -d. -f1)
        output_path="converted/${filename}.bin"
        
        if convert_image "$file" "$output_path"; then
            ((success_count++))
        else
            ((failure_count++))
        fi
    fi
done

echo ""
echo "Conversion Summary:"
echo "✅ Successful: $success_count"
echo "❌ Failed: $failure_count"
```

## Help and Version Information

```bash
# Display help
node dist/cli.js --help
node dist/cli.js -h

# Display version
node dist/cli.js --version
node dist/cli.js -v
```

## Integration with Build Tools

### NPM Scripts (package.json)

```json
{
  "scripts": {
    "convert:images": "node dist/cli.js -i assets/images/input.png -o dist/images/output.bin -s 420 -q 10",
    "convert:thumbnails": "node dist/cli.js -i assets/images/large.png -o dist/thumbnails/thumb.bin -s 420 -q 15 -r 50",
    "convert:batch": "bash scripts/batch-convert.sh"
  }
}
```

### Makefile Integration

```makefile
# Convert images as part of build process
convert-images:
	@echo "Converting images..."
	@mkdir -p dist/images
	@for img in assets/images/*.png; do \
		output="dist/images/$$(basename $$img .png).jpg"; \
		node dist/cli.js -i "$$img" -o "$$output" -s 420 -q 10; \
	done

build: convert-images
	@echo "Build completed with converted images"

.PHONY: convert-images build
```

## Performance Optimization

### Parallel Processing (GNU Parallel)

```bash
# Install GNU parallel first
# Ubuntu: sudo apt install parallel
# macOS: brew install parallel

# Convert images in parallel
find . -name "*.png" | parallel -j 4 'node dist/cli.js -i {} -o converted/{/.}.bin -s 420 -q 10'
```

### Memory-Efficient Processing for Large Batches

```bash
#!/bin/bash

# Process images in smaller batches to manage memory
batch_size=5
count=0

for file in *.png; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .png)
        node dist/cli.js -i "$file" -o "converted/${filename}.bin" -s 420 -q 10 &
        
        ((count++))
        
        # Wait for batch to complete before starting next batch
        if [ $((count % batch_size)) -eq 0 ]; then
            wait
            echo "Completed batch of $batch_size images"
        fi
    fi
done

# Wait for remaining processes
wait
echo "All conversions completed!"
```

## Troubleshooting Commands

```bash
# Check if FFmpeg is available
ffmpeg -version

# Test with a simple conversion
node dist/cli.js -i test.png -o test.bin -s 420 -q 10

# Verify output file
file test.bin
hexdump -C test.bin | head -5

# Check file sizes
ls -la test.png test.bin
```