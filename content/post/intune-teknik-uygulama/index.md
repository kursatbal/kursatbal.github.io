---
title: "Microsoft Intune — Teknik Uygulama ve Cihaz Yönetimi Rehberi"
description: "Intune ekosisteminin kurulumundan Windows 11 cihaz kaydına, gruplandırma mantığından yapılandırma profili ve zorunlu uygulama dağıtımına kadar adım adım teknik rehber."
date: 2025-05-14
draft: false
categories:
    - Microsoft 365
tags:
    - Intune
    - Microsoft 365
    - MDM
    - Entra ID
    - Device Management
    - Configuration Profile
    - Windows 11
---

Bu rehber Microsoft Intune'un kurumsal ortamlarda sıfırdan yapılandırılmasını, cihaz kaydını, politika dağıtımını ve uygulama yönetimini adım adım ele almaktadır.

---

## Intune Ekosistemi ve Portal Yönetimi

Microsoft Intune, kurumsal kaynaklara erişen uç noktaların güvenliğini sağlamak ve yapılandırmak için tasarlanmış bulut tabanlı bir **Cihaz Yönetimi (Device Management)** platformudur. Yönetim süreci birbiriyle entegre çalışan üç ana portal üzerinden yürütülür:

| Portal | Temel Kullanım Amacı | Erişim Adresi |
|---|---|---|
| **M365 Admin Center** | Kullanıcı yönetimi ve lisanslama | admin.microsoft.com |
| **Microsoft Entra** | Kimlik yönetimi, cihaz kayıt ayarları, dizin işlemleri | entra.microsoft.com |
| **Intune Admin Center** | MDM politikaları, yapılandırma profilleri, uygulama dağıtımı | intune.microsoft.com |

---

## Kullanıcı Lisanslama ve Yönetim Ayrımı

Intune üzerinden bir cihazın yönetilebilmesi için ilgili kullanıcıya **lisans atanması zorunludur.** Lisansı olmayan kullanıcı cihazını Entra ID'ye kaydedebilir; ancak Intune üzerinden yönetilemez ve politikalar uygulanmaz.

### Lisans Atama Adımları

1. **M365 Admin Center** → `admin.microsoft.com`
2. **Kullanıcılar → Etkin Kullanıcılar** — ilgili kullanıcıyı seçin
3. **Lisanslar ve Uygulamalar** sekmesine tıklayın
4. Aşağıdaki lisanslardan birini atayın ve kaydedin:
   - Microsoft 365 E3 veya E5
   - Microsoft 365 Business Premium
   - Bağımsız Intune Lisansı (Intune Standalone)

> **Not:** Lisansı olmayan kullanıcıların cihazları Entra ID üzerinde görünse de Intune portalında **"Yönetilmiyor"** olarak işaretlenir. Bu cihazlara politikalar uygulanmaz.

---

## Entra ID Cihaz Ayarları ve MDM Yapılandırması

### Üç Ana Cihaz Yapısı

| Yapı | Açıklama |
|---|---|
| **Entra ID Join** | Tamamen bulut tabanlı, tam yönetim ve SSO odaklı |
| **Kayıtlı Cihaz (Registered)** | Kişisel/BYOD cihazların kurumsal uygulamalara güvenli erişimi |
| **Hibrit Katılım (Hybrid Join)** | On-prem AD ve bulutun birlikte kullanıldığı geçiş yapısı |

### Cihaz Ayarlarının Yapılandırılması

**Microsoft Entra ID → Cihazlar (Devices) → Cihaz Ayarları (Device Settings)**

| Ayar | Değer |
|---|---|
| **Cihaz Katılımı** | "Kullanıcılar cihazlarını Microsoft Entra'ya katılabilir" → **Tümü (All)** |
| **MFA Gereksinimi** | Cihaz kaydı sırasında MFA → **Evet** |
| **Cihaz Sınırı** | Kullanıcı başına cihaz sayısı: varsayılan 50'den **20'ye** düşürün |

### MDM Otoritesinin Etkinleştirilmesi

**Entra ID → Mobilite (MDM ve MAM) → Microsoft Intune**

1. Entra ID portalında **Mobilite (MDM ve MAM)** sekmesine gidin
2. **Microsoft Intune** uygulamasını seçin
3. **MDM Kullanıcı Kapsamı (MDM User Scope)** → **Tümü (All)** — tüm lisanslı kullanıcılar için MDM yönetimini aktif edin

---

## Windows 11 Cihaz Kayıt Süreci (Entra ID Join)

Yeni bir Windows 11 makinesini kurumsal yönetime dahil etmek için:

**Ayarlar → Hesaplar → İş veya Okul Erişimi (Access work or school)**

