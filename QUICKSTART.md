# Quick Start Guide

## Setup & Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the backend server** (Terminal 1):
   ```bash
   npm run dev:backend
   ```
   This starts the Express server on `http://localhost:3001`

3. **Start the Next.js frontend** (Terminal 2):
   ```bash
   npm run dev
   ```
   This starts the Next.js app on `http://localhost:3000`

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## First Use

- The app will automatically fetch directory structure from the backend
- Currently uses mock data for development
- Click on nodes to open folders in your file explorer
- Right-click nodes for context menu options

## Features Overview

### Toolbar Controls

- **Mode Toggle**: Switch between View and Edit modes
- **Layout Toggle**: Switch between Auto (tree) and Freeflow (drag) layouts
- **Color Picker**: Change node colors (in Edit mode, with node selected)
- **Icon Picker**: Change node icons (in Edit mode, with node selected)

### Canvas Interactions

- **Zoom**: Use mouse wheel or zoom controls
- **Pan**: Click and drag the canvas background
- **Minimap**: Bottom-right corner shows overview
- **Node Click**: Opens folder in file explorer
- **Node Right-Click**: Context menu with options

### Layout Modes

- **Auto Layout**: Automatically arranges nodes in a hierarchical tree
- **Freeflow Layout**: Drag nodes to position them manually (in Edit mode)

## Development Notes

- Backend currently uses mock data - replace with Everything SDK for Windows
- Node positions are saved when dragging in Freeflow mode
- Areas can be created programmatically (see `src/lib/areaUtils.ts`)

## Troubleshooting

- **Backend not connecting**: Make sure backend is running on port 3001
- **No nodes showing**: Check browser console for errors
- **CORS errors**: Backend has CORS enabled, but check if ports match

