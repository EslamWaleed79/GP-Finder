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
    origin: [
      "https://workspacegrad-hub-production.up.railway.app",
      "https://workspaceapi-server-production-9d0e.up.railway.app",
    ],
    credentials: false,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(jwtAuth);
app.use("/api", router);

runSeed().catch((err) => {
  logger.error({ err }, "Seed failed");
});

export default app;
