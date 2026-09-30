---
title: "FRS'ten DFSR'a SYSVOL Geçişi — Başlamadan Önce Yapılan Kontrollerin Değeri"
description: "SYSVOL geçişinde dfsrmig'i çalıştırmadan önce DC'lerin OU konumunu ve Default Domain Controllers Policy'nin uygulandığını doğrulamak, State 1'de Event 8028 Access Denied hatasını baştan önler."
date: 2026-09-30
draft: false
slug: frs-dfsr-sysvol-gecisi
categories:
    - Yazılar
tags:
    - SYSVOL
    - DFSR
    - FRS
    - dfsrmig
    - Domain Controller
    - Windows Server 2022
---

## Giriş

Bir ortamda yeni Windows Server 2022 domain controller'ları devreye alma çalışması yürütüyorduk. Bu tür projelerde ilk kontrol edilmesi gereken konulardan biri şudur: **SYSVOL replikasyonu hangi yöntemle yapılıyor?**

FRS (File Replication Service), Windows Server 2019 ve sonrasında desteklenmiyor. Ortamda SYSVOL hâlâ FRS ile replike ediliyorsa, yeni nesil bir DC eklemeden önce DFSR'a geçiş yapılması gerekiyor. Standart yol da belli: `dfsrmig` aracıyla State 0 → 1 → 2 → 3.

Ancak bu geçişi körlemesine başlatmak yerine, State değiştirmeden önce ortamın geçişe hazır olup olmadığını kontrol ettik. Bu ön kontroller, ileride "Access Denied" gibi sorunlara yol açabilecek üç önemli detayı baştan ortaya çıkardı.

## Ön kontrolde ortaya çıkan üç bulgu

### 1) DC nesneleri yanlış OU'daydı

DC'ler standart **Domain Controllers** OU'sunda değil, farklı OU'lardaydı (lab notasyonuyla):

| DC | Bulunduğu OU |
|---|---|
| DC01 | OU=Servers |
| DC02 | OU=Servers |
| DC03 | OU=Policy (özel bir OU) |

### 2) Sonuç: Default Domain Controllers Policy uygulanmıyordu

Bu politika Domain Controllers OU'suna bağlıdır. DC'ler o OU'da olmadığı için politika bu sunuculara hiç uygulanmıyordu.

### 3) Asıl kritik nokta: SeSecurityPrivilege eksikti

Politika devrede olmadığından **BUILTIN\Administrators** grubu, *Manage auditing and security log* (`SeSecurityPrivilege`) yetkisinden mahrum kalmıştı. DFSR ise geçiş sırasında `LocalSettings` nesnesinin güvenlik tanımlayıcısını (SD) yazmak için tam da bu yetkiye ihtiyaç duyuyor.

Bu eksiklik giderilmeden başlanan bir geçiş, **Event 8028 – Access Denied** hatasıyla State 1'de takılırdı. Bu durum Microsoft'un **KB2567421**'de tanımladığı desteklenmeyen konfigürasyondur.

## Geçiş öncesi uygulanan düzeltmeler

1. DC nesneleri standart **Domain Controllers** OU'suna taşındı.
2. **Default Domain Controllers Policy** içinde *Computer Configuration → Policies → Windows Settings → Security Settings → Local Policies → User Rights Assignment → Manage auditing and security log* ayarına **BUILTIN\Administrators** grubu geri tanımlandı.
3. `gpupdate /force` ve oturum yenileme ile etkinleştirildi.

Politikanın gerçekten uygulandığını, geçişe başlamadan önce şu kontrollerle doğrulayabilirsiniz:

```powershell
# DC nesnelerinin bulunduğu OU
Get-ADDomainController -Filter * |
    Select-Object Name, ComputerObjectDN

# DC üzerinde efektif yetki (Manage auditing and security log)
whoami /priv | findstr /i SeSecurityPrivilege

# Politikanın uygulandığı GPO listesi
gpresult /r /scope computer
```

## Geçiş

Ortam hazır hale geldikten sonra geçiş `dfsrmig` ile yürütüldü:

```cmd
dfsrmig /setglobalstate 1
dfsrmig /getmigrationstate

dfsrmig /setglobalstate 2
dfsrmig /getmigrationstate

dfsrmig /setglobalstate 3
dfsrmig /getmigrationstate
```

Her state değişikliğinden sonra `dfsrmig /getmigrationstate` çıktısında **tüm DC'lerin** yeni state'e ulaştığı doğrulanmadan bir sonrakine geçilmedi.

State 0 → 1 → 2 → 3 (**Eliminated**) sorunsuz tamamlandı. Tüm süreç, önceden alınan System State yedekleri ve her aşamada yapılan doğrulamalarla, hizmet kesintisi olmadan ilerledi.

## Çıkarılan ders

Bir geçişte asıl fark, aracı çalıştırmadan önce yapılan hazırlıkta ortaya çıkar. DC'lerinizin doğru OU'da olduğunu ve default policy'lerin gerçekten uygulandığını önceden doğrulamak, saatlerce sürebilecek bir troubleshooting'i daha başlamadan bitirir.

*Ortam ve isimler anonimleştirilmiştir; lab notasyonu kullanılmıştır.*
