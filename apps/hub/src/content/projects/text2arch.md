---
title: "text2arch"
name: "text2arch"
slug: "text2arch"
pinned: false
pinnedOrder: -1
description: "Text to Arch(Base4) Encryption/Decryption"
repoUrl: "https://github.com/mozi1924/text2arch"
homepage: "https://text2arch.mozi1924.com/"
stars: 0
forks: 0
language: "TypeScript"
topics: ["archlinux","base4","encryption","iusearchbtw","memes"]
license: ""
createdAt: "2024-11-16T12:41:38Z"
pushedAt: "2026-01-18T13:04:04Z"
defaultBranch: "main"
archived: false
---
<p align="center">
  <img src="https://raw.githubusercontent.com/mozi1924/text2arch/main/public/logo.svg" alt="Text2Arch Logo" width="120" />
</p>

# Text2Arch

> **The Professional ArchBase4 Editor**

Text2Arch is a state-of-the-art text encoding tool tailored for the **ArchBase4** quaternary format. Designed for precision and ease of use, it features a split-pane interface with real-time bidirectional editing, syntax highlighting, and persistent layout management.

## Features

- **Bidirectional Editing**: Changes in the source text instantly update the encoded output, and vice versa.
- **Dual Protocol Support**:
  - **v2 (Default)**: Paragraph-preserving encoding for structured output.
  - **v1 (Legacy)**: Classic continuous stream encoding.
- **Quaternary Syntax Highlighting**: Visual distinction for `i`, `use`, `arch`, `btw` tokens.
- **Smart Layout**: Resizable panes that remember user settings significantly enhance workflow.
- **Dark Mode Optimization**: A sleek, dark-themed UI built for prolonged coding sessions.

## Technologies

Built with a modern stack for high performance and maintainability:

- **React 18**
- **TypeScript**
- **Vite**
- **Tailwind CSS**

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/mozi1924/text2arch.git
    cd text2arch
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Start the development server**

    ```bash
    npm run dev
    ```

4.  **Build for production**

    ```bash
    npm run build
    ```

## ArchBase4 Spec

### v2 (Structural)

Preserves original paragraph formatting, generating a structured and readable ciphertext.

### v1 (Legacy)

Encodes everything into a single continuous stream, treating newlines as standard bytes.
