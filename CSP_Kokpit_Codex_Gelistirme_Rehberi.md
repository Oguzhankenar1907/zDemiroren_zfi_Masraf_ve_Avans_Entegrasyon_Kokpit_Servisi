# Demirören Personel Avans ve Masraf Kokpiti Codex Geliştirme Rehberi

Hazırlanma tarihi: 22 Ekim 2026

Bu belgeyi uygulama projesiyle birlikte Codex'e verin. Amaç, mevcut ABAP servislerini kullanarak VS Code projesinde SAPUI5 kokpitini geliştirmektir. Servis sözleşmesi, paylaşılan CDS, behavior, handler, yardımcı sınıf ve metadata üzerinden çıkarılmıştır. Backend'de aksiyon tanımlı olması işlemin çalışır veya test edilmiş olduğunu göstermez. Aşağıdaki eksikler uygulama tarafından gizlenmemeli veya frontend hesaplamalarıyla muhasebe kuralına dönüştürülmemelidir.

## 1 İşin kapsamı ve çalışma kuralları

Uygulama CSP'den alınmış onaylı formları listeler. Formların iş verisi kokpitte düzenlenmez. Avans, normal masraf, personelin ödediği e-fatura ve raporlama süreçleri bulunur. Hatalı iş verisi CSP'de düzeltilerek yeni form olarak gönderilir. Henüz işlem görmemiş formun tekrar gönderiminde güncelleme yapabilen inbound kod da mevcuttur; CSP tekrar gönderim sözleşmesi henüz paylaşılmamıştır.

Kullanıcının bağlayıcı kaynak koruma tercihi: kaldırılacak veya değiştirilecek eski kodu silmeyin; bulunduğu yerde dilin desteklediği yorum biçimiyle koruyun ve yeni kodu yanında tutun. JS'de yorum, XML'de geçerli XML yorumları kullanın; yorum içine geçersiz çift tire koymayın. JSON yorum desteklemez: manifest gibi dosyaların eski halini ayrı yedekte ve/veya Git geçmişinde koruyun. ABAP tablo editöründe yorum biçimleriyle sorun yaşandı; geçerli sözdizimini kontrol edin, tahminle tekrar tekrar değiştirmeyin. Dosyaları değişiklikten önce okuyun; kullanıcı değişikliklerini ezmeyin.

Geliştirme projesi HMX_EN_demiroren_80, test mandantı 100'dür. Uç noktaların gerçekten hangi mandantta çalıştığını proje adına bakarak varsaymayın. Önce salt okunur servis bağlantısını doğrulayın. Muhasebe aksiyonlarını keşif veya bağlantı testi amacıyla tetiklemeyin.

## 2 Kanıtların kapsamı

İncelenenler: fonksiyonel spesifikasyon, inbound tablo/CDS/behavior ve handler kaynakları; kokpit servis tanımı, root/projection CDS'leri, behavior tanımları, ZBP_R_FI_CSP_KOKPIT_HEAD Local Types, ZCL_FI_CSP_HELPER, ters kayıt parametresi, işlem geçmişi CDS'si, kokpit metadata XML'i, manifest.json ve ADT ekranları.

Görülmeyenler: VS Code controller/view/Component.js içerikleri, package.json, UI5 proxy yaml'leri, canlı kokpit örnek yanıtları, beş bakım servisinin metadata'ları ve behavior kodları, CSP'nin resmi JSON sözleşmesi. Önceki IDE bağlamındaki açık dosya isimleri içerik erişimi anlamına gelmez. Uygulama klasörünü doğrulayın ve bu dosyaları okuyun. Bu belge canlı sistem incelemesi veya uçtan uca muhasebe testi değildir.

## 3 Mevcut VS Code uygulaması

Uygulama kimliği: com.golive.demiroren.zficspkokpit
Başlangıç şablonu: @sap/generator-fiori:basic, 1.22.0
Manifest sürümü: 1.83.0
Minimum UI5: 1.148.10

Bu yapı freestyle SAPUI5 XML view/controller uygulamasıdır; manifestte sap.fe.templates ListReport/ObjectPage hedefleri yoktur. Metadata'daki UI annotation'larının freestyle ekranı kendiliğinden oluşturacağını varsaymayın.

