import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User";
import EmailService from "../services/emailService";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    if (process.env.AUTH_GOOGLE_ONLY === 'true') {
      return res.status(403).json({ message: "Registration is Google-only. Use Sign in with Google." });
    }
    const { firstName, lastName, email, password } = req.body as {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
    };

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
    });

    // Send email verification
    const baseUrl = process.env.CLIENT_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const verificationUrl = `${baseUrl}/verify-email?token=${emailVerificationToken}`;
    
    EmailService.sendEmailVerification({
      to: user.email,
      firstName: user.firstName,
      verificationUrl,
    }).catch((e) => console.error("Email verification error:", e));

    return res.status(201).json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      message: "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password, twoFactorCode } = req.body as { 
      email?: string; 
      password?: string;
      twoFactorCode?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // If 2FA code is not provided, generate and send one
      if (!twoFactorCode) {
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
        const twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.twoFactorCode = code;
        user.twoFactorExpires = twoFactorExpires;
        await user.save();

        EmailService.send2FACode({
          to: user.email,
          firstName: user.firstName,
          code,
        }).catch((e) => console.error("2FA email error:", e));

        return res.status(200).json({
          requires2FA: true,
          message: "A verification code has been sent to your email",
        });
      }

      // Verify 2FA code
      if (!user.twoFactorCode || !user.twoFactorExpires) {
        return res.status(400).json({ message: "No verification code found. Please request a new one." });
      }

      if (new Date() > user.twoFactorExpires) {
        return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
      }

      if (twoFactorCode !== user.twoFactorCode) {
        return res.status(401).json({ message: "Invalid verification code" });
      }

      // Clear 2FA code after successful verification
      user.twoFactorCode = undefined;
      user.twoFactorExpires = undefined;
      await user.save();
    }

    const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Email verification endpoint
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const { token } = req.body as { token?: string };

    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await User.findOne({ 
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired verification token. Please request a new verification email.",
        expired: true
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email after verification
    EmailService.sendWelcomeEmail({
      to: user.email,
      firstName: user.firstName,
    }).catch((e) => console.error("Welcome email error:", e));

    return res.json({
      message: "Email verified successfully. You can now log in.",
      verified: true
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Resend verification email
router.post("/resend-verification", async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save();

    const baseUrl = process.env.CLIENT_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173';
    const verificationUrl = `${baseUrl}/verify-email?token=${emailVerificationToken}`;
    
    await EmailService.sendEmailVerification({
      to: user.email,
      firstName: user.firstName,
      verificationUrl,
    });

    return res.json({
      message: "Verification email sent successfully. Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Enable 2FA
router.post("/enable-2fa", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ message: "Please verify your email first" });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "Two-factor authentication is already enabled" });
    }

    user.twoFactorEnabled = true;
    await user.save();

    return res.json({
      message: "Two-factor authentication enabled successfully",
      twoFactorEnabled: true
    });
  } catch (error) {
    console.error("Enable 2FA error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Disable 2FA
router.post("/disable-2fa", async (req: Request, res: Response) => {
  try {
    const { email, password, twoFactorCode } = req.body as { 
      email?: string; 
      password?: string;
      twoFactorCode?: string;
    };

    if (!email || !password || !twoFactorCode) {
      return res.status(400).json({ message: "Email, password, and verification code are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: "Two-factor authentication is not enabled" });
    }

    // Verify 2FA code
    if (!user.twoFactorCode || !user.twoFactorExpires) {
      return res.status(400).json({ message: "Please request a verification code first" });
    }

    if (new Date() > user.twoFactorExpires) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    if (twoFactorCode !== user.twoFactorCode) {
      return res.status(401).json({ message: "Invalid verification code" });
    }

    user.twoFactorEnabled = false;
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    await user.save();

    return res.json({
      message: "Two-factor authentication disabled successfully",
      twoFactorEnabled: false
    });
  } catch (error) {
    console.error("Disable 2FA error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Request 2FA code (for disabling 2FA)
router.post("/request-2fa-code", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: "Two-factor authentication is not enabled" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const twoFactorExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.twoFactorCode = code;
    user.twoFactorExpires = twoFactorExpires;
    await user.save();

    await EmailService.send2FACode({
      to: user.email,
      firstName: user.firstName,
      code,
    });

    return res.json({
      message: "Verification code sent to your email",
    });
  } catch (error) {
    console.error("Request 2FA code error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;


