<p align="center">
  <img src="cobaltbg.png" alt="Cobalt" width="140" />
</p>

<h1 align="center">Cobalt</h1>

<p align="center">
  Windows için modern PC bakımı, sürücü yönetimi ve optimizasyon aracı.
</p>

<p align="center">
  <a href="https://github.com/ensomg/Cobalt/releases/latest"><img src="https://img.shields.io/github/v/release/ensomg/Cobalt?color=1e90ff&label=son%20sürüm" alt="son sürüm" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-1e90ff" alt="platform" />
  <img src="https://img.shields.io/badge/lisans-MIT-1e90ff" alt="lisans" />
</p>

---

Cobalt; sürücü güncellemelerini, sistem tweak'lerini, temizliği, bloatware kaldırmayı ve ağ ayarlarını tek bir Windows kontrol panelinde topluyor. Electron üstünde çalışır, işi Windows'un kendi araçlarına yaptırır — üçüncü parti script yok, telemetri yok.

## Öne çıkanlar

- **Sürücü güncelleme** — Windows Update kataloğundan bekleyen güncellemeleri listeler ve arka planda sessizce kurar, ilerleme çubuğu gerçek zamanlı akar.
- **Optimizasyon** — kayıt defteri ve servis tweak'leri; hepsi geri alınabilir, hazır preset'lerle gelir ve her öğenin mevcut durumunu tespit eder.
- **Bloatware & program kaldırıcı** — Windows'un önyüklü uygulamalarını kaldırın, kurulu programları ikonlarıyla görüntüleyin, kaldırma sonrası artıkları derin temizleyin.
- **Temizlik** — geçici klasörler, önbellekler, Windows Update artıkları ve prefetch'ten disk alanı boşaltır; onaydan önce ne kadar yer açılacağını gösterir.
- **Windows Defender** — ayrıntılı toggle'lar, preset'ler ve ne yaptığınızı biliyorsanız tam kapatma / açma yolu.
- **DNS & Güç planı** — Cloudflare, Google, Quad9, AdGuard gibi tek tık DNS preset'leri ve ping tablosu; Ultimate Performance dahil güç planı seçenekleri.
- **Uygulama yöneticisi** — `winget` üzerinden yazılım kurun, güncelleyin ve kaldırın; her paket için canlı ilerleme.
- **Sistem paneli** — CPU, RAM, disk ve GPU sayaçları canlı olarak.
- **Otomatik güncelleme** — uygulama açılışta GitHub Releases'i kontrol eder, yeni sürüm varsa imzalı kurulumu indirmeniz için ekrana güncelleme ekranı çıkarır.

## Kurulum

Son yükleyiciyi [Releases](https://github.com/ensomg/Cobalt/releases/latest) sayfasından indirin:

- `Cobalt-<sürüm>-x64.exe` — kurulum (NSIS, kullanıcı bazlı)
- `Cobalt-<sürüm>-portable.exe` — kurulum gerektirmeyen taşınabilir sürüm

Cobalt; sürücü, kayıt defteri ve servis işlemleri için yönetici izni ister. Gerektiğinde uygulama size sorar.

## Kaynaktan derleme

```bash
git clone https://github.com/ensomg/Cobalt.git
cd Cobalt
npm install
npm start           # geliştirme modunda çalıştır
npm run build       # NSIS + portable üret
```

Çıktılar `dist/` klasörüne düşer.

## Güncellemeler

Cobalt güncellemeleri GitHub Releases üzerinden dağıtır. Açılışta
`api.github.com/repos/ensomg/Cobalt/releases/latest` okunur, tag ile mevcut
sürüm karşılaştırılır ve yeni bir sürüm varsa tam ekran güncelleme kartı
gösterilir; indirme yüzdesi ekranda canlı gider. Yeni bir sürüm yayınlamak için
release oluşturun (örn. `v0.2.0`) ve `Cobalt-Setup-*.exe` dosyasını asset
olarak ekleyin.

## Proje yapısı

```
main/        Electron ana süreç modülleri (drivers, cleanup, defender, dns…)
renderer/    Arayüz (HTML, CSS, vanilla JS sayfaları)
web/         Tanıtım ve indirme sitesi (Next.js)
build/       İkon ve kurulum kaynakları
```

## Katkı

Issue ve pull request'ler açık. Bir hata bildiriyorsanız Windows sürümünüzü
(`winver`) ve ilgiliyse uygulama içi bildirimdeki hata mesajını / çıkış kodunu
eklerseniz sevinirim.

## Lisans

[MIT Lisansı](LICENSE) altında yayınlanmıştır. © 2026 Enes.

---

<p align="center">
  <sub>English version: <a href="README.md">README.md</a>.</sub>
</p>
