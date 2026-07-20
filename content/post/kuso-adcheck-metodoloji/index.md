---
title: "Kuso AD Check — Active Directory Güvenlik Değerlendirmesi"
description: "Kuso AD Check'in 21 analiz ekranı ve 6 risk kategorisindeki 96 güvenlik kuralının teknik metodolojisi: Tier 0'dan Trust'lara AD güvenlik yüzeyi."
date: 2024-06-23
draft: false
slug: kuso-adcheck-metodoloji
weight: 1
aliases:
    - /p/kuso-ad-check-active-directory-güvenlik-değerlendirmesi-metodolojisi/
categories:
    - Active Directory
tags:
    - Active Directory
    - Security
    - Kuso AD Check
    - MITRE ATT&CK
    - Penetration Testing
---

<video controls preload="metadata" style="width:100%;border-radius:10px;margin:0 0 24px 0;">
  <source src="Kuso_AD_Check_Savunma_Rehberi.mp4" type="video/mp4">
</video>

<div class="download-box">
  <div class="download-box-icon">⬇</div>
  <div class="download-box-content">
    <div class="download-box-title">KusoADCheck — Script Paketi</div>
    <div class="download-box-desc">Aracı buradan indirebilirsiniz.</div>
  </div>
  <a class="download-box-btn" href="KusoADCheck.zip" download>İndir (.zip · 319 KB)</a>
</div>

Active Directory, bir organizasyonun kimlik, erişim ve politika altyapısının merkezidir. AD'i ele geçiren saldırgan tüm ortamı ele geçirmiş demektir. **Kuso AD Check**, bu yüzeyi sistematik olarak **21 menü ekranı** ve **6 risk kategorisinde 96 kural** ile tarayan, özel geliştirilmiş bir denetim aracıdır.

---

## Sol Navigasyon Menüsündeki Ekranlar

Araç açıldığında sol tarafta görünen her menü maddesi, AD ortamının farklı bir boyutunu analiz eder.

### AD Risk Dashboard

Tüm ortamın tek ekranda özetlendiği yönetici görünümü. İlk açılan ana ekrandır.

- **Risk Skoru (0–100):** Her kategorideki bulguların ağırlıklı toplamından türetilen genel güvenlik puanı
- **Radar grafiği:** 6 kategori için görsel risk dağılımı — hangi alanda en fazla açık var?
- **Kategori kartları:** Privileged Infrastructure, Privileged Accounts, Stale Objects, Anomalies, Hygiene, Trusts — özet skor ve bulgu sayısı
- **Top 5 Active Risks:** O anda en yüksek puanlı 5 risk maddesi
- **Attack Chain (Saldırı Zinciri):** Mevcut bulgular üzerinden kurgulanmış gerçekçi saldırı senaryosu
- **Recommended Sequence:** Hangi bulguyu önce kapatmalı? Öncelik sırası
- **MITRE ATT&CK eşleştirmesi:** Her bulgunun karşılık geldiği ATT&CK tekniği
- **Remediation Tracking:** Bulgular açık / kapatılmış / istisna olarak işaretlenmiş mi?
- **Risk Simülatörü:** "Şu bulguları kapatsam skor kaç olur?" sorusunu anlık yanıtlar
- **Risk trend grafiği:** Geçmiş taramalarla karşılaştırmalı skor değişimi

### Risk Baseline Diff

İki farklı tarama arasındaki farkları gösterir. Güvenlik kapatma çalışması sonrasında "ne değişti?" sorusunu yanıtlar.

- Yeni bulgular: Son taramada ortaya çıkan, öncekinde olmayan riskler
- Kapanan bulgular: Bir önceki taramaya göre düzeltilen güvenlik açıkları
- Değişen bulgular: Var olmaya devam eden ama durumu değişen bulgular
- Kategori bazlı dağılım: Hangi kategoride ne kadar ilerleme var?

### AD User Risk Level

Kullanıcı bazında risk analizi. Her kullanıcının son 30 günlük davranışı ve hesap özellikleri değerlendirilerek risk skoru hesaplanır.

- Hesap kilitleme sayısı: Son 30 günde kilitlenen hesaplar ve sıklığı
- Başarısız giriş denemeleri: Brute-force göstergesi
- Kaynak IP analizi: Beklenmedik IP tespiti
- Kullanıcı–cihaz eşleşmesi: Normalde hangi cihazdan giriş yapıyor, sapmalar var mı?
- Davranış ısı haritası: Aktivitenin saat/gün dağılımı — mesai dışı erişim tespiti

