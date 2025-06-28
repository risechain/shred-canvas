#!/usr/bin/env tsx

import sharp from 'sharp';
import { ethers } from 'ethers';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory  
config({ path: path.join(__dirname, '..', '.env') });
config({ path: path.join(__dirname, '.env') });

// Configuration
const CANVAS_SIZE = 64;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x6e8152909F0e0f6bD7cbf3B8aE5E6a8aA5fA5198';
const RPC_URL = process.env.RPC_URL || 'https://testnet.riselabs.xyz/';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '64');
const CONCURRENT_TRANSACTIONS = parseInt(process.env.CONCURRENT_TRANSACTIONS || '10');
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || '3');

// Contract ABI (only the functions we need)
const CONTRACT_ABI = [
  'function paintTiles(uint256[] memory _tiles, uint8 _r, uint8 _g, uint8 _b) public',
  'function writeSection(uint256 _cursorX, uint256 _cursorY, uint24[] memory _colors) public',
  'event tilesPainted(uint256[] indices, uint8 r, uint8 g, uint8 b)',
  'event sectionWritten(uint256 cursorX, uint256 cursorY, uint256 numPixels)'
] as const;

// Types
interface Pixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

interface BatchJob {
  batchIndex: number;
  batchPixels: Pixel[];
  cursorX: number;
  cursorY: number;
  packedColors: number[];
  retryCount: number;
}

// Nonce Manager Class
class NonceManager {
  private currentNonce: number;
  
  constructor(initialNonce: number) {
    this.currentNonce = initialNonce;
  }
  
  getNextNonce(): number {
    return this.currentNonce++;
  }
  
  getCurrentNonce(): number {
    return this.currentNonce;
  }
  
  resetNonce(nonce: number): void {
    this.currentNonce = nonce;
  }
}

// Delay function
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

async function processImage(imagePath: string): Promise<Pixel[][]> {
  console.log(`Processing image: ${imagePath}`);
  
  try {
    console.log('Step 1: Getting metadata...');
    const metadata = await sharp(imagePath).metadata();
    console.log(`Original: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
    
    console.log('Step 2: Resizing and getting raw data...');
    // Fixed approach: Remove the problematic .toFormat() and use direct raw output
    const { data: rawData, info } = await sharp(imagePath)
      .resize(CANVAS_SIZE, CANVAS_SIZE, { 
        fit: 'cover',
        position: 'center'
      })
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    console.log(`Processed: ${info.width}x${info.height}, channels: ${info.channels}, data length: ${rawData.length}`);
    
    // Convert buffer to pixel array
    // Fix: Rotate 90 degrees counter-clockwise to correct the orientation
    const pixels: Pixel[][] = [];
    
    for (let y = 0; y < CANVAS_SIZE; y++) {
      const row: Pixel[] = [];
      for (let x = 0; x < CANVAS_SIZE; x++) {
        // Rotate 90 degrees counter-clockwise: (x,y) -> (CANVAS_SIZE-1-y, x)
        const sourceX = CANVAS_SIZE - 1 - y;
        const sourceY = x;
        const idx = (sourceY * CANVAS_SIZE + sourceX) * info.channels;
        
        // Handle different channel counts (grayscale, RGB, RGBA)
        const r = rawData[idx] ?? 0;
        const g = info.channels >= 3 ? (rawData[idx + 1] ?? 0) : r; // Use red for grayscale
        const b = info.channels >= 3 ? (rawData[idx + 2] ?? 0) : r; // Use red for grayscale
        
        row.push({ x, y, r, g, b });
      }
      pixels.push(row);
    }
    
    console.log(`Successfully processed ${pixels.length} rows of ${pixels[0]?.length} pixels each`);
    return pixels;
    
  } catch (error) {
    console.error('Sharp error details:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to process image: ${message}`);
  }
}

async function executeBatchJob(job: BatchJob, contract: ethers.Contract, nonceManager: NonceManager): Promise<boolean> {
  try {
    // Calculate gas limit based on batch size
    const gasLimit = BigInt(100_000) + BigInt(job.batchPixels.length) * BigInt(50_000);
    const nonce = nonceManager.getNextNonce();
    
    console.log(`  ⛽ Gas limit: ${gasLimit.toLocaleString()}, Nonce: ${nonce}`);
    
    const tx = await contract.writeSection(
      job.cursorX,
      job.cursorY,
      job.packedColors,
      {
        gasLimit,
        gasPrice: BigInt(100),
        nonce
      }
    );

    console.log(`  📤 Batch ${job.batchIndex + 1} sent: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`  ✅ Batch ${job.batchIndex + 1} confirmed in block ${receipt?.blockNumber}`);
    
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Batch ${job.batchIndex + 1} failed:`, message);
    return false;
  }
}

