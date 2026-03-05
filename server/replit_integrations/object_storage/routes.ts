import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { isAuthenticated } from "../auth";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), ".uploads");
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

function ensureUploadsDir() {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
}

function sanitizeFileName(fileName: string): string | null {
  const base = path.basename(fileName);
  if (!base || base === "." || base === ".." || base.includes("..")) return null;
  const resolved = path.resolve(LOCAL_UPLOADS_DIR, base);
  if (!resolved.startsWith(LOCAL_UPLOADS_DIR + path.sep) && resolved !== LOCAL_UPLOADS_DIR) return null;
  return base;
}

const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".txt", ".csv", ".md"]);

function safeExtension(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) ? ext : "";
}

async function isObjectStorageAvailable(): Promise<boolean> {
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!privateDir) return false;
  try {
    const objectStorageService = new ObjectStorageService();
    await objectStorageService.getObjectEntityUploadURL();
    return true;
  } catch {
    return false;
  }
}

let useLocalFallback: boolean | null = null;

function generateLocalUploadResponse(name: string, size: number, contentType: string) {
  ensureUploadsDir();
  const fileId = randomUUID();
  const ext = safeExtension(name);
  const localFileName = `${fileId}${ext}`;
  return {
    uploadURL: `/api/uploads/local/${localFileName}`,
    objectPath: `/objects/uploads/${localFileName}`,
    metadata: { name, size, contentType },
    _localUpload: true,
  };
}

export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  isObjectStorageAvailable().then(available => {
    useLocalFallback = !available;
    if (useLocalFallback) {
      console.log("[Storage] Object Storage not available, using local file storage fallback");
      ensureUploadsDir();
    } else {
      console.log("[Storage] Object Storage is available");
    }
  });

  app.post("/api/uploads/request-url", isAuthenticated, async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Missing required field: name" });
      }

      if (useLocalFallback !== false) {
        return res.json(generateLocalUploadResponse(name, size, contentType));
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      useLocalFallback = true;
      const { name = "", size = 0, contentType = "application/octet-stream" } = req.body || {};
      res.json(generateLocalUploadResponse(name, size, contentType));
    }
  });

  app.put("/api/uploads/local/:fileName", isAuthenticated, (req, res) => {
    const { fileName } = req.params;
    const safe = sanitizeFileName(fileName);
    if (!safe) {
      return res.status(400).json({ error: "Invalid file name" });
    }

    ensureUploadsDir();
    const filePath = path.join(LOCAL_UPLOADS_DIR, safe);

    let totalSize = 0;
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_UPLOAD_SIZE) {
        res.status(413).json({ error: "File too large" });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (totalSize > MAX_UPLOAD_SIZE) return;
      try {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(filePath, buffer);
        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("Local upload write error:", err);
        res.status(500).json({ error: "Upload failed" });
      }
    });

    req.on("error", (err) => {
      console.error("Local upload stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Upload failed" });
      }
    });
  });

  app.get("/objects/{*objectPath}", async (req, res) => {
    try {
      const reqPath = req.path;
      const rawFileName = reqPath.split("/").pop();

      if (rawFileName) {
        const safe = sanitizeFileName(rawFileName);
        if (safe) {
          const localPath = path.join(LOCAL_UPLOADS_DIR, safe);
          if (fs.existsSync(localPath)) {
            const ext = path.extname(safe).toLowerCase();
            const mimeTypes: Record<string, string> = {
              ".png": "image/png",
              ".jpg": "image/jpeg",
              ".jpeg": "image/jpeg",
              ".gif": "image/gif",
              ".webp": "image/webp",
              ".pdf": "application/pdf",
              ".txt": "text/plain",
              ".csv": "text/csv",
              ".md": "text/markdown",
            };
            res.set("Content-Type", mimeTypes[ext] || "application/octet-stream");
            return res.sendFile(localPath);
          }
        }
      }

      if (useLocalFallback) {
        return res.status(404).json({ error: "Object not found" });
      }

      const objectFile = await objectStorageService.getObjectEntityFile(reqPath);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}
