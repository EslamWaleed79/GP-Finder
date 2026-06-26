import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { jwtAuth } from "./lib/auth.js";
import { runSeed } from "./seed.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: function (_origin, callback) {
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 204,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(jwtAuth);
app.use("/api", router);

app.use((err: any, req: any, res: any, next: any) => {
  logger.error({ err }, "Global error");
  console.error("Global error:", err);
  res.status(500).json({ error: "Internal server error" });
});

runSeed().catch((err) => {
  logger.error({ err }, "Seed failed");
});

export default app;
