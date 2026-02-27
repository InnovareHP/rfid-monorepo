import { Logger, UseGuards } from "@nestjs/common";
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
  cors: {
    origin: [appConfig.WEBSITE_URL, appConfig.SUPPORT_URL],
    credentials: true,
  },
})
@UseGuards(AuthGuard)
export class BoardGateway implements OnGatewayConnection {
  private readonly logger = new Logger(BoardGateway.name);
  @WebSocketServer() server: Server;

  async getSessionFromSocket(socket: Socket) {
    const cookie = socket.handshake.headers.cookie;

    if (!cookie) {
      this.logger.warn(
        `No cookie in socket handshake from origin: ${socket.handshake.headers.origin}`
      );
      return null;
    }

    const session = await auth.api.getSession({
      headers: socket.handshake.headers as Record<string, string>,
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
        this.logger.error(`Socket auth error: ${err.message}`);
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

    await client.join(`org:${orgId}`);
  }

  emitRecordCreated(orgId: string, record: any, moduleType?: string) {
    this.server.to(`org:${orgId}`).emit("board:record-created", {
      record,
      moduleType: moduleType ?? record.module_type ?? "LEAD",
    });
  }
  emitRecordDeleted(
    orgId: string,
    recordIds: string[],
    moduleType: string = "LEAD"
  ) {
    this.server
      .to(`org:${orgId}`)
      .emit("board:record-deleted", { recordIds, moduleType });
  }
  emitRecordNotificationState(
    orgId: string,
    recordId: string,
    moduleType: string = "LEAD"
  ) {
    this.server
      .to(`org:${orgId}`)
      .emit("board:record-notification-state", { recordId, moduleType });
  }
  emitColumnCreated(
    orgId: string,
    column: string,
    moduleType: string = "LEAD"
  ) {
    this.server
      .to(`org:${orgId}`)
      .emit("board:column-created", { column, moduleType });
  }
  emitRecordValueUpdated(
    orgId: string,
    recordId: string,
    fieldName: string,
    value: any,
    moduleType: string = "LEAD"
  ) {
    this.server
      .to(`org:${orgId}`)
      .emit("board:update", { recordId, fieldName, value, moduleType });
  }

  emitRecordValueLocation(
    orgId: string,
    recordId: string,
    data: {
      [key: string]: any;
    },
    moduleType: string = "LEAD"
  ) {
    this.server
      .to(`org:${orgId}`)
      .emit("board:update-location", { recordId, data, moduleType });
  }

  emitActivityCreated(orgId: string, recordId: string, activity: any) {
    this.server
      .to(`org:${orgId}`)
      .emit("board:activity-created", { recordId, activity });
  }

  emitActivityUpdated(
    orgId: string,
    recordId: string,
    activityId: string,
    status: string
  ) {
    this.server
      .to(`org:${orgId}`)
      .emit("board:activity-updated", { recordId, activityId, status });
  }
}
