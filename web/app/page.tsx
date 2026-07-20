import { DownloadCTA } from "@/components/download-cta";
import { Features } from "@/components/features";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Nav } from "@/components/nav";
import { Preview } from "@/components/preview";
import { Requirements } from "@/components/requirements";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <Preview />
        <Requirements />
        <DownloadCTA />
      </main>
      <Footer />
    </>
  );
}
