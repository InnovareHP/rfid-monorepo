import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { appConfig } from "./config/app-config";
import { AllExceptionsFilter } from "./filter/filter";
import { LoggerMiddleware } from "./filter/logger";
import { SocketIoAdapter } from "./lib/socket";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: [appConfig.WEBSITE_URL, appConfig.SUPPORT_URL],
    methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  app.use(new LoggerMiddleware().use);

  app.enableVersioning({
    type: VersioningType.URI,
  });

  const config = new DocumentBuilder()
    .setTitle(appConfig.APP_NAME)
    .setDescription("Innovare Service API Documentation")
    .setVersion("1.0")
    .addTag(appConfig.APP_NAME)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  app.setGlobalPrefix("api");

  const socketAdapter = new SocketIoAdapter(app);
  await socketAdapter.connectToRedis();
  app.useWebSocketAdapter(socketAdapter);

  await app.listen(appConfig.PORT);
}

bootstrap();
