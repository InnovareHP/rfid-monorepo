import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { auth } from "src/lib/auth/auth";

@WebSocketGateway({
  path: "/ws",
  cors: {
    origin: "*",
  },
})
export class BoardGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(BoardGateway.name);
  @WebSocketServer() server: Server;

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;

        if (!token) {
          return next(new Error("No token provided"));
        }

        const verified = await auth.api.verifyOneTimeToken({
          body: {
            token: token, // required
          },
        });
        if (!verified?.session) {
          return next(new Error("Invalid token"));
        }

        socket.data.session = verified.session;
        next();
      } catch (err) {
        this.logger.error(`Socket auth error: ${err.message}`);
        next(new Error("Unauthorized"));
      }
    });
  }

  async handleConnection(client: Socket) {
    const session = client.data?.session;

    if (!session) {
      client.disconnect();
      return;
    }

    const orgId = session.activeOrganizationId;

    if (!orgId) {
      this.logger.warn("No activeOrganizationId in session, disconnecting");
      client.disconnect();
      return;
    }

    await client.join(`org:${orgId}`);
    this.logger.log(`Client joined org:${orgId}`);
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
  emitColumnDeleted(
    orgId: string,
    columnId: string,
    moduleType: string = "LEAD"
  ) {
    this.server
      .to(`org:${orgId}`)
      .emit("board:column-deleted", { columnId, moduleType });
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
