import { createPublicClient, createWalletClient, http, webSocket, parseAbiItem, encodeFunctionData, Address, keccak256, serializeTransaction } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { riseTestnet } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration
const NETWORK = process.env.NETWORK || 'production';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const NUM_TRANSACTIONS = parseInt(process.env.NUM_TRANSACTIONS || '1000');
const DELAY_BETWEEN_TXS = parseInt(process.env.DELAY_BETWEEN_TXS || '50'); // milliseconds

if (!PRIVATE_KEY) {
  console.error('Please set PRIVATE_KEY in .env file');
  process.exit(1);
}

// Network configurations
const networkConfigs = {
  production: {
    contractAddress: '0x39A9625E535e7E6c65b4B63E82Edf0c341C678C7' as Address,
    rpcUrl: 'https://node2.testnet.riselabs.xyz/',
    wssUrl: 'wss://node2.testnet.riselabs.xyz/ws',
    canvasSize: 64,
  },
  staging: {
    contractAddress: '0x0a8d0B15f68C49A8d3351F9D0e539375360D8e2D' as Address,
    rpcUrl: 'https://staging.riselabs.xyz/',
    wssUrl: 'wss://staging.riselabs.xyz/ws',
    canvasSize: 32,
  },
};

const config = networkConfigs[NETWORK as keyof typeof networkConfigs];
if (!config) {
  console.error(`Invalid network: ${NETWORK}. Use 'production' or 'staging'`);
  process.exit(1);
}


