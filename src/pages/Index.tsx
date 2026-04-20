import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Camera, Upload, Play, AlertTriangle, X, Code2, Sparkles, Terminal } from "lucide-react";
import CodeWatermark from "@/components/CodeWatermark";

type Analysis = {
  extractedCode: string;
  language: string;
  output: string;
  errors: { line?: number; severity?: string; message: string; suggestion?: string }[];
  explanation: string;
};

const Index = () => {
  const [code, setCode] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch (e: any) {
      const msg =
        e?.name === "NotAllowedError"
          ? "Camera permission denied. Enable camera access in your browser."
          : e?.name === "NotFoundError"
          ? "No camera found on this device."
          : `Camera error: ${e?.message || "Unknown"}`;
      toast.error(msg);
    }
  };

  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    setPreviewImg(dataUrl);
    await analyzeImage(dataUrl);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, etc).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image is too large. Max 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreviewImg(dataUrl);
      await analyzeImage(dataUrl);
    };
    reader.onerror = () => toast.error("Failed to read file.");
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (dataUrl: string) => {
    setLoading(true);
    setAnalysis(null);
    // Jump to workbench so user sees progress + results immediately
    document.getElementById("analyze")?.scrollIntoView({ behavior: "smooth", block: "start" });
    const t = toast.loading("Reading image & compiling…");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-code", {
        body: { imageBase64: dataUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data);
      setCode(data.extractedCode || "");
      toast.success("Code extracted & compiled", { id: t });
    } catch (e: any) {
      toast.error(e.message || "Analysis failed", { id: t });
    } finally {
      setLoading(false);
    }
  };

  const analyzeText = async () => {
    if (!code.trim()) {
      toast.error("Paste or write some code first.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-code", {
        body: { code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data);
      toast.success("Code compiled");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <CodeWatermark />

      {/* radial gradient overlay for depth */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at top, hsl(145 80% 20% / 0.15), transparent 60%), radial-gradient(ellipse at bottom right, hsl(180 80% 25% / 0.1), transparent 50%)",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 backdrop-blur-sm">
          <div className="container flex items-center justify-between py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--terminal))] to-[hsl(var(--accent-cyan))] text-background">
                <Terminal className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="font-mono text-lg font-bold tracking-tight">
                  image<span className="text-terminal">.compile</span>
                </h1>
                <p className="text-xs text-muted-foreground">snap · upload · analyze</p>
              </div>
            </div>
            <a
              href="#analyze"
              className="hidden rounded-md border border-white/10 px-4 py-2 text-sm hover:border-[hsl(var(--terminal))] hover:text-terminal transition md:inline-block"
            >
              Get started →
            </a>
          </div>
        </header>

        {/* Hero */}
        <section className="container py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--terminal))]/30 bg-[hsl(var(--terminal))]/5 px-3 py-1 font-mono text-xs text-terminal">
              <Sparkles className="h-3 w-3" /> AI-powered OCR + compiler
            </div>
            <h2 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
              Turn any photo of code <br />
              into <span className="text-terminal cursor">runnable output</span>
            </h2>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Snap a photo, upload a screenshot, or paste source. We extract the code, predict the
              output, surface errors, and let you edit it live.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={openCamera}
                className="bg-[hsl(var(--terminal))] text-background hover:bg-[hsl(var(--terminal-glow))] font-mono"
              >
                <Camera className="mr-2 h-4 w-4" /> Live capture
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="border-white/15 hover:border-[hsl(var(--terminal))] font-mono"
              >
                <Upload className="mr-2 h-4 w-4" /> Upload image
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          </div>

          {/* feature strip */}
          <div className="mt-20 grid gap-4 md:grid-cols-3">
            {[
              { icon: Camera, title: "Live capture", desc: "Use your camera to snap code from a screen, book, or whiteboard." },
              { icon: Upload, title: "Image upload", desc: "Drop a screenshot or photo. PNG, JPG up to 10MB." },
              { icon: Code2, title: "Edit & re-run", desc: "Tweak the extracted code in our editor and recompile instantly." },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/5 bg-[hsl(var(--surface))]/60 p-6 backdrop-blur-sm transition hover:border-[hsl(var(--terminal))]/40"
              >
                <f.icon className="h-6 w-6 text-terminal" />
                <h3 className="mt-4 font-mono font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workbench */}
        <section id="analyze" className="container pb-24">
          <div className="mb-6 flex items-end justify-between">
            <h3 className="font-mono text-2xl font-bold">
              <span className="text-terminal">$</span> workbench
            </h3>
            {previewImg && (
              <button
                onClick={() => setPreviewImg(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                clear image
              </button>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Editor */}
            <div className="rounded-xl border border-white/10 bg-[hsl(var(--surface))]/80 backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--danger))]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--warning))]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--terminal))]" />
                  <span className="ml-3">
                    {analysis?.language ? `editor · ${analysis.language}` : "editor"}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={analyzeText}
                  disabled={loading}
                  className="h-8 bg-[hsl(var(--terminal))] text-background hover:bg-[hsl(var(--terminal-glow))] font-mono"
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  {loading ? "running..." : "compile"}
                </Button>
              </div>
              {previewImg && (
                <div className="border-b border-white/5 p-3">
                  <img
                    src={previewImg}
                    alt="captured code"
                    className="max-h-40 rounded-md border border-white/10 object-contain"
                  />
                </div>
              )}
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="// paste code here, or capture/upload an image of code…"
                className="min-h-[420px] resize-none rounded-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0"
                spellCheck={false}
              />
            </div>

            {/* Output panel */}
            <div className="space-y-5">
              <div className="rounded-xl border border-white/10 bg-[hsl(var(--surface))]/80 backdrop-blur">
                <div className="border-b border-white/5 px-4 py-3 font-mono text-xs text-muted-foreground">
                  output
                </div>
                <pre className="min-h-[180px] overflow-auto p-4 font-mono text-sm text-terminal">
{loading
  ? "compiling…"
  : analysis?.output || "// run the compiler to see predicted output"}
                </pre>
              </div>

              <div className="rounded-xl border border-white/10 bg-[hsl(var(--surface))]/80 backdrop-blur">
                <div className="border-b border-white/5 px-4 py-3 font-mono text-xs text-muted-foreground">
                  diagnostics{" "}
                  {analysis?.errors?.length ? (
                    <span className="text-[hsl(var(--danger))]">({analysis.errors.length})</span>
                  ) : (
                    <span className="text-terminal">(0)</span>
                  )}
                </div>
                <div className="p-4">
                  {!analysis && (
                    <p className="font-mono text-sm text-muted-foreground">
                      // no diagnostics yet
                    </p>
                  )}
                  {analysis && analysis.errors.length === 0 && (
                    <p className="font-mono text-sm text-terminal">✓ no errors detected</p>
                  )}
                  {analysis?.errors.map((err, i) => (
                    <div
                      key={i}
                      className="mb-3 rounded-md border border-[hsl(var(--danger))]/30 bg-[hsl(var(--danger))]/5 p-3 font-mono text-xs"
                    >
                      <div className="flex items-center gap-2 text-[hsl(var(--danger))]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {err.severity || "error"}
                        {err.line ? ` · line ${err.line}` : ""}
                      </div>
                      <div className="mt-1.5 text-foreground">{err.message}</div>
                      {err.suggestion && (
                        <div className="mt-1.5 text-muted-foreground">→ {err.suggestion}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {analysis?.explanation && (
                <div className="rounded-xl border border-white/10 bg-[hsl(var(--surface))]/80 p-4 backdrop-blur">
                  <div className="mb-2 font-mono text-xs text-muted-foreground">explanation</div>
                  <p className="text-sm leading-relaxed">{analysis.explanation}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 py-6 text-center font-mono text-xs text-muted-foreground">
          image.compile — built with Lovable Cloud
        </footer>
      </div>

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur">
          <div className="relative w-full max-w-2xl rounded-xl border border-white/10 bg-[hsl(var(--surface))] p-4">
            <button
              onClick={stopCamera}
              className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h4 className="mb-3 font-mono text-sm">live capture</h4>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-md border border-white/10"
            />
            <div className="mt-4 flex justify-center gap-3">
              <Button variant="outline" onClick={stopCamera}>
                cancel
              </Button>
              <Button
                onClick={captureSnapshot}
                className="bg-[hsl(var(--terminal))] text-background hover:bg-[hsl(var(--terminal-glow))]"
              >
                <Camera className="mr-2 h-4 w-4" /> snap & analyze
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
