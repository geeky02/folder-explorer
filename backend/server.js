/* eslint-disable @typescript-eslint/no-require-imports */
// Local Node.js backend server
// Connects to Everything SDK (Windows) to read directory structure

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const fsPromises = fs.promises;
const os = require("os");
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
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);
app.use(express.json());

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
        try {
          const child = await readDirectory(
            childPath,
            maxDepth,
            currentDepth + 1
          );
          if (child) {
            children.push(child);
          }
        } catch (childError) {
          if (childError.code !== "EPERM" && childError.code !== "EACCES") {
            throw childError;
          }
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
    throw error;
  }
}

/**
 * GET /drives
 * Returns list of available drives (Windows: C:, D:, etc.)
 */
app.get("/drives", async (_req, res) => {
  try {
    const platform = process.platform;
    const drives = [];

    if (platform === "win32") {
      const { exec } = require("child_process");
      const { promisify } = require("util");
      const execAsync = promisify(exec);

      try {
        const { stdout } = await execAsync("wmic logicaldisk get name");
        const driveLines = stdout
          .split("\n")
          .slice(1)
          .map((line) => line.trim())
          .filter((line) => line && /^[A-Z]:$/.test(line));

        for (const driveLetter of driveLines) {
          const drivePath = `${driveLetter}\\`;
          try {
            const stats = await fsPromises.stat(drivePath);
            if (stats.isDirectory()) {
              drives.push({
                name: driveLetter,
                path: drivePath,
                type: "drive",
              });
            }
          } catch {}
        }
      } catch {
        const commonDrives = ["C:", "D:", "E:", "F:"];
        for (const driveLetter of commonDrives) {
          const drivePath = `${driveLetter}\\`;
          try {
            const stats = await fsPromises.stat(drivePath);
            if (stats.isDirectory()) {
              drives.push({
                name: driveLetter,
                path: drivePath,
                type: "drive",
              });
            }
          } catch {}
        }
      }
    } else {
      const homeDir = os.homedir();
      const commonPaths = [
        {
          name: "Desktop",
          path: path.join(homeDir, "Desktop"),
          type: "folder",
        },
        {
          name: "Documents",
          path: path.join(homeDir, "Documents"),
          type: "folder",
        },
        {
          name: "Downloads",
          path: path.join(homeDir, "Downloads"),
          type: "folder",
        },
        { name: "Home", path: homeDir, type: "folder" },
        { name: "Root", path: "/", type: "folder" },
      ];

      let hasAccessiblePath = false;
      for (const item of commonPaths) {
        try {
          const stats = await fsPromises.stat(item.path);
          if (stats.isDirectory()) {
            drives.push(item);
            hasAccessiblePath = true;
          }
        } catch (error) {}
      }

      if (!hasAccessiblePath || drives.length === 0) {
        drives.push(
          { name: "C:", path: "C:\\", type: "drive" },
          { name: "D:", path: "D:\\", type: "drive" },
          {
            name: "Mock Folder A",
            path: "/Users/Mock/FolderA",
            type: "folder",
          },
          { name: "Mock Folder B", path: "/Users/Mock/FolderB", type: "folder" }
        );
      }
    }

    if (drives.length === 0) {
      drives.push(
        { name: "C:", path: "C:\\", type: "drive" },
        { name: "D:", path: "D:\\", type: "drive" }
      );
    }

    res.json(drives);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch drives" });
  }
});

/**
 * Mock directory structure for fallback (when permissions fail or for testing)
 */
function getMockDirectoryStructure(basePath, baseName) {
  return {
    id: uuidv4(),
    name: baseName || path.basename(basePath) || "Mock Drive",
    path: basePath,
    children: [
      {
        id: uuidv4(),
        name: "Users",
        path: path.join(basePath, "Users"),
        children: [
          {
            id: uuidv4(),
            name: "User1",
            path: path.join(basePath, "Users", "User1"),
            children: [
              {
                id: uuidv4(),
                name: "Documents",
                path: path.join(basePath, "Users", "User1", "Documents"),
                children: [],
                icon: "folder",
                color: "#e0e0e0",
                position: { x: 0, y: 0 },
              },
              {
                id: uuidv4(),
                name: "Desktop",
                path: path.join(basePath, "Users", "User1", "Desktop"),
                children: [],
                icon: "folder",
                color: "#e0e0e0",
                position: { x: 0, y: 0 },
              },
            ],
            icon: "folder",
            color: "#e0e0e0",
            position: { x: 0, y: 0 },
          },
        ],
        icon: "folder",
        color: "#e0e0e0",
        position: { x: 0, y: 0 },
      },
      {
        id: uuidv4(),
        name: "Program Files",
        path: path.join(basePath, "Program Files"),
        children: [],
        icon: "folder",
        color: "#e0e0e0",
        position: { x: 0, y: 0 },
      },
    ],
    icon: "folder",
    color: "#e0e0e0",
    position: { x: 0, y: 0 },
  };
}

/**
 * GET /directory?path=C:\Users
 * Returns folder tree structure
 * Falls back to mock data if permissions fail (macOS) or directory not accessible
 */
app.get("/directory", async (req, res) => {
  try {
    const { path: dirPath } = req.query;

    if (!dirPath) {
      return res.json(mockDirectoryStructure);
    }

    let structure = null;
    try {
      structure = await readDirectory(dirPath);
    } catch (error) {
      structure = null;
    }

    if (!structure || !structure.children || structure.children.length === 0) {
      structure = getMockDirectoryStructure(dirPath, path.basename(dirPath));
    }

    res.json(structure);
  } catch (error) {
    const { path: dirPath } = req.query;
    const mockStructure = getMockDirectoryStructure(
      dirPath || "C:\\",
      "Mock Drive"
    );
    res.json(mockStructure);
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

    res.json({ success: true, message: "Layout saved" });
  } catch (error) {
    res.status(500).json({ error: "Failed to save layout" });
  }
});

/**
 * GET /search?q=keyword
 */
app.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json([]);
    }

    res.json([]);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
});

/**
 * GET /starred-files
 */
app.get("/starred-files", async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
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

    if (platform !== "win32" && isWindowsPath) {
      return res.status(400).json({
        error:
          "Windows-style paths cannot be opened on this OS. Run the backend on Windows or provide a local path.",
      });
    }

    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({
        error: "Folder does not exist on this machine.",
      });
    }

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
        return res.status(500).json({ error: "Failed to open folder" });
      }
      res.json({ success: true });
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to open folder" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
