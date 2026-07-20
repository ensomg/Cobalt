import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FEATURES } from "@/lib/features";

export function Features() {
  return (
    <section id="features" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything your PC needs, in one app.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Twelve focused modules covering the boring but important stuff —
            drivers, cleanup, memory, power, DNS and more.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardHeader>
                <div className="flex size-9 items-center justify-center rounded-md border border-border/70 bg-muted/40">
                  <Icon className="size-4" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardDescription className="mt-3">{desc}</CardDescription>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
