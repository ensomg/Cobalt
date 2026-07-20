import { Github, Mail } from "lucide-react";
import Image from "next/image";
import { CONTACT_EMAIL, GITHUB_URL } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2">
          <Image src="/cobaltbg.png" alt="Cobalt" width={20} height={20} />
          <span>© 2026 Enes · MIT License</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <Mail className="size-4" />
            {CONTACT_EMAIL}
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            <Github className="size-4" />
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
