# bun-ha-tui

A terminal user interface (TUI) application built with Bun and OpenTUI.

## Features

- ASCII art rendering with the "tiny" font
- Interactive input fields with custom styling
- Responsive layout with flexbox-style positioning
- Built with TypeScript for type safety

## Requirements

- [Bun](https://bun.sh/) runtime
- TypeScript 5+

## Installation

```bash
bun install
```

## Development

Run the application in watch mode:

```bash
bun run dev
```

Or run directly:

```bash
bun run src/index.ts
```

## Dependencies

- `@opentui/core` - Core TUI rendering library for building terminal interfaces

## Project Structure

```
bun-ha-tui/
├── src/
│   └── index.ts       # Main application entry point
├── package.json
├── tsconfig.json
└── README.md
```

## About

This project was created using `bun create tui`. [create-tui](https://git.new/create-tui) is the easiest way to get started with OpenTUI.

## License

Private project
