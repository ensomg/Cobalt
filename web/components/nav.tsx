import Image from "next/image";
import Link from "next/link";
import { Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GITHUB_URL } from "@/lib/constants";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/cobaltbg.png"
            alt="Cobalt"
            width={26}
            height={26}
            priority
          />
          <span className="text-sm font-semibold tracking-tight">Cobalt</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="#features"
            className="hidden sm:inline-block rounded-md px-3 py-2 text-muted-foreground hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#download"
            className="hidden sm:inline-block rounded-md px-3 py-2 text-muted-foreground hover:text-foreground"
          >
            Download
          </Link>
          <Button asChild variant="outline" size="sm">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
              <Github />
              GitHub
            </a>
          </Button>
        </nav>
      </div>
    </header>
  );
}
