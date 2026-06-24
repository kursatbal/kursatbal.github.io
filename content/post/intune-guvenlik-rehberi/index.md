---
title: "Microsoft Intune Gelişmiş Güvenlik Yapılandırma Rehberi"
description: "Microsoft Intune ile kurumsal uç nokta güvenliğini uçtan uca yapılandırma: MFA, Windows Hello, Autopilot, BitLocker, compliance politikaları, MAM/DLP ve Zero Trust yaklaşımı."
date: 2025-02-10
draft: false
categories:
    - Microsoft 365
tags:
    - Intune
    - Microsoft 365
    - Security
    - Zero Trust
    - MFA
    - BitLocker
    - Autopilot
    - Compliance
---

Microsoft Intune, uç nokta yönetimi ve güvenliğini tek platformda birleştiren bulut tabanlı bir MDM/MAM çözümüdür. Bu rehber, kurumsal ortamda Intune üzerinden güvenliğin katmanlı olarak nasıl yapılandırılacağını ele alır.

---

## Lisanslama ve Ön Koşullar

Intune'un tam güvenlik özelliklerini kullanabilmek için asgari lisans gereksinimleri:

| Lisans | Kapsam |
|---|---|
| **Microsoft 365 Business Premium** | KOBİ için MEM + Defender for Business |
| **Microsoft 365 E3** | MDM + MAM + temel koşullu erişim |
| **Microsoft 365 E5** | E3 + Defender for Endpoint P2 + Microsoft Purview DLP |
| **EMS E3 / E5** | Bağımsız Enterprise Mobility + Security paketleri |

> **Intune Plan 1** tüm M365/EMS lisanslarında dahilidir. **Plan 2** (Advanced Endpoint Analytics, Tunnel, Remote Help) ayrıca lisanslanır.

---

## Kimlik Yönetimi ve Güvenli Erişim

### Microsoft Entra ID Conditional Access

Conditional Access, "Doğru kullanıcı, doğru cihaz, doğru koşul" ilkesiyle çalışır. Temel politika yapısı:

- **Assignments:** Kullanıcı/grup kapsamı, bulut uygulamaları, cihaz platformu/durumu, ağ konumu
- **Conditions:** Sign-in risk, user risk (Identity Protection), cihaz uyumluluk durumu
- **Access controls:** MFA zorunluluğu, uyumlu cihaz zorunluluğu, erişim engeli

**Kritik politika örnekleri:**

| Politika | Kapsam | Kontrol |
|---|---|---|
| Tüm uygulamalar — MFA | Tüm kullanıcılar | MFA zorunlu |
| Admin portalları | Yönetici rolleri | MFA + Uyumlu cihaz |
| High risk sign-in | Tüm kullanıcılar | Erişimi engelle veya MFA + şifre sıfırla |
| Compliant device | M365 uygulamaları | Sadece Intune'a kayıtlı, uyumlu cihazlar |

### MFA ve Windows Hello for Business

**MFA yöntemleri (güçten zayıfa):**

1. FIDO2 güvenlik anahtarı (fiziksel — kimlik avı dayanıklı)
2. Windows Hello for Business (biyometri/PIN — cihaza bağlı)
3. Microsoft Authenticator (telefon onayı)
4. TOTP uygulaması (Google Authenticator vb.)
5. SMS/çağrı (en zayıf — SIM swap riski)

**Windows Hello for Business (WHfB) Yapılandırması:**

Intune → Endpoint Security → Account protection → Windows Hello for Business policy:

```
Use Windows Hello for Business : Enabled
Minimum PIN length             : 8
Maximum PIN length             : 127
Lowercase letters in PIN       : Allowed
Uppercase letters in PIN       : Allowed
Special characters in PIN      : Required
PIN expiration (days)          : 0 (süresiz — biyometri kullanımı ön planda)
PIN history                    : 10
Enable enhanced anti-spoofing  : Enabled (IR kamera zorunluluğu)
```

---

## Uç Nokta Güvenliği

### Microsoft Defender for Endpoint Entegrasyonu

Intune ↔ Defender for Endpoint entegrasyonu için:

1. Microsoft Endpoint Manager admin center → Endpoint Security → Microsoft Defender for Endpoint
2. "Allow Microsoft Defender for Endpoint to enforce Endpoint Security Configurations" → On
3. Defender portalında Intune bağlantısını etkinleştirin

