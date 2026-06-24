---
title: "SPLA Mailbox Raporu — Otomatik Aylık Posta Kutusu Sayım ve Raporlama"
description: "Exchange On-Premises ortamında kullanıcı posta kutularının her ayın son günü otomatik sayılarak e-posta ile raporlanması: Relay yapılandırması, PowerShell script ve Task Scheduler kurulumu."
date: 2024-11-05
draft: false
categories:
    - Exchange
tags:
    - Exchange
    - SPLA
    - PowerShell
    - Task Scheduler
    - Reporting
---

Exchange şirket içi (on-prem) altyapısında aylık posta kutusu sayısını otomatik raporlamak, SPLA lisanslama takibi için kritik bir süreçtir. Bu döküman, script'in çalışabilmesi için gereken ön hazırlıklardan Task Scheduler otomasyonuna kadar tüm adımları kapsar.

> **Not:** Döküman kurulum ve yapılandırma adımlarını içerir. PowerShell script'inin tam hali ayrıca paylaşılmaktadır.

---

## Script Ön Hazırlık

Script, Exchange yönetim araçlarının yüklü olduğu bir makineden veya doğrudan Exchange sunucusunun kendisinden çalıştırılmalıdır. E-postanın dış dünyaya iletilebilmesi için relay tanımlamaları zorunludur.

### Exchange Admin Center (EAC) Erişimi

Exchange yönetim arayüzüne erişim için **Organization Management** rolü gereklidir. Rol atandıktan sonra:

```
https://<exchange-ip>/ecp
```

adresinden EAC'ye giriş yapılabilir.

### Receive Connector — Relay Tanımlaması

EAC'de **Mail Flow → Receive Connectors** altında yeni bir connector oluşturulur:

| Ayar | Değer |
|---|---|
| **Name** | `Relay` veya `Relayed` |
| **Role** | `Frontend Transport` |
| **Type** | `Custom` |
| **Network adapter bindings** | `All Available IPv4`, Port: 25 |
| **Remote network settings** | Script'in çalışacağı subnet (ör. `172.30.111.0/24`) veya sadece Exchange sunucusu için `172.30.111.10/32` |

Connector oluşturulduktan sonra üzerine çift tıklayarak ek ayarlar yapılır:

- **General sekmesi:** `Connector Status` → `Enable` olmalı
- **Maximum Receive Message Size:** Gerekiyorsa artırın
- **Security sekmesi:** `Anonymous users` seçeneği **işaretli** olmalı — diğer seçenekler kapalı kalabilir

### Script Değişkenlerinin Yapılandırılması

Script içindeki değişkenler ortama göre düzenlenir:

```powershell
# Raporun gönderileceği e-posta adresi
$RaporAlanMailAdresi = "splamailboxrapor@sirketim.com.tr"

# Gönderen adres
$GonderenMailAdresi  = "splamailboxcount@sirketim.com"

# Exchange SMTP sunucusu (relay)
$SMTPSunucusu        = "172.30.111.8"

# Relay portu
$SMTPPortu           = "25"

# E-posta konusu ($Konu) ve gövdesi ($Govde) isteğe göre düzenlenir
```

---

## Task Scheduler Yapılandırması

Görevin her ayın son günü otomatik çalışması için Windows Görev Zamanlayıcı kullanılır.

### Yeni Görev Oluşturma

1. Başlat → aramaya **Task Scheduler** yazıp aç
2. **Task Scheduler Library** → sağ tık → **New Task**

### General Sekmesi

| Ayar | Açıklama |
|---|---|
| **Change User and Group** | Domain üzerinden yetkili kullanıcı seçin |
| **Run whether user is logged on or not** | İşaretli olmalı — kullanıcı oturumu kapalıyken de çalışır |
| **Run with highest privileges** | İşaretli olmalı — yetki eksikliğinden kaynaklanan hataları önler |

### Triggers (Tetikleyiciler)

**New** → Tetikleyici türü:

| Ayar | Değer |
|---|---|
| **Zamanlama türü** | `Monthly` |
| **Months** | `Select all months` |
| **Days** | `Last` — her ayın son günü çalışır |

### Actions (Eylemler)

**Action:** `Start a program`

| Alan | Değer |
|---|---|
| **Program/Script** | `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe` |
| **Add arguments** | `C:\Scripts\MailboxCountReport.ps1` |

> Dosya uzantısı (`.ps1`) yazılmayı unutulmamalıdır.

---

## Test Adımları

### Script Testi

Script dosyasına sağ tıklayarak **Run with PowerShell** seçin. PowerShell ISE'de yeşil **Start** butonuyla çalıştırın. Script e-posta gönderebiliyorsa temel yapılandırma doğru demektir.

### Task Scheduler Testi

1. Görev devre dışıysa sağ tık → **Enable**
2. Görev üzerinde sağ tık → **Run** ile manuel tetikleyin
3. **History** sekmesinden çalışıp çalışmadığını, hata durumunda hata kodunu inceleyin

### Sorun Giderme

E-posta Task Scheduler üzerinden çalıştırıldığında gelmiyorsa aşağıdaki sırayla kontrol edin:

| Kontrol Noktası | Açıklama |
|---|---|
| Hesap yetkisi | Görevi çalıştıran hesap gerekli izinlere sahip mi? |
| Program/Script yolu | `powershell.exe` konumu doğru mu? |
| Argüman yolu | Script dosya yolu ve uzantısı doğru girilmiş mi? |
| Relay yapılandırması | Connector'da Anonymous users işaretli mi? |
| Firewall kuralları | Port 25 iç ağda açık mı? |

Script'in bağımsız çalışması doğrulandıktan sonra Task Scheduler üzerinden hata alınıyorsa sorun genellikle yetki veya yol yapılandırmasındadır; relay nadiren suçludur.
