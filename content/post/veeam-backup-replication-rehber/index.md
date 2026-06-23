---
title: "Veeam Backup & Replication — Teknik Rehber ve Yapılandırma Kılavuzu"
description: "VMware vSphere ortamı için Veeam Backup & Replication 12.x kapsamlı teknik rehberi: Proxy mimarisi, kapasite hesaplama, replikasyon, failover/failback ve AD kurtarma."
date: 2024-12-15
draft: false
categories:
    - Projects
tags:
    - Veeam
    - VMware
    - vSphere
    - Backup
    - Replication
    - DR
---

Veeam Backup & Replication 12.x baz alınarak hazırlanmış bu rehber; VMware vSphere ortamında yedekleme altyapısının tasarımından işletimine kadar tüm adımları kapsamaktadır.

---

## Veeam Backup Proxy

### Proxy Nedir ve Neden Kullanılır?

Veeam Backup Proxy, yedekleme iş yükünü Veeam Backup Server'dan alarak dağıtık bir mimari oluşturan bileşendir. Küçük ortamlarda Veeam Server'ın kendisi proxy görevini üstlenebilir; ancak VM sayısı arttıkça ve yedekleme pencereleri daraldıkça ayrı proxy sunucuları zorunlu hale gelir.

**Temel işlevi:**

- Hedef VM'lerin disklerini hot-add veya doğrudan erişim yöntemiyle kendisine bağlar
- Değişen blokları (incremental) veya tam yedekleri (full backup) okuyarak depoya aktarır
- Yedekleme sunucusunu kaynak okuma yükünden kurtarır, ölçeklenebilirlik sağlar

### Yedekleme İş Akışı

1. Veeam Server, ilgili VM'i bulmak için ESXi ana bilgisayarına sorgu gönderir
2. Veeam Backup & Replication, VM snapshot'ı oluşturmak için VMware vSphere API'sini tetikler
3. VM'in sanal diskleri, VMware yedekleme proxy'sine hot-add olarak bağlanır (VM çalışmaya devam eder)
4. Proxy, verileri doğrudan bağlı disklerden okuyarak yedekleme deposuna yazar
5. İşlem tamamlandığında VM diskleri proxy'den ayrılır, snapshot silinir

### Proxy Taşıma Yöntemleri

**Fiber Kanal (FC) SAN — Doğrudan Depolama Erişimi**

En yüksek performanslı yöntemdir. LAN trafiğini tamamen atlar. Storage'e doğrudan FC bağlantısı olan fiziksel sunucularda kullanılır.

- **Direct SAN:** SAN'a FC bağlantısıyla doğrudan erişim — en verimli yöntem
- **Virtual Appliance (HotAdd):** Depolama ağındaki ESXi host üzerinde çalışan VM — ikinci en iyi yöntem
- **Ağ modu (NBD):** LAN üzerinden erişim — en az verimli, minimum 10 Gbps önerilir (1 Gbps yetmez)

**iSCSI / NFS Ortamları**

iSCSI veya NFS tabanlı depolama sistemlerinde hem fiziksel hem de sanal makine proxy olarak kullanılabilir. Yöntem seçimi depolama bant genişliği ve gecikme sürelerine bağlıdır.

---

## Proxy Sayısı Hesaplama

### Kapasite Formülleri

| Değişken | Formül | Açıklama |
|---|---|---|
| **D** | Kaynak veri (MB) | Backup alınacak toplam veri boyutu |
| **W** | Yedekleme penceresi (sn) | Backup'ın tamamlanması gereken süre |
| **T** | D / W (MB/s) | Saniyede işlenmesi gereken veri miktarı |
| **CR** | Değişim oranı (%) | Günlük ortalama veri değişim yüzdesi |
| **CF** | T / 100 | Full backup için gereken toplam CPU çekirdeği |
| **CI** | (T × CR) / 25 | Incremental backup için gereken CPU çekirdeği |

### Örnek Hesaplama

> **Senaryo:** 1.000 VM | 100 TB Depolama | 8 Saatlik Backup Penceresi | %10 Günlük Değişim Oranı

