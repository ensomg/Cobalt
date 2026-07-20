import Image from "next/image";

export function Preview() {
  return (
    <section className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            A calm interface for a noisy job.
          </h2>
          <p className="mt-4 text-muted-foreground">
            No dark patterns, no bundled toolbars, no upsells. Just the tools
            you actually reach for.
          </p>
        </div>
        <div className="mt-12 overflow-hidden rounded-xl border border-border bg-muted/20">
          <Image
            src="/preview.png"
            alt="Cobalt application interface"
            width={2400}
            height={1500}
            className="h-auto w-full"
            sizes="(min-width: 1024px) 1024px, 100vw"
            priority={false}
          />
        </div>
      </div>
    </section>
  );
}
