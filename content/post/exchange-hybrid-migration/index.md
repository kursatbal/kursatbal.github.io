---
title: "Exchange On-Premises'ten Microsoft 365'e Hibrit Geçiş Rehberi"
description: "Active Directory hazırlıklarından Entra Connect Cloud Sync kurulumuna ve posta kutusu taşıma işlemlerine kadar Exchange hibrit geçişinin adım adım anlatımı."
date: 2025-06-30
draft: false
categories:
    - Projects
tags:
    - Exchange
    - Microsoft 365
    - Active Directory
    - Entra Connect
    - Migration
---

Kurumsal altyapınızı buluta taşımak, günümüz iş dünyasının vazgeçilmez bir parçası haline geldi. Bu makale, şirket içi Exchange yapınızı Exchange Online (Microsoft 365) ile nasıl harmanlayacağınızı adım adım anlatmaktadır.

> **Not:** Bu rehber genel bir yol haritası sunar. Buradaki dökümanı sadece geçiş öncesi bilgilendirme gibi düşünebilirsiniz.

---

## Geçiş Öncesi Hazırlıklar

### OU Yapısı Analizi ve Düzenlemesi

Hibrit yapıya adım atarken Organizasyonel Birim (OU) yapılarınızı gözden geçirmek zorunludur. Şirket OU'su altında aşağıdaki 4 OU oluşturulması önerilir:

- **SirketMailboxUsers** — E-posta kutusu olan kullanıcılar
- **SirketUsers** — E-postası olmayan AD kullanıcıları
- **SirketDistGroups** — Dağıtım grupları
- **SirketGroups** — E-posta grubu olmayan genel gruplar

### Senkronize Edilecek Birimlerin Kontrolü

Bu işlemin arkasındaki kahraman **Microsoft Entra Connect Cloud Sync** aracıdır. Kilit nokta, AD kullanıcılarının **"E-mail" (mail-attribute)** değeridir.

> **Püf Noktası:** E-posta kutusu olan tüm kullanıcıların ve dağıtım gruplarının istisnasız Office 365'e senkronize edilmesi gerekir. Senkronize olmayan birimlerin Azure kimliği oluşmaz.

### E-posta Değerlerinin Kontrolü

Türkçe karakterlere (ş, ç, ö vb.) dikkat edin! Bu karakterler senkronizasyon sonrası Office 365'te farklı işaretlere dönüşebilir.

---

## Microsoft 365 Tenant Oluşturulması

### Domain Ekleme

Microsoft 365 Yönetici Merkezi'nden **Ayarlar → Etki Alanları → Etki alanı ekle** adımlarını izleyerek domain adınızı girin.

### DNS Kayıtları

Etki alanınızın size ait olduğunu kanıtlamak için DNS'e bir TXT kaydı eklemeniz gerekir:

```
TXT adı  : @
TXT değeri: MS=ms12345678
TTL      : 3600
```

> **Hibrit Geçiş Ayarı:** Alan adınıza tıkladıktan sonra **"Exchange ve Exchange Online Protection"** seçeneğini kapatın. SPF, Autodiscover ve MX kayıtlarını şimdilik manuel yöneteceksiniz.

### Accepted Domains — Autodiscover Ayarı

- Hem şirket içi Exchange'de hem Exchange Online'da "accepted domain" ayarları birebir aynı olmalıdır.
- Posta kutusu taşıma sırasında `autodiscover.domain.com` kaydı mutlaka şirket içi Exchange'e çözülmelidir.

### Connector Ayarları

**Hybrid Configuration Wizard (HCW)** bu ayarların çoğunu otomatik yapar:

- Şirket içinden Office 365'e giden postalar için **Send Connector** oluşturur
- Office 365'ten şirket içine gelen postalar için **Inbound Connector** kurar
- Güvenli iletişim için **TLS** ayarlarını yapar

Standart hibrit kurulumda manuel Receive Connector oluşturmanıza gerek yoktur.

---

## Hibrit Konfigürasyonu İçin Gerekli Kurulumlar

### Windows Server VM Kurulumu

1000 kişiden az kullanıcı için: **2 CPU, 8 GB RAM, 70 GB disk** ile bir Windows Server VM yeterlidir.

AD'de özel bir kullanıcı açın (örn. `azuresync`). Zorunlu roller:

- **Domain Admin**
- **Organization Management**

### EAC Ayarları

`https://ipadress/ecp` adresinden **Sunucular → Sanal Dizinler → EWS** altında **"Enable MRS Proxy endpoint"** seçeneğinin etkin olduğundan emin olun.

### Hybrid Configuration Wizard (HCW)

[https://aka.ms/HybridWizard](https://aka.ms/HybridWizard) adresinden indirin.

**Hibrit Özellikler:**

| Seçenek | Açıklama |
|---|---|
| **Full Hybrid** | Kontrollü ve aşamalı geçiş için — önerilen |
| **Minimal Hybrid** | Hızlı, direkt geçiş senaryosu için |

**Hibrit Topoloji:**

| Seçenek | Açıklama |
|---|---|
| **Classic Hybrid Topology** | Full Hybrid için genellikle tercih edilir |
| **Modern Hybrid Topology** | Daha hızlı, yerel sunucuya dışarıdan erişim gerektirmez |

---

## Microsoft Entra Connect — Cloud Sync

### Cloud Sync'e Giriş

Azure Portal'da arama kutusuna **"Microsoft Entra Connect"** yazın → Cloud Sync.

### Cloud Sync Kurulumu

1. **Yeni yapılandırma** → "AD'den Microsoft Entra Kimliği" seçin
2. **"Şirket içi aracıyı indir"** ile ajan yazılımını indirip kurun
3. Sol menüden **Aracılar** sekmesinde ajanın **"Etkin"** göründüğünü doğrulayın

### Kapsam Belirleme Filtreleri

"Seçili kuruluş birimleri" seçeneğiyle senkronize edilecek OU'ları belirleyin.

**Örnek DN Bilgileri:**

```
OU=SirketMailboxUsers,OU=Sirketim,DC=sirketim,DC=com
OU=SirketDistGroups,OU=Sirketim,DC=sirketim,DC=com
```

> DN bilgisini almak için: ilgili OU → sağ tık → Özellikler → Öznitelik Düzenleyici → **distinguishedName**

### Öznitelik Eşleştirmesi (Attribute Mapping)

`UserPrincipalName` karşısına şunu yazın:

```
Trim([mail])
```

### Public DNS Kayıtları

SPF kaydınızı mutlaka güncelleyin:

```
include:spf.protection.outlook.com -all
```

---

## Mailbox Geçişi (Migration)

**Exchange Admin Center → Migration → Add migration batch:**

| Adım | Seçim |
|---|---|
| Migration path | Migration to Exchange Online |
| Migration type | Remote move migration |
| Kullanıcı ekleme | Manually add users |
| Schedule | Automatically |

> Geçiş işlemlerinden önce bir pivot kullanıcı ve dağıtım grubu açarak tüm testlerinizi bu birimlerde gerçekleştirin.

Ana ekranda işlem `syncing → synced → complete` olarak ilerleyecektir.

---

## Sonuç

Exchange On-Premises'ten Microsoft 365'e hibrit geçiş süreci, adım adım ve dikkatli bir planlamayla sorunsuz şekilde tamamlanabilir. Her altyapı farklılık gösterebilir; bu adımları kendi ortamınıza uyarlarken dikkat edin.
