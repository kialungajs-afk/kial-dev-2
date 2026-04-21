import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";

const app = express();
const PORT = 3000;

app.use(express.json());

const DATA_FILE = path.join(process.cwd(), "proposals.json");

// Initialize data file
async function initData() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([]));
  }
}
initData();

// API Routes
app.post("/api/proposals", async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    const proposals = JSON.parse(data);
    const newProposal = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() };
    proposals.push(newProposal);
    await fs.writeFile(DATA_FILE, JSON.stringify(proposals, null, 2));
    res.json({ success: true, proposal: newProposal });
  } catch (error) {
    res.status(500).json({ error: "Failed to save proposal" });
  }
});

app.get("/api/proposals", async (req, res) => {
  // Simple auth for the dashboard
  const authHeader = req.headers.authorization;
  if (authHeader !== "Bearer admin-secret-token") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ error: "Failed to read proposals" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
