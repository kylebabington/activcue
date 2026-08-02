// server/middleware/requestContext.js
// Attach a requestId and emit structured request logs (no child notes / prompts).

import { randomUUID } from "crypto";

export function requestContextMiddleware(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.trim()
      ? incoming.trim().slice(0, 80)
      : randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const startedAt = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const payload = {
      level: res.statusCode >= 500 ? "error" : "info",
      msg: "request.completed",
      requestId,
      method: req.method,
      route: req.originalUrl?.split("?")[0] || req.path,
      statusCode: res.statusCode,
      durationMs,
      userSafeErrorCode: res.locals?.errorCode || null,
    };

    if (payload.level === "error") {
      console.error(JSON.stringify(payload));
    } else if (process.env.LOG_HTTP === "true" || process.env.NODE_ENV !== "test") {
      console.log(JSON.stringify(payload));
    }
  });

  next();
}

export function logDependencyError({
  req,
  dependency,
  code,
  message,
  statusCode = 500,
}) {
  const payload = {
    level: "error",
    msg: "dependency.failed",
    requestId: req?.requestId || null,
    route: req?.originalUrl?.split("?")[0] || null,
    dependency,
    code,
    statusCode,
    // Keep message short and free of prompts / child details.
    error: typeof message === "string" ? message.slice(0, 200) : "unknown",
  };
  console.error(JSON.stringify(payload));
}