Kütüphaneler: sap.m, sap.ui.core, sap.f, sap.ui.layout, sap.ui.table, sap.ui.export.
Varsayılan model: mainService'e bağlı OData V4 modeli; preload=true, operationMode=Server, autoExpandSelect=true, earlyRequests=true.
i18n bundle: com.golive.demiroren.zficspkokpit.i18n.i18n
CSS: webapp/css/style.css
Root view: com.golive.demiroren.zficspkokpit.view.App; id App.
Router: sap.m.routing.Router, controlId app, pages aggregation, XML view.
Route: Routezfi_csp_kokpit; pattern :?query:; target Targetzfi_csp_kokpit.
Target view: zfi_csp_kokpit, namespace com.golive.demiroren.zficspkokpit.view.
Yerel metadata: webapp/localService/mainService/metadata.xml.

Manifest ana servis URI'si:

```text
/sap/opu/odata4/sap/zui_fi_csp_kokpit_o4/srvd/sap/zui_fi_csp_kokpit_o4/0001/
```

Manifest odataVersion değeri 4.01; metadata edmx:Edmx Version değeri 4.0. Bunları tek başına hata saymayın; uygulamanın UI5 sürümünde desteklenen model ayarlarını kontrol edin.

## 4 Servislerin ayrımı

### 4.1 Kokpit ana servisi

Service definition ve binding: ZUI_FI_CSP_KOKPIT_O4
Binding: OData V4 UI, ADT'de Published olarak görüldü.
Namespace: com.sap.gateway.srvd.zui_fi_csp_kokpit_o4.v0001
Alias: SAP__self
Entity container: Container.

```abap
define service ZUI_FI_CSP_KOKPIT_O4 {
  expose ZC_FI_CSP_KOKPIT_HEAD  as Form;
  expose ZC_FI_CSP_KOKPIT_ITEM  as Kalem;
  expose ZR_FI_CSP_KOKPIT_ISLEM as IslemGecmisi;
}
```

Form -> ZC_FI_CSP_KOKPIT_HEAD -> ZR_FI_CSP_KOKPIT_HEAD -> zfi_t_csp_mhead.
Kalem -> ZC_FI_CSP_KOKPIT_ITEM -> ZR_FI_CSP_KOKPIT_ITEM -> zfi_t_csp_mitem.
IslemGecmisi -> ZR_FI_CSP_KOKPIT_ISLEM -> zfi_t_csp_mislem.
Masraf tipi açıklaması zfi_t_csp_mtyp tablosundan okunur.

### 4.2 CSP inbound servisi

ZUI_FI_CSP_MASRAF_O4, OData V4 Web API; kokpit servisinden farklıdır.

```text
/sap/opu/odata4/sap/zui_fi_csp_masraf_o4/srvd_a2x/sap/zui_fi_csp_masraf_o4/0001/
```

Masraf -> ZC_FI_CSP_MASRAF_HEAD; MasrafKalem -> ZC_FI_CSP_MASRAF_ITEM.
Statik, collection-bound Kaydet aksiyonu başlık ve _Item listesini alır. Namespace: com.sap.gateway.srvd_a2x.zui_fi_csp_masraf_o4.v0001.

```text
POST .../Masraf/com.sap.gateway.srvd_a2x.zui_fi_csp_masraf_o4.v0001.Kaydet
```

UI kokpit butonları bu Kaydet aksiyonunu kullanmaz. Bu servis CSP'nin veri kabul katmanıdır. Fiziksel tablolar kokpitle ortaktır.

### 4.3 Bakım servisleri

ADT'de şu binding/definition adları görüldü:

| Amaç | Servis | Bilinen fiziksel tablo |
|---|---|---|
| Masraf tipi | ZUI_FIT_CSP_MTYP_O4 | ZFI_T_CSP_MTYP |
| Gider hesabı tayini | ZUI_FIT_CSP_MHESAP_O4 | ZFI_T_CSP_MHESAP |
| KDV göstergeleri | ZUI_FIT_CSP_MKDV_O4 | ZFI_T_CSP_MKDV |
| KKEG kuralları | ZUI_FIT_CSP_MKKEG_O4 | ZFI_T_CSP_MKKEG |
| Belge türleri ve personel hesabı | ZUI_FIT_CSP_MBELGE_O4 | ZFI_T_CSP_MBELGE |

