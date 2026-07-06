---
title: "802.1X Network Authentication — AD CS ile Kurumsal Ağ Kimlik Doğrulama"
description: "Kablolu ve kablosuz ağlarda EAP-TLS tabanlı sertifika kimlik doğrulaması: AD CS PKI kurulumu, NPS/RADIUS yapılandırması, GPO autoenrollment ve Cisco switch konfigürasyonu."
date: 2026-06-24
draft: false
slug: 802-1x-ad-cs-kimlik-dogrulama
image: cover.svg
categories:
    - Active Directory
tags:
    - Active Directory
    - 802.1X
    - NPS
    - AD CS
    - EAP-TLS
    - Network Security
    - PowerShell
    - GPO
---

<div class="download-box">
  <div class="download-box-icon">⬇</div>
  <div class="download-box-content">
    <div class="download-box-title">802.1X Deployment Rehberi — PDF</div>
    <div class="download-box-desc">Bu rehberin tam sürümünü PDF olarak indirebilirsiniz.</div>
  </div>
  <a class="download-box-btn" href="802.1X-AD-CS-Kimlik-Dogrulama-Rehberi.pdf" download>İndir (PDF)</a>
</div>

## 1. Giriş ve Mimari Genel Bakış

### 1.1 802.1X Nedir?

IEEE 802.1X, ağ cihazlarına erişim öncesinde kimlik doğrulama zorunluluğu getiren bir **port tabanlı erişim kontrol** standardıdır. Kablosuz (Wi-Fi) ve kablolu (Ethernet) ağlarda çalışır. Bir istemci ağa bağlanmaya çalıştığında, switch veya Access Point bu isteği doğrudan karşılamaz; kimlik doğrulama trafiğini bir RADIUS sunucusuna (bu senaryoda NPS) yönlendirir. RADIUS sunucusu doğrulamayı yapar ve erişime izin verir ya da reddeder.

```
Supplicant (PC/Laptop)  ──EAPOL──►  Authenticator (Switch/AP)  ──RADIUS UDP 1812──►  Auth Server (NPS)
```

### 1.2 EAP-TLS vs PEAP — Neden Sertifika Seçtik?

| Özellik | PEAP-MSCHAPv2 | EAP-TLS (Seçilen) |
|---|---|---|
| İstemci Kimlik Doğrulama | Kullanıcı adı + Parola | X.509 Sertifikası |
| Sunucu Kimlik Doğrulama | Sunucu Sertifikası | Sunucu Sertifikası |
| Parola Ele Geçirme Riski | Yüksek (offline brute-force) | Yok |
| Sertifika Altyapısı Gereksinimi | Sadece sunucu | Sunucu + İstemci |
| Yönetim Karmaşıklığı | Düşük | Orta (GPO ile otomatize) |
| Güvenlik Seviyesi | Orta | **Yüksek (önerilen)** |

<div class="callout callout--success">
<strong>✅ Best Practice</strong> EAP-TLS, sertifika tabanlı kimlik doğrulama sayesinde parola güvenliği sorununu ortadan kaldırır. AD CS + GPO autoenrollment kombinasyonu ile istemci sertifikaları otomatik dağıtılır, yönetim yükü minimumdur.
</div>

### 1.3 Ortam Bilgileri

| Bileşen | Detay |
|---|---|
| Domain | ortakvy.local |
| CA Sunucusu | Windows Server 2019 — Enterprise Root CA |
| NPS Sunucusu | Windows Server 2019 (CA ile aynı veya ayrı) |
| İstemciler | Windows 10/11 — Domain Member |
| Wireless Infrastructure | 802.1X destekli Access Point'ler |
| Kablolu Infrastructure | 802.1X destekli Cisco Switch'ler |
| Sertifika Geçerlilik Süresi | Bilgisayar: 2 yıl, Kullanıcı: 1 yıl |

---

## 2. AD CS — Sertifika Altyapısı Kurulumu

### 2.1 CA Rolü Kurulumu (Enterprise Root CA)

Active Directory Certificate Services (AD CS), PKI altyapısının temelini oluşturur. Enterprise Root CA seçimi, sertifikaların Active Directory ile entegre çalışmasını ve autoenrollment özelliğinin kullanılabilmesini sağlar.

```powershell
# AD CS rolünü kur
Install-WindowsFeature -Name AD-Certificate -IncludeManagementTools

# Enterprise Root CA olarak yapılandır
Install-AdcsCertificationAuthority `
    -CAType EnterpriseRootCa `
    -CACommonName 'OrtakVY-Root-CA' `
    -KeyLength 2048 `
    -HashAlgorithmName SHA256 `
    -ValidityPeriod Years `
    -ValidityPeriodUnits 10 `
    -Force
