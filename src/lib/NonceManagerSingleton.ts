import { NonceManager } from './NonceManager';

class NonceManagerSingleton {
  private static instance: NonceManager | null = null;

  static getInstance(): NonceManager {
    if (!this.instance) {
      this.instance = new NonceManager();
    }
    return this.instance;
  }

  // Optional: method to reset the singleton (useful for testing)
  static reset(): void {
    this.instance = null;
  }
}

export { NonceManagerSingleton };