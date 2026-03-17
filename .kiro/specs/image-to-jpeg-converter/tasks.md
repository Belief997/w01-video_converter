# Implementation Plan: Image to JPEG Converter

## Overview

This implementation plan outlines the steps to build a TypeScript library that converts images to JPEG format with custom binary headers. The system uses FFmpeg for conversion and provides both a programmatic API and CLI interface for source code integration into other projects.

## Tasks

- [x] 1. Set up project structure and TypeScript configuration
  - Create directory structure (src/, tests/, docs/)
  - Initialize package.json with dependencies (fast-check for testing)
  - Configure tsconfig.json for ES modules and strict type checking
  - Set up testing framework (Jest or Vitest)
  - Create .gitignore and basic README
  - _Requirements: 11.1_

- [ ] 2. Define core types and interfaces
  - [x] 2.1 Create types.ts with all TypeScript interfaces
    - Define ConversionConfig interface
    - Define SamplingFactor enum (400, 420, 422, 444)
    - Define ResizeOption enum (None=0, Fifty=1, Seventy=2, Eighty=3)
    - Define ConversionResult interface
    - Define ConversionError type with error categories
    - Define RgbDataHeader and JpegFileHeader interfaces
    - Add JSDoc comments for all exported types
    - _Requirements: 11.5, 11.6_
  
  - [ ]* 2.2 Write property test for enum values
    - **Property 2: Sampling Factor Mapping**
    - **Validates: Requirements 2.1**

- [ ] 3. Implement input validation module
  - [x] 3.1 Create validator.ts with InputValidator class
    - Implement file existence validation
    - Implement quality range validation (1-31)
    - Implement sampling factor validation
    - Implement output path validation
    - Aggregate multiple validation errors
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 3.2 Write property tests for validation
    - **Property 3: Quality Parameter Validation**
    - **Property 15: Input File Validation**
    - **Validates: Requirements 3.2, 3.3, 8.1, 8.2**
  
  - [ ]* 3.3 Write unit tests for validation edge cases
    - Test boundary values (quality 0, 1, 31, 32)
    - Test non-existent file paths
    - Test invalid sampling factors
    - Test multiple validation errors aggregation
    - _Requirements: 8.5_

- [ ] 4. Implement FFmpeg executor module
  - [x] 4.1 Create ffmpeg-executor.ts with FFmpegExecutor class
    - Implement command builder for different sampling factors
    - Map sampling factors to pixel formats (400→gray, 420→yuvj420p, 422→yuvj422p, 444→yuvj444p)
    - Implement FFmpeg process execution using child_process
    - Capture stdout, stderr, and exit code
    - Handle FFmpeg not found error
    - Validate output file exists after conversion
    - _Requirements: 1.1, 1.2, 2.1, 7.1, 7.2, 7.4, 7.5_
  
  - [ ]* 4.2 Write property test for FFmpeg command construction
    - **Property 4: Quality Parameter Propagation**
    - **Property 13: FFmpeg Command Completeness**
    - **Validates: Requirements 3.1, 7.1**
  
  - [ ]* 4.3 Write unit tests for FFmpeg integration
    - Test command construction for each sampling factor
    - Test FFmpeg error handling (non-zero exit code)
    - Test FFmpeg not found scenario
    - Mock FFmpeg execution for unit tests
    - _Requirements: 1.3, 1.4, 7.3, 7.4_

- [ ] 5. Checkpoint - Ensure validation and FFmpeg modules work
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement binary header generator module
  - [x] 6.1 Create header-generator.ts with HeaderGenerator class
    - Implement RgbDataHeader generation with bit field packing
    - Initialize all bit fields to 0 by default (scan, align, resize, compress, jpeg, idu, rsvd)
    - Set type field to 12 for JPEG
    - Set width and height from image dimensions
    - Handle resize option mapping (0, 1, 2, 3)
    - Handle compress flag (set bit to 1 if enabled)
    - Initialize version and reserved fields to 0
    - Implement little-endian encoding using Buffer
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 9.1, 9.4_
  
  - [x] 6.2 Implement JpegFileHeader generation
    - Include RgbDataHeader as first component
    - Calculate size field from 0xFFD8 marker
    - Exclude header bytes from size calculation
    - Set dummy field to 0
    - Validate JPEG data starts with 0xFFD8
    - Encode complete header to Buffer
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.3_
  
  - [ ]* 6.3 Write property tests for header generation
    - **Property 5: Header Size Invariant**
    - **Property 6: JPEG Header Constants**
    - **Property 7: Image Dimension Accuracy**
    - **Property 8: Resize Option Mapping**
    - **Property 9: Reserved Fields Initialization**
    - **Property 10: JPEG Size Calculation**
    - **Property 11: Dummy Field Invariant**
    - **Property 17: Little-Endian Encoding**
    - **Property 18: Field Size Correctness**
    - **Property 19: No Padding Bytes**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6, 4.8, 5.2, 5.3, 5.4, 9.1, 9.2, 9.3, 9.5**
  
  - [ ]* 6.4 Write unit tests for header edge cases
    - Test with various image dimensions
    - Test with different resize options
    - Test with compress flag enabled/disabled
    - Test JPEG data without 0xFFD8 marker (error case)
    - Verify binary structure byte-by-byte
    - _Requirements: 4.6, 4.7, 5.6_

