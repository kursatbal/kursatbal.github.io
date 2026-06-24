---
title: "Exchange On-Premises Mailbox PST Dışa Aktarım Rehberi"
description: "Exchange On-Premises ortamında posta kutularının PST dosyalarına nasıl dışa aktarılacağını ve farklı dışa aktarım yöntemlerini açıklayan rehber."
date: 2025-07-08
draft: false
categories:
    - Exchange
tags:
    - Exchange
    - PST
    - PowerShell
    - Mailbox
---

Exchange On-Premises ortamında posta kutularını PST dosyalarına aktarmanın farklı yöntemlerini adım adım ele alıyoruz.

---

## Ön Koşullar ve Yetkilendirme

### Kullanıcı Yetkilendirmesi

PST dışa aktarımı yapacak kullanıcının **Mailbox Import Export** rolüne sahip olması gerekir:

```powershell
New-ManagementRoleAssignment -Role "Mailbox Import Export" -User kursat.test
```

### Dışa Aktarım Klasörünün Hazırlanması

1. PST dosyalarının kaydedileceği bir klasör oluşturun (örn. `C:\pst_yedek`)
2. Klasörün **Security** sekmesinde **Exchange Trusted Subsystem** grubuna **Full Control** yetkisi verin

> Bu izinler dışa aktarım işlemi sırasında kritik öneme sahiptir.

---

## PST Dışa Aktarım İşlemleri

### Tüm Posta Kutusunu Dışa Aktarma

```powershell
New-MailboxExportRequest -Mailbox kursat.test -FilePath \\ipadress\pst_yedek\kursattest.pst
```

| Parametre | Açıklama |
|---|---|
| `-Mailbox` | Dışa aktarılacak posta kutusunun adresi |
| `-FilePath` | PST'nin kaydedileceği ağ yolu |

### Belirli Bir Klasörü Dışa Aktarma

Önce klasörün tam yolunu öğrenin:

```powershell
Get-MailboxFolderStatistics -Identity kursat.test | Select Name, FolderPath
```

Ardından `-IncludeFolders` parametresiyle dışa aktarın:

```powershell
New-MailboxExportRequest -Mailbox kursat.test `
    -FilePath \\ipadress\pst_yedek\kursattest.pst `
    -IncludeFolders "#2020#"
```

Klasör Gelen Kutusu altındaysa tam yolu kullanın:

```powershell
New-MailboxExportRequest -Mailbox kursat.test `
    -FilePath \\ipadress\pst_yedek\kursattest.pst `
    -IncludeFolders "#\Gelen Kutusu\2020#"
```

### Tarih Aralığına Göre Dışa Aktarma

```powershell
New-MailboxExportRequest -Mailbox kursat.test `
    -ContentFilter {(Received -le '12/31/2022')} `
    -FilePath \\ip-adress\pst_yedek\kursattest.pst
```

| Operatör | Anlam |
|---|---|
| `-le` | Küçük veya eşit (less than or equal to) |
| `-ge` | Büyük veya eşit (greater than or equal to) |

> Tarih formatı sisteminizin bölgesel ayarlarına göre farklılık gösterebilir (MM/DD/YYYY veya DD/MM/YYYY).

---

## Dışa Aktarım Durumunu Kontrol Etme

```powershell
Get-MailboxExportRequest -Mailbox kursat.test | Get-MailboxExportRequestStatistics
```

| Alan | Açıklama |
|---|---|
| `StatusDetail` | Queued / InProgress / Completed |
| `PercentCompleted` | Tamamlanma yüzdesi |
| `SourceAlias` | İşlem yapılan posta kutusunun alias'ı |

---

## İşlemin Tamamlanması ve Doğrulama

`StatusDetail` değeri **Completed** olduğunda işlem başarıyla tamamlanmıştır. PST dosyasının belirtilen klasörde bulunup bulunmadığını kontrol edin.
