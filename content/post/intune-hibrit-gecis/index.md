---
title: "Intune Hibrit Geçiş Rehberi — On-Prem AD'den Modern Yönetime"
description: "Şirket içi Active Directory ortamından Microsoft Intune yönetimine geçiş: Entra Hybrid Join, Entra Connect / Cloud Sync, GPO ile MDM kayıt otomasyonu ve yetki kısıtlamaları."
date: 2025-03-18
draft: false
categories:
    - Microsoft 365
tags:
    - Intune
    - Microsoft 365
    - Active Directory
    - Hybrid Join
    - Entra Connect
    - MDM
    - GPO
---

Kurumsal ortamlarda yerleşik Active Directory altyapısını sürdürürken Intune yönetimine geçiş, dikkatli planlama gerektiren çok adımlı bir süreçtir. Bu rehber, kimlik senkronizasyonundan cihaz kaydına ve yetki devirlerine kadar tüm bileşenleri kapsar.

---

## Kavramsal Çerçeve: Hibrit Ortam Nedir?

**Hibrit join** (Entra Hybrid Join), cihazın hem on-prem Active Directory'ye hem de Microsoft Entra ID'ye (eski adıyla Azure AD) kayıtlı olduğu durumdur. Bu model:

- Geçiş döneminde şirket içi GPO yönetimini sürdürürken
- Intune MDM politikalarını aynı anda uygulamaya
- Koşullu erişim politikalarının cihaz durumuyla çalışmasına

olanak tanır.

**Cihaz kimlik modelleri karşılaştırması:**

| Model | AD Kaydı | Entra Kaydı | Intune Yönetimi |
|---|---|---|---|
| Domain Joined (klasik) | Var | Yok | Hayır |
| Entra Hybrid Joined | Var | Var | Evet (MDM ile) |
| Entra Joined | Yok | Var | Evet |
| Registered (BYOD) | Yok | Var (registered) | Evet (MAM ile) |

---

## Lisanslama Gereksinimleri

Intune ile MDM yönetimi için kullanıcı başına lisans zorunludur:

| Lisans | Intune MDM | Conditional Access | Defender |
|---|---|---|---|
| M365 Business Premium | Dahil | Dahil | Defender for Business |
| M365 E3 | Dahil | Dahil | — |
| M365 E5 / EMS E5 | Dahil | Dahil | Defender P2 |
| Intune standalone | Dahil | — | — |

> Lisanssız kullanıcıların cihazları MDM ile yönetilemez ve Conditional Access politikaları bu cihazları uyumsuz olarak işaretler.

---

## Entra ID ve Entra Connect Hazırlığı

### Entra ID Tenant Yapılandırması

1. **Microsoft Entra admin center** → Identity → Overview — tenant bilgilerini doğrulayın
2. **Custom domain** eklenmiş ve doğrulanmış olmalıdır
3. **UPN suffix** on-prem AD ile eşleşmeli: `kullanici@sirket.com`

### Entra Connect (Klasik) veya Cloud Sync

**Hangi araç ne zaman?**

| Araç | Uygun Senaryo |
|---|---|
| **Entra Connect (AAD Connect)** | Karmaşık filtreler, özel öznitelik eşleştirme, Exchange hibrit |
| **Cloud Sync** | Çoklu orman, basit senkronizasyon, aracı tabanlı yüksek erişilebilirlik |

**Cloud Sync kurulumu:**
1. Microsoft Entra admin center → Hybrid management → Microsoft Entra Connect → Cloud Sync
2. **Yeni yapılandırma** → "AD'den Microsoft Entra Kimliği"
3. Aracıyı (provisioning agent) indirip Exchange VM'ine veya üye sunucuya kurun
4. **Kapsam filtresi:** Senkronize edilecek OU'ları belirleyin (ör. `OU=Users,DC=sirket,DC=com`)
5. **Öznitelik eşleştirmesi:** `userPrincipalName` → `Trim([mail])` (mail özniteliği dolu olmalı)

### Servis Bağlantı Noktası (SCP) Yapılandırması

SCP, cihazların hangi Entra ID tenant'a kayıt olacağını anlamas için gereklidir.

**Group Policy üzerinden SCP (Windows 10/11):**

