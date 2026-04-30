# Release Checklist (Android)

## 1) Static quality gate
- Run `flutter pub get`
- Run `flutter analyze`
- Run `flutter test`

## 2) Release build validation
- Run `flutter run --release` on a physical Android device
- Verify app starts successfully and does not freeze on splash
- Verify game list and core navigation works

## 3) Build outputs and size
- Run `flutter build appbundle --release`
- Optional size analysis: `flutter build apk --release --analyze-size`
- Check output file under `build/app/outputs/bundle/release/*.aab`
- Compare bundle size against previous release baseline

## 4) Ads and monetization
- Verify banner ad loads on home screen
- Verify rewarded ad can be shown and reward is granted
- Verify interstitial flow on game exits
- Confirm release ad unit IDs are used in release mode

## 5) Firebase connectivity
- Confirm `android/app/google-services.json` matches production project
- Verify Auth sign-in flow (anonymous + Google sign-in)
- Verify Firestore reads/writes (coins, unlocked games, profile updates)
- Verify FCM token is saved and push open flow works

## 6) Minify/ProGuard safety checks
- Build with minify enabled (already configured in Gradle)
- Watch logcat for `ClassNotFoundException` / `NoSuchMethodError`
- If crash occurs, update `android/app/proguard-rules.pro` keep rules

## 7) Pre-store sanity
- Bump `version` in `pubspec.yaml`
- Validate app icon, splash, and app name
- Validate privacy policy / data safety declarations in Play Console
