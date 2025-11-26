/* eslint-disable @typescript-eslint/no-require-imports */
// Local Node.js backend server
// Connects to Everything SDK (Windows) to read directory structure
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fsPromises = fs.promises;
const EVERYTHING_API_URL =
  process.env.EVERYTHING_API_URL || "http://127.0.0.1:5600/";
const DEFAULT_ROOT_PATH = process.env.DEFAULT_ROOT_PATH || "C:\\";
const EVERYTHING_MAX_DEPTH = Number(process.env.EVERYTHING_MAX_DEPTH || 5);
const EVERYTHING_MAX_CHILDREN = Number(
  process.env.EVERYTHING_MAX_CHILDREN || 20
);
const EVERYTHING_RESULTS_PER_QUERY = Number(
  process.env.EVERYTHING_RESULTS_PER_QUERY || 120
);
const WINDOWS_PATH_REGEX = /^[a-zA-Z]:\\/;

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
app.use(cors());
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

function createFolderNode({ name, folderPath, depth = 0 }) {
  return {
    id: uuidv4(),
    name,
    path: folderPath,
    children: [],
    icon: "folder",
    color: "#e0e0e0",
    position: { x: depth * 40, y: depth * 40 },
  };
}

function getFullPathFromResult(result) {
  if (result.fullpath) {
    return result.fullpath;
  }
  if (result.path && (result.name || result.filename)) {
    return path.join(result.path, result.name || result.filename);
  }
  return result.name || result.filename || null;
}

