import { KarmaEventManager } from "./KarmaEventManager";
import type { PublicShredClient } from "shreds/viem";

class KarmaEventManagerSingleton {
  private static instance: KarmaEventManager | null = null;
  private static currentClient: PublicShredClient | null = null;

  static getInstance(shredClient: PublicShredClient): KarmaEventManager {
    // If client changed, disconnect old manager and create new one
    if (this.currentClient !== shredClient) {
      if (this.instance) {
        this.instance.disconnect();
      }
      this.instance = new KarmaEventManager(shredClient);
      this.currentClient = shredClient;
    }

    // If no instance exists, create one
    if (!this.instance) {
      this.instance = new KarmaEventManager(shredClient);
      this.currentClient = shredClient;
    }

    return this.instance;
  }

  static disconnect() {
    if (this.instance) {
      this.instance.disconnect();
      this.instance = null;
      this.currentClient = null;
    }
  }
}

export { KarmaEventManagerSingleton };