```
D  = 100 TB × 1.024 × 1.024 = 104.857.600 MB
W  = 8 saat × 3.600 sn      = 28.800 saniye
T  = 104.857.600 / 28.800   = 3.641 MB/sn

CF = 3.641 / 100            = 36 çekirdek  → Full backup
CI = (3.641 × 0,10) / 25   = 14 çekirdek  → Incremental backup
```

**Sonuç:** Bu ortam için 36 çekirdek / 72 GB RAM kapasitesinde proxy altyapısı gerekmektedir. Tek bir proxy'nin sınırı 18 CPU / 36 GB RAM olduğundan, her biri 8 CPU + 16 GB RAM olan **en az 5 proxy sunucusu** konuşlandırılmalıdır.

### Proxy Tasarım Gereksinimleri

- Her bir CPU, 2 eş zamanlı sanal disk (vDisk) işlemini destekler (2 task = 1 CPU + 2 GB RAM)
- Proxy, yedeklenecek VM'lerin bulunduğu depolamaya doğrudan erişebilmelidir (LAN-free tercih edilir)
- Veeam önerisi: HotAdd modunda datacenter altına özel bir proxy VM oluşturulması — diğer VM'lere doğrudan erişim sağlar
- Maksimum kapasite: Proxy başına **18 CPU ve 36 GB RAM** (Veeam sınırı)

---

## Veeam Proxy Kurulumu

### Ön Gereksinimler

- Windows Server 2016 veya üzeri (2022 önerilir)
- Firewall kuralı: Veeam sunucusundan proxy'ye tüm portlarda erişim izni (Allow ALL)
- Proxy VM'in ilgili ESXi host'a ve storage'e ağ erişimi

### Kurulum Adımları

1. Windows Server kurulumu tamamlanır ve Veeam Agent gereksinimlerine göre yapılandırılır
2. Veeam Backup & Replication konsolundan **Backup Infrastructure → Backup Proxies** bölümüne gidin
3. **"Add VMware Backup Proxy"** seçeneği seçilir (VMware vSphere mimarisi için)
4. Server sekmesinde **"Add New"** ile Windows makinesi eklenir; kimlik bilgileri girilir
5. **"Max Concurrent Tasks"** değeri belirlenir (1 CPU = 2 task kuralına göre)

### Transport Modu Seçimi

> **"Automatic selection"** bırakmak genellikle en güvenli seçimdir; Veeam ortama göre en uygun modu otomatik seçer.

- **Virtual Appliance (HotAdd):** Proxy ve hedef VM aynı ESXi host üzerindeyse — en hızlı seçenek
- **Direct Storage Access:** Proxy'nin SAN/NFS'e doğrudan erişimi varsa — ikinci en hızlı
- **Network (NBD):** Diğer modlar mümkün değilse — yavaş, yalnızca 10 Gbps+ ağlarda kullanılmalı

---

## Veeam Restore Seçenekleri

### Instant Recovery (Anlık Kurtarma)

VM, doğrudan backup deposundan çalıştırılır. Hızlı erişim sağlar ancak performansı sınırlıdır; üretim ortamına geçiş için **"Migrate to Production"** kullanılmalıdır.

> **Önemli:** Instant Recovery sırasında vCenter üzerinden poweroff/on veya network adapter değişikliği yapmayın. VM Veeam üzerinden çalıştığından veri kaybı yaşanabilir.

**Redirect Write Cache seçeneği:**
- SSD datastore mevcutsa: Write cache için SSD datastore seçilmesi performansı artırır
- SSD yoksa bu seçeneği aktif etmeyin — HDD üzerinde ciddi yavaşlamaya neden olur

### Restore Entire VM

Backup dosyasından VM'i kalıcı olarak geri yükler. Üç mod mevcuttur:

- **Original location:** VM doğrudan mevcut konumunun üzerine yazılır
- **New location / different settings:** Host, disk, network gibi ayarlar özelleştirilerek geri yüklenir — **önerilen yöntem**
- **Staged restore:** Test ortamında doğrulamak için kullanılır (nadiren tercih edilir)

> **İpucu:** "Quick Rollback" seçeneği; yazılım hatası veya yanlışlıkla silme durumlarında yalnızca değişen bloklarını yazar — tam restore'dan çok daha hızlıdır.

