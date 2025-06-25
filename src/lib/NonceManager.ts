import { Address, PublicClient } from 'viem';

export class NonceManager {
  private nonces: Map<Address, number> = new Map();
  private initialized: Set<Address> = new Set();

  async initialize(address: Address, publicClient: PublicClient): Promise<void> {
    if (this.initialized.has(address)) {
      return;
    }

    try {
      const currentNonce = await publicClient.getTransactionCount({
        address,
        blockTag: 'pending'
      });
      
      this.nonces.set(address, currentNonce);
      this.initialized.add(address);
      
      console.log(`NonceManager initialized for ${address} with nonce: ${currentNonce}`);
    } catch (error) {
      console.error('Failed to initialize nonce manager:', error);
      throw error;
    }
  }

  getNextNonce(address: Address): number {
    if (!this.initialized.has(address)) {
      throw new Error(`NonceManager not initialized for address: ${address}`);
    }

    const currentNonce = this.nonces.get(address) ?? 0;
    const nextNonce = currentNonce;
    
    // Increment for next use
    this.nonces.set(address, currentNonce + 1);
    
    console.log(`NonceManager: Using nonce ${nextNonce} for ${address}`);
    return nextNonce;
  }

  getCurrentNonce(address: Address): number {
    return this.nonces.get(address) ?? 0;
  }

  // Reset nonce manager and re-fetch from blockchain
  async reset(address: Address, publicClient: PublicClient): Promise<void> {
    this.initialized.delete(address);
    await this.initialize(address, publicClient);
  }

  // Manually set nonce (useful for error recovery)
  setNonce(address: Address, nonce: number): void {
    this.nonces.set(address, nonce);
    this.initialized.add(address);
  }

  isInitialized(address: Address): boolean {
    return this.initialized.has(address);
  }
}