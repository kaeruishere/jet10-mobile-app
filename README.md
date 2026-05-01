# 🎮 JET10 - Retro Arcade & Oyun Kütüphanesi

JET10, merkezi bir arcade platformu ve oyun kütüphanesi olarak tasarlanmış, modern ve özelliklerle dolu bir Flutter uygulamasıdır. Nostaljik **Retro Arcade** estetiğini en yeni mobil özelliklerle birleştirerek, kullanıcılara çeşitli oyunları keşfetme, kilidini açma ve oynama imkanı sunar.

---

## 🌟 Ana Özellikler

### 🕹️ Arcade Deneyimi
- **Oyun Kütüphanesi:** Dinamik kilit açma mekanizmalarına sahip küratörlü bir minioyun listesi.
- **Uygulama İçi Minioyunlar:** Jeton kazanmak için entegre edilmiş *Yazı Tura* ve *Taş Kağıt Makas* gibi oyunlar.
- **Ekonomi Sistemi:** Oyun kilitlerini ve ödülleri yönetmek için geliştirilmiş güçlü "Jeton" sistemi.

### 🔐 Güvenli ve Sosyal
- **Firebase Kimlik Doğrulama:** Misafir girişi ve güvenli Google ile Giriş Yap entegrasyonu.
- **Bulut Senkronizasyonu:** Cloud Firestore kullanarak jetonlarınızı ve açtığınız oyunları cihazlar arasında senkronize edin.
- **Profil Özelleştirme:** Özel ikonlar ve misafir adlarıyla deneyiminizi kişiselleştirin.

### 💰 Para Kazanma ve Etkileşim
- **AdMob Entegrasyonu:** Ödüllü video reklamları izleyerek jeton kazanın.
- **Anlık Bildirimler:** Firebase Cloud Messaging aracılığıyla en yeni oyunlar ve ödüllerden haberdar olun.
- **Performans İzleme:** Stabil bir deneyim için entegre Firebase Crashlytics ve Performance takibi.

### 🎨 Modern UI/UX
- **Retro Arcade Teması:** Google Fonts ve Material 3 ile güçlendirilmiş piksel mükemmelliğinde tasarım.
- **Glassmorphism:** Premium bir his için şık, yarı saydam arayüz öğeleri.
- **Yerelleştirme:** **Türkçe (TR)** ve **İngilizce (EN)** dilleri için tam destek.
- **Adaptif Tasarım:** Koyu ve Açık modlar arasında sorunsuz geçiş.

---

## 🛠️ Teknoloji Yığını

- **Framework:** [Flutter](https://flutter.dev/) (Çoklu Platform)
- **Durum Yönetimi (State Management):** [Provider](https://pub.dev/packages/provider)
- **Arka Plan (Backend):** [Firebase](https://firebase.google.com/) (Auth, Firestore, Analytics, Crashlytics, Performance, Messaging)
- **Reklamlar:** [Google Mobile Ads SDK](https://pub.dev/packages/google_mobile_ads)
- **Yerel Depolama:** [Shared Preferences](https://pub.dev/packages/shared_preferences)
- **Ses:** [AudioPlayers](https://pub.dev/packages/audioplayers)

---

## 🚀 Başlarken

### Gereksinimler
- Flutter SDK (en güncel sürüm önerilir)
- Android/iOS için yapılandırılmış Firebase projesi
- Google Mobile Ads hesabı (prodüksiyon için)

### Kurulum

1. **Depoyu klonlayın:**
   ```bash
   git clone https://github.com/kaeruishere/Jet10.git
   cd Jet10
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   flutter pub get
   ```

3. **Firebase Yapılandırması:**
   - `google-services.json` (Android) ve `GoogleService-Info.plist` (iOS) dosyalarınızı ekleyin.
   - `firebase_options.dart` dosyasının doğru oluşturulduğundan emin olun.

4. **Uygulamayı çalıştırın:**
   ```bash
   flutter run
   ```

---

## 📂 Proje Yapısı

- `lib/core/`: Uygulama temaları, metinler ve global sabitler.
- `lib/data/`: API, Firebase ve yerel depolama için servis katmanı.
- `lib/providers/`: Durum yönetimi ve iş mantığı (business logic).
- `lib/ui/`: UI bileşenleri, ekranlar ve özel widget'lar.
- `lib/minigames/`: Arcade oyunları için mantık ve arayüz.

---

## 📸 Ekran Görüntüleri

| Ana Menü | Oyun Kütüphanesi | Profil |
| :---: | :---: | :---: |
| ![Ana Menü](https://via.placeholder.com/200x400?text=Ana+Menu) | ![Oyun Kutuphanesi](https://via.placeholder.com/200x400?text=Oyun+Library) | ![Profil](https://via.placeholder.com/200x400?text=Profil) |

---

## 📄 Lisans

Bu proje MIT Lisansı ile lisanslanmıştır.