### Windows OS Overview

AD'e kayıtlı tüm Windows makinelerinin işletim sistemi dağılımı ve sürüm bazlı envanteri.

- **Windows Server OS:** Sunucu sürüm dağılımı (2019, 2022 vb.), aktiflik durumu, eski/desteksiz sürüm işaretleme
- **Windows Client OS:** İstemci sürüm dağılımı (Win10/11), 90+ gün inaktifler

> Eski OS = yamalanamayan açık. EternalBlue/WannaCry örneğinde görüldüğü üzere tek yama almamış makine tüm ağa sıçramanın kapısıdır.

### AD Users Overview

AD'deki tüm kullanıcı hesaplarının kapsamlı envanteri ve güvenlik durumu.

- **All Users:** Tüm hesaplar — etkin/devre dışı, son giriş, ayrıcalık durumu, şifre özellikleri
- **Password Never Expires:** PasswordNeverExpires=True olan hesaplar — kimlik bilgisi sızıntısı süresiz kullanılabilir
- **Domain Admins:** DA grubu üyeleri — son kullanım tarihi, şifre yaşı
- **Schema Admins:** SA grubu üyeleri — bu grup normalde **boş** olmalıdır
- **Enterprise Admins:** EA grubu üyeleri — orman geneli yetki, sadece geçici kullanım için
- **Disabled Users:** Devre dışı hesaplar — silinmeyi bekleyenler

### Groups & Security

AD'deki tüm grupların envanteri ve güvenlik analizi.

- **Security Groups:** Toplam 70 grup — Windows yerleşik (28), domain varsayılan (22), özel/organizasyonel (20)
- Tehlikeli üyelikler: Domain Admins, Schema Admins, Administrators gibi kritik gruplara beklenmedik üyelikler vurgulanır
- **Distribution Groups:** Mail dağıtım gruplarının envanteri

> Yanlış grup üyeliği en yaygın aşırı yetki kaynağıdır. Boş gruplar zamanla sahipsiz kalır ve saldırganlar tarafından dolaylı yetki kazanmak için kullanılabilir.

### Inactive Objects

Son 90+ gündür hiç aktivite göstermemiş kullanıcı ve bilgisayar hesapları.

- Inactive Users: Son 90 günde giriş yapmayan etkin kullanıcılar. Ayrıcalıklı inaktif hesaplar kırmızıyla vurgulanır
- Inactive Computers: Son 90 günde ağa bağlanmayan bilgisayar hesapları

> İnaktif hesaplar sahipsizdir. Ele geçirilmiş inaktif hesap alarm tetiklemez.

### Exchange / O365 Users

AD'deki mail özniteliklerine göre posta kutusu bulunan kullanıcıların envanteri ve hibrit yapı analizi.

- Toplam mail kullanıcıları, On-Prem Exchange kullanıcıları, Hibrit (M365 Mailbox) kullanıcıları
- **AD Connect hesap durumu:** Azure AD Connect servis hesapları tespit edilir ve maruziyeti değerlendirilir

### Service Accounts

AD'deki tüm servis hesaplarının (SPN'li kullanıcılar ve gMSA) envanteri ve güvenlik profili.

- **SPN tablosu:** Hangi hesapta hangi servis bağlantı noktası tanımlı? Kerberoasting'e açık hesaplar işaretlenir
- **gMSA listesi:** Group Managed Service Account olarak yapılandırılmış hesaplar — şifre rotasyonu otomatik, Kerberoasting'e bağışık
- Kullanılmayan veya 90+ gündür giriş yapılmayan servis hesapları vurgulanır

> Unutulmuş bir servis hesabı + eski şifre + SPN = Kerberoasting hedefi.

### Locked Accounts

Anlık hesap kilitleme durumu ve brute-force göstergeleri.

- Şu anda kilitli hesaplar ve yönetici hesaplarının kilitleme durumu
- **BadPwdCount >= 5:** 5 veya üzeri başarısız giriş denemesi — devam eden brute-force işareti
- Kilitleme yoğunlaşması; credential stuffing, parola spreyi veya eski parola kullanan servislerin tespitinde kritik veri

### Password Expiry

Parolaların yaşam döngüsü.

- Süresi dolmuş parolalar: Servis kesintisi riski
- Yakında dolacaklar (7 gün)
- Hiç sona ermeyenler: PasswordNeverExpires bayrağı — güvenlik riski olarak işaretlenir

### Password Policies

Domain genelinde uygulanan parola politikalarının tam görünümü.

