# Fatura Kayıt ve KDV Takip Uygulaması - Kurulum Rehberi

Bu rehber, Fatura Kayıt ve KDV Takip Uygulaması'nın kurulumu ve çalıştırılması için gerekli adımları içermektedir.

## Gereksinimler

Uygulamayı çalıştırmak için aşağıdaki yazılımların bilgisayarınızda kurulu olması gerekmektedir:

- [Node.js](https://nodejs.org/) (v18 LTS veya v20 LTS önerilir)
- [npm](https://www.npmjs.com/) (Node.js ile birlikte gelir)

## Kurulum Adımları

### 1. Proje Dosyalarını İndirin

Projeyi GitHub'dan klonlayın veya ZIP dosyası olarak indirin ve bir klasöre çıkarın.

```bash
git clone https://github.com/kullanici-adi/tax-tracker.git
cd tax-tracker
```

### 2. Bağımlılıkları Yükleyin

Proje klasöründe aşağıdaki komutu çalıştırarak gerekli bağımlılıkları yükleyin:

```bash
npm install
```

Bu işlem birkaç dakika sürebilir.

## Uygulamayı Çalıştırma

### Geliştirme Modu

Uygulamayı geliştirme modunda çalıştırmak için aşağıdaki komutu kullanın:

```bash
npm run dev
```

Bu komut, hem Electron uygulamasını hem de React geliştirme sunucusunu başlatacaktır.

### Uygulama Paketini Oluşturma

Uygulamanın dağıtılabilir paketini oluşturmak için aşağıdaki komutu kullanın:

```bash
npm run build
```

Bu işlem tamamlandığında, `release` klasöründe kurulum dosyası oluşturulacaktır:

- **Windows**: `release/Tax Tracker-Setup-1.0.0.exe`

## Kullanım

Uygulama başlatıldığında, ana ekranda bir dashboard göreceksiniz. Üst menüden aşağıdaki işlemleri yapabilirsiniz:

1. **Dashboard**: Aylık KDV, ciro ve fatura istatistiklerini görüntüleyin.
2. **Faturalar**: Mevcut faturaları listeleyin, filtreleyin ve yönetin.
3. **Yeni Fatura**: Yeni fatura ekleyin.
4. **Kur Yönetimi**: Aylık döviz kurlarını girin ve yönetin.

## Veri Depolama

Uygulama, verileri yerel JSON dosyalarında saklar. Veri dosyaları aşağıdaki konumlarda bulunur:

- **Windows**: `%APPDATA%\tax-tracker\taxtracker-data\`
  - `invoices.json` — Fatura kayıtları
  - `fxrates.json` — Aylık döviz kuru kayıtları

> **Not:** Geliştirme modunda veriler `%APPDATA%\Electron\taxtracker-data\` klasöründe saklanır. İlk üretim sürümü çalıştırıldığında bu veriler otomatik olarak aktarılır.

## Sorun Giderme

Uygulama başlatılırken veya kullanılırken sorunlarla karşılaşırsanız:

1. Node.js ve npm'in güncel sürümlerini kullandığınızdan emin olun.
2. Proje klasöründe `npm install` komutunu tekrar çalıştırın.
3. Geliştirme modunda çalıştırarak (`npm run dev`) hata mesajlarını kontrol edin.

### Derleme Sorunları

Uygulamayı derlerken sorunlar yaşıyorsanız:

1. **Dosya Kilitleme Hatası:**
   - Tüm Electron süreçlerinin kapatıldığından emin olun.
   - `npm run clean` komutunu çalıştırarak eski derleme dosyalarını temizleyin.
   - Windows Görev Yöneticisi'nden tüm node.exe ve electron.exe süreçlerini sonlandırın.

2. **Node.js Sürüm Uyumsuzluğu:**
   - Node.js LTS sürümünü (v18.x veya v20.x) kullanın.
   - Node.js v22+ bazı native modüllerle uyumsuzluk yaşayabilir.

## Güncelleme

Uygulamanın yeni bir sürümü yayınlandığında, proje dosyalarını güncelleyin ve bağımlılıkları yeniden yükleyin:

```bash
git pull
npm install
``` 