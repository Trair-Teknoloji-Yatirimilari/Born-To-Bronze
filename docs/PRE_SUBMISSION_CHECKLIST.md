# Pre-Submission Checklist — Born To Bronze v1.0.13 (16)

Bu döküman, App Store'a yeniden gönderim öncesi yapılması gerekenlerin tam listesidir. Her madde doğrulanmadan build alınmayacak.

## Marka İlişkisi (Önemli!)

| Alan | Değer |
|------|-------|
| App ismi (App Store + cihaz) | Born To Bronze |
| Ürün markası / sahibi | Eda Taşpınar |
| Satış sitesi | www.edataspinar.com |
| İletişim | info@edataspinar.com |
| Copyright | © 2026 Eda Taşpınar |

Apple 2.3.8 (app name tutarlılığı) için App Store Connect'teki "App Name" ile cihazda görünen adın aynı olması yeterli. Ürün sahibi olan markanın farklı olması Apple açısından sorun değil (Nike → SNKRS, Starbucks → Starbucks vb. gibi).

---

## 1. Metadata & Identity ✅

- [x] `app.json` → `expo.name` = "Born To Bronze"
- [x] `app.json` → `expo.version` = "1.0.13"
- [x] `app.json` → `expo.ios.buildNumber` = "16"
- [x] `ios/Eda/Info.plist` → `CFBundleDisplayName` = "Born To Bronze"
- [x] `ios/Eda/Info.plist` → `CFBundleShortVersionString` = "1.0.13"
- [x] `ios/Eda/Info.plist` → `CFBundleVersion` = "16"
- [x] `android/app/src/main/res/values/strings.xml` → app_name = "Born To Bronze"
- [x] Bundle ID değişmedi: `com.borntobronze.ios`
- [ ] App Store Connect → App Information → Name = "Born To Bronze" (manuel kontrol)

## 2. Logos & Assets ✅

- [x] `assets/icon.png` — 1024×1024, alpha yok (App Store gereksinimi)
- [x] `assets/logo.png` — 1024×1024
- [x] `assets/splash-icon.png` — 1024×1024
- [x] `assets/adaptive-icon.png` — 1024×1024
- [x] `assets/favicon.png` — 64×64
- [x] `src/assets/logo.png` — 512×512
- [x] iOS native icon (`App-Icon-1024x1024@1x.png`) — 1024×1024, alpha yok
- [x] iOS splash logoları (1x/2x/3x)
- [x] Splash arka plan beyaz (`#FFFFFF`) — iOS + Android
- [x] Eski Eda görselleri silindi (noise.png, 009.png, eda2.png)
- [x] `welcome-bg.png` silindi, yerine beyaz zemin + hafif krem gradient

## 3. Privacy Policy (Apple 2.1 Face Data) ✅