### Diğer Restore Seçenekleri

| Seçenek | Açıklama |
|---|---|
| Instant Disk Recovery | Sanal disk düzeyinde kurtarma — disk farklı bir VM'e bağlanabilir |
| Restore Virtual Disk | Kalıcı disk kurtarma (Instant Disk'in kalıcı versiyonu) |
| Restore VM Files | VMDK, VMX gibi VM dosyalarını kurtarır |
| Restore Guest Files | Uygulama seviyesinde dosya kurtarma (VSS desteği gerektirir) |
| Export as Virtual Disk | Backup içeriğini sanal disk olarak dışa aktarır |
| Export Backup | VM'i doğrudan başka ortama aktarır |

---

## Veeam Replication (Replikasyon)

### Replikasyon Mimarisi

**On-site (Tek vCenter):** Kaynak ve hedef sunucular aynı vCenter altında bulunur. Backup proxy kaynak host ile hedef host arasındaki veri aktarımını üstlenir. Prod tarafta en az bir yedek proxy zorunludur.

**Off-site (İki vCenter):** Kaynak ve hedef ortamlar farklı vCenter'lar yönetimindedir. WAN üzerinden replikasyon için her iki tarafta da proxy ve isteğe bağlı WAN Accelerator konuşlandırılır.

### Erişim Gereksinimleri

**Production (Kaynak) Taraf Proxy'si:**
- Veeam Backup Server'a erişim
- Kaynak ESXi ana bilgisayarına erişim
- DR tarafındaki hedef proxy'ye erişim
- Replika meta verilerinin bulunduğu backup deposuna erişim

**DR (Hedef) Taraf Proxy'si:**
- Prod taraftaki Veeam Backup Server'a erişim
- Hedef ESXi ana bilgisayarına erişim
- Kaynak proxy'ye erişim

Site dışı replikasyon senaryosunda Veeam veri sıkıştırma uygular; kaynak proxy veri bloklarını sıkıştırarak WAN üzerinden iletir, hedef proxy bu verileri açarak VMware vSphere biçiminde depolar.

### Replikasyon Çalışma Prensibi

1. Backup Server, kaynak VM'in snapshot'ını alır
2. Snapshot, VM'in çalışmasını sürdürürken ana diski salt okunur (read-only) hale getirir
3. Kaynak proxy, disk verilerini işleyerek hedef proxy'ye aktarır
4. Hedef proxy, DR ortamında sanal makineyi oluşturur veya günceller

---

## Replication Job Yapılandırması

### Name Sekmesi

- **Replica seeding:** DR tarafında mevcut backup varsa ve WAN bant genişliği düşükse bu seçenek backup'tan ilk replikayı oluşturur
- **Network remapping:** Kaynak ve hedef sitedeki sanal ağlar (vSwitch/portgroup) farklıysa — ağ eşleme tablosu tanımlanır
- **Replica re-IP:** DR sitesinde farklı IP adresi planı varsa — makineye otomatik yeni IP atanır
- **High priority:** Bu job kaynak planlamasında önceliklendirilir

### Virtual Machines Sekmesi

Replike edilecek VM'ler seçilir. Kaynak veri modu belirlenir:

- **From production storage:** VM'den anlık kopyalama — kritik VM'lerde snapshot performans etkisi yaratabilir
- **From backup files:** Var olan backup dosyasından replikasyon — **kritik VM'ler için önerilir**, üretim etkisi minimumdur

### Destination Sekmesi

DR tarafındaki hedef vCenter, host, datastore ve klasör seçilir.

### Network Sekmesi

Kaynak ve hedef VM'lerin bağlanacağı sanal ağlar eşleştirilir.

> **İpucu:** DR tarafında ayrı bir vSwitch/portgroup oluşturup replikayı bu ağa bağlamak, production ağıyla istenmeyen iletişimi engeller.

### Job Settings Sekmesi

- Replikasyon meta verilerini depolayacak backup deposu seçilir
- Replica name suffix (örn. `_replica`) ve kaç geri yükleme noktası tutulacağı belirlenir
- İlk çalıştırmada full backup alınır; sonraki çalıştırmalarda yalnızca incremental değişiklikler aktarılır

### Data Transfer Sekmesi

- **Direct:** Hızlı WAN veya LAN bağlantıları için — standart seçim
- **Through built-in WAN accelerators:** Düşük bant genişlikli uzak siteler için — her iki tarafa da WAN Accelerator kurulumu gerektirir

---

## Failover ve Failback Yönetimi

### Failover Seçenekleri

**Failover Now:** Replika anında ayağa kaldırılır. Planlanmamış kesintilerde veya anlık test amacıyla kullanılır.

**Planned Failover:** Bakım pencereleri veya kontrollü geçişler için tercih edilen yöntemdir. İlgili replica job eklenerek gecikme süresi (delay) tanımlanır — bu değer, production VM'in düşmesinden kaç saniye sonra DR VM'in devreye alınacağını belirler.

**Add to Failover Plan:** Birden fazla VM'i sıralı şekilde failover planına ekler. Uygulama bağımlılıklarına göre sıra belirlenir (önce SQL Server, ardından uygulama sunucusu gibi).

### Failover Restore Noktası Seçimi

1. "Failover to replica" seçeneğiyle ilerlenir
2. Virtual machines bölümünde ilgili replica VM seçilir
3. "Point" menüsünden geri dönülecek snapshot noktası seçilir — bu noktalar vCenter'da saatlik snapshot olarak görünür

### Failback Seçenekleri

**Fail Back to Production:** DR'da çalışan replica'daki değişiklikler, production VM'e aktarılarak üretim ortamına geri dönülür.

> **Önemli:** Failover tamamlandıktan sonra MUTLAKA "Fail Back to Production" kullanılmalıdır. İşlem sonunda **"Commit Failback"** tıklanarak değişiklikler kalıcı hale getirilir.

**Permanent Failover:** Replica, production VM'in kalıcı olarak yerine geçer — artık replica job kaldırılır ve DR'daki makine yeni production olur. Kullanılmadan önce eski production VM'in kapatıldığından emin olun.

**Undo Failover:** Failover işlemi geri alınır — replica kapatılır, üzerindeki tüm değişiklikler atılır. Test amaçlı failover'lardan çıkmak için kullanılır.

### Fail Back to Production — Çalışma Prensibi

1. DR tarafındaki aktif replica üzerinde sağ tıklanır → "Failback to Production" seçilir
2. Failback modu seçilir:
   - **Failback to original VM:** Production altyapısı bozulmadıysa ve orijinal VM hâlâ mevcutsa — yalnızca delta farklar aktarılır
   - **Failback to original VM restored in a different location:** Orijinal VM farklı konuma restore edildiyse
   - **Failback to specified location (advanced):** Orijinal VM yoksa — tüm disk verileri ağ üzerinden taşınır, önemli bant genişliği tüketir
3. Failback Mode belirlenir: Auto (VM hazır olduğunda), Scheduled (belirlenen bakım saatinde), Manual
4. İşlem tamamlandıktan sonra replica'ya sağ tıklanır → **"Commit Failback"** seçilir

---

## Replica Seeding (Replikasyon Tohumlaması)

### Seeding Nedir?

Replica seeding, düşük bant genişlikli WAN bağlantıları üzerinden ilk replikasyon yükünü azaltmak için kullanılır. Production'daki mevcut backup, DR sitesindeki backup deposuna taşınır; Veeam bu backup'ı "tohum" olarak kullanarak yalnızca sonraki değişiklikleri WAN üzerinden aktarır.

### Seeding Adımları

1. Replike edilecek VM'lerin backup'ı production sitedeki backup deposuna alınır
2. Bu backup dosyaları (VBK + VBM, varsa VIB) DR sitesindeki backup deposuna kopyalanır (taşınabilir disk, SCP, vb.)
3. DR sitesindeki backup deposu **"Rescan"** edilerek Veeam'in kopyayı algılaması sağlanır
4. Replikasyon job'u oluşturulurken Seeding sekmesinde bu depo seçilir
5. İlk senkronizasyonda Veeam, VM'i backup'tan geri yükler; sonraki çalışmalarda yalnızca delta aktarır

> **Önemli:** Yedeklemeleri DR sitesindeki scale-out (genişletilebilir) yedekleme deposuna kopyalamak desteklenmez. Standart backup deposu kullanılmalıdır.

---

## Yedekleme Türleri ve VSS

### Backup Türleri

**Full Backup (Tam Yedek):** Tüm veri bloklarının yedeklenmesidir. Geri yükleme en hızlı ve basittir; ancak depolama alanı tüketimi yüksektir. Genellikle haftalık veya aylık alınır.

**Incremental Backup (Artımlı Yedek):** Son yedeklemeden bu yana değişen bloklardan oluşur. Depolama ve süre açısından verimlidir. Geri yükleme için zincir bütünlüğü gereklidir.

**Synthetic Full Backup:** Veeam'in bir önceki full backup ile biriken incremental'ları birleştirerek yeni bir full backup oluşturduğu yöntemdir. Kaynak sisteme ek yük bindirmeden güncel bir full backup sağlar.

> **Synthetic Full vs. Active Full:** Synthetic Full, kaynak storage'e dokunmadan Veeam deposundaki verilerden oluşturulur. Active Full ise kaynaktan yeniden tam veri okur — daha yavaş ama zincir bağımsız.

### VSS (Volume Shadow Copy Service)

VSS, Windows'un anlık kopyalama mekanizmasıdır. Veeam, uygulama tutarlı (application-consistent) yedekler alabilmek için VSS'yi kullanır.

**VSS'nin Sağladıkları:**

- Aktif uygulama verilerinin (SQL Server, Exchange, Active Directory vb.) tutarlı anlık kopyasını alır
- Dosyalar ve uygulamalar çalışmaya devam ederken veri bütünlüğü sağlar — uygulamayı durdurmaya gerek kalmaz
- Uygulama seviyesinde geri yükleme (granular recovery) imkânı sunar
- Yedekleme sırasında yalnızca değişen bloklar işlendiğinden performans ve hız optimize edilir

### Veeam Snapshot Mekanizması

1. VM çalışırken arka planda VMware snapshot alınır — diskler salt okunur hale getirilir
2. Snapshot, yedekleme sırasında oluşan değişiklikleri ayrı delta dosyasında izler
3. Yedekleme tamamlandıktan sonra snapshot silinir, delta değişiklikler disk'e uygulanır
4. Kullanıcılar ve uygulamalar süreç boyunca kesintisiz çalışmaya devam eder

---

## Active Directory Nesne Kurtarma

### Yapılandırma

Uygulama farkındalıklı (application-aware) yedekleme için Guest Processing sekmesinde **"Enable Application-Aware Processing"** aktif edilmelidir. Domain Admin veya Enterprise Admin düzeyinde kimlik bilgisi tanımlanmalıdır.

### AD Nesne Kurtarma Adımları

1. Veeam konsolunda **Restore → Application Items → Microsoft Active Directory Objects** bölümüne gidin
2. Kurtarılacak backup noktası ve domain seçilir
3. "Compare Object Attributes" ile nesnenin mevcut ve backup'taki durumu karşılaştırılır
4. Silinmiş (tombstoned) nesneler tespit edilir — "Restore object" ile nesne geri yüklenir

> **İpucu:** Silinen AD nesneleri, tombstone süresi dolmadan (varsayılan **180 gün**) hem Veeam ile hem de Windows'un AD Recycle Bin özelliğiyle (etkinleştirilmişse) kurtarılabilir.

---

## Yaygın Sorunlar ve Çözümler

### Veeam Upgrade — SSPI Hatası

Upgrade sırasında SSPI kimlik doğrulama hatasıyla karşılaşılırsa **Veeam KB4542** makalesindeki adımlar izlenmelidir.

### De-duplicated Depolama Hataları

Windows Server'da Data Deduplication özelliği etkin olan hacimlere yönelik FLR (File Level Restore) işlemlerinde sorunlar yaşanabilir. Bu durumda deduplication özelliğini geçici olarak devre dışı bırakın veya Veeam'in FLR proxy'sini deduplicated olmayan bir volume üzerinde çalıştırın.
