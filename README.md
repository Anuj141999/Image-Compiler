# image.compile — AI Code Scanner for Beginners

A beginner-friendly web app that lets you snap a photo, upload a screenshot, or paste source code to get instant analysis. Powered by AI, it extracts code from images, predicts the output, surfaces errors with plain-English explanations, and lets you edit and re-run everything in a live workspace.

**Live site:** [https://image-intel-studio.lovable.app](https://image-intel-studio.lovable.app)

---

## Features

- **Live Camera Capture** — Point your camera at code on a screen, book, or whiteboard and capture it instantly.
- **Image Upload** — Drop any screenshot or photo (PNG, JPG up to 10MB).
- **AI-Powered OCR** — Extracts and recognizes code from images using an AI vision model.
- **Editable Workbench** — Tweak extracted code in a built-in editor and recompile on the fly.
- **Error Translation** — Complex compiler errors are decoded into beginner-friendly suggestions.
- **Output & Diagnostics** — See predicted program output and a full diagnostic panel with severity levels and fix tips.

---

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + TypeScript
- **UI:** shadcn/ui component library
- **Backend:** Lovable Cloud (managed backend with edge functions)
- **AI:** Google Gemini models via Lovable AI Gateway for OCR, code extraction, and analysis

---

## How It Works

1. **Capture or Upload** — Use your camera or choose an image file.
2. **Extract** — The backend reads the image and pulls out any code it finds.
3. **Compile** — Code is compiled and executed in a sandboxed environment.
4. **Review** — Output, errors, and plain-English explanations are displayed in the workbench.
5. **Edit & Re-run** — Make changes in the editor and hit compile again.

---

## Project Structure

```
src/
  pages/Index.tsx          # Main app UI (hero, workbench, camera modal)
  components/
    ui/                      # shadcn/ui components
    CodeWatermark.tsx        # Background decorative element
  integrations/supabase/     # Supabase client and types
supabase/
  functions/
    analyze-code/index.ts    # Edge function: OCR + compile + explain
```

---

## Getting Started (Local Development)

```bash
# Install dependencies
bun install

# Start dev server
bun run dev
```

> **Note:** This project uses Lovable Cloud for backend features. The edge function and database are managed automatically when connected to a Lovable project.

---

## Built With

- [Lovable](https://lovable.dev)
- [Lovable Cloud](https://lovable.dev/cloud)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [React](https://react.dev)
- [Google Gemini](https://deepmind.google/technologies/gemini/)

---

## License

MIT
