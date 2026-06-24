---
title: "Intune Kavramsal Mimari — Cihaz Kimliği, Lisanslama ve Modern Yönetim"
description: "Microsoft Intune'un kavramsal mimarisi: cihaz kimlik durumları, lisanslı ve lisanssız kullanıcı farkı, SSO/ESR mekanizması, Windows LAPS ve uygulama yaşam döngüsü yönetimi."
date: 2025-04-07
draft: false
categories:
    - Microsoft 365
tags:
    - Intune
    - Microsoft 365
    - Entra ID
    - MDM
    - LAPS
    - SSO
    - App Management
---

Intune'u doğru kullanabilmek için yalnızca menüleri bilmek yetmez; arkasındaki kimlik modeli, lisanslama mantığı ve platform mimarisinin anlaşılması gerekir. Bu yazı teknik kavramsal çerçeveyi netleştirmeyi amaçlar.

---

## Mimari Güncelleme: Microsoft Endpoint Manager → Microsoft Intune

2022 yılında Microsoft, **Microsoft Endpoint Manager (MEM)** çatı markasını kaldırarak portallara yeni isimler verdi:

| Eski Ad | Yeni Ad |
|---|---|
| Microsoft Endpoint Manager admin center | Microsoft Intune admin center (`intune.microsoft.com`) |
| Azure AD | Microsoft Entra ID |
| Azure AD Connect | Microsoft Entra Connect |
| Azure AD Premium | Microsoft Entra ID P1/P2 |

> URL ve UI değişse de altındaki teknik yapı aynıdır. Eski dökümanlarda hâlâ "AAD" ve "MEM" terimleri geçer.

---

## Cihaz Kimlik Durumları

Bir Windows cihazı, Entra ID ve Intune açısından 4 farklı kimlik durumunda olabilir:

### 1. Microsoft Entra Registered (Kayıtlı)

- Kişisel/BYOD cihazlar için
- Cihaz sahibi şirket değil, kullanıcı
- **MAM** (uygulama koruması) uygulanabilir
- **MDM** (tam cihaz yönetimi) desteklenmez
- Tipik senaryo: Kullanıcının kişisel telefonu veya laptopundan şirket verilerine erişim

### 2. Microsoft Entra Joined

- Cihaz şirkete aittir, on-prem AD yoktur veya kullanılmaz
- Sadece Entra ID kimliğiyle çalışır
- **MDM (Intune) ile tam yönetim** desteklenir
- Modern Autopilot dağıtım senaryoları için idealdir
- SSO çalışır: Kullanıcı bir kez oturum açar, tüm M365 hizmetlere erişir

### 3. Microsoft Entra Hybrid Joined

- Cihaz hem on-prem AD'de hem Entra ID'de kayıtlıdır
- Geçiş dönemlerinde tercih edilir
- GPO + Intune MDM aynı anda uygulanabilir (çakışma riski yönetilmeli)
- `dsregcmd /status` ile doğrulanır

### 4. Not Joined / Not Registered

- Cihaz hiçbir kimlik dizinine kayıtlı değil
- Koşullu Erişim politikaları bu cihazları genellikle engeller
- Intune yönetimi mümkün değil

---

## Lisanslı ve Lisanssız Kullanıcı Farkı

Bu ayrım, pratikte en fazla karışıklığa yol açan konulardan biridir.

### Lisanslı Kullanıcı

Intune lisansı atanmış kullanıcı:
- Cihazı **MDM ile tam yönetilebilir** (compliance, yapılandırma, uygulama)
- Uygulama koruma politikaları (APP) uygulanabilir
- Koşullu Erişim senaryolarında "Uyumlu cihaz" koşulu değerlendirilebilir
- Autopilot dağıtımından yararlanabilir

### Lisanssız Kullanıcı

Intune lisansı olmayan kullanıcı:
- Cihaz MDM ile **yönetilemez**
- Compliance policy **değerlendirilemez** → cihaz her zaman "Not Evaluated" veya "Compliant değil" görünür
- Koşullu erişim bu kullanıcıyı reddedebilir
- MAM (uygulama koruması) bazı senaryolarda lisanssız çalışabilir

> **Kritik senaryo:** Lisanssız kullanıcının cihazı Entra Hybrid Join olsa bile Intune compliance değerlendirmesine giremez. Bu durum koşullu erişim politikalarını atlatmak için değil, yanlışlıkla erişim kesmek için ciddi risk taşır.

---

## SSO ve Enterprise State Roaming (ESR)

### Single Sign-On Mekanizması

Entra Joined veya Hybrid Joined cihazlarda SSO şu katmanlarla çalışır:

1. **Primary Refresh Token (PRT):** Cihaz ilk oturum açtığında Entra ID'den alınan uzun ömürlü token. Sonraki tüm uygulama erişimlerinde kullanılır — kullanıcıdan tekrar şifre istenmez.
2. **Web Account Manager (WAM):** Windows 10/11'de tarayıcı ve uygulamaların token istemesini koordine eder
3. **Seamless SSO (on-prem):** Hybrid Join cihazlarda on-prem kaynaklara da Kerberos üzerinden otomatik giriş