```

<div class="callout callout--warning">
<strong>⚠ Dikkat</strong> Production ortamında Root CA'yı offline tutmak best practice'tir. Ancak SMB ölçeğindeki ortamlarda online Enterprise Root CA kabul edilebilir bir trade-off'tur.
</div>

### 2.2 Sertifika Şablonları Oluşturma

802.1X için iki ayrı sertifika şablonu oluşturulur: biri NPS sunucusu, diğeri domain istemcileri için. Mevcut şablonlar kopyalanarak özelleştirilir.

**Şablon 1 — NPS Server Sertifikası:**

| Ayar | Değer |
|---|---|
| Kaynak Şablon | Computer (Windows Server 2003 veya üstü) |
| Şablon Adı | NPS-Server-Auth |
| Subject Name | Build from Active Directory (DNS name dahil) |
| Key Usage | Digital Signature, Key Encipherment |
| Extended Key Usage | Server Authentication (1.3.6.1.5.5.7.3.1) |
| Validity Period | 2 Years \| Renewal: 6 Weeks |
| Permissions | NPS sunucu bilgisayar hesabına Read + Enroll |
| Publish to AD | Hayır |

**Şablon 2 — İstemci Bilgisayar Sertifikası:**

| Ayar | Değer |
|---|---|
| Kaynak Şablon | Computer (mevcut şablonu kopyala) |
| Şablon Adı | 8021X-Computer-Auth |
| Subject Name | Build from Active Directory |
| Key Usage | Digital Signature, Key Encipherment |
| Extended Key Usage | Client Authentication (1.3.6.1.5.5.7.3.2) |
| Validity Period | 2 Years \| Renewal: 6 Weeks |
| Private Key Export | **HAYIR — güvenlik** |
| Permissions | Domain Computers grubuna Read + Enroll + **Autoenroll** |

### 2.3 Şablonların Yayınlanması

```powershell
# certutil ile şablon yayınlama
certutil -SetCAtemplates +NPS-Server-Auth
certutil -SetCAtemplates +8021X-Computer-Auth

# Alternatif: CA MMC > Certificate Templates > New > Certificate Template to Issue
```

<div class="callout callout--info">
<strong>Not</strong> Şablon değişikliklerinin AD'ye yayılması için CA servisini yeniden başlatın veya <code>gpupdate /force</code> çalıştırın. Propagation süresi genellikle 15-30 dakikadır.
</div>

---

## 3. NPS (Network Policy Server) Yapılandırması

### 3.1 NPS Rolü Kurulumu

```powershell
# NPS rolünü kur
Install-WindowsFeature -Name NPAS -IncludeManagementTools

# NPS'i AD'ye kaydet
netsh nps add registeredserver domain=ortakvy.local server=<NPS-FQDN>
```

<div class="callout callout--danger">
<strong>⚠ Kritik</strong> NPS sunucusunun AD'ye kayıt işlemi kritiktir. Kayıt yapılmadan NPS, kullanıcı/bilgisayar hesaplarını doğrulayamaz ve tüm 802.1X istekleri 'Access-Reject' döner.
</div>

### 3.2 RADIUS Client Tanımları (Switch / AP)

```powershell
# PowerShell ile RADIUS Client ekleme
New-NpsRadiusClient `
    -Name 'Core-Switch-01' `
    -Address '192.168.1.1' `
    -SharedSecret 'Guclu_Shared_Secret_2026!' `
    -VendorName 'Cisco'

New-NpsRadiusClient `
    -Name 'AP-Floor1' `
    -Address '192.168.1.10' `
    -SharedSecret 'Guclu_Shared_Secret_2026!' `
    -VendorName 'Standard'
