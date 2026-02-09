import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { db } from "../../db";
import { users, otpVerifications } from "@shared/models/auth";
import { eq, and, gt, desc } from "drizzle-orm";
import { z } from "zod";
import { sql } from "drizzle-orm";

const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export function getSession() {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: SESSION_TTL / 1000,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL,
      sameSite: "lax",
    },
  });
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpViaSms(phone: string, otp: string): Promise<boolean> {
  const apiKey = process.env.SMSGATEWAYHUB_API_KEY;
  const senderId = process.env.SMSGATEWAYHUB_SENDER_ID;
  const entityId = process.env.SMSGATEWAYHUB_ENTITY_ID;
  const templateId = process.env.SMSGATEWAYHUB_TEMPLATE_ID;

  if (!apiKey || !senderId || !entityId || !templateId) {
    console.log(`[DEV MODE] OTP for ${phone}: ${otp}`);
    return true;
  }

  try {
    const mobileNumber = phone.replace("+", "");
    const message = `Your Learnpro AI verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;

    const params = new URLSearchParams({
      APIKey: apiKey,
      senderid: senderId,
      channel: "OTP",
      DCS: "0",
      flashsms: "0",
      number: mobileNumber,
      text: message,
      route: "0",
      EntityId: entityId,
      dlttemplateid: templateId,
    });

    const url = `https://www.smsgatewayhub.com/api/mt/SendSMS?${params.toString()}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "cache-control": "no-cache" },
    });

    const responseText = await response.text();
    console.log("SMSGatewayHub response:", responseText);

    if (!response.ok) {
      console.error("SMSGatewayHub error:", responseText);
      return false;
    }

    try {
      const result = JSON.parse(responseText);
      if (result.ErrorCode === "000" || result.ErrorMessage === "Success") {
        return true;
      }
      console.error("SMSGatewayHub error code:", result.ErrorCode, result.ErrorMessage);
      return false;
    } catch {
      return response.ok;
    }
  } catch (error) {
    console.error("Failed to send OTP via SMSGatewayHub:", error);
    return false;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const schema = z.object({
        phone: z.string().regex(/^\+91\d{10}$/, "Please enter a valid Indian mobile number"),
      });
      const { phone } = schema.parse(req.body);

      const recentOtp = await db.select().from(otpVerifications)
        .where(and(
          eq(otpVerifications.phone, phone),
          gt(otpVerifications.createdAt, new Date(Date.now() - 60000))
        ))
        .orderBy(desc(otpVerifications.createdAt))
        .limit(1);

      if (recentOtp.length > 0) {
        return res.status(429).json({ message: "Please wait before requesting another OTP" });
      }

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await db.insert(otpVerifications).values({ phone, otp, expiresAt });

      const sent = await sendOtpViaSms(phone, otp);
      if (!sent) {
        return res.status(500).json({ message: "Failed to send OTP. Please try again." });
      }

      res.json({ success: true, message: "OTP sent successfully" });
    } catch (error: any) {
      if (error?.issues) {
        return res.status(400).json({ message: error.issues[0]?.message || "Invalid phone number" });
      }
      console.error("Send OTP error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const schema = z.object({
        phone: z.string().regex(/^\+91\d{10}$/),
        otp: z.string().length(6),
      });
      const { phone, otp } = schema.parse(req.body);

      const [otpRecord] = await db.select().from(otpVerifications)
        .where(and(
          eq(otpVerifications.phone, phone),
          eq(otpVerifications.verified, false),
          gt(otpVerifications.expiresAt, new Date())
        ))
        .orderBy(desc(otpVerifications.createdAt))
        .limit(1);

      if (!otpRecord) {
        return res.status(400).json({ message: "OTP expired or not found. Please request a new one." });
      }

      if ((otpRecord.attempts || 0) >= 5) {
        return res.status(429).json({ message: "Too many attempts. Please request a new OTP." });
      }

      if (otpRecord.otp !== otp) {
        await db.update(otpVerifications)
          .set({ attempts: (otpRecord.attempts || 0) + 1 })
          .where(eq(otpVerifications.id, otpRecord.id));
        return res.status(400).json({ message: "Invalid OTP. Please try again." });
      }

      await db.update(otpVerifications)
        .set({ verified: true })
        .where(eq(otpVerifications.id, otpRecord.id));

      let [user] = await db.select().from(users).where(eq(users.phone, phone));

      if (!user) {
        [user] = await db.insert(users).values({
          phone,
          displayName: null,
          onboardingCompleted: false,
        }).returning();
      }

      (req.session as any).userId = user.id;
      (req.session as any).phone = phone;

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        res.json({ success: true, user });
      });
    } catch (error: any) {
      if (error?.issues) {
        return res.status(400).json({ message: "Invalid input" });
      }
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.get("/api/login", (_req, res) => {
    res.redirect("/login");
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error("Session destroy error:", err);
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) console.error("Session destroy error:", err);
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = { claims: { sub: userId }, dbUser: user };
  next();
};
