# Tax Tracker - Fatura ve KDV Takip Uygulaması

## Kurulum Seçenekleri

### Seçenek 1: Portable (Taşınabilir) Uygulama (Önerilen)
**USB ile taşınabilir, kurulum gerektirmez**

1. `build-simple.bat` dosyasına çift tıklayın (Electron Builder sorunları için alternatif)
2. Build işlemi tamamlandıktan sonra `release\Tax Tracker-Portable\` klasörünü USB'ye kopyalayın
3. USB'deki `Tax Tracker-Portable\Tax Tracker.exe` dosyasını çalıştırın
4. Kurulum yapmaya gerek yoktur

**Not:** Bu yöntem Electron Builder'ın dosya kilitleme sorunlarını atlar ve daha güvenilirdir.

### Seçenek 2: Kurulum Dosyası
**Kalıcı kurulum için**

1. `Tax Tracker-Setup-1.0.0.exe` dosyasını çalıştırın (release klasöründe bulunmaktadır)
2. Kurulum otomatik olarak tamamlanacaktır
3. Uygulama otomatik olarak başlayacaktır

## Hızlı Başlatma

Eğer uygulamayı kurmadan çalıştırmak isterseniz:
1. `StartTaxTracker.bat` dosyasına çift tıklayın
2. Bu, uygulamayı doğrudan başlatacaktır

## Kullanım

### İlk Kullanım

- Uygulama kurulduktan sonra masaüstünüzde "Tax Tracker" kısayolu oluşturulacaktır
- Bu kısayola tıklayarak uygulamayı başlatabilirsiniz
- Uygulama ayrıca sistem tepsisinde (sağ alt köşede) bir simge olarak görünecektir
- İlk açılışta otomatik olarak örnek bir fatura ve kur kaydı oluşturulacaktır

### Sistem Tepsisi (Sağ Alt Köşe) Simgesi

Uygulamanın sistem tepsisindeki simgesine sağ tıklayarak:

- **Aç**: Uygulamayı açar veya öne getirir
- **Bilgisayar başlangıcında çalıştır**: İşaretlendiğinde, bilgisayarınız her açıldığında uygulama otomatik olarak başlar
- **Çıkış**: Uygulamayı tamamen kapatır

### Fatura İşlemleri

1. **Yeni Fatura Ekleme**:
   - Ana sayfada "Yeni Fatura" butonuna tıklayın
   - Gerekli bilgileri doldurun
   - "Kaydet" butonuna tıklayın

2. **Fatura Düzenleme**:
   - Faturalar listesinde düzenlemek istediğiniz faturanın yanındaki düzenleme butonuna tıklayın
   - Bilgileri güncelleyin
   - "Güncelle" butonuna tıklayın

3. **Fatura Silme**:
   - Faturalar listesinde silmek istediğiniz faturanın yanındaki çöp kutusu butonuna tıklayın
   - Onaylayın

### Excel'e Aktarma

- Faturalar sayfasında "Excel'e Aktar" butonuna tıklayın
- Excel dosyası otomatik olarak oluşturulacak ve bilgisayarınıza kaydedilecektir
- Excel dosyası iki sayfa içerir:
  1. **Özet**: Alış ve satış faturalarının toplam tutarları ve KDV tutarları
  2. **Faturalar**: Tüm faturaların detaylı listesi

### Dashboard (Gösterge Paneli)

- Dashboard sayfasında faturalarınızla ilgili özet bilgileri ve grafikleri görebilirsiniz
- Tarih aralığını değiştirerek belirli bir döneme ait verileri görüntüleyebilirsiniz
- "Tümü", "Alış" ve "Satış" sekmeleri arasında geçiş yaparak farklı türdeki faturaların özetlerini görebilirsiniz

### Kur Yönetimi

- Kur Yönetimi sayfasında döviz kurlarını ekleyebilir ve düzenleyebilirsiniz
- Eklenen kurlar, yabancı para birimli faturaların TL karşılıklarının hesaplanmasında kullanılır

## Önemli Notlar

- Uygulama kapatıldığında sistem tepsisinde çalışmaya devam eder
- Uygulamayı tamamen kapatmak için sistem tepsisindeki simgeye sağ tıklayıp "Çıkış" seçeneğini seçin
- Bilgisayarınızı her açtığınızda uygulamanın otomatik başlaması için sistem tepsisindeki simgeye sağ tıklayıp "Bilgisayar başlangıcında çalıştır" seçeneğini işaretleyin

## Sorun Giderme

### Boş Sayfa Sorunu

Eğer uygulama açıldığında sadece başlık çubuğu görünüyor ve içerik boş görünüyorsa:

1. **Veri Dosyaları Eksik Olabilir**: Uygulama, veri dosyalarını bulamadığında içeriği gösteremeyebilir.
2. **Çözüm**: 
   - Uygulamayı kapatın
   - Tekrar açın
   - İlk açılışta otomatik olarak örnek veriler oluşturulacaktır
   - Eğer sorun devam ederse, en az bir fatura ve bir kur kaydı ekleyin

### Veri Konumları

- Geliştirme modunda: `%APPDATA%\Electron\taxtracker-data`
- Kurulu uygulamada: `%APPDATA%\Tax Tracker\taxtracker-data`

## Yenilikler

### Excel Dışa Aktarma İyileştirmeleri
- Daha iyi sütun genişlikleri ve okunabilirlik
- Başlıklar ve toplam satırları için stil iyileştirmeleri
- Alış ve satış faturalarının özetlerini içeren ayrı bir sayfa
- Sayılar ve para birimi değerleri için daha iyi biçimlendirme

### Kullanım Kolaylığı
- Uygulama sistem tepsisinde çalışmaya devam eder
- Bilgisayar başlangıcında otomatik çalıştırma seçeneği
- Masaüstü kısayolu ve kolay erişim
- Otomatik veri taşıma ve örnek veri oluşturma