| Adım | İşlem |
|---|---|
| **1** | **Ayarlar → Hesaplar → İş veya Okul Erişimi** yolunu izleyin |
| **2** | **Bağlan (Connect)** butonuna tıklayın |
| **3** | Doğrudan e-posta girmek **yerine** alt kısımdaki **"Bu cihazı Microsoft Entra ID'ye kat"** (Join this device to Entra ID) bağlantısına tıklayın |
| **4** | Kullanıcı bilgilerini girin ve **MFA** adımını tamamlayın |
| **5** | Kuruluş bilgilerini onaylayın ve cihazı **yeniden başlatın** |
| **6** | Cihaz açıldığında kurumsal kimlikle giriş yapın; SSO sayesinde Office portalına şifresiz erişimi doğrulayın |

> **Dikkat:** 3. adımda doğrudan e-posta girilirse cihaz "Registered" (kayıtlı) olur, "Joined" (katılmış) olmaz. "Join this device to Entra ID" bağlantısı kullanılmalıdır.

---

## Cihaz Gruplandırma ve Yönetim Mantığı

Politika dağıtımı için Entra ID üzerinde bir **Güvenlik Grubu (Security Group)** oluşturulması gerekir. Grup bazlı dağıtım, MDM yönetiminin aktif olduğu cihazları otomatik hedefler.

**Microsoft Entra ID → Gruplar → Yeni Grup**

1. Grup ismini **"IT Devices"** olarak belirleyin, üyelik tipi → **Atanmış (Assigned)**
2. Gruba yönetilen/lisanslı cihazları (**WS2**) ve yönetilmeyen/lisanssız cihazları (**WS3**) ekleyin
3. Dağıtımlar bu gruba yapıldığında yalnızca MDM yönetimi aktif olan **WS2** cihazı politikaları alacaktır

> **Mimari Fark:** WS3 grupta olsa dahi lisanssız olduğu için politikaları almaz. **Grup üyeliği politika alımını garanti etmez; lisans zorunludur.**

---

## Yapılandırma Profili: Cihaz Kısıtlamaları

**Intune → Cihazlar (Devices) → Windows → Yapılandırma Profilleri → Profil Oluştur**

Örnek: Gaming özelliklerini kısıtlayan bir profil oluşturma ("Oslo Settings"):

| Adım | İşlem |
|---|---|
| **Platform** | Windows 10 ve üzeri |
| **Profil Türü** | Şablonlar (Templates) → **Cihaz Kısıtlamaları (Device Restrictions)** |
| **Profil Adı** | `Oslo Settings` |
| **Yapılandırma** | Configuration Settings → **Oyun (Gaming)** → tüm özellikler **Engelle (Block)** |
| **Atama** | Assignments → **"IT Devices"** grubunu hedefle → Yayınla |

**Cihaz Kısıtlama profili türüyle yönetilebilecek diğer alanlar:**

| Alan | Kısıtlanabilecek Özellikler |
|---|---|
| Kamera | Ön/arka kamera engeli |
| Ekran görüntüsü | Ekran yakalama engeli |
| USB | USB depolama aygıtı engeli |
| Uygulama mağazası | Microsoft Store erişimi |
| Cortana | Sesli asistan devre dışı |
| Bluetooth | Cihaz eşleştirme engeli |

---

## Zorunlu Uygulama Dağıtımı

Kurumsal bir uygulamanın (örn. Zoom) tüm yönetilen cihazlara otomatik yüklenmesi:

**Intune → Uygulamalar (Apps) → Windows → Ekle (Add)**

1. Uygulama türü: **Microsoft Store uygulaması (yeni)** — Microsoft Store app (new)
2. Uygulama mağazasında **"Zoom"** araması yaparak uygulamayı seçin
3. **Atamalar (Assignments)** sekmesinde atama tipini belirleyin
4. **"IT Devices"** grubuna **Zorunlu (Required)** ataması yaparak kaydedin

| Atama Tipi | Davranış |
|---|---|
| **Zorunlu (Required)** | Uygulama arka planda otomatik yüklenir, kullanıcı müdahalesi gerekmez |
| **Mevcut (Available)** | Uygulama Şirket Portalı (Company Portal) üzerinden kullanıcı seçimine bırakılır |
| **Kaldır (Uninstall)** | Uygulama cihazdaysa silinir |

---

## Doğrulama

Yapılan işlemlerin başarısını kullanıcı tarafında ve Intune portalında kontrol edin:

| Kontrol Noktası | Beklenen Sonuç |
|---|---|
| **Gaming kısıtlaması** | Windows Ayarları'nda "Oyun" sekmesi tamamen kaybolur |
| **Zoom uygulaması** | Başlat menüsünde hazır görünür, manuel kurulum gerekmez |
| **SSO deneyimi** | Office, Teams vb. portallarda şifre sorulmadan otomatik giriş |
| **Uyumluluk (Compliance)** | Intune portalında yönetilen cihaz **"Uyumlu"**, lisanssız cihaz **"Yönetilmiyor"** |

Microsoft Intune, Modern Endpoint Management mimarisinin temel taşıdır. **MDM + MAM + Koşullu Erişim** kombinasyonu ile kurumsal veriler uç noktalarda güvenli ve yönetilebilir hale gelir.