async function drawToCanvas(pixels: Pixel[][]): Promise<void> {
  if (!PRIVATE_KEY) {
    throw new Error('Please set PRIVATE_KEY in your .env file');
  }

  console.log(`Using RPC: ${RPC_URL}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Batch size: ${BATCH_SIZE} pixels per transaction`);
  console.log(`Concurrent transactions: ${CONCURRENT_TRANSACTIONS}`);
  console.log(`Max retries: ${MAX_RETRIES}`);

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

  console.log(`Connected to contract at ${CONTRACT_ADDRESS}`);
  console.log(`Using wallet: ${wallet.address}`);

  // Initialize nonce manager
  const currentNonce = await wallet.getNonce();
  const nonceManager = new NonceManager(currentNonce);
  console.log(`Starting nonce: ${currentNonce}`);

  // Get current gas price
  try {
    const feeData = await provider.getFeeData();
    const gasPriceGwei = feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : 'unknown';
    console.log(`Current gas price: ${gasPriceGwei} gwei`);
  } catch (error) {
    console.log('Could not fetch gas price, proceeding with default');
  }

  // Flatten pixels into a single array for batch processing
  const allPixels: Pixel[] = [];
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      allPixels.push(pixels[y][x]);
    }
  }

  console.log(`\n📐 Total pixels to draw: ${allPixels.length}`);
  const totalBatches = Math.ceil(allPixels.length / BATCH_SIZE);
  console.log(`📦 Total batches: ${totalBatches} (${BATCH_SIZE} pixels each)`);

  // Create batch jobs
  const jobs: BatchJob[] = [];
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIdx = batchIndex * BATCH_SIZE;
    const endIdx = Math.min(startIdx + BATCH_SIZE, allPixels.length);
    const batchPixels = allPixels.slice(startIdx, endIdx);
    
    // Find the cursor position (top-left of this batch)
    const firstPixel = batchPixels[0];
    const cursorX = firstPixel.x;
    const cursorY = firstPixel.y;
    
    // Convert pixels to packed uint24 colors (R<<16 | G<<8 | B)
    const packedColors: number[] = [];
    for (const pixel of batchPixels) {
      const packedColor = (pixel.r << 16) | (pixel.g << 8) | pixel.b;
      packedColors.push(packedColor);
    }
    
    jobs.push({
      batchIndex,
      batchPixels,
      cursorX,
      cursorY,
      packedColors,
      retryCount: 0
    });
  }

  // Process jobs with concurrent transactions and retry logic
  let pendingJobs = [...jobs];
  let completedJobs = 0;
  
  while (pendingJobs.length > 0) {
    // Take up to CONCURRENT_TRANSACTIONS jobs
    const currentBatch = pendingJobs.splice(0, CONCURRENT_TRANSACTIONS);
    
    console.log(`\n🚀 Processing ${currentBatch.length} concurrent transactions...`);
    
    // Execute all jobs in parallel
    const results = await Promise.allSettled(
      currentBatch.map(job => executeBatchJob(job, contract, nonceManager))
    );
    
    // Check results and handle failures
    const failedJobs: BatchJob[] = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const job = currentBatch[i];
      
      if (result.status === 'fulfilled' && result.value === true) {
        // Job succeeded
        completedJobs++;
        const progressPercent = (completedJobs / totalBatches * 100).toFixed(1);
        console.log(`  📊 Progress: ${progressPercent}% (${completedJobs}/${totalBatches})`);
      } else {
        // Job failed
        job.retryCount++;
        
        if (job.retryCount <= MAX_RETRIES) {
          console.log(`  🔄 Will retry batch ${job.batchIndex + 1} (attempt ${job.retryCount}/${MAX_RETRIES})`);
          failedJobs.push(job);
        } else {
          console.error(`  💀 Batch ${job.batchIndex + 1} failed permanently after ${MAX_RETRIES} attempts`);
        }
      }
    }
    
    // Add failed jobs back to pending for retry
    if (failedJobs.length > 0) {
      pendingJobs.unshift(...failedJobs);
      console.log(`  ⏳ Waiting 2 seconds before retrying failed jobs...`);
      await delay(2000);
    }
    
    // Short delay between batches to avoid overwhelming the network
    if (pendingJobs.length > 0) {
      await delay(500);
    }
  }

  console.log('\n🎉 Image drawing complete!');
  console.log(`📈 Successfully drew ${completedJobs * BATCH_SIZE} pixels in ${completedJobs} batches`);
  
  if (completedJobs < totalBatches) {
    const failedBatches = totalBatches - completedJobs;
    console.log(`⚠️ ${failedBatches} batches failed permanently`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: tsx draw-image.ts <image-path>');
    console.error('Example: tsx draw-image.ts ./my-image.png');
    console.error('');
    console.error('Environment variables:');
    console.error('  BATCH_SIZE - Number of pixels per transaction (default: 64)');
    console.error('  Example: BATCH_SIZE=32 tsx draw-image.ts ./my-image.png');
    process.exit(1);
  }

  // Validate environment variables
  if (!PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY not found in environment variables');
    console.error('Please create a .env file in the project root with:');
    console.error('PRIVATE_KEY=your_private_key_here');
    process.exit(1);
  }

  if (!RPC_URL) {
    console.error('❌ Error: RPC_URL not found in environment variables');
    process.exit(1);
  }

  const imagePath = path.resolve(args[0]);

  try {
    // Check if file exists
    await fs.access(imagePath);
    
    // Process image
    const pixels = await processImage(imagePath);
    
    // Confirm before drawing
    console.log('\nReady to draw image to canvas.');
    console.log('This will send multiple transactions and may take several minutes.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await delay(5000);
    
    // Draw to canvas
    await drawToCanvas(pixels);
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error:', message);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Unhandled error:', message);
  process.exit(1);
});