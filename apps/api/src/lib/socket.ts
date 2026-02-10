import { INestApplicationContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { ServerOptions } from "socket.io";

export class SocketIoAdapter extends IoAdapter {
  constructor(private app: INestApplicationContext) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const configService = this.app.get(ConfigService);

    // Ensure this matches your REST CORS configuration exactly
    const corsOptions: Partial<ServerOptions> = {
      ...options,
      cors: {
        origin:
          configService.get<string>("WEBSITE_URL") || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
      // Helps with debugging connection issues in development
      serveClient: false,
      // Ensure we support the transports defined on the client
      transports: ["websocket", "polling"],
    };

    return super.createIOServer(port, corsOptions);
  }
}