- **Default Domain Password Policy:** Minimum uzunluk, karmaşıklık, geçmiş sayısı, kilit eşiği
- **Fine-Grained Password Policies (PSO):** Belirli gruplara özel politikalar

> Domain Admin ile normal kullanıcı aynı parola politikasına tabi olmamalıdır. PSO ile ayrıcalıklı hesaplara 20+ karakter, daha sık rotasyon uygulanabilir.

### Group Policy Check

Tüm GPO'ların envanteri, OU bağlantı haritası ve hijyen analizi.

- **Orphaned (Yetim) GPO'lar:** Hiçbir OU'ya bağlı olmayan GPO'lar — saldırganlar için gizli değişiklik noktası
- Boş GPO'lar: Hiç ayar içermeyenler
- OU bağlantı haritası: Hangi GPO hangi OU'ya bağlı?

> GPO'lar tüm ağa yazılım dağıtabilir, betik çalıştırabilir, güvenlik ayarlarını değiştirebilir. Yanlış yazma izni tüm domain'i toplu saldırı vektörüne dönüştürür.

### AD Tier List (T0 / T1 / T2)

AD ortamındaki tüm hesap ve nesnelerin Microsoft Tier modeline göre sınıflandırılması.

- **Tier 0:** Domain Controller'lar, FSMO rol sahipleri, kritik altyapı hesapları — doğrudan domain kontrolü sağlayan varlıklar
- **Tier 1:** Uygulama sunucuları, yönetim sunucuları, servis hesapları — sunucu katmanı
- **Tier 2:** İş istasyonları, standart kullanıcılar — uç nokta katmanı
- Katman ihlalleri: Tier 0 hesabının Tier 2 sistemde oturum açması gibi tehlikeli yatay kesişimler tespit edilir

> Tier sınırı ihlali = lateral movement için köprü. Tier 0 kimlik bilgisi Tier 2 makinede bellekte kalırsa full domain tehlikesi vardır.

### AD Sites & Topology

Active Directory Sites and Services yapılandırmasının görsel ve tablolu özeti.

- Site listesi, DC dağılımı, Subnet–Site eşleşmesi, site linkleri ve replikasyon maliyetleri

### DC Health & FSMO

Domain Controller'ların servis sağlığı, DNS durumu, replikasyon kalitesi ve FSMO rol dağılımı.

- DC listesi, DNS sağlığı (SOA kaydı, ters lookup zone), replikasyon durumu
- **FSMO rolleri:** PDC Emulator, RID Master, Infrastructure Master, Schema Master, Domain Naming Master

### AD Trusts

Birden fazla domain veya forest arasındaki güven ilişkilerinin detaylı analizi.

- **Trust tablosu:** Güven yönü (tek yönlü / çift yönlü), türü (forest / external / shortcut), geçişkenliği
- **SID Filtreleme:** Her trust üzerinde SIDFilteringQuarantined aktif mi? Kapalıysa alt domain ele geçirmesi ana domain DA yetkisi verebilir
- **TGT Delegation:** TGTDelegation açık trust'lar — unconstrained delegation ile birleşince tam ele geçirme riski
- **Selective Authentication:** Yalnızca belirlenen kaynaklara erişim sınırlandırılmış mı?

### DNS Health

Active Directory'nin DNS altyapısının sağlık kontrolü.

- **Forward zone tablosu:** AD entegre DNS zone'ları, delegasyonlar, dinamik güncelleme politikası
- **Reverse lookup zone'ları:** PTR kayıtları için ters arama zone'larının varlığı ve tutarlılığı
- **DnsAdmins grubu:** DC'de DNS DLL injection riskine yol açan grup üyeleri listelenir
- Yetim (orphaned) DNS kayıtları ve zone replikasyon durumu

> DNS zehirlenmesi veya kayıt manipülasyonu, kerberos kimlik doğrulama trafiğini yeniden yönlendirmek için kullanılabilir.

### SYSVOL / NETLOGON

DC'lerdeki kritik paylaşım klasörlerinin güvenlik ve tutarlılık denetimi.

- **FRS / DFSR durumu:** Her DC'de SYSVOL replikasyonunun FRS'den DFSR'ye geçişi tamamlanmış mı? FRS = artık desteklenmiyor
- **GPP cpassword dosyaları:** SYSVOL içindeki XML dosyalarında şifrelenmiş parola kalıntısı (MS14-025) — Microsoft'un yayınladığı AES anahtarıyla kırılabilir
- **NETLOGON hassas içerik:** Oturum açma scriptlerinde açık metin kimlik bilgisi, şifre veya token içeren dosyalar taranır

