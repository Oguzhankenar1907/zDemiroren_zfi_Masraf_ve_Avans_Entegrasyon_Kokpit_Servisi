# Uygulama durumu — 23 Ekim 2026

## Rehbere göre yerel tamamlama

Kullanıcının son talimatıyla canlı sistem doğrulaması yapılmadı. Yerel metadata ve rehber esas alındı. Normal kalemlerin hata mesajı başlıktan, e-faturalarınki kalemden gösterilir. Detay kalem sorgusunda şirket filtresi korunur; karışık form ve fatura kapsamı ayrı test edilir. Detay yenilemesi başlık/kalem servis mesajlarını da yeniler; aynı mesajlar tekilleştirilir ve düz metin gösterilir. Ana listede Int64 kimliklerin otomatik binlik ayracıyla biçimlendirilmesi önlendi. Yenileme sırasında çift tıklama engellendi.

Rehberin 10. bölümünün son paragrafı boş/kritik hatalı işlemlerin devre dışı tutulmasını; 13. bölüm 5. adım ise backend iş listesi tamamlandıkça aksiyonların açılmasını istiyor. Bu nedenle muhasebe butonları açılmadı. Backend kaynakları ve bakım servis sözleşmeleri projede bulunmadığından bunlara ait kod değişikliği yapılmadı. Bakım/import endpoint'i veya mali hesaplanan alan uydurulmadı. Kullanıcının önceki temizlik talimatı doğrultusunda eski kod kopyaları yeniden eklenmedi.

Yerel hedefli testler, XML kontrolleri ve build başarılı; ESLint hata yok, mevcut 9 stil uyarısı sürüyor.

## Temizlik

- `backups/before-cockpit-2026-10-22` kopyaları ve controller/view/formatter içindeki eski yorum kodları silindi.
- Çağrılmayan HistoryDialog, ItemDialog ve ReversalDialog fragmentleri kaldırıldı. Aktif detay ekranı CockpitDetail fragmentidir.
- Genel UI5 sınıflarını etkileyen özel CSS ve manifest referansı; kullanılmayan sap.f/sap.ui.table bağımlılıkları kaldırıldı.
- Spec ve geliştirme rehberi referans doküman olarak korundu. scripts/test-cockpit.cjs geliştirme testidir; uygulama paketinde bulunmaz.

## Yayın paketi ve düzeltmeler

- ui5.yaml build ayarı test ve localService dosyalarını dist paketinden çıkarır. Mock metadata geliştirme ortamında korunur.
- Manifest OData protokolü 4.0 olarak tanımlandı; mevcut V4 servis URI'si korundu. Bu değişiklik SAP servisinin sürümünü değiştirmez.
- i18n desteklenen dil/fallback ayarları mevcut temel bundle ile eşleştirildi; build uyarıları giderildi.
- Detay açılırken tekrar tıklamalar engellenir. Filtre değişiminde diğer sekmelerin eski şirket sonuçları temizlenir. TCKN giriş kontrolü eklendi.
- Detay ve Excel için liste sorgularında başlık/kalem alanları açıkça istenir. Büyük Int64 kimlikler ve decimal tutarlar korunur.
- Bozuk Türkçe buton metinleri düzeltildi. QUnit iskeletinin view olmadan onInit çağırması kaldırıldı; OPA'nın beklediği page ID eklendi.

## Doğrulama ve sınırlar

- node scripts/test-cockpit.cjs: başarılı.
- Değişen JS dosyalarında hedefli ESLint: hata yok; 9 stil uyarısı var.
- Aktif XML dosyaları ve tablo kolon/hücre sayıları: başarılı.
- npm run build: başarılı; dist içinde test/localService/kaldırılmış CSS bulunmadığı doğrulandı.
- UI5 CLI güncelleme bildiriminin yerel config erişim uyarısı derlemeyi engellemiyor.

Public Cloud'a yayın yapılmadı. Hedef sistemin UI5 sürümü, FLP uygulama tanımı, servis erişimi ve yetkileri canlı ortamda doğrulanmalıdır. Projede yayın hedefini tanımlayan deploy yapılandırması bulunmuyor; mevcut npm deploy komutu fiori verify çalıştırıyor.

Backend kaynakları bu repository'de yoktur. Muhasebe butonları mevcut backend eksikleri nedeniyle devre dışıdır. Bu temizlik muhasebe işlemlerini etkinleştirmez. MasrafTuru'nun mevcut kokpit servisindeki teknik alanı AvansTuru olmaya devam eder; backend/metadata değişmeden binding adı değiştirilmedi. Ayrıntılar CSP_Kokpit_Codex_Gelistirme_Rehberi.md dosyasındadır.
