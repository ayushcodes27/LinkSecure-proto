import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.slice("Bearer ".length);
  const secret = process.env.JWT_SECRET || "dev_secret_change_me";

  try {
    const payload = jwt.verify(token, secret) as any;
    // Map the JWT payload to the expected user structure
    (req as any).user = {
      id: payload.sub, // JWT uses 'sub' field for user ID
      email: payload.email
    };
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}


