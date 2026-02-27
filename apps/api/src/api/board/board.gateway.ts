import { Logger, UseGuards } from "@nestjs/common";
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from "@nestjs/websockets";
import {
  AuthGuard,
  OptionalAuth,
  Session,
  UserSession,
} from "@thallesp/nestjs-better-auth";
import { from, map, Observable } from "rxjs";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  path: "/ws",
  cors: {
    origin: "*", // Replace with your production domain (e.g., https://app.yourdomain.com)
    credentials: true,
  },
})
@UseGuards(AuthGuard)
export class BoardGateway {
  private readonly logger = new Logger(BoardGateway.name);

  @WebSocketServer()
  server: Server;

  @SubscribeMessage("join_board")
  async handleJoinBoard(
    @Session() session: UserSession,
    @ConnectedSocket() client: Socket
  ) {
    const orgId = session.session?.activeOrganizationId;

    if (!orgId) {
      this.logger.warn(
        `User ${session.user.email} attempted to join without active org`
      );
      return { event: "error", data: "No active organization found." };
    }

    await client.join(`org:${orgId}`);
    this.logger.log(`User ${session.user.email} joined room: org:${orgId}`);

    return { event: "joined", data: { orgId } };
  }

  /**
   * PROTECTED: Ping handler using RxJS stream (like your example)
   */
  @SubscribeMessage("ping")
  handlePing(@Session() session: UserSession): Observable<WsResponse<string>> {
    return from(session.user.name.split("")).pipe(
      map((char) => ({ event: "pong", data: char }))
    );
  }

  /**
   * OPTIONAL: Example of optional authentication
   */
  @OptionalAuth()
  @SubscribeMessage("get_status")
  handleStatus(@Session() session: UserSession) {
    return {
      event: "status",
      data: session
        ? `Authenticated as ${session.user.name}`
        : "Anonymous user",
    };
  }

  // --- BROADCASTING METHODS (Used by Services) ---

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
    data: { [key: string]: any },
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