Masraf tipi için ZC_FIT_CSP_MTYP projection/metadata extension ve OData V4 UI binding görülmüş, preview'de kayıt oluşturma ve Excel export menüsü gözlenmiştir. Diğer servislerin URI, entity set, anahtar, draft, ETag ve CRUD sözleşmeleri henüz incelenmemiştir. Servis adından bunları türetip kodlamayın. Her bakım servisi için binding URL'sini ve $metadata'yı okuyun; gerekiyorsa manifestte ayrı named model tanımlayın. Şu an manifestte yalnız kokpit mainService vardır.

Business Configuration Maintenance Object yerine kullanıcının tercihiyle OData UI Service generator yoluna geçildi. Custom Business Configurations entegrasyonu ve değişiklik geçmişi ihtiyacı tamamlanmış değildir. Oluşturan/değiştiren alanları ayrıntılı eski/yeni değer logu değildir.

## 5 Anahtarlar, tipler ve veri okuma

| Entity set | Anahtarlar | Navigasyon |
|---|---|---|
| Form | AkisNumarasi: Edm.Int64 | _Item -> Kalem koleksiyonu |
| Kalem | AkisNumarasi: Edm.Int64, OrderId: Edm.Int32 | _Header -> tek Form |
| IslemGecmisi | AkisNumarasi: Edm.Int64, Sira: String(4) | Serviste sunulmuş navigasyon yok |

Root başlıkta _History tanımlı olsa da projection/metadata'da sunulmuyor. Geçmişi /IslemGecmisi üzerinden AkisNumarasi ile filtreleyin. İşlem geçmişi root CDS'sindeki _Header da paylaşılan metadata'da yoktur; olmayan navigasyonu çağırmayın.

Int64 kimliklerini JavaScript Number'a zorlamayın; modelin sunduğu hassas gösterimi koruyun. Decimal tutarları parseFloat ile muhasebe hesaplamasına sokmayın. Para birimleri farklı satırları toplamayın. Tarihler Edm.Date için YYYY-MM-DD, zaman Uzeit için Edm.TimeOfDay; UTC timestamp ile iş tarihi aynı şey değildir.

Salt okunur örnekler (base URI sonrasında):

```text
Form?$top=20&$filter=SirketKodu eq '1100' and SurecTipi eq 'A'
Form(900000000004)/_Item?$orderby=OrderId
Kalem?$filter=Zcheck eq 'X'&$expand=_Header
IslemGecmisi?$filter=AkisNumarasi eq 900000000004&$orderby=Sira desc
Form?$filter=SurecTipi eq 'M' and _Item/any(i:i/Zcheck eq '')
```

Son any filtresinin canlı serviste çalışmasını ilk entegrasyonda doğrulayın. Boş CHAR değerinin wire karşılığını canlı yanıttan kontrol edin; frontend'e boşluk ve boş string varsayımlarını gelişigüzel yaymayın. URL/query üretimini UI5 Filter/Sorter ve OData modeline bırakın. Örnekler yalnız sözleşmeyi anlatır; seçili şirket filtresini bütün listelere uygulayın.

## 6 Form alanları

- Kimlik: AkisNumarasi, FormNumarasi (Int64).
- Tür: AvansTuru, SeyahatTuru (Byte), SurecTipi (String 1).
- Tarih/dönem: BelgeTarihi, KayitTarihi (Date), MaliDonem (String 2).
- Şirket/personel: SirketKodu (4), Tckn (11), SicilNo (20).
- Avans bağlantısı: YurticiYurtdisi (String 1), AvansFormNumarasi (Int64).
- Durum: Durum, OncekiDurum (String 1), DurumCriticality (Byte), HataMesaji (220).
- Belgeler: TalepBelge/TalepYil, MuhasebeBelge/MuhasebeYil, TersBelge/TersYil; belge no 10, yıl String 4. OdemeBelge 10; ayrı ödeme yılı yok.
- Yönetim: CreatedBy/LastChangedBy (12); CreatedAt/LastChangedAt/LocalLastChangedAt DateTimeOffset precision 7.
- Teknik: __OperationControl, SAP__Messages.

ÖNEMLİ AD AYRIMI: Inbound alan adı MasrafTuru olarak değiştirildi. Fiziksel alan avans_turu kaldı. Kokpit aktif sözleşmesi hâlâ AvansTuru sunuyor. UI şimdilik AvansTuru'na bağlanıp Masraf Türü etiketi ve yeni açıklamaları gösterebilir; metadata'da olmayan MasrafTuru'na bağlanmayın. Backend adı değişirse metadata ve tüm binding'leri birlikte güncelleyin.