Bilgisayar Yapılandırması → Tercihler → Windows Ayarları → Registry:

```
Hive  : HKEY_LOCAL_MACHINE
Path  : SOFTWARE\Microsoft\Windows\CurrentVersion\CDJ\AAD
Value : TenantId   → <Entra Tenant ID>
Value : TenantName → <doğrulanmış domain adı>
```

**Alternatif — AD'de SCP nesnesi:**

```powershell
$scp = New-Object System.DirectoryServices.DirectoryEntry
$scp.Path = "LDAP://CN=62a0ff2e-97b9-4a43-99f6-73c7ecdc9b81,CN=Device Registration Configuration,CN=Services,CN=Configuration,DC=sirket,DC=com"
$scp.Keywords.Add("azureADId:<TenantId>")
$scp.Keywords.Add("azureADName:<TenantName>")
$scp.CommitChanges()
```

---

## GPO ile Cihaz Kaydı Otomasyonu

Domain-joined Windows 10/11 cihazlarının Entra Hybrid Join sürecini GPO tetikler.

### Task Scheduler Görevi (Otomatik Kayıt)

```
Group Policy Management Editor:
Bilgisayar Yapılandırması → Tercihler → Denetim Masası Ayarları → Zamanlanmış Görevler

Ad   : Automatic-Device-Join
Tetik: Kullanıcı oturum açtığında
Eylem: dsregcmd /join
```

Alternatif olarak MDM enrollment GPO ile yapılabilir:

**Bilgisayar Yapılandırması → İdari Şablonlar → Windows Bileşenleri → MDM:**

```
Enable automatic MDM enrollment using default Azure AD credentials : Enabled
```

---

## MDM Otomatik Kayıt Yapılandırması

### Intune'da MDM Kapsam Ayarı

1. Intune admin center → Devices → Enrollment → Automatic Enrollment
2. **MDM user scope:** `All` (veya pilot grup için `Some`)
3. **MDM terms of use URL, discovery URL, compliance URL** → varsayılan değerler bırakılabilir

### Kayıt Doğrulama

Cihazda komut isteminden:

```cmd
dsregcmd /status
```

Beklenen çıktı:

```
AzureAdJoined          : YES
EnterpriseJoined       : NO
DomainJoined           : YES
AzureAdPrt             : YES
```

Intune'a kayıt doğrulaması:

```cmd
mdmdiagnosticstool.exe -area Autopilot -cab c:\mdm_report.cab
```

---

## Doğrulama ve Uzaktan Yönetim

### Intune Admin Center'dan Cihaz Kontrolü

1. Devices → All Devices → cihazı filtreleyin
2. **Managed by:** `Intune` görünmeli
3. **Compliance:** `Compliant` (politika henüz atanmadıysa `Not evaluated`)
4. **Join Type:** `Hybrid Azure AD joined`

### İlk Politika Atamaları

- Yeni kaydolan cihazlar için başlangıç grubu: **Tüm Cihazlar** veya dinamik grup (`deviceOSType -eq "Windows"`)
- İlk atanacak politikalar: BitLocker encryption, Firewall, Defender settings

---

## Hibrit Yapının Kısıtlamaları

| Sınırlama | Açıklama |
|---|---|
| GPO ve MDM çakışması | Aynı ayar hem GPO hem Intune'dan geliyorsa **GPO kazanır**. Çift yönetimden kaçının. |
| Şifre yönetimi | Hibrit Join'da şifre değişikliği on-prem DC üzerinden gerçekleşir; Entra SSPR bağımsız çalışmaz |
| Autopilot + Hybrid Join | Pre-provisioning ve Hybrid Join birlikte kullanılıyorsa Intune Connector for AD gereklidir |
| LAPS | Legacy LAPS on-prem ile çalışır; Windows LAPS Entra'ya veya AD'ye ayrı ayrı yapılandırılabilir |
| Uygulama dağıtımı | Win32 uygulamaları Intune Management Extension (IME) gerektirir — cihaz her iki kaynaktan uygulama alabilir |

> Uzun vadeli hedef: Entra Joined (full cloud) mimarisine geçiş. Hibrit Join bir köprüdür, son durak değildir.
