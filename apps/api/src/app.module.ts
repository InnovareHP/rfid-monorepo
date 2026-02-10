import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { ApiModule } from "./api/api.module";
import { appConfigSchema } from "./config/app-config";
import { auth } from "./lib/auth/auth";

@Module({
  imports: [
    AuthModule.forRoot({ auth }),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => {
        return appConfigSchema.parse(env);
      },
    }),
    ApiModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