```

<div class="callout callout--success">
<strong>✅ Best Practice</strong> Kritik ortamlarda her switch/AP grubu için farklı shared secret kullanın. Minimum 22 karakter, karmaşık secret önerilir.
</div>

### 3.3 Connection Request Policy

| Ayar | Değer |
|---|---|
| Policy Name | 802.1X-CRP |
| Policy Type | Grant access |
| Condition — NAS Port Type | Ethernet VEYA IEEE 802.11 Wireless |
| Authentication | Authenticate requests on this server |
| Sıra (Order) | 1 (en yüksek öncelik) |

### 3.4 Network Policy — EAP-TLS

| Ayar | Değer |
|---|---|
| Policy Name | 802.1X-EAP-TLS-Computers |
| Access Permission | Grant access |
| Condition — Windows Groups | Domain Computers |
| Condition — NAS Port Type | Ethernet + Wireless |
| Authentication Method | EAP — Microsoft: Smart Card or other certificate |
| EAP Type Sertifikası | NPS-Server-Auth sertifikası (CA'dan alınan) |
| Certificate Validation | Verify issuer = ortakvy.local CA |
| Constraints | SADECE EAP (PEAP/MSCHAPv2 işaretlenmez) |

<div class="callout callout--danger">
<strong>⚠ Dikkat</strong> EAP-TLS policy'de 'Less secure authentication methods' seçeneklerini (MSCHAPv2, PAP) kesinlikle işaretlemeyin. Bu seçenekler güvenlik modelini bozar.
</div>

---

## 4. GPO ile Sertifika Otomatik Dağıtımı

GPO Autoenrollment, domain üyesi bilgisayarların sertifika şablonlarından otomatik sertifika talep etmesini sağlar. Kullanıcı müdahalesi gerekmez; sertifikalar arka planda alınır ve yenilenir.

### 4.1 Computer Sertifikası Autoenrollment GPO

| Ayar | Değer |
|---|---|
| GPO Adı | 8021X-Certificate-Autoenrollment |
| Bağlantı | Domain kök veya hedef OU |
| Yol | `Computer Configuration > Windows Settings > Security Settings > Public Key Policies > Certificate Services Client - Auto-Enrollment` |
| Ayar | **Enabled** |
| Seçenek 1 | ✅ Renew expired certificates... |
| Seçenek 2 | ✅ Update certificates that use certificate templates |

### 4.2 Trusted Root CA Dağıtımı

```powershell
# İstemci üzerinde sertifikaları doğrula
Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {
    $_.EnhancedKeyUsageList -like '*Client Authentication*'
} | Select-Object Subject, NotAfter, Thumbprint

# Autoenrollment'ı manuel tetikle (test için)
certutil -pulse
gpupdate /force
```

---

## 5. Kablosuz Ağ (Wireless) 802.1X Yapılandırması

### 5.1 GPO ile Wireless Profile Dağıtımı

**GPO Yolu:** `Computer Configuration > Windows Settings > Security Settings > Wireless Network (IEEE 802.11) Policies`

| Ayar | Değer |
|---|---|
| Network Name (SSID) | ORTAKVY-CORP |
| Connection Type | ESS (Infrastructure Mode) |
| Security | WPA2-Enterprise |
| Encryption | AES (CCMP) |
| Authentication | EAP |
| Authentication Method | Smart Card or other certificate |
| Certificate Issuer | OrtakVY-Root-CA |
| Connect automatically | Evet |

<div class="callout callout--danger">
<strong>⚠ Dikkat</strong> Wireless GPO'da 'Validate server certificate' seçeneği mutlaka işaretli olmalıdır. Bu seçenek devre dışı bırakılırsa rogue AP saldırılarına karşı koruma ortadan kalkar.
</div>

### 5.2 Access Point Tarafı Yapılandırması

| AP Ayarı | Değer |
|---|---|
| SSID | ORTAKVY-CORP |
| Security Mode | WPA2-Enterprise |
| Encryption | AES |
| RADIUS Server IP | NPS sunucu IP adresi |
| RADIUS Port (Auth) | 1812 |
| RADIUS Port (Accounting) | 1813 |
| Shared Secret | NPS'e girilen shared secret (aynı değer) |
| MAC Auth Bypass | Devre dışı (EAP-TLS kullanıldığında gereksiz) |

---

## 6. Kablolu Ağ (Wired) 802.1X Yapılandırması

### 6.1 GPO ile Wired Autoconfig Servisi

**Servis GPO Yolu:** `Computer Configuration > Windows Settings > Security Settings > System Services`
- Servis: **Wired AutoConfig (dot3svc)** — Startup: **Automatic**

**Wired Policy GPO Yolu:** `Computer Configuration > Windows Settings > Security Settings > Wired Network (IEEE 802.3) Policies`

| Ayar | Değer |
|---|---|
| Security Type | 802.1X |
| Authentication | User or Computer authentication |
| EAP Type | Smart Card or other certificate |
| Validate server certificate | Evet |
| Trusted Root CA | OrtakVY-Root-CA |

### 6.2 Switch Port Yapılandırması (Cisco)

```cisco
! Global RADIUS yapılandırması
aaa new-model
aaa authentication dot1x default group radius
aaa authorization network default group radius
aaa accounting dot1x default start-stop group radius