**PRT sağlık kontrolü:**
```cmd
dsregcmd /status
```
`AzureAdPrt : YES` → SSO çalışıyor

### Enterprise State Roaming (ESR)

ESR, kullanıcı ayarlarını (tarayıcı favorileri, tema, parola hatırlatıcıları hariç) cihazlar arasında senkronize eder:

1. Microsoft Entra admin center → Devices → Enterprise State Roaming → **Users may sync settings and app data across devices: All**
2. Uygulanan cihazlar: Entra Joined ve Hybrid Joined Windows 10/11

---

## Uzaktan Yönetim ve Windows LAPS

### Intune Üzerinden Uzaktan İşlemler

Intune admin center → Devices → cihaz seçimi:

| İşlem | Açıklama |
|---|---|
| **Sync** | Cihazı hemen politika kontrolüne zorla |
| **Remote lock** | Cihazı kilitle (kayıp/çalıntı senaryosu) |
| **Retire** | Kurumsal verileri sil, cihazı MDM'den çıkar (BYOD güvenli silme) |
| **Wipe** | Fabrika sıfırlama |
| **Fresh start** | Windows'u yeniden yükle, kişisel veri seçeneğiyle |
| **Remote assistance** | Quick Assist ile uzak destek |

### Windows LAPS

Local Administrator Password Solution (LAPS), yerel yönetici parolasını otomatik olarak rotasyona alır ve Entra ID veya AD'de saklar.

**Windows LAPS (modern — Entra ID'de saklama):**

Intune → Endpoint Security → Account protection → Local admin password solution:

```
Backup directory         : Azure Active Directory
Password age (days)      : 30
Password length          : 20
Password complexity      : Large + small letters + numbers + special chars
Post-auth reset delay    : 24 saat
```

Parola görüntüleme:
- Intune admin center → Devices → cihaz → Local admin password
- Microsoft Entra admin center → Devices → cihaz → Local administrator password

> Windows LAPS Windows Server 2019+, Windows 10 20H2+ gerektirir (KB5025221 ve üzeri yüklü).

---

## Uygulama Yönetimi

Intune üzerinden uygulama yaşam döngüsü:

### Uygulama Türleri

| Tür | Senaryo |
|---|---|
| **Microsoft Store (yeni)** | Winget tabanlı, WinGet App ID ile basit dağıtım |
| **Win32 App (.intunewin)** | Geleneksel MSI/EXE — tam kontrol, IME gerektirir |
| **LOB App** | Kurumsal imzalı MSI/MSIX doğrudan yükleme |
| **Microsoft 365 Apps** | Office suite, Office Deployment Tool gerektirmez |
| **Web link** | Tarayıcıdan açılacak kısayollar |

### Win32 App Paketleme

1. [Win32 Content Prep Tool](https://github.com/Microsoft/Microsoft-Win32-Content-Prep-Tool) ile `.intunewin` paketi oluşturun:
```
IntuneWinAppUtil.exe -c <kaynak_klasör> -s setup.exe -o <çıktı_klasör>
```

2. Intune → Apps → Windows → Add → Win32:
   - Install command: `setup.exe /silent /norestart`
   - Uninstall command: `setup.exe /uninstall /silent`
   - Detection rule: Registry veya MSI product code

---

## Cihaz Yapılandırma Politikaları

### Yapılandırma Profili Türleri

| Profil | Kullanım |
|---|---|
| **Settings catalog** | Modern — 5000+ ayar, ARM tabanlı, önerilen |
| **Administrative templates** | ADMX tabanlı GPO benzeri yapılandırma |
| **Endpoint protection** | Defender, BitLocker, Firewall ayarları |
| **Device restrictions** | Kamera, ekran görüntüsü, USB, mağaza kısıtlamaları |
| **Custom (OMA-URI)** | Catalog'da olmayan özel CSP ayarları |

### Başlangıç İçin Minimum Profil Seti

1. **BitLocker:** Sürücü şifrelemesi, recovery key Entra ID'e yedek
2. **Firewall:** Domain/Private/Public profilleri aktif
3. **Defender:** Real-time protection, cloud-based protection, sample submission
4. **Windows Update rings:** Semi-annual channel, 0 gün feature / 0 gün quality (veya 7 gün defer)
5. **Device restrictions:** Kamera/mikrofon (isteğe bağlı), USB storage (politikaya göre)

---

## Özet

Intune'un kavramsal mimarisi üç eksen üzerine oturur:

**Kimlik** → Cihazın Entra ID'deki durumu (Registered / Hybrid Joined / Entra Joined) MDM yönetim kapsamını ve SSO davranışını belirler.

**Lisans** → Her yönetilen kullanıcıya Intune lisansı atanmalıdır; lisanssız kullanıcı Compliance dışında kalır ve Conditional Access aksar.

**Platform** → Settings Catalog, App deployment, LAPS, Windows Update rings ve Endpoint Security politikaları birlikte "GPO'nun bulut versiyonu" işlevi görür — ancak daha ayrıntılı, daha izlenebilir, uzaktan yönetilebilir.
