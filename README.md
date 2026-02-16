# 🧊 Minecraft Client Checker

## 🤖 Disclaimer

This project was entirely built with AI assistance.

A web app to check whether Minecraft mods are client-side only. Supports `.jar` file analysis for **Forge**, **NeoForge**, **Fabric**, and **Quilt** mod loaders.

## ✨ Features

- 📦 **Upload mod files** — Drag & drop or select `.jar` files to analyze
- 📂 **Multi-file support** — Upload and analyze multiple mods at once
- 🔍 **Mod loader detection** — Automatically detects Forge, NeoForge, Fabric, and Quilt
- ⚠️ **Client-only detection** — Identifies mods that can't run on a server
- 📥 **Download server mods** — Export only server-compatible mods as a `.zip`

## 🛠️ Tech Stack

- **Framework** — [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
- **Runtime** — [Bun](https://bun.sh/)
- **Language** — TypeScript
- **Styling** — Tailwind CSS v4
- **UI** — [shadcn/ui](https://ui.shadcn.com/) + Lucide Icons
- **Zip** — [JSZip](https://stuk.github.io/jszip/)

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js

## 📁 Project Structure

```
client-checker/
├── app/
│   ├── actions.ts          # Server actions (mod analysis)
│   └── page.tsx            # Main page
├── components/
│   ├── mod-checker.tsx     # Mod checker component
│   └── ui/                 # shadcn/ui components
└── package.json
```

## 🔎 How It Works

1. User uploads `.jar` mod files
2. Server Action extracts the `.jar` (zip) and checks:
   - **Forge/NeoForge** — Reads `META-INF/mods.toml` for `side="CLIENT"`
   - **Fabric** — Reads `fabric.mod.json` for `environment: "client"`
   - **Quilt** — Reads `quilt.mod.json` for `environment: "client"`
   - **Class files** — Scans for client-only packages like `net.minecraft.client`, `com.mojang.blaze3d`
3. Displays which mods are client-only and which are server-compatible