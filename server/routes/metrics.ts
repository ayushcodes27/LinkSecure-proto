import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { performance } from "perf_hooks";
import path from "path";
import fs from "fs";

let activeRequestsCount = 0;

/**
 * Middleware to track live active concurrent requests
 */
export function activeRequestsMiddleware(_req: Request, res: Response, next: NextFunction): void {
  activeRequestsCount++;
  res.on("finish", () => {
    activeRequestsCount = Math.max(0, activeRequestsCount - 1);
  });
  next();
}

/**
 * Measure Node.js event loop lag in milliseconds
 */
function getEventLoopLag(): Promise<number> {
  const start = performance.now();
  return new Promise((resolve) => {
    setImmediate(() => {
      const lag = performance.now() - start;
      resolve(Number(lag.toFixed(2)));
    });
  });
}

/**
 * Check MongoDB connection status and ping latency
 */
async function getDatabaseMetrics(): Promise<{ status: string; latencyMs: number }> {
  const stateMap: Record<number, string> = {
    0: "DISCONNECTED",
    1: "CONNECTED",
    2: "CONNECTING",
    3: "DISCONNECTING",
  };

  const dbState = mongoose.connection.readyState;
  const statusStr = stateMap[dbState] || "UNKNOWN";

  if (dbState !== 1 || !mongoose.connection.db) {
    return { status: statusStr, latencyMs: -1 };
  }

  try {
    const start = performance.now();
    await mongoose.connection.db.admin().ping();
    const latencyMs = Number((performance.now() - start).toFixed(2));
    return { status: statusStr, latencyMs };
  } catch (error) {
    return { status: "DEGRADED", latencyMs: -1 };
  }
}

/**
 * Get package version from package.json
 */
function getAppVersion(): string {
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }
  try {
    const pkgPath = path.join(__dirname, "../package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return pkg.version || "1.0.0";
    }
  } catch (e) {
    // fallback default
  }
  return "1.0.0";
}

/**
 * Health & Metrics route handler for PulseCheck & Render observability
 */
export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  try {
    const memoryUsage = process.memoryUsage();
    const memoryHeapMB = Number((memoryUsage.heapUsed / (1024 * 1024)).toFixed(2));
    const memoryRssMB = Number((memoryUsage.rss / (1024 * 1024)).toFixed(2));

    const eventLoopLagMs = await getEventLoopLag();
    const dbMetrics = await getDatabaseMetrics();

    // Determine overall health status
    let overallStatus = "UP";
    if (dbMetrics.status !== "CONNECTED" || eventLoopLagMs > 500) {
      overallStatus = dbMetrics.status === "DISCONNECTED" ? "DOWN" : "DEGRADED";
    }

    const payload = {
      status: overallStatus,
      app: {
        version: getAppVersion(),
        environment: process.env.NODE_ENV || "development",
        uptimeSeconds: Math.floor(process.uptime()),
      },
      performance: {
        memoryHeapMB,
        memoryRssMB,
        eventLoopLagMs,
        activeRequests: activeRequestsCount,
      },
      dependencies: {
        database: dbMetrics,
      },
    };

    const statusCode = overallStatus === "DOWN" ? 503 : 200;
    res.status(statusCode).json(payload);
  } catch (error: any) {
    res.status(500).json({
      status: "DOWN",
      error: error.message || "Failed to generate health metrics",
    });
  }
}
