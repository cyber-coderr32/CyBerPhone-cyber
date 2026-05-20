import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dblnktl9m';
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'CONEXWORLD';

// Configure Gemini
const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for videos and high-res images
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // API Route: Cloudinary Upload (Unsigned Proxy)
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        console.error("[PROXY UPLOAD] No file in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      const folder = req.body.folder || "cyberphone/uploads";
      const resourceType = req.body.resourceType === 'video' ? 'video' : 'auto';

      console.log(`[PROXY UPLOAD] Receiving file: ${req.file.originalname}, Size: ${req.file.size} bytes, ResourceType: ${resourceType}, Folder: ${folder}`);

      // Criar o FormData para o Cloudinary (Unsigned Upload)
      const cloudinaryForm = new FormData();
      // Converter Buffer para Uint8Array para compatibilidade com Blob no Node.js
      const uint8Array = new Uint8Array(req.file.buffer);
      const blob = new Blob([uint8Array], { type: req.file.mimetype });
      cloudinaryForm.append('file', blob, req.file.originalname);
      cloudinaryForm.append('upload_preset', UPLOAD_PRESET);
      cloudinaryForm.append('folder', folder);

      const cloudUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
      
      console.log(`[PROXY UPLOAD] Sending to Cloudinary: ${cloudUrl}`);

      const cloudinaryResponse = await fetch(cloudUrl, {
        method: 'POST',
        body: cloudinaryForm
      });

      if (!cloudinaryResponse.ok) {
        const errorData = await cloudinaryResponse.json().catch(() => ({ error: { message: "Cloudinary raw error" } }));
        console.error("[PROXY UPLOAD] Cloudinary Error Details:", errorData);
        throw new Error(errorData.error?.message || `Cloudinary upload failed with status ${cloudinaryResponse.status}`);
      }

      const result = await cloudinaryResponse.json();
      console.log("[PROXY UPLOAD] Success:", result.secure_url);
      res.json({ secure_url: result.secure_url });
    } catch (error: any) {
      console.error("[PROXY UPLOAD] Fatal Error:", error);
      res.status(500).json({ error: error.message || "Failed to upload to Cloudinary" });
    }
  });

  // API Route: Gemini Proxy
  app.post("/api/gemini", async (req: Request, res: Response) => {
    try {
      const { model, contents, config } = req.body;
      
      const result = await genAI.models.generateContent({
        model: model || "gemini-3.5-flash",
        contents: contents,
        config: config
      });

      res.json({ text: result.text });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "Failed to call Gemini API" });
    }
  });

  // Health check
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
