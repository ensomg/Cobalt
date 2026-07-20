import { Download, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  APP_TAGLINE,
  DOWNLOAD_FILENAME,
  DOWNLOAD_URL,
  GITHUB_URL,
} from "@/lib/constants";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-[420px] bg-[radial-gradient(ellipse_at_center,oklch(0.7_0.15_240/0.15),transparent_60%)]"
      />
      <div className="mx-auto max-w-3xl px-6 pt-28 pb-24 text-center">
        <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          For Windows 10 &amp; 11 · x64
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
          Modern PC maintenance,
          <br />
          <span className="text-muted-foreground">reimagined.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          {APP_TAGLINE}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <a href={DOWNLOAD_URL} download={DOWNLOAD_FILENAME}>
              <Download />
              Download for Windows
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
              <Github />
              View on GitHub
            </a>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Free forever · MIT licensed · No account required
        </p>
      </div>
    </section>
  );
}