Masraf türleri: 1 İş avansı, 2 Seyahat avansı, 3 Seyahat masrafı, 4 Araç masrafı, 5 Diğer masraf. 1/2 SurecTipi A; 3/4/5/0/diğer kabul edilen sayısal değerler M. Diğer değerleri UI'de boşaltmayın veya hata gibi göstermeyin; örneğin Diğer (8) gösterimi kullanın. Süreç için backend SurecTipi'ni esas alın.
YurticiYurtdisi: '0' Yurtiçi, '1' Yurtdışı, '2' Seyahat dışı.

## 7 Kalem ve geçmiş alanları

Kalem: AkisNumarasi, OrderId; Tutar Decimal(23,variable), ParaBirimi String(5), Aciklama(255), PYPKodu(24), MasrafTipi(10), MasrafTipiTanim(60), MasrafYeri(10), KdvOrani Decimal(5,2), EfaturaCari(20), FaturaId(40), Zcheck(1), AracGiderTuru(10).
İşlem: KalemDurum, OncekiDurum, VirmanBelge/VirmanYil, GiderBelge/GiderYil, TersBelge/TersYil, HataMesaji, KalemDurumCriticality; ayrıca başlıktaki yönetim ve teknik alanlar.

Zcheck='X': personelin ödediği e-fatura. Normal masraf kaleminde KalemDurum boş olabilir; işlem durumu başlıktaki Durum'dur. Bu boşluk hata değildir. E-fatura durumu fatura bazında tüm kalemlerde aynı olmalıdır.

IslemGecmisi: AkisNumarasi, Sira(4), FaturaId(40), Islem(10), Sonuc(1), Belnr(10), Gjahr(4), Mesaj(220), Usnam(12), Datum(Date), Uzeit(TimeOfDay).
İşlem kodları: AVANS, MASRAF, VIRMAN, GIDER, TERS, SIL, SILKALDIR. Sonuc: S başarılı, E hatalı.

## 8 Durumlar ve ekran tasarımı

| Kod | Anlam | Renk |
|---|---|---|
| B | Bekliyor | Nötr |
| H | Hatalı | Kırmızı |
| M | Muhasebeleşti | Yeşil |
| O | Ödendi | Yeşil |
| V | Virman yapıldı | Sarı |
| G | Giderleştirildi | Yeşil |
| T | Ters kaydedildi | Nötr |
| S | Silme işaretli | Nötr |

Criticality 0 -> None, 1 -> Error, 2 -> Warning, 3 -> Success. Durum metinlerini i18n/formatter ile çevirin. O durumu yalnız avans talebi denkleşmişse CDS'de hesaplanır; fiziksel başlık M kalır.

Dört sekme:
1. Avans: Form, SurecTipi='A', form başına bir satır. Tutar/para birimi başlıkta yoktur; gerekli kalem okumasıyla veya backend genişletmesiyle sağlanmalıdır.
2. Masraf: Form, SurecTipi='M', en az bir normal kalem. Sadece bu sekmeye ait normal kalemlerin toplamı dikkate alınmalı. Karışık formlar e-fatura sekmesinde de bulunabilir.
3. E-Fatura Masrafları: Kalem, Zcheck='X', başlık SurecTipi='M'; fatura anahtarı AkisNumarasi + FaturaId. SirketKodu ve başlık filtreleri _Header üzerinden uygulanır.
4. Raporlama: Tüm Kalem kayıtları ve gerekli _Header alanları; aksiyon yok. Normal kalemlerde durum başlıktan, e-faturada kalemden alınır.

Ortak filtreler: zorunlu tek şirket, akış/form aralığı, belge tarihi aralığı, TCKN, yurtiçi/yurtdışı, çoklu durum, silme işaretlileri getir. İşlem sekmelerinde başlangıç durumları B/H, raporlamada tüm durumlar. Durum ve silme filtrelerini sekmenin doğru alanına uygulayın. Varsayılan B/H, V durumundaki giderleştirilecek faturaları gizleyebilir; kullanıcı durum seçimini değiştirebilmelidir.

Form detayında başlık, kalemler ve filtrelenmiş işlem geçmişi gösterin. Fatura detayında aynı akış+faturanın kalemlerini gösterin. Belge numaraları için Manage Journal Entries intent'ini sistemde doğrulamadan hardcode etmeyin; şirket+yıl+belge kimliğini kullanın.

