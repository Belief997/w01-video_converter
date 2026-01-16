/**
 * Post-processors for video conversion
 * 
 * This module exports all post-processing classes:
 * - MjpegPacker: Pack JPEG frames into MJPEG stream with 8-byte alignment
 * - AviAligner: Align AVI file frames to 8-byte boundaries
 * - H264Packer: Add custom header to H264 raw streams
 */

export { MjpegPacker } from './mjpeg-packer.js';
export { AviAligner } from './avi-aligner.js';
export { H264Packer, BitReader } from './h264-packer.js';
