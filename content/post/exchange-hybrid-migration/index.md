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

Kurumsal altyapınızı buluta taşımak, günümüz iş dünyasının vazgeçilmez bir parçası haline geldi. Özellikle e-posta sistemleri, bir şirketin kalbi gibidir; iletişim ve iş sürekliliğini doğrudan etkiler. Bu makale, şirket içi (on-premises) Exchange yapınızı Exchange Online (Microsoft 365) ile nasıl harmanlayacağınızı, yani bir hibrit geçişi nasıl gerçekleştireceğinizi adım adım anlatmaktadır.

> **Not:** Bu rehber genel bir yol haritası sunar; tam anlamıyla sizin yapınıza uygun olmayabilir. Geçiş öncesi bilgilendirme amaçlıdır.

---

## 1. Geçiş Öncesi Hazırlıklar

### 1.1. OU Yapısı Analizi ve Düzenlemesi

Hibrit yapıya adım atarken Organizasyonel Birim (OU) yapılarınızı gözden geçirmek ve düzenlemek zorunludur. Şirket OU'su altında aşağıdaki 4 OU oluşturulması önerilir:

- **SirketMailboxUsers** — E-posta kutusu olan kullanıcılar
- **SirketUsers** — E-postası olmayan AD kullanıcıları
- **SirketDistGroups** — Dağıtım grupları
- **SirketGroups** — E-posta grubu olmayan genel gruplar

Bu basit düzen bile hem geçişi hem de sonrasındaki yönetimi inanılmaz derecede kolaylaştıracaktır.

### 1.2. Senkronize Edilecek Birimlerin Kontrolü

Şirket içi Exchange'den Microsoft 365'e kimlerin senkronize edileceği kritik bir karardır. Bu işlemin arkasındaki kahraman **Microsoft Entra Connect Cloud Sync** aracıdır. Kilit nokta, AD kullanıcılarının **"E-mail" (mail-attribute)** değeridir.

> **Püf Noktası:** E-posta kutusu olan tüm kullanıcıların ve dağıtım gruplarının istisnasız Office 365'e senkronize edilmesi gerekir. Senkronize olmayan birimlerin Azure kimliği oluşmaz.

### 1.3. OU Analizi ve E-posta Değerlerinin Kontrolü

Türkçe karakterlere (ş, ç, ö vb.) dikkat edin! Bu karakterler senkronizasyon sonrası Office 365'te farklı işaretlere dönüşebilir.

---

## 2. Microsoft 365 Tenant Oluşturulması

### 2.1. Domain Ekleme

Microsoft 365 Yönetici Merkezi'nden **Ayarlar → Etki Alanları → Etki alanı ekle** adımlarını izleyerek domain adınızı (örneğin sirketim.com) girin.

### 2.1.1. DNS Kayıtları

Etki alanınızın size ait olduğunu kanıtlamak için DNS'e bir TXT kaydı eklemeniz gerekir:

```
TXT adı  : @
TXT değeri: MS=ms12345678
TTL      : 3600
```

Kayıtları girdikten sonra Admin Center'a dönüp **"Doğrula"** seçeneğine tıklayın.

> **Hibrit Geçiş Ayarı:** Alan adınıza tıkladıktan sonra **"Exchange ve Exchange Online Protection"** seçeneğini kapatın. SPF, Autodiscover ve MX kayıtlarını şimdilik manuel yöneteceksiniz.

### 2.2. Accepted Domains — Autodiscover Ayarı

- Hem şirket içi Exchange'de hem Exchange Online'da "accepted domain" ayarları birebir aynı olmalıdır.
- Posta kutusu taşıma sırasında `autodiscover.domain.com` kaydı mutlaka şirket içi Exchange'e çözülmelidir.

### 2.3. Connector Ayarları

İyi haber: **Hybrid Configuration Wizard (HCW)** bu ayarların çoğunu otomatik yapar:

- Şirket içinden Office 365'e giden postalar için **Send Connector** oluşturur
- Office 365'ten şirket içine gelen postalar için **Inbound Connector** kurar
- Güvenli iletişim için **TLS** ayarlarını yapar
- **Accepted Domain** eşlemesini tamamlar

Standart hibrit kurulumda manuel Receive Connector oluşturmanıza gerek yoktur. Özel Receive Connector gerektiği durumlar:

- SMTP relay yapan 3rd party bir cihaz varsa
- Merkezi posta akışı (centralized mail flow) kullanılıyorsa

---

## 3. Hibrit Konfigürasyonu İçin Gerekli Kurulumlar

### 3.1. Windows Server VM Kurulumu

1000 kişiden az kullanıcı için: **2 CPU, 8 GB RAM, 70 GB disk** ile bir Windows Server VM yeterlidir. Kurulum sonrası güvenlik güncellemelerini tamamlayın ve makineyi domain'e dahil edin.

