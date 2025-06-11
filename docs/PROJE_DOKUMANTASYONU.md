# Bronzlaştırıcı Krem Önizleme Uygulaması Dokümantasyonu

## 1. Proje Genel Bakış
Bu proje, kullanıcıların fotoğraflarını yükleyip, bronzlaştırıcı krem efektlerini önizleyebilecekleri bir mobil uygulamadır. Expo ve React Native kullanılarak geliştirilmiştir.

## 2. Teknik Altyapı
- **Framework**: React Native
- **Geliştirme Ortamı**: Expo
- **Paket Yöneticisi**: npm
- **Build Sistemi**: EAS (Expo Application Services)

### Temel Bağımlılıklar
- react-native-gesture-handler
- react-native-screens
- expo-image-picker
- expo-file-system
- expo-media-library

## 3. Ana Özellikler

### 3.1 Fotoğraf Düzenleme Ekranı (PhotoEditScreen)
- Fotoğraf seçimi ve yükleme
- Alan seçimi ve boyama
- Fırça boyutu ayarlama
- Renk analizi
- Ürün listeleme
- Renk bilgisi modalı

### 3.2 Renk Analizi
- Backend API entegrasyonu
- Cilt rengi analizi
- Renk tonu eşleştirme
- Sonuç gösterimi

## 4. Karşılaşılan Sorunlar ve Çözümleri

### 4.1 Build Sorunları
- **Sorun**: "gesturehandler" hedefi bulunamama hatası
- **Çözüm**: 
  - react-native-gesture-handler ve react-native-screens paketlerinin güncellenmesi
  - Build ortamının temizlenmesi
  - EAS build'in yeniden denenmesi

### 4.2 Renk Analizi Sorunları
- **Sorun**: Expo managed workflow'da renk analizi sınırlamaları
- **Çözüm**: Backend API geliştirilerek daha doğru analiz sağlandı

### 4.3 UI Sorunları
- **Sorun**: Float pozisyonlama ile ilgili UI element erişim sorunları
- **Çözüm**: Layout yapısının yeniden düzenlenmesi ve float stillerinin kaldırılması

## 5. Build ve Dağıtım

### 5.1 Android Build
```bash
npx eas build --platform android
```

### 5.2 iOS Build
```bash
npx eas build --platform ios
```
Not: iOS build için Apple Developer hesabı gereklidir.

### 5.3 Tüm Platformlar İçin Build
```bash
npx eas build --platform all
```

## 6. Geliştirme Notları

### 6.1 State Yönetimi
- PhotoEditScreen'de state yönetimi optimize edildi
- Gereksiz render'lar engellendi
- Performans iyileştirmeleri yapıldı

### 6.2 Hata Yönetimi
- Try-catch blokları eklendi
- Kullanıcı dostu hata mesajları
- Hata durumlarında geri bildirim mekanizmaları

## 7. Gelecek Geliştirmeler
- Boyama fonksiyonunun iyileştirilmesi
- Katmanlı boyama sisteminin geliştirilmesi
- Performans optimizasyonları
- Yeni ürün ve efekt eklemeleri

## 8. Kurulum

1. Projeyi klonlayın
2. Bağımlılıkları yükleyin:
```bash
npm install
```
3. Geliştirme sunucusunu başlatın:
```bash
npx expo start
```

## 9. Katkıda Bulunma
1. Fork yapın
2. Feature branch oluşturun
3. Değişikliklerinizi commit edin
4. Branch'inizi push edin
5. Pull Request oluşturun 