Başlıkta personel adı/numarası, net/KDV/KKEG, ana hesap ve toplam alanları metadata'da yoktur. Frontend'de helper'ın sonuçlarını çağıracak bir API de görülmedi. Bu alanları hazır saymayın, sahte değerle doldurmayın. Bilgi amaçlı UI toplamı ile resmi backend grup hesaplamasını ayırın; sayfalı kalem verisinin kısmi toplamını form toplamı gibi göstermeyin.

## 9 Aksiyon çağrı sözleşmesi

Namespace N = com.sap.gateway.srvd.zui_fi_csp_kokpit_o4.v0001.
Hepsi instance-bound; koleksiyona değil seçilen entity context'ine çağrılır.

| Entity | Aksiyon | Beklenen uygunluk kuralı |
|---|---|---|
| Form | AvansTalebiOlustur | A süreci, B/H; UYGULAMA BOŞ |
| Form | Muhasebelestir | M süreci, B/H |
| Form | SilmeKoy | B/H |
| Form | SilmeKaldir | S |
| Form | TersKayit | M; avansın ödeme/bağımlılık kontrolleri ayrıca |
| Kalem | Virman | E-fatura B/H |
| Kalem | Giderlestir | E-fatura V |
| Kalem | KalemSilmeKoy | E-fatura B/H |
| Kalem | KalemSilmeKaldir | E-fatura S |
| Kalem | KalemTersKayit | E-fatura V/G |

Uygunluk tablosu istenen kuraldır, eksiksiz mevcut backend uygulaması değildir. Metadata __OperationControl booleans ve OperationAvailable path'leri sunar; UI bunlarla birlikte sekme/seçim durumunu değerlendirmeli. Frontend kontrolü backend yetki/durum denetiminin yerine geçmez.

```text
POST .../Form(900000000009)/com.sap.gateway.srvd.zui_fi_csp_kokpit_o4.v0001.Muhasebelestir
Body: {}

POST .../Kalem(AkisNumarasi=900000000009,OrderId=1)/com.sap.gateway.srvd.zui_fi_csp_kokpit_o4.v0001.KalemTersKayit
Body: {"KayitTarihi":"2026-10-22"}
```

Diğer aksiyonlar aynı entity + namespace + aksiyon biçimindedir. Parametresizlerde boş nesne; TersKayit ve KalemTersKayit için KayitTarihi Edm.Date nullable=true. UI tarihini bugün varsayılanıyla zorunlu isteyin, ileri tarihi engelleyin; backend'in de doğrulaması gerekir. Kalem handler'ı şu an bu parametreyi yok sayıyor.

UI5 OData V4 operation binding kullanın: seçilen context'e göre N.Aksiyon(...) deferred operation binding'i oluşturun; parametreleri setParameter ile atayın; uygulamanın UI5 sürümünde desteklenen invoke/execute API'sini resmi dokümandan doğrulayın. V2 modelindeki callFunction/read/create API'lerini V4 modele taşımayın. UI5 modelinin batch, CSRF ve ETag yönetimini kullanın; ayrıca elle token sistemi kurmayın.

Form/Kalem standart POST-create, PATCH-update ve DELETE metadata'da kapalıdır. Kokpitte doğrudan CRUD yapmayın; yalnız tanımlı aksiyonlar.

Çoklu seçimde formları AkisNumarasi, faturaları AkisNumarasi+FaturaId ile tekilleştirin. Aynı faturadan birden fazla seçili kalem için UI'nin ayrı ayrı Virman çağırması mükerrer risk yaratır: backend sadece tek çağrı içindeki keys listesini tekilleştiriyor. Her fatura için tek temsilci context seçin, fatura bütünlüğünü backend de sağlamalıdır. İşlem bazında sonuçları gösterin; tümüne tek başarı mesajı basmayın. Yenilemede liste, detay, geçmiş, durum ve operation control verilerini güncelleyin. Aynı işlemi çift tıklamayla tekrar başlatmayı engelleyin.

SAP__Messages collection alanları: code, message, target, additionalTargets, transition, numericSeverity, longtextUrl. HTTP 200 veya operation promise resolve tek başına muhasebe başarısı değildir: reported error/state mesajlarını da kullanıcıya gösterin. Kullanıcı mesajlarını HTML olarak yorumlamayın.

## 10 Backend inceleme bulguları ve geliştirme engelleri

### Kritik işlem yönetimi

