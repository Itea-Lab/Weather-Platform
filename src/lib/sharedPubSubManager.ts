import { PubSub } from "@aws-amplify/pubsub";
import { iotConfigManager } from "./iotConfig";

/**
 * Shared PubSub manager to handle all IoT connections
 * Prevents multiple WebSocket connections and manages subscriptions
 */
class SharedPubSubManager {
  private static instance: SharedPubSubManager | null = null;
  private pubsub: PubSub | null = null;
  private isInitializing = false;
  private activeSubscriptions = new Map<string, any>();

  private constructor() {}

  static getInstance(): SharedPubSubManager {
    if (!SharedPubSubManager.instance) {
      SharedPubSubManager.instance = new SharedPubSubManager();
    }
    return SharedPubSubManager.instance;
  }

  async getPubSub(): Promise<PubSub> {
    if (this.pubsub) {
      return this.pubsub;
    }

    if (this.isInitializing) {
      // Wait for initialization to complete
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.pubsub) {
        return this.pubsub;
      }
    }

    this.isInitializing = true;

    try {
      console.log("Initializing shared PubSub connection...");
      const iotConfig = await iotConfigManager.getConfig();

      this.pubsub = new PubSub({
        region: iotConfig.region,
        endpoint: iotConfig.endpoint,
        credentials: iotConfig.credentials,
      });

      return this.pubsub;
    } catch (error) {
      console.error("Failed to initialize shared PubSub:", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async subscribe(
    topics: string[],
    callback: (message: any) => void
  ): Promise<string> {
    const pubsub = await this.getPubSub();
    const subscriptionKey = topics.sort().join(",");

    // If already subscribed to these topics, reuse the subscription
    if (this.activeSubscriptions.has(subscriptionKey)) {
      // console.log("Reusing existing subscription for topics:", topics);
      return subscriptionKey;
    }

    // console.log("Creating new subscription for topics:", topics);

    const subscription = pubsub.subscribe({ topics }).subscribe({
      next: callback,
      error: (error: any) => {
        console.error("PubSub subscription error:", error);
        // Remove failed subscription
        this.activeSubscriptions.delete(subscriptionKey);
      },
    });

    this.activeSubscriptions.set(subscriptionKey, subscription);
    return subscriptionKey;
  }

  async publish(topic: string, message: any): Promise<void> {
    const pubsub = await this.getPubSub();

    try {
      console.log(`Publishing to topic: ${topic}`);

      const result = await pubsub.publish({
        topics: [topic],
        message: message,
      });

      console.log(`Successfully published to topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to publish to topic ${topic}:`, error);
      throw error;
    }
  }

  unsubscribe(subscriptionKey: string): void {
    const subscription = this.activeSubscriptions.get(subscriptionKey);
    if (subscription) {
      subscription.unsubscribe();
      this.activeSubscriptions.delete(subscriptionKey);
      console.log("Unsubscribed from:", subscriptionKey);
    }
  }

  cleanup(): void {
    // Unsubscribe from all active subscriptions
    for (const [key, subscription] of this.activeSubscriptions) {
      subscription.unsubscribe();
    }
    this.activeSubscriptions.clear();
    this.pubsub = null;
  }
}

export const sharedPubSubManager = SharedPubSubManager.getInstance();
