import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { sessionPool } from "@workspace/db";
import { runSeed } from "./seed.js";

const frontendOrigin = process.env.FRONTEND_URL ?? "https://your-frontend-url.vercel.app";

const PgSession = connectPgSimple(session);

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
      'https://workspacegrad-hub-production.up.railway.app',
      'https://workspaceapi-server-production-9d0e.up.railway.app',
    ],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgSession({
      pool: sessionPool,
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET ?? "grad-hub-secret-change-in-production",
    resave: false,
    saveUninitialized: true,
    proxy: true,
    cookie: {
      secure: true,
      sameSite: "none",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);

app.use("/api", router);

runSeed().catch((err) => {
  logger.error({ err }, "Seed failed");
});

export default app;