> SYSVOL tüm domain kullanıcılarına okunabilir. GPP cpassword → domain kullanıcısından domain admin'e tek adım.

### Hybrid / Entra Join

On-prem AD makinelerinin Microsoft Entra ID ile hibrit kayıt durumu.

- Hibrit join durumu ve kayıtlı cihaz sayısı
- AD Connect hesapları: Servis hesabının aşırı yetkisi DCSync'e eşdeğer risk oluşturabilir

### Skipped / Unreachable DCs

Tarama sırasında erişilemeyen veya atlanan domain controller'ların listesi ve nedenleri.

- Erişilemeyen DC'ler: WinRM veya RPC bağlantısı kurulamayan DC'ler
- Atlama nedeni: Bağlantı hatası, kimlik doğrulama sorunu, zaman aşımı

> Erişilemeyen DC kör nokta demektir. Eksik DC verisi yanlış güvenlik profili oluşturur.

---

## AD Risk Dashboard: 6 Güvenlik Kategorisi ve 96 Kural

### Kategori 1 — Privileged Infrastructure (55 kural)

Tüm domaine doğrudan etki eden altyapısal güvenlik kontrolleri. Bu kategorideki açıklar genellikle tek adımda tam domain ele geçirilmesiyle sonuçlanır.

**Tier 0 — Domain Düzeyi Kontroller (En Kritik)**

- **DCSync hakları:** Domain kökünde DS-Replication-Get-Changes-All yetkisi olan hesaplar tespit edilir. Bu yetki yalnızca DC makine hesaplarında bulunmalıdır; user hesabında varsa saldırgan tüm hash'leri DC'ye dokunmadan dökebilir
- **Kritik nesnelerde tehlikeli ACE'ler:** Domain kökü, AdminSDHolder, CN=Policies gibi kritik AD nesneleri üzerinde GenericAll, WriteDacl, WriteOwner, GenericWrite izinleri taranır
- **LSA Koruması (RunAsPPL):** Her DC'de RunAsPPL kayıt defteri değeri kontrol edilir — boşsa Mimikatz doğrudan çalışır
- **SMBv1 DC'de etkin mi?** EternalBlue/WannaCry saldırısının kapısı
- **WDigest düz metin kimlik bilgileri:** WDigest etkinse Windows bellekte düz metin parola tutar
- **NTLMv1 aktif kullanım:** Event ID 4624 incelenerek NTLMv1 kimlik doğrulaması hâlâ gerçekleşiyor mu tespit edilir
- **AD CS — ESC1:** Sertifika şablonunda kullanıcı SAN girebiliyor mu? Domain Admin sertifikası talep edilebilir
- **AD CS — ESC4:** Şablon ACL'inde geniş gruplara yazma izni var mı?
- **AD CS — ESC6:** CA'da EDITF_ATTRIBUTESUBJECTALTNAME2 bayrağı açık mı? Tüm şablonlar ESC1'e dönüşür

**Tier 1 — Sunucu Katmanı Kontrolleri**

- **Kerberoastable normal kullanıcılar:** SPN taşıyan non-privileged hesaplar — offline hash kırma hedefi
- **Shadow credentials (msDS-KeyCredentialLink):** Beklenmedik giriş var mı? Parola sıfırlamaya dayanıklı arka kapı
- **ESC8 — AD CS HTTP relay yüzeyi:** /certsrv endpoint'i NTLM üzerinden erişilebilir mi?
- **GPO sahip anomalileri:** GPO'ların sahibi Domain Admins dışı birisi mi?
- **DNS yönetici maruziyeti:** DnsAdmins grubunda gereksiz üye var mı? DC'de DNS DLL injection riski
- **Atıl veya yetim servis hesapları:** 90+ gündür giriş yapmayan SPN'li hesaplar — Kerberoasting'e açık

**Tier 2 — Temel Güvenlik Kontrolleri**

- **SMB ve LDAP imzalama:** DC'lerde SMB imzalama, LDAP imzalama ve LDAP kanal bağlama — üçü birlikte NTLM relay saldırılarını kapatır
- **CredSSP maruziyeti:** PowerShell remoting için CredSSP etkinse DC'de düz metin kimlik bilgisi bellekte kalır
- **gMSA benimsemesi:** Servis hesapları Group Managed Service Account'a taşınmış mı? gMSA = 240 karakter otomatik rotasyon, Kerberoasting'e karşı bağışık

