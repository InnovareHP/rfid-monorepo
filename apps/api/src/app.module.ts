import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { ApiModule } from "./api/api.module";
import { appConfigSchema } from "./config/app-config";
import { AuditModule } from "./lib/audit/audit.module";
import { auth } from "./lib/auth/auth";
import { BullBoardSetupModule } from "./lib/queue/bull-board.module";
import { QueueModule } from "./lib/queue/queue.module";

@Module({
  imports: [
    QueueModule,
    BullBoardSetupModule,

    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => {
        return appConfigSchema.parse(env);
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 300 }],
    }),
    AuthModule.forRoot({ auth }),
    AuditModule,
    ApiModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