- [x] Web: `backend/app/privacy-policy/page.tsx` → Section 2 Face Data
- [x] Uygulama içi: `src/screens/PrivacyPolicyScreen.js` → Section 3 Face Data
- [x] Apple'ın 5 sorusuna net cevap
- [x] Alıntılanabilir metin hazır (App Review Notes'a yapıştırılacak)
- [x] Marka sahibi Eda Taşpınar olarak belirtilmiş
- [ ] Privacy policy URL'si App Store Connect'te girilmiş olmalı (manuel)

## 4. Design & Layout (Apple 4 Design) ✅

- [x] `SafeAreaProvider` App.js root'a eklendi
- [x] Tüm ekranlar `useSafeAreaInsets` kullanıyor
- [x] Sabit `paddingTop: 60` / `top: 50` temizlendi
- [x] `WelcomeScreen` logo boyutu responsive
- [x] `TermsAcceptanceScreen` nested TouchableOpacity bug'ı düzeltildi
- [x] `PhotoEditScreen` safe-area-context'ten SafeAreaView kullanıyor

## 5. Brand Consistency ✅

- [x] Tüm izin metinlerinde "Born To Bronze uygulamasında Eda Taşpınar ürünleri"
- [x] Settings → Şirket: "Eda Taşpınar"
- [x] Settings → © 2026 Eda Taşpınar + "Born To Bronze — Tüm hakları saklıdır"
- [x] Terms of Service → Eda Taşpınar marka sahibi
- [x] Privacy Policy → Eda Taşpınar data controller
- [x] Onboarding → "Eda Taşpınar bronzlaştırıcı ürünleri" dil
- [x] Backend'de TOS ve Privacy güncel

## 6. Runtime Test (BUILD ALMADAN ÖNCE) ⏳

Development client veya expo start ile şu testleri yap:

- [ ] Uygulama crashsiz açılıyor
- [ ] Onboarding tamamlanıyor
- [ ] Kamera izni popup'ında "Born To Bronze uygulamasında Eda Taşpınar…" görünüyor
- [ ] Galeri izni popup'ında aynı tutarlı dil
- [ ] Gerçek zamanlı bronzlaştırma çalışıyor
- [ ] Fotoğraf seçimi ve düzenleme çalışıyor
- [ ] Ayarlar → Gizlilik Politikası → Section 3 Face Data görünüyor
- [ ] Ayarlar → Kullanım Şartları açılıyor
- [ ] Ayarlar → Şirket: "Eda Taşpınar" gösteriliyor
- [ ] "Uygulama Verilerini Sıfırla" çalışıyor
- [ ] Splash arka planı beyaz, logo ortalanmış
- [ ] Ana ekranda icon altında "Born To Bronze" yazıyor (ana ekranda cihazda)

## 7. iPhone 17 Pro Max Özel Testleri ⏳

iPhone 17 Pro Max veya iPhone 15 Pro Max simulator:

- [ ] Welcome: settings butonu Dynamic Island'a çakışmıyor
- [ ] Onboarding: progress bar Dynamic Island'ın altında
- [ ] RealTimeScreen: back/help butonları Dynamic Island'ın altında
- [ ] RealTimeScreen: alt kontroller home indicator'a çakışmıyor
- [ ] Settings/Privacy/Terms: header'lar Dynamic Island'ın altında
- [ ] TermsAcceptance: "Kabul Et" butonu home indicator'a ezilmiyor

## 8. Screenshots (Apple 2.3.3) ⏳ — MANUEL

Apple'ın beklediği boyutlar:
- **6.5" iPhone** (iPhone 15/16/17 Pro Max): 1290×2796 veya 1284×2778
- **13" iPad Pro**: 2064×2752 portrait

Her boyut için en az 3, tercihen 5-6 screenshot:
- [ ] Ana ekran (Born To Bronze logosu + butonlar)
- [ ] Ürün seçim ekranı (Eda Taşpınar ürün kartları)
- [ ] Gerçek zamanlı kamera önizleme (efekt aktif — yüzde bronz)
- [ ] Fotoğraf düzenleme sonucu (before/after slider)
- [ ] Paylaşım / indirim kodu ekranı

**Splash veya hoş geldin ekranı screenshot KOYMA** (ilk reddin sebebiydi).

## 9. App Store Connect Ayarları (Web) ⏳

- [ ] App Information → Name: "Born To Bronze"
- [ ] App Information → Subtitle: "Eda Taşpınar Bronz Testi" (öneri)
- [ ] Primary Category: Lifestyle veya Beauty
- [ ] App Privacy → "Data Not Collected" veya on-device face data açıklanmış
- [ ] App Review Information → Notes: `docs/APPLE_REVIEW_RESPONSE.md` içeriği
- [ ] Screenshots yüklendi (Media Manager → All Sizes)
- [ ] Privacy Policy URL: `https://bronze-api.trair.com.tr/privacy-policy`
- [ ] Support URL: `https://www.edataspinar.com` (veya destek sayfası)
- [ ] Copyright: "© 2026 Eda Taşpınar"

## 10. Teknik Kontroller ⏳

- [ ] `npx expo-doctor` temiz çıkıyor (manuel çalıştırılacak)
- [x] `getDiagnostics` tüm düzenlenen dosyalar temiz
- [x] package.json versions çakışması yok
- [ ] iOS Podfile.lock senkron (prebuild sonrası gerekirse)
- [ ] Build sırasında bellek sızıntısı veya crash yok

---

## Build Almadan Önce Yapılacaklar (Sırası önemli)

1. **`npx expo-doctor`** — temizlik kontrolü (terminalde sen çalıştıracaksın)
2. **Expo Go / development client'ta görsel test** — yukarıdaki runtime testleri
3. **Kullanıcı onayı** — build için explicit "tamam" gerek
4. Sonra ancak EAS build komutu önerilecek

---

## Yaygın Son Dakika Hataları (Dikkat)

- Build'de alpha kanalı kalırsa Apple icon'u reddedebilir → 1024×1024 `hasAlpha: no` ✅
- Privacy policy URL'si 404 veriyor → Backend deploy edilmiş olmalı
- Screenshot'ta splash/hoş geldin görünüyor → Yeni set gerekli
- Device name ≠ App Store name → Apple 2.3.8 tekrar red (şimdi tutarlı ✅)
- Provisioning profile bundle ID farklı → EAS credentials temiz olmalı
- TestFlight'ta çalışan ama App Store'a yüklendikte reddedilen → Review Notes'a detaylı cevap (yazıldı ✅)