- [ ] 7. Implement file assembler module
  - [x] 7.1 Create file-assembler.ts with FileAssembler class
    - Implement binary file writing using fs module
    - Write header bytes first
    - Write JPEG data immediately after header
    - Verify file was written successfully
    - Handle I/O errors gracefully
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [ ]* 7.2 Write property tests for file assembly
    - **Property 12: Output File Structure**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  
  - [ ]* 7.3 Write unit tests for file assembly
    - Test successful file writing
    - Test I/O error handling
    - Test file verification
    - Mock file system for error scenarios
    - _Requirements: 6.4_

- [ ] 8. Implement main converter orchestration
  - [x] 8.1 Create converter.ts with Converter class
    - Orchestrate validation → FFmpeg → header generation → assembly pipeline
    - Create temporary file paths for FFmpeg output
    - Extract image dimensions from JPEG data
    - Implement cleanup on error
    - Implement cleanup on success
    - Handle all error types (validation, FFmpeg, I/O, header)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 8.2 Write property tests for converter
    - **Property 1: Valid JPEG Output**
    - **Property 16: Validation Before Execution**
    - **Property 20: Temporary File Cleanup**
    - **Property 21: Atomic Output Creation**
    - **Property 22: Error Message Completeness**
    - **Validates: Requirements 1.1, 1.2, 8.4, 10.1, 10.2, 10.3, 10.4**
  
  - [ ]* 8.3 Write integration tests for end-to-end conversion
    - Test PNG to JPEG with 420 sampling
    - Test BMP to JPEG with 444 sampling
    - Test grayscale conversion with 400 sampling
    - Test with resize options
    - Test error scenarios (invalid input, FFmpeg failure)
    - Verify output file structure
    - _Requirements: 1.1, 2.1, 3.1, 4.6_

- [ ] 9. Checkpoint - Ensure core conversion pipeline works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement public API and exports
  - [x] 10.1 Create index.ts with public API exports
    - Export convertToJpeg function
    - Export all types and interfaces
    - Export enums (SamplingFactor, ResizeOption)
    - Add comprehensive JSDoc comments
    - _Requirements: 11.2, 11.5, 11.6_
  
  - [ ]* 10.2 Write unit tests for public API
    - Test API function signatures
    - Test error handling through public API
    - Test type exports
    - _Requirements: 11.2_

- [ ] 11. Implement command-line interface
  - [x] 11.1 Create cli.ts with argument parsing
    - Parse command-line arguments (input, output, sampling, quality, resize)
    - Validate CLI arguments
    - Call converter with parsed configuration
    - Display results or errors
    - Add help text and usage examples
    - _Requirements: 11.1_
  
  - [ ]* 11.2 Write unit tests for CLI
    - Test argument parsing
    - Test help text display
    - Test error message formatting
    - Mock converter for CLI tests
    - _Requirements: 11.1_

- [ ] 12. Create integration documentation
  - [x] 12.1 Write INTEGRATION.md
    - Document how to copy source files into target project
    - List required dependencies (FFmpeg, Node.js version)
    - Explain TypeScript configuration requirements
    - Provide build and compilation instructions
    - Show example integration in different project types
    - _Requirements: 11.3_
  
  - [x] 12.2 Write README.md
    - Add quick start example
    - Document installation instructions
    - Provide basic usage examples
    - List configuration options
    - Show error handling examples
    - _Requirements: 11.7_
  
  - [x] 12.3 Write API.md
    - Document complete API reference
    - Document all exported types and interfaces
    - Provide usage examples for each function
    - Document error handling patterns
    - Document advanced configuration options
    - _Requirements: 11.6_

- [ ] 13. Add usage examples and documentation
  - [x] 13.1 Create examples directory with sample code
    - Basic conversion example
    - Conversion with resize option
    - Error handling example
    - CLI usage examples
    - _Requirements: 11.4_
  
  - [ ] 13.2 Add inline code examples to documentation
    - Update README with code snippets
    - Add examples to API documentation
    - _Requirements: 11.4, 11.7_

- [ ] 14. Final integration testing and validation
  - [ ]* 14.1 Run all property-based tests with 100+ iterations
    - Verify all 22 properties pass
    - Check test coverage
    - _Requirements: All_
  
  - [ ]* 14.2 Run all unit tests and integration tests
    - Verify all edge cases are handled
    - Check error handling paths
    - _Requirements: All_
  
  - [x] 14.3 Test source code integration in sample project
    - Create a sample project that imports the library
    - Test compilation and runtime behavior
    - Verify documentation accuracy
    - _Requirements: 11.3_

- [x] 15. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties (22 properties total)
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end functionality
- Documentation tasks ensure the library can be easily integrated into other projects
- The implementation uses TypeScript with Node.js Buffer API for binary data handling
- FFmpeg is executed via child_process module
- fast-check library is used for property-based testing
