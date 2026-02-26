import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { ApiModule } from "./api/api.module";
import { appConfigSchema } from "./config/app-config";
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
    AuthModule.forRoot({ auth }),
    ApiModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