// Contract ABI
const canvasAbi = [
  {
    inputs: [
      { name: '_tiles', type: 'uint256[]' },
      { name: '_r', type: 'uint8' },
      { name: '_g', type: 'uint8' },
      { name: '_b', type: 'uint8' },
    ],
    name: 'paintTiles',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const tilesPaintedEvent = parseAbiItem('event tilesPainted(uint256[] indices, uint8 r, uint8 g, uint8 b)');

// Types
interface TransactionRecord {
  txHash: string;
  tiles: bigint[];
  color: { r: number; g: number; b: number };
  sentAt: bigint;
  receivedAt?: bigint;
  latencyMs?: number;
}

interface Statistics {
  totalTransactions: number;
  receivedEvents: number;
  missingEvents: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  latencies: number[];
}

// Main test function
async function runTest() {
  console.log(`🚀 Starting paint tiles event test on ${NETWORK} network`);
  console.log(`📍 Contract: ${config.contractAddress}`);
  console.log(`📊 Sending ${NUM_TRANSACTIONS} transactions`);
  console.log('');

  const account = privateKeyToAccount((PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`) as `0x${string}`);
  console.log(`👤 Using account: ${account.address}`);

  // Create clients
  const publicClient = createPublicClient({
    chain: riseTestnet,
    transport: http(config.rpcUrl),
  });

  const wsClient = createPublicClient({
    chain: riseTestnet,
    transport: webSocket(config.wssUrl),
  });

  // Transaction tracking
  const transactions = new Map<string, TransactionRecord>();
  const eventTimeouts = new Map<string, NodeJS.Timeout>();

  // Start watching for events
  console.log('📡 Setting up WebSocket event listener...');
  const unwatch = wsClient.watchEvent({
    address: config.contractAddress,
    event: tilesPaintedEvent,
    onLogs: (logs) => {
      logs.forEach((log) => {
        const receivedAt = process.hrtime.bigint();
        const txHash = log.transactionHash?.toLowerCase();
        
        if (txHash && transactions.has(txHash)) {
          const record = transactions.get(txHash)!;
          if (!record.receivedAt) {
            record.receivedAt = receivedAt;
            record.latencyMs = Number((receivedAt - record.sentAt) / 1_000_000n);
            
            // Clear timeout
            const timeout = eventTimeouts.get(txHash);
            if (timeout) {
              clearTimeout(timeout);
              eventTimeouts.delete(txHash);
            }
            
            console.log(`✅ Event received for tx ${txHash.substring(0, 10)}... | Latency: ${record.latencyMs}ms | Tiles: ${record.tiles.length}`);
          }
        }
      });
    },
  });

  console.log('✅ WebSocket connected and listening');
  console.log('');

  // Get initial nonce
  let nonce = await publicClient.getTransactionCount({
    address: account.address,
    blockTag: 'pending',
  });
  
  // Send transactions in parallel
  console.log('🎨 Preparing and sending paint transactions in parallel...');
  console.log(`⚡ Delay between transactions: ${DELAY_BETWEEN_TXS}ms`);
  
  // Create all transaction promises
  const transactionPromises = Array.from({ length: NUM_TRANSACTIONS }, async (_, i) => {
    // Add staggered delay to avoid overwhelming the RPC
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TXS * i));
    }
    
    const txNonce = nonce + i;
    
    // Generate random tiles (1-10 tiles per transaction)
    const numTiles = 1;//Math.floor(Math.random() * 10) + 1;
    const tiles: bigint[] = [];
    const usedTiles = new Set<number>();
    
    while (tiles.length < numTiles) {
      const tile = Math.floor(Math.random() * (config.canvasSize * config.canvasSize));
      if (!usedTiles.has(tile)) {
        tiles.push(BigInt(tile));
        usedTiles.add(tile);
      }
    }
    
    // Random color
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    
    try {
      // Encode function data
      const data = encodeFunctionData({
        abi: canvasAbi,
        functionName: 'paintTiles',
        args: [tiles, r, g, b],
      });
      
      // Prepare transaction
      const transaction = {
        to: config.contractAddress,
        data,
        nonce: txNonce,
        gas: BigInt(90_000 * 20_000 * tiles.length),
        gasPrice: BigInt(100),
        value: BigInt(0),
        chainId: riseTestnet.id,
        from: account.address,
      };
      
      // Sign transaction to get the hash
      const signature = await account.signTransaction(transaction);
      const hash = keccak256(signature);
      
      // Record transaction BEFORE sending
      const sentAt = process.hrtime.bigint();
      const txRecord: TransactionRecord = {
        txHash: hash.toLowerCase(),
        tiles,
        color: { r, g, b },
        sentAt,
      };
      
      transactions.set(hash.toLowerCase(), txRecord);
      
      // Set timeout for missing event detection
      const timeout = setTimeout(() => {
        console.log(`❌ Event timeout for tx ${hash.substring(0, 10)}... | Tiles: ${tiles.length}`);
      }, 5000);
      eventTimeouts.set(hash.toLowerCase(), timeout);
      
      // Now send the signed transaction
      const sentHash = await publicClient.sendRawTransaction({
        serializedTransaction: signature,
      });
      
      // Verify the hash matches
      if (sentHash.toLowerCase() !== hash.toLowerCase()) {
        console.warn(`⚠️  Hash mismatch: calculated ${hash} but got ${sentHash}`);
      }
      
      console.log(`📤 Sent tx ${i + 1}/${NUM_TRANSACTIONS}: ${hash.substring(0, 10)}... | Tiles: ${tiles.length} | Color: rgb(${r},${g},${b})`);
      
      return { success: true, hash, index: i };
    } catch (error) {
      console.error(`❌ Error sending transaction ${i + 1}:`, error);
      return { success: false, error, index: i };
    }
  });
  
  // Execute all transactions in parallel
  const results = await Promise.all(transactionPromises);
  
  console.log('');
  const successfulTxs = results.filter(r => r.success).length;
  console.log(`✅ Successfully sent ${successfulTxs}/${NUM_TRANSACTIONS} transactions`);
  console.log('⏳ Waiting for events (5 second timeout)...');
  
  // Wait for all events or timeouts
  await new Promise(resolve => setTimeout(resolve, 5500));
  
  // Calculate statistics
  const stats: Statistics = {
    totalTransactions: transactions.size,
    receivedEvents: 0,
    missingEvents: 0,
    averageLatencyMs: 0,
    minLatencyMs: Infinity,
    maxLatencyMs: 0,
    latencies: [],
  };
  
  transactions.forEach((record) => {
    if (record.receivedAt && record.latencyMs !== undefined) {
      stats.receivedEvents++;
      stats.latencies.push(record.latencyMs);
      stats.minLatencyMs = Math.min(stats.minLatencyMs, record.latencyMs);
      stats.maxLatencyMs = Math.max(stats.maxLatencyMs, record.latencyMs);
    } else {
      stats.missingEvents++;
    }
  });
  
  if (stats.latencies.length > 0) {
    stats.averageLatencyMs = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;
  }
  
  // Print results
  console.log('');
  console.log('📊 Test Results:');
  console.log('================');
  console.log(`Total transactions sent: ${stats.totalTransactions}`);
  console.log(`Events received: ${stats.receivedEvents} (${((stats.receivedEvents / stats.totalTransactions) * 100).toFixed(1)}%)`);
  console.log(`Events missing: ${stats.missingEvents} (${((stats.missingEvents / stats.totalTransactions) * 100).toFixed(1)}%)`);
  console.log('');
  console.log('⏱️  Latency Statistics:');
  console.log(`Average: ${stats.averageLatencyMs.toFixed(2)}ms`);
  console.log(`Min: ${stats.minLatencyMs === Infinity ? 'N/A' : stats.minLatencyMs + 'ms'}`);
  console.log(`Max: ${stats.maxLatencyMs === 0 ? 'N/A' : stats.maxLatencyMs + 'ms'}`);
  
  if (stats.latencies.length > 0) {
    // Calculate percentiles
    const sorted = [...stats.latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    console.log(`P50: ${p50}ms`);
    console.log(`P95: ${p95}ms`);
    console.log(`P99: ${p99}ms`);
  }
  
  // Cleanup
  unwatch();
  
  process.exit(stats.missingEvents > 0 ? 1 : 0);
}

// Run the test
runTest().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});