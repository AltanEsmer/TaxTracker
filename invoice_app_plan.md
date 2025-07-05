**Proje Adı:** Fatura Kayıt ve KDV Takip Uygulaması

### 1. Gereksinimler ve Özellikler

- **Fatura Girişi Formu:**
  - Alanlar: Tarih, Şirket İsmi, Fatura No, Ara Toplam, KDV Oranı (%), Genel Toplam
  - Para Birimi: USD, EUR, TRY
- **Kur Yönetimi:**
  - Aylık ortalama USD ve EURO kurları girişi veya API üzerinden otomatik çekme
- **Hesaplamalar:**
  - Girilen ara toplam ve KDV oranına göre KDV miktarını ve genel toplamı hesaplama
  - Farklı para birimlerini TL'ye dönüştürme
- **Dashboard:**
  - Aylık toplam KDV
  - Aylık ciro (TL cinsinden)
  - Fatura sayısı ve para birimi dağılımı
  - Tarih aralığı seçim özelliği
- **Veri Depolama:**
  - Lokal SQLite veritabanı (lokal dosya olarak)
- **Platform:**
  - Windows ve Mac desteği sağlamak için çapraz platform çözüm

### 2. Teknoloji Seçenekleri

- **Electron + React/Vue:**
  - Web teknolojileriyle masaüstü uygulama
  - UI: React veya Vue + Ant Design / Vuetify
  - Veritabanı: SQLite (node-sqlite3) veya lowdb

### 3. Mimari ve Veri Modeli

- **Tablolar:**
  - `invoices` (id, date, company, invoice\_no, subtotal, vat\_rate, total, currency)
  - `fx_rates` (id, month, year, usd\_to\_try, eur\_to\_try)

### 4. Adım Adım Gelişim Planı

1. Proje ortamını hazırlama (repo oluşturma, bağımlılıkları yükleme)
2. Veritabanı katmanını oluşturma (SQLite bağlantısı, tablolar)
3. Fatura girişi formu geliştirme (CRUD işlemleri)
4. Kur yönetimi arayüzü ekleme (manuel veya API bağlantısı)
5. Hesaplama modüllerini yazma (KDV ve dönüştürme)
6. Dashboard sayfası (grafikler, istatistikler)
7. Uygulamayı paketleme ve dağıtım hazırlığı

### 5. Dashboard İçin Grafik Önerileri

- **Bar Grafiği:** Aylara göre toplam KDV
- **Pasta Grafiği:** Para birimi bazlı fatura sayısı
- **Çizgi Grafiği:** Aylık ciro trende göre

---

Bu planı temel alarak dilersen bir teknoloji seçip proje iskeletini oluşturmaya başlayalım. Hangi teknolojiyi tercih ediyorsun?

