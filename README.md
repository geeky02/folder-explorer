# Folder Mindmap Tool

A visual folder structure explorer with mindmap interface built with Next.js, ReactFlow, and a local Node.js backend.

## Features

- 🗂️ **Visual Folder Structure**: View your folder hierarchy as an interactive mindmap
- 🎨 **Customizable Nodes**: Change colors and icons for folders
- 🔄 **Layout Modes**: Switch between Auto Layout (tree) and Freeflow Layout (drag & drop)
- 👁️ **View/Edit Modes**: Toggle between viewing and editing the mindmap
- 📦 **Area Grouping**: Group parent folders with all descendants into visual areas
- 🔍 **Zoom & Pan**: Navigate large folder structures with minimap support
- 🖱️ **Context Menu**: Right-click nodes for quick actions (copy path, expand/collapse, open folder)
- 🎯 **Minimap**: Overview of the entire folder structure

## Architecture

### Frontend
- **Next.js 15+** with App Router
- **ReactFlow** for canvas visualization
- **Zustand** for state management
- **TailwindCSS** for styling
- **TypeScript** for type safety

### Backend
- **Node.js** with Express
- Local server running on port 3001
- API endpoints for directory reading and folder operations
- TODO: Everything SDK integration for Windows

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- (Optional) Everything SDK for Windows (for production use)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd flow
```

2. Install dependencies:
```bash
npm install
```

### Running the Application

1. Start the backend server (in one terminal):
```bash
npm run dev:backend
```

The backend will run on `http://localhost:3001`

2. Start the Next.js frontend (in another terminal):
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

3. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
flow/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main page component
│   └── layout.tsx         # Root layout
├── backend/               # Node.js backend server
│   └── server.js         # Express server with API endpoints
├── src/
│   ├── components/        # React components
│   │   ├── canvas/       # Canvas and node components
│   │   ├── toolbar/      # Toolbar component
│   │   └── context-menu/ # Context menu component
│   ├── lib/              # Utilities and types
│   │   ├── types.ts      # TypeScript interfaces
│   │   ├── utils.ts      # Utility functions
│   │   ├── api.ts        # API client
│   │   └── areaUtils.ts  # Area grouping utilities
│   └── store/            # Zustand store
│       └── useFlowStore.ts
└── package.json
```

## API Endpoints

### Backend API (http://localhost:3001)

- `GET /directory?path=<path>` - Get folder tree structure
- `POST /save-layout` - Save node positions and customizations
- `POST /open-folder` - Open folder in OS file explorer
- `GET /search?q=<query>` - Search files (future)
- `GET /starred-files` - Get starred files (future)

## Usage

### View Mode
- Click nodes to open folders in your file explorer
- Right-click nodes for context menu options
- Use zoom controls or mouse wheel to zoom
- Drag canvas to pan

### Edit Mode
- Switch to Edit mode in the toolbar
- In Freeflow mode, drag nodes to reposition them
- Select a node to change its color or icon
- Positions are automatically saved

### Layout Modes
- **Auto Layout**: Automatically arranges nodes in a tree structure
- **Freeflow Layout**: Manually position nodes anywhere on the canvas

### Area Grouping
- Areas group parent folders with all their descendants
- Click an area to zoom into it
- Areas are visually highlighted with colored backgrounds

## Development

### Adding Everything SDK Integration

The backend currently uses Node.js `fs` module for directory reading. To integrate with Everything SDK on Windows:

1. Install Everything SDK
2. Update `backend/server.js` to use Everything SDK instead of `fs.readdir`
3. The SDK provides faster directory indexing and search capabilities

### Future Enhancements

- [ ] Everything SDK integration for Windows
- [ ] Search functionality
- [ ] Starred files feature
- [ ] Export/import layouts
- [ ] Electron wrapper for desktop app
- [ ] Multi-platform support (Mac, Linux)

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [ReactFlow](https://reactflow.dev/) - Flow-based UI library
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [Dagre](https://github.com/dagrejs/dagre) - Graph layout algorithm
- [Express](https://expressjs.com/) - Backend framework
- [TailwindCSS](https://tailwindcss.com/) - Styling

## License

MIT