ZCL_FI_CSP_HELPER post_masraf_form, post_efatura_virman, post_efatura_gider, reverse_document metotlarında COMMIT ENTITIES var. Bu metotlar RAP action handler içinden çağrılıyor. RAP BO implementation içinde commit ve modify aşamasındaki doğrudan DB yazımı sözleşmesi gözden geçirilip düzeltilmeli. Çağrıyı yardımcı sınıfa taşımak bu kısıtları ortadan kaldırmaz. Mevcut kodda ayrıca mhead/mitem UPDATE ve add_history_log içinde INSERT var.

Spec tasarımı: post %pid ile ilişkilendirilir; belge anahtarları kaydetme aşamasında CONVERT KEY ile alınır; framework transaction'ı yönetir. Ek save/late numbering mimarisini desteklenen I_JournalEntryTP senaryosuyla doğrulayın. Yalnız COMMIT satırlarını yorumlamak tam bir düzeltme değildir: belge anahtarlarının alınması, BO güncellemeleri ve geçmişin aynı işlemde saklanması birlikte tasarlanmalıdır.

Mevcut kod commit failure sonuçlarını okuyup kontrol etmiyor; sonrasında success=true yapıyor. Belge no referans+şirket+belge türüyle SELECT SINGLE üzerinden aranıyor. Yıl ve benzersiz işlem anahtarı eksik; e-fatura referansı ilk 16 karaktere kesiliyor. Yanlış/eski veya boş belge numarası ilişkilendirme riski vardır. İşlem kimliğiyle güvenilir anahtar çözümü gerekir.

### Eksik işlev ve kurallar

- AvansTalebiOlustur handler boş; SOAP Journal Entry Post implementasyonu yok. Bu buton üretimde çalışır diye sunulamaz.
- Post öncesi I_JournalEntryTP validate çağrısı yok.
- Normal ve e-fatura gider payload'ında gider/KKEG/vergiler spec'teki gruplarla birleştirilmiyor; her kalem ayrı hesaplanıp satır üretiliyor. Grup bazlı net/KDV yuvarlama ile farklılaşabilir.
- get_global_authorizations bütün aksiyonları allowed döndürüyor; incelenen helper ve CDS'lerde spec'teki şirket bazlı F_BKPF_BUK kontrolü yok. Liste için ACTVT 03, işlem için 01 kontrolü sağlanmalıdır; UI filtresi yetki değildir.
- Form get_instance_features yalnız TersKayit, SilmeKoy/Kaldir dolduruyor; AvansTalebiOlustur ve Muhasebelestir sonuçları eksik, SurecTipi ayrımı yok.
- Kalem feature metodu Zcheck kontrol etmiyor. Virman ve gider helper'larında mevcut durumun yeniden denetlenmesi yok; kontrol ve kilitleme işlem anında yapılmalı.
- Kalem silme/kaldırma yalnız seçilen kalemleri değiştiriyor; bütün faturaya uygulanmıyor.
- KalemTersKayit kullanıcı KayitTarihi parametresini yok sayıp bugünü kullanıyor. V/G dışı durumda devam etmeme ve döngü hedef değişkenlerinin temizlenmesi de kontrol edilmeli.
- Başlık avans ters kayıt bağımlılık kontrolü sadece M durumundaki masraf başlıklarını arıyor; bağlı V/G e-fatura kalemleri eksik.
- Ters kayıtta avans ödeme hata kodu 018 yerine genel 019 dönüyor.
- Bazı hata yollarında HataMesaji kalıcı güncellenmiyor; güncellemeler/log sonuçları denetlenmiyor.
- Virman helper'ında bağlı avansın varlık/personel/durum kontrolü yok. Masraf helper'ında bu kontrol var ama ödenmemiş avans için 014 uyarısı yok.
- Mükerrer virman sorgusunda şirket koşulu yok; ham EfaturaCari ile kontrol ediliyor. Aynı satıcının vergi no/satıcı kodu biçimleri ayrıca ele alınmalı.
- Fatura cari bilgisi ilk kalemden okunuyor; tüm kalemlerde doluluk ve aynı satıcı kontrolü eksik.
- determine_gider_hesabi joker tespiti CP '*\*' ve prefix substring sınırları incelenmeli. ABAP CP kaçış kurallarıyla test edilmeden doğru sayılmamalı. Döngü içi DATA ... VALUE başlangıçlarına güvenilmemeli; eşleşme değişkenleri her adayda açıkça temizlenmeli.
- KKEG döngü değişkenleri lv_has_kkeg/lv_kkeg_h/lv_kkeg_v_h her kalemde temizlenmiyor; önceki kalemin bilgisi taşınabilir.
- KKEG tarih çakışması ve bakım alan doğrulamaları için servis davranışları henüz görülmedi.
- add_history_log MAX(sira)+1 kullanıyor; eşzamanlılık ve INSERT sonucu kontrolü eksik.
- _TalepClearing [0..1] kardinalitesini belge satırlarının gerçekten tekil olduğunu varsayarak kullanıyor; eşleşme çokluğu doğrulanmalı.
- Başlık criticality bazı silme/ters kayıt durumlarında clearing üzerinden yeşil dönebilir; gösterilen Durum ile aynı kurala bağlanmalı.
- Liste için personel, gider hesabı, vergi ve KKEG hesaplanan alanlarını sağlayan servis alanları eksik.

