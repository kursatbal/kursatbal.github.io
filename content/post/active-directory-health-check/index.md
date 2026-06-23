---
title: "Active Directory Ortamında Temel Sağlık Kontrolleri"
description: "AD ortamınızı periyodik olarak kontrol etmek için kullanabileceğiniz PowerShell komutları ve Best Practices."
date: 2026-06-24
draft: false
categories:
    - Active Directory
tags:
    - PowerShell
    - Health Check
    - AD DS
image: cover.jpg
---

## Neden Periyodik Sağlık Kontrolü?

Active Directory, kurumsal kimlik altyapısının omurgasıdır. Domain Controller'ların replikasyon durumu, SYSVOL sağlığı, DNS tutarsızlıkları gibi sorunlar sessizce birikir ve en kötü zamanda kendini gösterir.

Bu yazıda hızlıca koşturabileceğiniz kontrolleri paylaşıyorum.

## 1. Domain Controller Replikasyon Durumu

```powershell
# Tüm DC'ler arası replikasyon özetini göster
repadmin /replsummary

# Hataları filtrele
repadmin /showrepl * /errorsonly
```

`repadmin /replsummary` çıktısında `Largest delta` kolonuna dikkat edin. 60 dakikanın üzerindeyse replikasyon sağlıklı değildir.

## 2. SYSVOL ve NETLOGON Paylaşım Kontrolü

SYSVOL paylaşımı her DC'de erişilebilir olmalı:

```powershell
$DCs = (Get-ADDomainController -Filter *).Name
foreach ($dc in $DCs) {
    $sysvol = Test-Path "\\$dc\SYSVOL"
    $netlogon = Test-Path "\\$dc\NETLOGON"
    [PSCustomObject]@{
        DC       = $dc
        SYSVOL   = $sysvol
        NETLOGON = $netlogon
    }
}
```

## 3. FSMO Rolleri

```powershell
# Domain FSMO rolleri
netdom query fsmo

# PowerShell ile daha detaylı
Get-ADForest | Select-Object SchemaMaster, DomainNamingMaster
Get-ADDomain | Select-Object PDCEmulator, RIDMaster, InfrastructureMaster
```

PDCEmulator rolü, şifre değişiklikleri ve zaman senkronizasyonu için kritiktir. Erişilebilir mi kontrol edin:

```powershell
$pdc = (Get-ADDomain).PDCEmulator
Test-NetConnection -ComputerName $pdc -Port 389
```

## 4. DNS Sağlık Kontrolü

```powershell
# DC'nin kendi DNS kayıtlarını doğrula
dcdiag /test:dns /v

# SRV kayıtları
nslookup -type=SRV _ldap._tcp.dc._msdcs.<DomainFQDN>
```

## 5. Event Log — Kritik Hatalar

```powershell
# Son 24 saatte Directory Services hatalarını çek
Get-WinEvent -LogName "Directory Service" -ComputerName $env:COMPUTERNAME |
    Where-Object { $_.LevelDisplayName -in "Error","Critical" -and
                   $_.TimeCreated -gt (Get-Date).AddHours(-24) } |
    Select-Object TimeCreated, Id, Message |
    Format-Table -AutoSize
```

## Özet Kontrol Listesi

| Kontrol | Araç | Sıklık |
|---|---|---|
| Replikasyon | `repadmin /replsummary` | Günlük |
| SYSVOL paylaşımı | `Test-Path` | Günlük |
| FSMO rolleri | `netdom query fsmo` | Haftalık |
| DNS SRV kayıtları | `dcdiag /test:dns` | Haftalık |
| Event Log hataları | `Get-WinEvent` | Günlük |

Bir sonraki yazıda bu kontrolleri otomasyona taşıyıp e-posta raporlama ekleyeceğiz.
