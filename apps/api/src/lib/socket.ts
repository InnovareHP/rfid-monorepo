// apps/api/src/lib/socket/socket-io.adapter.ts
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-streams-adapter";
import { Redis } from "ioredis";
import { ServerOptions } from "socket.io";

export class SocketIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const redisClient = new Redis(
      process.env.REDIS_URL || "redis://localhost:6379"
    );

    if (redisClient.status === "wait") {
      await redisClient.connect();
    }

    this.adapterConstructor = createAdapter(redisClient, {
      streamName: "socket.io-stream",
    });
  }
  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
