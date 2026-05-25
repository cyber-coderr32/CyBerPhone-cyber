import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

// Helper to load Firebase configuration dynamically from environment variables or file
function getFirebaseConfig() {
  const config = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.VITE_PROJECT_ID || process.env.PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "",
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.VITE_APP_ID || process.env.APP_ID || process.env.FIREBASE_APP_ID || "",
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.VITE_AUTH_DOMAIN || process.env.AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || "",
    firestoreDatabaseId: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIRESTORE_DATABASE_ID || process.env.FIRESTORE_DATABASE_ID || process.env.FIREBASE_FIRESTORE_DATABASE_ID || "",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.VITE_STORAGE_BUCKET || process.env.STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_MESSAGING_SENDER_ID || process.env.MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.VITE_MEASUREMENT_ID || process.env.MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || ""
  };

  if (config.apiKey) {
    return config;
  }

  // Look for configuration JSON in expected parent levels
  const possiblePaths = [
    path.join(process.cwd(), "firebase-applet-config.json"),
    path.join(process.cwd(), "..", "firebase-applet-config.json"),
    path.join(process.cwd(), "..", "..", "firebase-applet-config.json"),
    path.join(process.cwd(), "..", "..", "..", "firebase-applet-config.json"),
    "/firebase-applet-config.json"
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const fileContent = fs.readFileSync(p, "utf-8");
        const parsed = JSON.parse(fileContent);
        if (parsed && parsed.apiKey) {
          console.log(`[FirebaseConfig Server] Loaded configuration from: ${p}`);
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return config;
}

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

  // Firebase config server proxy
  app.get("/api/firebase-config", (req: Request, res: Response) => {
    try {
      const config = getFirebaseConfig();
      res.json(config);
    } catch (error: any) {
      console.error("[PROXY CONFIG] Failed to load config:", error);
      res.status(500).json({ error: "Failed to load firebase config" });
    }
  });

  // API Route: Sumsub Access Token Generator
  app.post("/api/sumsub-token", async (req: Request, res: Response) => {
    try {
      const { userId, levelName = "basic-kyc-level" } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      const appToken = process.env.SUMSUB_APP_TOKEN;
      const secretKey = process.env.SUMSUB_SECRET_KEY;

      if (!appToken || !secretKey) {
        console.error(`[Sumsub Proxy] Sumsub credentials (SUMSUB_APP_TOKEN, SUMSUB_SECRET_KEY) not configured in env.`);
        return res.status(500).json({ error: "O serviço de verificação do Sumsub não foi configurado pelo administrador. É necessário configurar as chaves de API reais no painel de controle (SUMSUB_APP_TOKEN e SUMSUB_SECRET_KEY)." });
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const method = "POST";
      const requestPath = `/resources/accessTokens?userId=${encodeURIComponent(userId)}&levelName=${encodeURIComponent(levelName)}`;
      const bodyString = JSON.stringify({ userId });

      // Generate signature for Sumsub API
      const signatureCreator = crypto.createHmac("sha256", secretKey);
      signatureCreator.update(timestamp + method + requestPath + bodyString);
      const signature = signatureCreator.digest("hex");

      const sumsubUrl = `https://api.sumsub.com${requestPath}`;
      console.log(`[Sumsub Proxy] Sending secure token request to: ${sumsubUrl}`);

      const response = await fetch(sumsubUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-App-Token": appToken,
          "X-App-Access-Sig": signature,
          "X-App-Access-Ts": String(timestamp),
        },
        body: bodyString
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Sumsub Proxy] Real Sumsub API error response:`, errorText);
        throw new Error(`Sumsub API returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`[Sumsub Proxy] Token fetched successfully for user ${userId}`);
      res.json({
        simulated: false,
        token: data.token,
        userId: data.userId || userId
      });
    } catch (error: any) {
      console.error(`[Sumsub Proxy] Fatal error:`, error);
      res.status(500).json({ error: error.message || "Failed to generate Sumsub access token" });
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
      try {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          let html = fs.readFileSync(indexPath, "utf-8");
          const config = getFirebaseConfig();
          const configScript = `
  <script>
    window.__FIREBASE_CONFIG__ = ${JSON.stringify(config)};
    console.log("🔥 [FirebaseConfig Client] Configuração injetada com sucesso pelo backend!");
  </script>`;
          html = html.replace("<head>", `<head>${configScript}`);
          res.send(html);
        } else {
          res.status(404).send("index.html not found");
        }
      } catch (err: any) {
        console.error("Error serving index.html with firebase config:", err);
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