Bu başlıklar statik kaynak incelemesi bulgularıdır; her birinin canlı hata ürettiği iddia edilmez. Muhasebe aksiyonlarının hazır kabul edilmesini engellerler. İlk UI tesliminde veri okuma, filtreleme, detay/geçmiş ve export geliştirilebilir; boş veya kritik hatalı işlemler açıkça devre dışı bırakılmalı ve nedenleri geliştirme iş listesinde belirtilmelidir.

## 11 Bakım tabloları ve Excel

MTYP: anahtar client + masraf_tipi CHAR10; tanim CHAR60; beş yönetim alanı eklendi. Diğer tablo sözleşmeleri aşağıdaki iş gereksinimini karşılamalı; aktif metadata ile doğrulayın:
- MHESAP: BUKRS, MASRAF_TIPI, ARAC_GIDER_TURU, YURTICI_YURTDISI, MASRAF_YERI anahtar; HKONT sonuç. Birebir > uzun prefix kalıbı > boş, ardından yurtiçi ve araç doluluğu önceliği.
- MKDV: KDV_ORANI anahtar; MWSKZ, KKEG_MWSKZ.
- MKKEG: BUKRS, HKONT, GECERLILIK_BAS anahtar; GECERLILIK_BIT, KKEG_HESAP, KKEG_VERGI_HESAP, KISIT_TURU, YUZDE, LIMIT, WAERS. Aynı şirket/hesap tarihleri çakışmamalı.
- MBELGE: BUKRS+YURTICI_YURTDISI anahtar; BLART_AVANS, BLART_MASRAF, BLART_VIRMAN, BLART_GIDER, PERSONEL_HESAP. Boş yurtiçi alanı şirket varsayılanı.

Excel export masraf tipi Fiori Elements preview'de gözlendi. Freestyle uygulamada sap.ui.export kütüphanesi manifestte var; export davranışını uygulayın ve sayfalı veri sınırını belirtin. Export butonunu import gibi kullanmayın.

Kullanıcı Excel import da istiyor. Henüz implementasyonu yok. Yalnız metadata annotation eklemek XLSX okuma/kayıt akışını sağlamaz. Bakım servisi sözleşmesini ve uygulama UI5 özelliklerini doğrulayıp dosya seçimi, XLSX okuma, kolon eşleme, satır doğrulama, önizleme, onay ve RAP kaydı tasarlayın. İlk MTYP şablonu MasrafTipi/Tanim; yönetim alanları sisteme ait. Yeni/mükerrer kayıt politikasını netleştirin; başlangıç önerisi mükerrer kodu reddetmek, sessiz üzerine yazmamak. Draft varsa aktivasyon/save akışını da yönetin; entity metadata'sını görmeden CRUD yazmayın.

## 12 Bağlantı ve test bilgileri

Daha önce kullanılan test hostu: https://my440393.s4hana.cloud.sap
UI'de same-origin göreli URI/proxy/destination kullanın; hostu controller'a hardcode etmeyin. Parola ve iletişim kullanıcısını kaynak koda veya manifest'e koymayın. Yerel proxy için ui5.yaml/ui5-local.yaml ve destination erişimini kontrol edin. Bu dosyalar henüz paylaşılmadı.

Postman metadata GET'te Accept application/xml kullanılmalı. Yanlış application/json Accept ile metadata isteğinde 406 alındı. CSRF fetch GET header X-CSRF-Token: Fetch, response token ve aynı cookie oturumu ile POST; süresi geçerse yenilenir. UI5 modeli bu yönetimi üstlenmelidir.