Entegrasyon sonrası cihazın Defender risk seviyesi Intune compliance policy'de değerlendirilebilir:

```
Device Threat Level : Secured / Low / Medium / High
```

### Attack Surface Reduction (ASR) Kuralları

Intune → Endpoint Security → Attack surface reduction:

| ASR Kuralı | Mod | Açıklama |
|---|---|---|
| Block Office macros from creating child processes | Block | Office zararlı yazılım zincirini keser |
| Block credential stealing from LSASS | Block | Mimikatz ve benzeri araçları engeller |
| Block executable content from email | Block | E-posta tabanlı yayılımı önler |
| Block abuse of exploited vulnerable signed drivers | Block | BYOVD saldırılarına karşı |
| Block untrusted/unsigned USB execution | Block | USB tabanlı saldırıları önler |

> Kuralları önce **Audit** modda çalıştırın, 2 hafta log inceleyin, sonra **Block**'a alın.

---

## Compliance Politikaları

Uyumluluk politikaları cihazın Conditional Access'e dahil olabilmesi için karşılaması gereken minimum güvenlik çıtasını belirler.

### Windows Compliance Policy (Önerilen Minimum)

```
OS Version         : Windows 10 21H2 veya üzeri
BitLocker          : Required
Secure Boot        : Required
Code Integrity     : Required
Defender           : Real-time protection enabled, up-to-date signatures
Firewall           : Required
Antivirus          : Required
Password           : Required, min 8 karakter, max 5 dk boşta kalma
Device Threat Level: Low veya daha iyi
```

**Non-compliance aksiyonu:** 15 gün uyumsuz cihaz işaretlenir → 30. günde uzaktan kilitleme bildirimi → 45. günde koşullu erişim bloke.

---

## MAM — Uygulama Bazlı Veri Koruma (DLP)

Mobile Application Management (MAM), cihaz yönetimi olmadan uygulama düzeyinde veri koruma sağlar (BYOD senaryoları için idealdir).

### Intune App Protection Policy (APP)

**Veri transferi kısıtlamaları:**

| Ayar | Değer |
|---|---|
| Send org data to other apps | Policy managed apps only |
| Receive data from other apps | Policy managed apps only |
| Save copies of org data | Block |
| Backup org data to... | Block |
| Restrict cut, copy, paste | Policy managed apps |
| Screen capture | Block (Android) |

**Erişim gereksinimleri:**

| Ayar | Değer |
|---|---|
| PIN for access | Required |
| Biometric instead of PIN | Allow |
| Recheck access requirements | 30 dakika |
| Offline grace period | 720 saat |
| Wipe data after failed PIN attempts | 5 deneme sonrası |

---

## Windows Autopilot

Autopilot, cihazların kutusundan çıkıp son kullanıcı eline geçene kadar IT departmanına dokunmadan Intune ile yapılandırılmasını sağlar.

### Deployment Profile Ayarları

**User-driven mode** (en yaygın):

```
Deployment mode          : User-driven
Join to Azure AD as      : Azure AD joined
Microsoft Software License Terms : Auto-accept
Privacy settings         : Hide
Hide change account      : Hide
User account type        : Standard User
```

**Pre-provisioning (White Glove):** IT, cihazı son kullanıcıya vermeden önce kurum politikalarını ve uygulamaları önceden yükler. Kullanıcıya sadece kendi kimlik bilgilerini girecek bir cihaz ulaşır.

### Enrollment Status Page (ESP)

ESP, kullanıcının masaüstüne geçmeden önce tüm kritik uygulama ve politikaların yüklenmesini garanti eder:

- **Block device use until all apps and profiles are installed:** Yes
- **Show error when installation takes longer than:** 60 dakika
- **Allow users to collect logs:** Yes (sorun giderme kolaylığı)

---

## Sonuç

Intune üzerinde güvenliği katmanlı yapılandırmak; kimlik doğrulamadan cihaz uyumluluğuna, uygulama korumasından uç nokta tehdit zekasına kadar uzanan bir Zero Trust zinciri oluşturur. Her katman tek başına yetersizdir; güç, katmanların birlikte çalışmasından gelir.

| Katman | Araç |
|---|---|
| Kimlik | Entra ID + Conditional Access + MFA/WHfB |
| Cihaz | Intune MDM + Compliance Policy + BitLocker |
| Uygulama | MAM + App Protection Policy |
| Tehdit | Defender for Endpoint + ASR |
| Süreç | Autopilot + ESP |