radius server NPS-Primary
 address ipv4 <NPS-IP> auth-port 1812 acct-port 1813
 key Guclu_Shared_Secret_2026!

! 802.1X global aktivasyon
dot1x system-auth-control

! Access port yapılandırması
interface GigabitEthernet1/0/1
 description Workstation-Port
 switchport mode access
 switchport access vlan 10
 authentication port-control auto
 dot1x pae authenticator
 spanning-tree portfast

 ! Opsiyonel: Auth-Fail VLAN
 authentication event fail action authorize vlan 999
 authentication event no-response action authorize vlan 999
```

<div class="callout callout--success">
<strong>✅ Best Practice</strong> Guest VLAN ve Auth-Fail VLAN yapılandırması, domain dışı cihazların sınırlı ağa erişimini sağlar. Bu sayede misafir cihazlar tamamen bloke edilmek yerine yönlendirilebilir.
</div>

---

## 7. Test ve Doğrulama

### 7.1 NPS Event Log Kontrolü

```powershell
# Son 50 NPS event (6272 = Başarılı, 6273 = Reddedildi)
Get-WinEvent -LogName 'Security' -MaxEvents 50 | Where-Object {
    $_.Id -in @(6272, 6273)
} | Select-Object TimeCreated, Id, Message | Format-List
```

| Event ID | Anlam | Kontrol Edilecek Alan |
|---|---|---|
| 6272 | Access Granted (Başarılı) | Account Name, Policy Name |
| 6273 | Access Denied (Reddedildi) | Reason Code — hata sebebi |
| 6274 | Request Discarded | NPS'e ulaşan ama işlenemeyen istek |

### 7.2 Sık Karşılaşılan Hatalar ve Çözümleri

| Hata / Belirti | Muhtemel Sebep | Çözüm |
|---|---|---|
| Event 6273 Reason 16 | Sertifika yok veya geçersiz | `certmgr.msc > Personal` kontrol |
| Event 6273 Reason 22 | Sertifika süresi dolmuş | Autoenrollment GPO'yu doğrula |
| Event 6273 Reason 48 | CA'ya güven yok | Trusted Root CA GPO'nun uygulandığını doğrula |
| NPS sertifika görmüyor | CA'dan sertifika alınmamış | `certmgr.msc (Local Computer) > Personal'da NPS-Server-Auth` olmalı |
| Switch port açılmıyor | Shared secret uyuşmuyor | NPS RADIUS client ve switch config'deki secret'ı karşılaştır |
| Wired 802.1X çalışmıyor | dot3svc servisi çalışmıyor | `services.msc > Wired AutoConfig > Automatic + Start` |

---

## 8. Best Practice Kontrol Listesi

### AD CS
- ☑ Enterprise Root CA — SHA256, 2048-bit minimum
- ☑ Sertifika şablonlarında minimum gerekli izinler (Domain Computers: Enroll + Autoenroll)
- ☑ Şablon geçerlilik süresi makul (bilgisayar 2 yıl, kullanıcı 1 yıl)
- ☑ Private key export izni kapalı

### NPS
- ☑ NPS'i AD'ye kaydet (`netsh nps add registeredserver`)
- ☑ Her RADIUS client için güçlü ve benzersiz shared secret
- ☑ Sadece EAP-TLS kabul et, zayıf metodları devre dışı bırak
- ☑ NPS sertifikasının FQDN'i ile uyumlu SAN içermesini sağla

### GPO
- ☑ Autoenrollment her iki kutucuğu da işaretli olmalı
- ☑ Wireless/Wired policy'de 'Validate server certificate' açık
- ☑ Trusted Root CA GPO ile dağıtılmış
- ☑ Wired AutoConfig servisi otomatik başlatma

### Network
- ☑ Switch/AP'lerde auth-fail VLAN tanımlı (misafir/bilinmeyen cihaz izolasyonu)
- ☑ NPS sunucusuna erişim için güvenlik duvarı: UDP 1812, 1813
- ☑ Printerlar, IP phoneler için MAB (MAC Auth Bypass) ek önlem olarak yapılandır
- ☑ NPS log'larını düzenli izle (SIEM entegrasyonu önerilir)

---

*Bu doküman, VMind Bilgi ve Teknolojileri A.Ş. bünyesinde gerçekleştirilen ortakvy.local ortamı 802.1X deployment deneyimine dayanarak hazırlanmıştır.*
