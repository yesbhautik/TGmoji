# Contributing to TGmoji

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/YOUR_USERNAME/tgmoji.git
cd tgmoji
npm install
npm run dev
```

The dev server starts at `http://localhost:3000` with auto-reload.

## Branch Naming

```
feature/description    # New features
fix/description        # Bug fixes
docs/description       # Documentation
refactor/description   # Code refactoring
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add batch SVG conversion
fix: handle empty SVG viewBox
docs: update API examples
refactor: extract frame capture utility
```

## Pull Requests

1. **Fork** the repository
2. **Branch** from `main`
3. **Code** your changes
4. **Test** locally (`npm run dev` and convert a few SVGs)
5. **Commit** with clear messages
6. **Push** to your fork
7. **Open a PR** against `main`

### PR Checklist

- [ ] Code runs without errors
- [ ] Tested with at least one SVG conversion (GIF + WebM + Sticker)
- [ ] No console errors in the browser
- [ ] Health endpoint returns `"status": "ok"`

## Code Style

- **Indent:** 4 spaces
- **Quotes:** Single quotes for JS
- **Semicolons:** Yes
- **Naming:** `camelCase` for variables/functions, `PascalCase` for classes

## Reporting Issues

When opening an issue, please include:

1. **Description** of the problem
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Environment** (OS, Node version, browser)
6. **SVG file** (if relevant — attach or link)

## Questions?

Open a [Discussion](https://github.com/yesbhautik/tgmoji/discussions) or reach out at [yesbhautik.co.in](https://yesbhautik.co.in).

---

**Thank you for making TGmoji better! ❤️**
