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

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;

    console.log(`[Socket] New connection attempt: ${client.id}`);

    if (!token) {
      console.error(`[Socket] Connection rejected: No token found`);
      client.disconnect();
      return;
    }

    const session = await auth.api.verifyOneTimeToken({
      body: {
        token: token as string,
      },
    });
    const orgId = session?.session?.activeOrganizationId;

    if (!orgId) {
      console.error(
        `[Socket] Connection rejected: No active organization for session`
      );
      client.disconnect();
      return;
    }

    console.log(`[Socket] Client ${client.id} joined room: org:${orgId}`);
    await client.join(`org:${orgId}`);

    // TEST EMIT: Send a message ONLY to this client to prove it works
    client.emit("debug:joined", { room: `org:${orgId}` });
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
