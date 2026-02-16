import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { appConfig } from "src/config/app-config";
import { auth } from "src/lib/auth/auth";

@WebSocketGateway({
  cors: { origin: appConfig.WEBSITE_URL, credentials: true },
})
export class BoardGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) return next(new Error("unauthorized"));

        const session = await auth.api.verifyOneTimeToken({
          body: { token },
        });

        const orgId = session?.session?.activeOrganizationId;

        if (!orgId) return next(new Error("unauthorized"));

        // Attach for later use
        socket.data.orgId = orgId;

        next();
      } catch {
        next(new Error("unauthorized"));
      }
    });
  }

  async handleConnection(client: Socket) {
    const orgId = client.data.orgId;

    if (!orgId) {
      client.disconnect(true);
      return;
    }

    await client.join(`org:${orgId}`);

    client.emit("debug:joined", {
      room: `org:${orgId}`,
    });
  }
  emitRecordCreated(orgId: string, record: any) {
    this.server.to(`org:${orgId}`).emit("board:record-created", { record });
  }
  emitRecordDeleted(orgId: string, recordIds: string[]) {
    this.server.to(`org:${orgId}`).emit("board:record-deleted", { recordIds });
  }
  emitRecordNotificationState(orgId: string, recordId: string) {
    this.server
      .to(`org:${orgId}`)
      .emit("board:record-notification-state", { recordId });
  }
  emitColumnCreated(orgId: string, column: string) {
    this.server.to(`org:${orgId}`).emit("board:column-created", { column });
  }
  emitRecordValueUpdated(
    orgId: string,
    recordId: string,
    fieldName: string,
    value: any
  ) {
    this.server
      .to(`org:${orgId}`)
      .emit("board:update", { recordId, fieldName, value });
  }

  emitRecordValueLocation(
    orgId: string,
    recordId: string,
    data: {
      [key: string]: any;
    }
  ) {
    this.server
      .to(`org:${orgId}`)
      .emit("board:update-location", { recordId, data });
  }
}
