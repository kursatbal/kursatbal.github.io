---
title: "Exchange Server'da Kerberos Kimlik Doğrulamasına Geçiş"
description: "Microsoft Exchange Server ortamında NTLM'den Kerberos kimlik doğrulamasına geçiş için ASA hesabı, SPN yapılandırması ve GPO ayarlarını içeren adım adım kılavuz."
date: 2025-11-10
draft: false
categories:
    - Exchange
tags:
    - Exchange
    - Kerberos
    - Active Directory
    - Security
    - GPO
---

Bu kılavuz, Microsoft Exchange Server ortamınızda Kerberos kimlik doğrulamasına geçiş için gerekli adımları detaylandırmaktadır.

---

## Ön Şartlar ve Active Directory Yapılandırması

### DNS Kayıtlarının Oluşturulması

DNS **Forward Lookup Zone** üzerinde ilgili Autodiscover ve mail adları için **A kaydı** oluşturulmalıdır.

### Alternatif Hizmet Hesabı (ASA) Computer Nesnesi Oluşturma

Kerberos'un düzgün çalışabilmesi için bir **Alternatif Hizmet Hesabı (ASA)** bilgisayar nesnesi oluşturulmalıdır. Bu nesne **devre dışı bırakılmamalıdır**.

**OU Path Tespiti:**

Exchange Server'ın bulunduğu OU üzerine gelin → Properties → Attribute Editor → `distinguishedName` değerini not alın.

**ASA Computer Nesnesi Oluşturma:**

```powershell
New-ADComputer -Name "EXCH2019ASA" `
    -AccountPassword (Read-Host "Enter new password" -AsSecureString) `
    -Description "Alternate Service Account credentials for Exchange" `
    -Enabled:$True `
    -SamAccountName "EXCH2019ASA" `
    -Path "OU=Exchange Servers,OU=Servers,OU=Company,DC=kuso,DC=local"
```

> `-Path` parametresini kendi OU yapınıza göre güncelleyin.

**AES 256 Şifrelemesini Etkinleştirme:**

```powershell
Set-ADComputer "EXCH2019ASA" -add @{"msDS-SupportedEncryptionTypes"="28"}
```

**Doğrulama:**

```powershell
Get-ADComputer "EXCH2019ASA" | Format-List msDS-SupportedEncryptionTypes
```

**AD Senkronizasyonunu Tetikleme:**

```
Repadmin /syncall /ADPe
```

---

## Exchange Server Üzerinde ASA Dağıtımı

### ASA Kimlik Bilgilerinin Dağıtılması

Bu adımlar **Exchange Management Shell (EMS)** üzerinden gerçekleştirilir.

**Scripts klasörüne geçin:**

```powershell
cd $exscripts
```

**İlk Exchange Sunucusuna Dağıtma:**

```powershell
.\RollAlternateServiceAccountPassword.ps1 `
    -ToSpecificServer "kbexchsrv.kuso.local" `
    -GenerateNewPasswordFor kuso\EXCH2019ASA$
```

> **Önemli:** `kuso\EXCH2019ASA$` kısmında netBIOS adını kullanın. İstendiğinde `Y` yazıp Enter'a basın. İşlem tamamlandığında **"Succeeded"** çıktısı görülmelidir.

**Birden Fazla Exchange Sunucusuna Dağıtma:**

```powershell
.\RollAlternateServiceAccountPassword.ps1 `
    -ToSpecificServer "exchsrv2.kuso.local" `
    -CopyFrom "kbexchsrv.kuso.local"
```

**ASA Kimlik Bilgisi Ayarlarını Kontrol Etme:**

```powershell
Get-ClientAccessServer -IncludeAlternateServiceAccountCredentialStatus |
    Format-List Name, AlternateServiceAccountConfiguration
```

Çıktıda tüm sunucular için `kuso\EXCH2019ASA$` görülmelidir.

---

## Hizmet Asıl Adlarını (SPN) Ayarlama

### Mevcut SPN İlişkilerini Kontrol Etme

CMD üzerinden çalıştırın. Çıktı **"No such SPN found"** olmalıdır:

```
setspn -F -Q http/mail.kuso.local
setspn -F -Q http/autodiscover.kuso.local
```

### SPN'leri ASA Kimlik Bilgilerine Bağlama

**MAPI/HTTP ve Outlook Anywhere SPN'si:**

```
setspn -S http/mail.kuso.local kuso\EXCH2019ASA$
```

**Autodiscover SPN'si:**

```
setspn -S http/autodiscover.kuso.local kuso\EXCH2019ASA$
```

### SPN İlişkilerini Doğrulama

```
setspn -L kuso\EXCH2019ASA$
```

---

## Exchange Sanal Dizinlerini Yapılandırma

### Outlook Anywhere İçin Kerberos

**Etkinleştirme:**

```powershell
Get-OutlookAnywhere -Server "kbexchsrv" |
    Set-OutlookAnywhere -InternalClientAuthenticationMethod Negotiate
```

**Doğrulama:**

```powershell
Get-OutlookAnywhere -Server "kbexchsrv" |
    Format-Table InternalClientAuthenticationMethod
# Beklenen: Negotiate
```

### MAPI over HTTP İçin Kerberos

**Etkinleştirme (NTLM + Negotiate):**

```powershell
Get-MapiVirtualDirectory -Server "kbexchsrv" |
    Set-MapiVirtualDirectory -IISAuthenticationMethods Ntlm,Negotiate
```

**Doğrulama:**

```powershell
Get-MapiVirtualDirectory -Server "kbexchsrv" |
    Format-List IISAuthenticationMethods
# Beklenen: {Ntlm, Negotiate}
```

**Hibrit/OAuth Ortamları İçin (Opsiyonel):**

```powershell
$mapidir = Get-MapiVirtualDirectory -Server "kbexchsrv"
$mapidir | Set-MapiVirtualDirectory `
    -IISAuthenticationMethods ($mapidir.IISAuthenticationMethods +='Negotiate')
```

---

## Son İşlemler ve Test

### Grup İlkesi (GPO) Uygulama

Kerberos kullanacak tüm kullanıcılara bir GPO uygulanmalıdır. **Authenticated Users** grubuna uygulanabilir.

Yol: `Computer Configuration → Policies → Windows Settings → Security Settings → Local Policies → Security Options`

| Policy | Setting |
|---|---|
| Restrict NTLM: Incoming NTLM traffic | Deny all accounts |
| Restrict NTLM: NTLM authentication in this domain | Disable |
| Restrict NTLM: Outgoing NTLM traffic to remote servers | Deny all |

### Hizmetleri Yeniden Başlatma

```powershell
Restart-Service MSExchangeServiceHost
Restart-WebAppPool -Name MSExchangeAutodiscoverAppPool
```

### Test ve Doğrulama

1. İstemci makinesinde **Outlook'u** başlatın
2. CMD'yi başlatın ve Kerberos biletlerini kontrol edin:

```
klist
```

Çıktıda aşağıdaki biletlerin görülmesi Kerberos'un başarıyla çalıştığını gösterir:

```
Server: HTTP/mail.kuso.local @ kuso.local
Server: HTTP/autodiscover.kuso.local @ kuso.local
KerbTicket Encryption Type: AES-256-CTS-HMAC-SHA1-96
```
