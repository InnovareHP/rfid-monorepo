import { UseGuards } from "@nestjs/common";
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { Server, Socket } from "socket.io";
import { appConfig } from "src/config/app-config";
import { auth } from "src/lib/auth/auth";

@WebSocketGateway({
  cors: { origin: appConfig.WEBSITE_URL, credentials: true },
})
@UseGuards(AuthGuard)
export class BoardGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  async getSessionFromSocket(socket: Socket) {
    const cookie = socket.handshake.headers.cookie;

    if (!cookie) return null;

    const session = await auth.api.getSession({
      headers: { cookie },
    });
  
    return session?.session;
  }

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const session = await this.getSessionFromSocket(socket);

        if (!session) {
          return next(new Error("Unauthorized"));
        }

        socket.data.session = session;

        next();
      } catch (err) {
        next(err);
      }
    });
  }

  async handleConnection(client: Socket) {
    const session = client.data.session;

    if (!session) {
      client.disconnect();
      return;
    }

    const orgId = session?.activeOrganizationId;

    if (!orgId) {
      client.disconnect();
      return;
    }

    console.log(
      "user connected to board gateway",
      session.activeOrganizationId
    );

    await client.join(`org:${orgId}`);
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
