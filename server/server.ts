import express from "express";
import { Request, Response, NextFunction } from "express"; // Corrected line
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";

import authRoutes from "./routes/auth";
import fileRoutes from "./routes/files";
import secureRoutes from "./routes/secure";
import teamRoutes from "./routes/team";
import googleAuthRoutes from "./routes/googleAuth";
import userRoutes from "./routes/user";
import notificationRoutes from "./routes/notifications";
import linkRoutes from "./routes/links";
import fs from "fs";

// Load .env.local first (if exists) for local development, then .env
const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('🔧 Loaded .env.local for local development');
}
dotenv.config();

const app = express();

// Middlewares
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:8081', // Frontend dev server alternate port
  'http://localhost:8082', // Frontend dev server alternate port 2
  'https://linksecure-2cdc.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/secure", secureRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notifications", notificationRoutes);

// Short link routes - separate endpoints
app.use("/api/links", linkRoutes);      // GET /api/links/my-links, PATCH /api/links/:short_code/revoke
app.use("/api/v1/links", linkRoutes);  // POST /api/v1/links/create
app.use("/s", linkRoutes);              // GET /s/:short_code (redirection endpoint)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values((err as any).errors).map((e: any) => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: errors.join(', ')
    });
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    return res.status(400).json({
      success: false,
      error: 'Duplicate Entry',
      message: `${field} already exists`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired',
      message: 'Authentication token has expired'
    });
  }

  // File system errors
  if (err.message.includes('ENOENT')) {
    return res.status(404).json({
      success: false,
      error: 'File Not Found',
      message: 'The requested file was not found'
    });
  }

  if (err.message.includes('EACCES')) {
    return res.status(403).json({
      success: false,
      error: 'Permission Denied',
      message: 'Insufficient permissions to access the resource'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI environment variable is required");
  process.exit(1);
} 

async function start() {
  try {
    await mongoose.connect(MONGO_URI!);
    console.log("MongoDB connected");
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();