function escapeEverythingQueryValue(value) {
  return value.replace(/"/g, '\\"');
}

async function queryEverything(search, { count = EVERYTHING_RESULTS_PER_QUERY } = {}) {
  const url = new URL(EVERYTHING_API_URL);
  url.searchParams.set("s", search);
  url.searchParams.set("path", "1");
  url.searchParams.set("json", "1");
  if (count) {
    url.searchParams.set("count", String(count));
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Everything API request failed with status ${response.status}`
    );
  }
  return response.json();
}

async function buildTreeFromEverythingPath(targetPath, depth = 0) {
  const normalizedPath = targetPath || DEFAULT_ROOT_PATH;
  const nodeLabel =
    depth === 0
      ? normalizedPath
      : path.basename(normalizedPath) || normalizedPath;

  const node = createFolderNode({
    name: nodeLabel,
    folderPath: normalizedPath,
    depth,
  });

  if (depth >= EVERYTHING_MAX_DEPTH) {
    return node;
  }

  const escapedParent = escapeEverythingQueryValue(normalizedPath);
  const query = `parent:"${escapedParent}"`;
  const data = await queryEverything(query, {
    count: EVERYTHING_RESULTS_PER_QUERY,
  });

  const folderResults = (data?.results || []).filter(
    (item) => item.type === "folder"
  );
  const limited = folderResults.slice(0, EVERYTHING_MAX_CHILDREN);

  const children = [];
  for (const result of limited) {
    const childPath = getFullPathFromResult(result);
    if (!childPath) {
      continue;
    }
    try {
      const childNode = await buildTreeFromEverythingPath(
        childPath,
        depth + 1
      );
      children.push(childNode);
    } catch (childError) {
      console.warn(
        `Failed to build Everything subtree for ${childPath}:`,
        childError.message
      );
    }
  }

  node.children = children;
  return node;
}

function buildTreeFromSearchResults(results = [], label = "Search Results") {
  const root = {
    id: uuidv4(),
    name: label,
    path: label,
    children: [],
    icon: "folder",
    color: "#e0e0e0",
    position: { x: 0, y: 0 },
  };

  const children = results.map((result) => {
    const fullPath = getFullPathFromResult(result);
    return {
      id: uuidv4(),
      name: result.name || result.filename || path.basename(fullPath || label),
      path: fullPath || result.name || label,
      children: [],
      icon: result.type === "folder" ? "folder" : "file",
      color: result.type === "folder" ? "#e0e0e0" : "#cfd8dc",
      position: { x: 0, y: 0 },
    };
  });

  root.children = children;
  return root;
}

async function fetchDirectoryFromEverything(input) {
  const requested = typeof input === "string" ? input.trim() : "";
  const isWindowsPath = WINDOWS_PATH_REGEX.test(requested);

  // Treat plain text (non-path) requests as search queries
  if (requested && !isWindowsPath) {
    const data = await queryEverything(requested, {
      count: EVERYTHING_RESULTS_PER_QUERY,
    });
    return buildTreeFromSearchResults(
      data?.results?.slice(0, EVERYTHING_MAX_CHILDREN * 2) || [],
      `Search: ${requested}`
    );
  }

  const targetPath = isWindowsPath ? requested : DEFAULT_ROOT_PATH;
  return buildTreeFromEverythingPath(targetPath);
}

function formatEverythingEntry(result) {
  const fullPath = getFullPathFromResult(result);
  const name =
    result.name || result.filename || path.basename(fullPath || "Unknown");

  return {
    id: fullPath || uuidv4(),
    name,
    path: fullPath || name,
    type: result.type || "file",
    size: result.size ?? null,
    dateModified:
      result.date_modified || result.dateModified || result.date_created || null,
    icon: result.type === "folder" ? "folder" : "file",
    hasChildren: result.type === "folder",
  };
}

async function listEverythingChildren(
  targetPath,
  limit = EVERYTHING_MAX_CHILDREN
) {
  const normalizedPath = targetPath?.trim() || DEFAULT_ROOT_PATH;
  const escapedParent = escapeEverythingQueryValue(normalizedPath);
  const query = `parent:"${escapedParent}"`;

  const data = await queryEverything(query, {
    count: Math.min(limit, EVERYTHING_RESULTS_PER_QUERY),
  });

  const results = data?.results || [];
  return results.map((result) => formatEverythingEntry(result));
}

/**
 * GET /directory?path=C:\Users
 * Returns folder tree structure
 */
app.get("/connectors/everything/list", async (req, res) => {
  try {
    const { path: targetPath, limit } = req.query;
    const normalizedPath =
      typeof targetPath === "string" && targetPath.trim()
        ? targetPath.trim()
        : DEFAULT_ROOT_PATH;
    const parsedLimit = Number(limit);
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, EVERYTHING_RESULTS_PER_QUERY)
        : EVERYTHING_MAX_CHILDREN;

    const children = await listEverythingChildren(normalizedPath, safeLimit);

    res.json({
      path: normalizedPath,
      name: path.basename(normalizedPath) || normalizedPath,
      total: children.length,
      children,
    });
  } catch (error) {
    console.error("Error listing Everything folder:", error);
    res
      .status(500)
      .json({ error: "Failed to list Everything folder", details: error.message });
  }
});

app.get("/connectors/everything/search", async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q || typeof q !== "string" || !q.trim()) {
      return res.status(400).json({ error: "Search query (q) is required" });
    }

    const trimmedQuery = q.trim();
    const parsedLimit = Number(limit);
    const safeLimit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, EVERYTHING_RESULTS_PER_QUERY)
        : Math.min(50, EVERYTHING_RESULTS_PER_QUERY);

    const data = await queryEverything(trimmedQuery, { count: safeLimit });
    const results = (data?.results || []).map((result) =>
      formatEverythingEntry(result)
    );

    res.json({
      query: trimmedQuery,
      totalResults: data?.totalResults ?? results.length,
      results,
    });
  } catch (error) {
    console.error("Error searching Everything:", error);
    res
      .status(500)
      .json({ error: "Failed to search Everything", details: error.message });
  }
});


app.get("/directory", async (req, res) => {
  try {
    const { path: dirPath } = req.query;
    const trimmedPath = typeof dirPath === "string" ? dirPath.trim() : "";

    try {
      const structure = await fetchDirectoryFromEverything(trimmedPath);
      return res.json(structure);
    } catch (everythingError) {
      console.warn(
        "Falling back to local filesystem readDirectory:",
        everythingError.message
      );
    }

    if (!trimmedPath) {
      return res.json(mockDirectoryStructure);
    }

    // Fallback: use local filesystem if Everything request fails and path provided
    const structure = await readDirectory(trimmedPath);

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