AD'de özel bir kullanıcı açın (örn. `azure` veya `azuresync`). Bu kullanıcıya şu roller zorunludur:
- **Domain Admin**
- **Organization Management**

### 3.2. EAC Ayarları

`https://ipadress/ecp` adresindeki Exchange Yönetici Merkezi'nde:

**Sunucular → Sanal Dizinler → EWS** altında **"Enable MRS Proxy endpoint"** seçeneğinin etkin olduğundan emin olun. Bu küçük ayar posta kutusu taşıma işlemleri için kritiktir.

### 3.3. Hybrid Configuration Wizard (HCW)

Hibrit sihirbazını [https://aka.ms/HybridWizard](https://aka.ms/HybridWizard) adresinden indirin. Edge veya Internet Explorer ile açmanız önerilir.

**Kurulum Adımları:**

1. **Şirket İçi Exchange:** "Detect the optimal Exchange Server" seçeneği sunucunuzu otomatik bulur
2. **Hesap Bilgileri:**
   - On-prem için: Domain Admin veya azure kullanıcısı
   - Office 365 için: Global Admin hesabı
3. **Hibrit Özellikler:**
   - **Full Hybrid** → Kontrollü ve aşamalı geçiş için (önerilen)
   - **Minimal Hybrid** → Hızlı, direkt geçiş senaryosu için
4. **Hibrit Topoloji:**
   - **Classic Hybrid Topology** → Full Hybrid için genellikle tercih edilir
   - **Modern Hybrid Topology** → Daha hızlı, yerel sunucuya dışarıdan erişim gerektirmez

---

## 4. Microsoft Entra Connect — Cloud Sync

### 4.1. Cloud Sync'e Giriş

Office 365 Admin Center → Azure-Kimlik → Karma Yönetim → Microsoft Entra Connect → Cloud Sync yolunu izleyin. Veya Azure Portal'da arama kutusuna **"Microsoft Entra Connect"** yazın.

### 4.2. Cloud Sync Aracı İşlemleri

1. **Yeni yapılandırma** → "AD'den Microsoft Entra Kimliği" seçin
2. **"Şirket içi aracıyı indir"** ile ajan yazılımını indirip kurun
3. Sol menüden **Aracılar** sekmesinde ajanın **"Etkin"** göründüğünü doğrulayın

### 4.2.1. Kapsam Belirleme Filtreleri

"Seçili kuruluş birimleri" seçeneğiyle hangi OU'ların senkronize edileceğini belirleyin.

**Örnek DN Bilgileri:**
```
OU=SirketMailboxUsers,OU=Sirketim,DC=sirketim,DC=com
OU=SirketDistGroups,OU=Sirketim,DC=sirketim,DC=com
```

> DN bilgisini almak için ilgili OU'ya sağ tıklayın → Özellikler → Öznitelik Düzenleyici → **distinguishedName**

### 4.2.2. Öznitelik Eşleştirmesi (Attribute Mapping)

`UserPrincipalName` karşısına şunu yazın:

```
Trim([mail])
```

Bu ifade mail attribute değerini alarak Office 365'e UPN olarak iletir.

### 4.3. Senkronizasyon Başlangıcı

Yapıyı devreye aldıktan sonra **"Hazırlamayı yeniden başlat"** (Restart provisioning) seçeneğine tıklayın. **İzleyici → Sağlama Günlükleri** üzerinden süreci takip edebilirsiniz.

### 4.4. Public DNS Kayıtları

Hibrit yapı kullandığımız için MX ve Autodiscover kayıtlarını şimdilik değiştirmenize gerek yok. Ancak **SPF kaydınızı mutlaka güncelleyin:**

```
include:spf.protection.outlook.com -all
```

### 4.5. Mail Testi

Exchange Online ve şirket içi Exchange üzerinden hem iç hem dış posta testleri yapın.

### 4.6. Mailbox Geçişi (Migration)

**Exchange Admin Center → Migration → Add migration batch:**

| Adım | Seçim |
|---|---|
| Migration path | Migration to Exchange Online |
| Migration type | Remote move migration |
| Kullanıcı ekleme | Manually add users |
| Schedule | Automatically |

Ana ekranda işlem `syncing → synced → complete` olarak ilerleyecektir.

---

## Sonuç

Exchange On-Premises'ten Microsoft 365'e hibrit geçiş süreci, adım adım ve dikkatli bir planlamayla sorunsuz şekilde tamamlanabilir. Active Directory hazırlıklarından Cloud Sync kurulumuna ve posta kutusu taşıma işlemlerine kadar her aşama, bulut maceranızın başarılı ilerlemesi için kritik öneme sahiptir.

Her altyapı farklılık gösterebilir; bu adımları kendi ortamınıza uyarlarken dikkat edin ve gerektiğinde Microsoft'un dokümantasyonlarından destek almaktan çekinmeyin.
