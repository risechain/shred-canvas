import { Address } from "viem";
import { RegistrationCacheEntry } from "@/types/feedback";

export class RegistrationCache {
  private cache = new Map<string, RegistrationCacheEntry>();
  private ttl = 5 * 60 * 1000; // 5 minutes TTL
  private timestamps = new Map<string, number>();

  set(address: Address, entry: RegistrationCacheEntry): void {
    this.cache.set(address.toLowerCase(), entry);
    this.timestamps.set(address.toLowerCase(), Date.now());
  }

  get(address: Address): RegistrationCacheEntry | undefined {
    const key = address.toLowerCase();
    const timestamp = this.timestamps.get(key);
    
    // Check if cache entry is expired
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return undefined;
    }
    
    return this.cache.get(key);
  }

  update(address: Address, updates: Partial<RegistrationCacheEntry>): void {
    const key = address.toLowerCase();
    const existing = this.cache.get(key);
    
    if (existing) {
      this.cache.set(key, { ...existing, ...updates });
      this.timestamps.set(key, Date.now());
    } else {
      this.set(address, updates as RegistrationCacheEntry);
    }
  }

  delete(address: Address): void {
    const key = address.toLowerCase();
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.timestamps.clear();
  }

  has(address: Address): boolean {
    return this.get(address) !== undefined;
  }
}

// Singleton instance
export const registrationCache = new RegistrationCache();