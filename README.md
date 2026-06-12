# JET10 - Retro Arcade & Oyun Kütüphanesi

[![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://flutter.dev)
[![Dart](https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white)](https://dart.dev)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)

Merkezi bir arcade platformu ve oyun kütüphanesi olarak tasarlanmış, retro temalı bir mobil uygulama. Kullanıcıların jeton kazanıp harcayarak çeşitli mini oyunlar oynayabildiği interaktif bir ekosistem sunar.

## 🚀 Özellikler

- **Retro Temalı Arayüz:** Piksel sanatından esinlenmiş modern ve dinamik tasarım.
- **Jeton Ekonomi Sistemi:** Kullanıcıların oyun oynayarak veya reklam izleyerek jeton biriktirebildiği ekonomi motoru.
- **Firebase Entegrasyonu:** Güvenli kullanıcı kimlik doğrulaması (Auth) ve veri senkronizasyonu (Firestore).
- **AdMob Reklam Entegrasyonu:** Uygulama içi ödüllü reklamlar ile jeton kazanımı.
- **Geniş Oyun Kütüphanesi:** HTML5 tabanlı entegre oyunları mobil uygulama içinden oynatma desteği.

## 🛠️ Kullanılan Teknolojiler

- **Frontend:** Flutter & Dart
- **Backend:** Firebase (Authentication, Firestore, Cloud Functions)
- **Monetizasyon:** Google AdMob

## 📦 Kurulum ve Çalıştırma

1. Projeyi yerel makinenize indirin.
2. Flutter bağımlılıklarını yükleyin:
   ```bash
   flutter pub get
   ```
3. Firebase konfigürasyon dosyasını (`google-services.json` / `GoogleService-Info.plist`) ilgili platform dizinlerine ekleyin.
4. Uygulamayı başlatın:
   ```bash
   flutter run
   ```