**Privileged Group Review — Kritik Grupların Üyelik Denetimi**

| Grup | Beklenen Durum |
|---|---|
| Domain Admins | Minimum üye, Protected Users kapsamında |
| Enterprise Admins | Normalde **boş** — sadece geçici JIT erişimle |
| Schema Admins | Normalde **boş** |
| Administrators | Doğrudan ve dolaylı üyelikler (iç içe gruplar) dahil denetlenir |
| DnsAdmins | DC'de DLL injection riski — minimize edilmeli |
| Account/Server/Backup/Print Operators | Modern ortamda **boş** olmalı |

---

### Kategori 2 — Privileged Accounts (11 kural)

- **krbtgt şifre yaşı:** 755 gün gibi uzun süreler Golden Ticket saldırısı için idealdir. Hedef: en az 180 günde bir rotasyon, 2 adımlı
- **Kısıtsız delegasyon (Unconstrained Delegation):** TrustedForDelegation=True olan DC dışı makineler — DC'nin TGT'si çalınabilir. PrinterBug/PetitPotam ile birleşince full domain
- **Kısıtlı delegasyon (Constrained Delegation):** Hangi hesaplar hangi servisler için taklit yapabiliyor? Protocol transition ile daha tehlikeli
- **Protected Users grubu kapsamı:** DA/EA/SA hesapları Protected Users'da mı? Olmayanlara PtH ve PtT uygulanabilir
- **DA hesaplarında PasswordNeverExpires:** Sınırsız saldırı penceresi
- **adminCount kayması (drift):** Gruptan çıkarılmış ama adminCount=1 kalmış hesaplar — SDProp koruması devam eder
- **RBCD maruziyeti:** msDS-AllowedToActOnBehalfOfOtherIdentity ile oluşturulmuş Resource-Based Constrained Delegation yolları
- **Ayrıcalıklı hesapta SPN:** DA/EA/SA hesabında SPN varsa Kerberoasting hedefi — offline hash kırma

---

### Kategori 3 — Stale Objects (8 kural)

Bakımsız ortam, saldırganlar için fırsattır.

- **Etkin olmayan kullanıcı hesapları:** Son 90 günde giriş yapılmamış, hâlâ etkin hesaplar
- **Machine Account Quota:** ms-DS-MachineAccountQuota varsayılan 10 = her domain kullanıcısı 10 bilgisayar hesabı açabilir — RBCD saldırısının temel ön koşulu
- **Eski Windows sürümleri:** Desteksiz veya güncel olmayan OS çalıştıran makineler
- **Zayıf Kerberos şifreleme (RC4/DES):** DES veya RC4 kullanan hesaplar — AES'e göre Kerberoasting'de çok daha hızlı kırılır
- **LAPS kapsamı:** Legacy LAPS ve Windows LAPS ayrı ayrı kontrol edilir. Kapsam dışı makineler aynı yerel admin parolasını paylaşıyor olabilir — lateral movement
- **Eski NTLM duruşu:** LmCompatibilityLevel değeri — LM ve NTLMv1 hâlâ etkin mi?

---

### Kategori 4 — Anomalies (16 kural)

Güvenli varsayılan yapılandırmadan sapan, tek başına küçük görünen ama kombinasyonlarda kritik hale gelebilen anormallikler.

- **DC coercion maruziyeti:** PetitPotam/PrinterBug gibi saldırıların ön koşulu olan servisler DC'lerde çalışıyor mu?
- **DC spooler maruziyeti:** Print Spooler servisi DC'de aktif mi? Kapalı olmalıdır
- **GPP cpassword kalıntıları:** SYSVOL'deki XML dosyalarında cpassword özniteliği var mı? MS14-025 ile anahtarı yayınlanan sabit AES şifrelemesi
- **AS-REP Roastable kullanıcılar:** DONT_REQ_PREAUTH bayrağı — şifresiz hash elde edilebilir, DC'de iz bırakmaz
- **LLMNR devre dışı değil:** LLMNR protokolü GPO ile kapatılmamışsa Responder saldırılarına zemin hazırlar
- **PowerShell script block logging:** GPO üzerinden PS script block ve module logging etkin mi? Olmadan saldırgan PS komutları iz bırakmaz
- **CVE-2021-42291 dsHeuristics:** KB5008383 kapsamındaki LDAPAddAuthZVerifications ve LDAPOwnerModify değerleri 1 olarak ayarlanmış mı?

---

### Kategori 5 — Hygiene (4 kural)

