import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOWNLOAD_FILENAME, DOWNLOAD_URL } from "@/lib/constants";

export function DownloadCTA() {
  return (
    <section id="download" className="border-t border-border/60">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Ready when you are.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Grab the installer, run it once, and give your Windows a proper
          spring-clean.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild size="lg">
            <a href={DOWNLOAD_URL} download={DOWNLOAD_FILENAME}>
              <Download />
              Download for Windows
            </a>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Free forever · MIT licensed
        </p>
      </div>
    </section>
  );
}
