/* eslint-disable @typescript-eslint/no-require-imports */
// Local Node.js backend server
// Connects to Everything SDK (Windows) to read directory structure

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3001;
const layoutStorePath = path.join(__dirname, "layouts.json");
async function readLayouts() {
  try {
    const data = await fsPromises.readFile(layoutStorePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeLayouts(layouts) {
  await fsPromises.writeFile(layoutStorePath, JSON.stringify(layouts, null, 2));
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json());

// Mock data for development (replace with Everything SDK integration)
const mockDirectoryStructure = {
  id: "root",
  name: "C:\\",
  path: "C:\\",
  children: [
    {
      id: "users",
      name: "Users",
      path: "C:\\Users",
      children: [
        {
          id: "user1",
          name: "User1",
          path: "C:\\Users\\User1",
          children: [
            {
              id: "documents",
              name: "Documents",
              path: "C:\\Users\\User1\\Documents",
              children: [],
            },
            {
              id: "desktop",
              name: "Desktop",
              path: "C:\\Users\\User1\\Desktop",
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: "programs",
      name: "Program Files",
      path: "C:\\Program Files",
      children: [],
    },
  ],
};

/**
 * Recursively read directory structure
 * TODO: Replace with Everything SDK integration
 */
async function readDirectory(dirPath, maxDepth = 5, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return null;
  }

  try {
    const stats = await fsPromises.stat(dirPath);
    if (!stats.isDirectory()) {
      return null;
    }

    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    const children = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const childPath = path.join(dirPath, entry.name);
        const child = await readDirectory(
          childPath,
          maxDepth,
          currentDepth + 1
        );
        if (child) {
          children.push(child);
        }
      }
    }

    return {
      id: uuidv4(),
      name: path.basename(dirPath),
      path: dirPath,
      children,
      icon: "folder",
      color: "#e0e0e0",
      position: { x: 0, y: 0 },
    };
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
    return null;
  }
}

/**
 * GET /directory?path=C:\Users
 * Returns folder tree structure
 */
app.get("/directory", async (req, res) => {
  try {
    const { path: dirPath } = req.query;

    if (!dirPath) {
      // Return mock data for development
      return res.json(mockDirectoryStructure);
    }

    // TODO: Use Everything SDK for Windows
    // For now, use Node.js fs (works on all platforms for development)
    const structure = await readDirectory(dirPath);

    if (!structure) {
      return res.status(404).json({ error: "Directory not found" });
    }

    res.json(structure);
  } catch (error) {
    console.error("Error fetching directory:", error);
    res.status(500).json({ error: "Failed to fetch directory structure" });
  }
});

/**
 * Layout endpoints
 */
app.get("/layouts", async (_req, res) => {
  try {
    const layouts = await readLayouts();
    res.json(layouts);
  } catch (error) {
    console.error("Error reading layouts:", error);
    res.status(500).json({ error: "Failed to load layouts" });
  }
});

app.get("/layouts/:id", async (req, res) => {
  try {
    const layouts = await readLayouts();
    const layout = layouts.find((l) => l.id === req.params.id);
    if (!layout) {
      return res.status(404).json({ error: "Layout not found" });
    }
    res.json(layout);
  } catch (error) {
    console.error("Error fetching layout:", error);
    res.status(500).json({ error: "Failed to fetch layout" });
  }
});

app.post("/layouts", async (req, res) => {
  try {
    const { name, mode, nodes, areas } = req.body;
    if (!name || !mode || !nodes) {
      return res.status(400).json({ error: "Missing layout data" });
    }

    const layouts = await readLayouts();
    const layout = {
      id: uuidv4(),
      name,
      mode,
      nodes,
      areas: areas || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    layouts.push(layout);
    await writeLayouts(layouts);
    res.status(201).json(layout);
  } catch (error) {
    console.error("Error saving layout:", error);
    res.status(500).json({ error: "Failed to save layout" });
  }
});

app.delete("/layouts/:id", async (req, res) => {
  try {
    const layouts = await readLayouts();
    const filtered = layouts.filter((layout) => layout.id !== req.params.id);
    await writeLayouts(filtered);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting layout:", error);
    res.status(500).json({ error: "Failed to delete layout" });
  }
});

/**
 * POST /save-layout
 * Saves node positions and customizations
 */
app.post("/save-layout", async (req, res) => {
  try {
    const { nodes, areas, layoutMode } = req.body;

    // TODO: Save to file or database
    // For now, just acknowledge
    console.log("Saving layout:", {
      nodesCount: nodes?.length,
      areasCount: areas?.length,
      layoutMode,
    });

    res.json({ success: true, message: "Layout saved" });
  } catch (error) {
    console.error("Error saving layout:", error);
    res.status(500).json({ error: "Failed to save layout" });
  }
});

/**
 * GET /search?q=keyword
 * Future: Search using Everything SDK
 */
app.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json([]);
    }

    // TODO: Implement Everything SDK search
    res.json([]);
  } catch (error) {
    console.error("Error searching:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * GET /starred-files
 * Future: Returns starred items
 */
app.get("/starred-files", async (req, res) => {
  try {
    // TODO: Implement starred files
    res.json([]);
  } catch (error) {
    console.error("Error fetching starred files:", error);
    res.status(500).json({ error: "Failed to fetch starred files" });
  }
});

/**
 * POST /open-folder
 * Opens folder in OS file explorer
 */
app.post("/open-folder", async (req, res) => {
  try {
    const { path: folderPath } = req.body;

    if (!folderPath) {
      return res.status(400).json({ error: "Path required" });
    }

    const platform = process.platform;
    const isWindowsPath = /^[a-zA-Z]:\\/.test(folderPath);

    // Guard against trying to open Windows-style mock paths on macOS/Linux
    if (platform !== "win32" && isWindowsPath) {
      return res.status(400).json({
        error:
          "Windows-style paths cannot be opened on this OS. Run the backend on Windows or provide a local path.",
      });
    }

    // Ensure the folder exists on the current machine before attempting to open
    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({
        error: "Folder does not exist on this machine.",
      });
    }

    // TODO: Use OS-specific command to open folder
    // Windows: start folderPath
    // Mac: open folderPath
    // Linux: xdg-open folderPath

    const { exec } = require("child_process");

    let command;
    if (platform === "win32") {
      command = `start "" "${folderPath}"`;
    } else if (platform === "darwin") {
      command = `open "${folderPath}"`;
    } else {
      command = `xdg-open "${folderPath}"`;
    }

    exec(command, (error) => {
      if (error) {
        console.error("Error opening folder:", error);
        return res.status(500).json({ error: "Failed to open folder" });
      }
      res.json({ success: true });
    });
  } catch (error) {
    console.error("Error opening folder:", error);
    res.status(500).json({ error: "Failed to open folder" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log("API endpoints:");
  console.log(`  GET  /directory?path=<path>`);
  console.log(`  GET  /layouts`);
  console.log(`  POST /layouts`);
  console.log(`  GET  /layouts/:id`);
  console.log(`  DELETE /layouts/:id`);
  console.log(`  POST /save-layout`);
  console.log(`  GET  /search?q=<query>`);
  console.log(`  GET  /starred-files`);
  console.log(`  POST /open-folder`);
});