Inbound testleri: yeni avans S000, tekrar S001; normal+e-fatura karışık form B başlık, X kalemde B, normal kalemde boş durum; sıfır tutar E012 ve eski tutarların korunması. MasrafTuru 1 -> A; 3,8,0 -> M; alan gönderilmeden de son abstract behavior değişikliğinden sonra M başarılı test edildi. Bu testler kokpit muhasebe işlemlerinin testi değildir.

Inbound abstract BDEF başlığı with control ve MasrafTuru dışındaki alanlarda mandatory:execute kullanıyor. Inbound son teknik hata düzenlemesi EML hatasını failed/reported ile iletiyor; gerçek kalem oluşturma hatası sonrası rollback testi debug değişken değiştirme yetkisi olmadığı için tamamlanamadı.

Harici debug 100 projesinde iletişim kullanıcısının teknik CC... kimliği seçilince yakalandı. Debug değişken değiştirme yetkisi yoktu. Uzun beklemede HTTP 500 / 610 saniye timeout görüldü; bu muhasebe veya rollback sonucu değildir. Test sonrası breakpoint'ler kapatılmalı.

## 13 Codex için önerilen uygulama sırası

1. Gerçek repository kökünü ve proje talimatlarını okuyun; manifest/controller/view/Component.js, i18n, CSS, package ve proxy ayarlarını inceleyin. Boş iskelet varsaymayın.
2. Salt okunur canlı Form/Kalem/IslemGecmisi sorgularıyla model erişimini doğrulayın; Int64, decimal, ETag ve operation control örneklerini görün.
3. Dört sekme, zorunlu şirket filtresi, durum metin/renkleri, silme filtresi, sunucu sayfalama ve hata/boş sonuç durumlarını geliştirin.
4. Form/kalem detayı, fatura kalemleri ve işlem geçmişini bağlayın. Teklif edilen ama serviste olmayan mali alanları hazırmış gibi göstermeyin.
5. Backend iş listesi tamamlandıkça aksiyonları tek tek açın; fatura tekilleştirme, tarih dialogu, kullanıcı mesajları ve yenilemeyi uygulayın. Boş avans aksiyonunu çalışır gibi sunmayın.
6. Bakım servis metadata'larını alın; modellerini ve bakım sayfalarını kurun. Export ve import'u ayrı uygulayın.
7. Hedefli testler: sekmelerin doğru filtreleri, karışık form, silme geri alma, çoklu seçimde aynı fatura, mesaj hata/başarı ayrımı, tarih parametresi, büyük kimlikler, karma para birimi ve sayfalı export. Muhasebe doğruluğunu backend uçtan uca testleriyle onaylayın.

## 14 İlk Codex talimatı

Bu belgeyi proje klasörüne koyup Codex'e şu isteği verin:

> CSP_Kokpit_Codex_Gelistirme_Rehberi.md dosyasını ve mevcut uygulama kaynaklarını oku. Önce mainService ile salt okunur bağlantıyı doğrula, mevcut kodun ilk halini koru ve dört sekmeli kokpitin filtre, liste, detay ve işlem geçmişi ekranlarını geliştir. Değişen eski kodu geçerli yorum biçimiyle bulunduğu yerde koru; JSON dosyalarını ayrı yedekle. Serviste olmayan alan veya endpoint uydurma. Backend eksikleri listesini dikkate al; boş/uygunsuz muhasebe işlemlerini çalışır gibi gösterme. Bakım servislerini metadata'larını görmeden bağlama. Yapılan değişiklikleri ve testleri raporla.

## 15 Teknik referanslar

- SAP RAP işlem aşamaları: https://help.sap.com/docs/abap-cloud/abap-concepts/luws-in-abap
- RAP aksiyon parametreleri: https://help.sap.com/docs/abap-cloud/abap-rap/modeling-parameters-for-non-standard-operations
- Fiori Elements export: https://help.sap.com/docs/SAPUI5/3f47ec0c79a547aeaa23090b74c9520c/4bab6f2043814257974b52d4dafe1dcd.html?version=1.120
- Fiori Elements uygulama uzantıları: https://help.sap.com/docs/SAPUI5/fbdf2b2c05364a829185721c6ce5daa0/7619517a92414e27b71f02094bd08d06.html

Referanslar ürün davranışını açıklamak içindir. Yerel UI5/sistem sürümüne uygun API ve özellikler uygulama geliştirilirken kontrol edilmelidir.