Uzun vadeli güvenlik duruşunu belirleyen temel yapılandırma olgunluğu.

- **Fine-Grained Password Policies (PSO):** PSO yapılandırılmış mı? Hangi gruplara uygulanmış?
- **Domain/Forest Functional Level:** Eski seviyeler Protected Users, Kerberos armoring ve PAM özelliklerini kısıtlar
- **Hybrid/Entra join kapsamı:** Kayıt dışı makineler koşullu erişim politikalarının körü
- **Azure AD Connect senkronizasyon hesabı maruziyeti:** AD Connect servis hesabı bazen DCSync yetkisiyle çalışır — domain tehlikesi

---

### Kategori 6 — Trusts (2 kural)

Birden fazla domain veya forest içeren ortamlarda güven ilişkileri ek saldırı yüzeyleri oluşturur.

- **Trust posture:** SID filtreleme (SIDFilteringQuarantined) aktif mi? Kapalı SID filtreleme ile alt domain ele geçirilmesiyle ana domain DA yetkisi kazanılabilir
- **SIDHistory kullanımı:** Domain geçişlerinden kalan SID geçmişi temizlenmiş mi? Saldırganlar DA SID'ini herhangi bir hesabın SIDHistory'sine enjekte ederek grup listelerinde görünmeden tam yetki alabilir

---

## Kapsam Özeti

| Ekran / Kategori | Kapsam |
|---|---|
| AD Risk Dashboard | Risk skoru, radar, attack chain, remediation tracking, simülatör |
| Risk Baseline Diff | Taramalar arası fark analizi — yeni / kapanan / değişen bulgular |
| AD User Risk Level | Kullanıcı bazında davranış ve risk puanı (son 30 gün) |
| Windows OS Overview | Sunucu ve istemci OS envanteri, desteksiz sürüm tespiti |
| AD Users Overview | Tüm kullanıcı hesapları, ayrıcalık grupları, şifre durumu |
| Groups & Security | Güvenlik ve dağıtım grubu envanteri, boş/tehlikeli gruplar |
| Inactive Objects | Atıl kullanıcı ve bilgisayar hesapları (90+ gün) |
| Exchange / O365 Users | Posta kutusu envanteri ve hibrit yapı durumu |
| Service Accounts | SPN'li hesaplar, gMSA listesi, atıl servis hesapları |
| Locked Accounts | Kilitleme yoğunlaşması ve brute-force tespiti |
| Password Expiry | Parola yaşam döngüsü takibi |
| Password Policies | Domain ve fine-grained (PSO) parola politikaları |
| Group Policy Check | GPO envanteri, OU bağlantı haritası, yetim/boş GPO analizi |
| AD Tier List | T0/T1/T2 sınıflandırması, katman ihlali tespiti |
| AD Sites & Topology | Site yapısı, DC dağılımı, subnet eşleşmesi |
| DC Health & FSMO | DC sağlığı, DNS, replikasyon kalitesi, FSMO rolleri |
| AD Trusts | Trust yönü/türü, SID filtreleme, TGT delegation, selective auth |
| DNS Health | Forward/reverse zone'lar, DnsAdmins maruziyeti |
| SYSVOL / NETLOGON | FRS/DFSR durumu, GPP cpassword kalıntıları, oturum açma scriptleri |
| Hybrid / Entra Join | Entra ID kayıt kapsamı ve AD Connect hesap durumu |
| Skipped / Unreachable DCs | Erişilemeyen DC'ler ve raporun kör noktaları |
| **Risk: Privileged Infrastructure** | **55 kural** — Tier 0/1/2 + Privileged Group Review |
| **Risk: Privileged Accounts** | **11 kural** — krbtgt, delegasyon, Protected Users, adminCount |
| **Risk: Stale Objects** | **8 kural** — inaktif hesaplar, NTLM, LAPS, Machine Quota |
| **Risk: Anomalies** | **16 kural** — şifre uzunluğu, denetim, coercion, GPP, LLMNR |
| **Risk: Hygiene** | **4 kural** — PSO, DFL/FFL, Entra join, AD Connect |
| **Risk: Trusts** | **2 kural** — SID filtering, SIDHistory |
| **TOPLAM** | **21 ekran + 96 güvenlik kuralı** |

Kuso AD Check, 21 ekran ve 96 kural ile saldırganın kullanabileceği her yüzeyi önceden görünür kılar. Periyodik tarama, AD'in canlı ortamda nasıl değiştiğini izlemek ve güvenlik borcunun birikmesini önlemek için kritiktir.
