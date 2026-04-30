import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'auth_service.dart';
import 'crashlytics_service.dart';

class AdService extends ChangeNotifier {
  static final AdService _instance = AdService._internal();
  factory AdService() => _instance;
  AdService._internal();

  // Ad Unit IDs (Release mode uses real IDs, Debug mode uses Test IDs)
  final String _bannerAdUnitId = kReleaseMode
      ? 'ca-app-pub-8178762756925111/3924537401' // Jet10_Banner_Main
      : 'ca-app-pub-3940256099942544/6300978111';
  final String _interstitialAdUnitId = kReleaseMode
      ? 'ca-app-pub-8178762756925111/6163687930' // Jet10_Gecis_Bolum_Arasi
      : 'ca-app-pub-3940256099942544/1033173712';
  final String _rewardedAdUnitId = kReleaseMode
      ? 'ca-app-pub-8178762756925111/6550700740' // Jet10_Odullu_Jeton_Kazanim
      : 'ca-app-pub-3940256099942544/5224354917';

  RewardedAd? _rewardedAd;
  InterstitialAd? _interstitialAd;
  
  bool _isRewardedAdLoaded = false;
  bool _isInterstitialAdLoaded = false;

  int _gameExitCount = 0;

  bool get isRewardedAdLoaded => _isRewardedAdLoaded;

  Future<void> init() async {
    CrashlyticsService().breadcrumb('ad_flow', 'mobile_ads_init_start');
    await MobileAds.instance.initialize();
    CrashlyticsService().breadcrumb('ad_flow', 'mobile_ads_init_done');
    _loadRewardedAd();
    _loadInterstitialAd();
  }

  // ================= BANNER AD =================
  BannerAd? createBannerAd() {
    if (AuthService().localUser?.isPremium == true) return null;
    CrashlyticsService().breadcrumb('ad_flow', 'banner_requested');

    return BannerAd(
      adUnitId: _bannerAdUnitId,
      size: AdSize.banner,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          debugPrint('BannerAd yüklendi.');
          CrashlyticsService().breadcrumb('ad_flow', 'banner_loaded');
        },
        onAdFailedToLoad: (ad, error) {
          debugPrint('BannerAd yüklenemedi: $error');
          CrashlyticsService().recordError(
            error,
            StackTrace.current,
            reason: 'Banner ad failed to load',
            fatal: false,
          );
          CrashlyticsService().breadcrumb('ad_flow', 'banner_load_failed');
          ad.dispose();
        },
      ),
    )..load();
  }

  // ================= REWARDED AD =================
  void _loadRewardedAd() {
    CrashlyticsService().breadcrumb('ad_flow', 'rewarded_requested');
    RewardedAd.load(
      adUnitId: _rewardedAdUnitId,
      request: const AdRequest(),
      rewardedAdLoadCallback: RewardedAdLoadCallback(
        onAdLoaded: (ad) {
          _rewardedAd = ad;
          _isRewardedAdLoaded = true;
          CrashlyticsService().breadcrumb('ad_flow', 'rewarded_loaded');
          notifyListeners();
        },
        onAdFailedToLoad: (err) {
          debugPrint('RewardedAd yüklenemedi: ${err.message}');
          CrashlyticsService().recordError(
            err,
            StackTrace.current,
            reason: 'Rewarded ad failed to load',
            fatal: false,
          );
          CrashlyticsService().breadcrumb('ad_flow', 'rewarded_load_failed');
          _isRewardedAdLoaded = false;
          notifyListeners();
        },
      ),
    );
  }

  void showRewardedAd(Function onRewardEarned) {
    if (AuthService().localUser?.isPremium == true) {
      CrashlyticsService().breadcrumb('ad_flow', 'rewarded_bypassed_premium');
      onRewardEarned(); // Premium users get the reward instantly without an ad
      return;
    }

    if (_rewardedAd != null && _isRewardedAdLoaded) {
      CrashlyticsService().breadcrumb('ad_flow', 'rewarded_show_attempt');
      _rewardedAd!.fullScreenContentCallback = FullScreenContentCallback(
        onAdDismissedFullScreenContent: (ad) {
          ad.dispose();
          _isRewardedAdLoaded = false;
          CrashlyticsService().breadcrumb('ad_flow', 'rewarded_dismissed');
          notifyListeners();
          _loadRewardedAd(); // Reload for next time
        },
        onAdFailedToShowFullScreenContent: (ad, err) {
          ad.dispose();
          _isRewardedAdLoaded = false;
          CrashlyticsService().recordError(
            err,
            StackTrace.current,
            reason: 'Rewarded ad failed to show',
            fatal: false,
          );
          CrashlyticsService().breadcrumb('ad_flow', 'rewarded_show_failed');
          notifyListeners();
          _loadRewardedAd();
        },
      );

      _rewardedAd!.show(onUserEarnedReward: (ad, reward) {
        CrashlyticsService().breadcrumb('ad_flow', 'rewarded_reward_granted');
        onRewardEarned();
      });
    } else {
      CrashlyticsService().breadcrumb('ad_flow', 'rewarded_show_skipped_not_loaded');
    }
  }

  // ================= INTERSTITIAL AD =================
  void _loadInterstitialAd() {
    CrashlyticsService().breadcrumb('ad_flow', 'interstitial_requested');
    InterstitialAd.load(
      adUnitId: _interstitialAdUnitId,
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          _interstitialAd = ad;
          _isInterstitialAdLoaded = true;
          CrashlyticsService().breadcrumb('ad_flow', 'interstitial_loaded');
        },
        onAdFailedToLoad: (err) {
          debugPrint('InterstitialAd yüklenemedi: ${err.message}');
          CrashlyticsService().recordError(
            err,
            StackTrace.current,
            reason: 'Interstitial ad failed to load',
            fatal: false,
          );
          CrashlyticsService().breadcrumb('ad_flow', 'interstitial_load_failed');
          _isInterstitialAdLoaded = false;
        },
      ),
    );
  }

  /// 3 çıkışta 1 ve %50 şansla gösterir.
  void showInterstitialAdOnExit() {
    if (AuthService().localUser?.isPremium == true) return;

    _gameExitCount++;
    
    // Her 3 çıkışta bir kontrol et
    if (_gameExitCount >= 3) {
      _gameExitCount = 0; // Sayacı sıfırla
      
      // %50 şansla göster
      if (Random().nextBool()) {
        if (_interstitialAd != null && _isInterstitialAdLoaded) {
          CrashlyticsService().breadcrumb('ad_flow', 'interstitial_show_attempt');
          _interstitialAd!.fullScreenContentCallback = FullScreenContentCallback(
            onAdDismissedFullScreenContent: (ad) {
              ad.dispose();
              _isInterstitialAdLoaded = false;
              CrashlyticsService().breadcrumb('ad_flow', 'interstitial_dismissed');
              _loadInterstitialAd(); // Reload for next time
            },
            onAdFailedToShowFullScreenContent: (ad, err) {
              ad.dispose();
              _isInterstitialAdLoaded = false;
              CrashlyticsService().recordError(
                err,
                StackTrace.current,
                reason: 'Interstitial ad failed to show',
                fatal: false,
              );
              CrashlyticsService().breadcrumb('ad_flow', 'interstitial_show_failed');
              _loadInterstitialAd();
            },
          );

          _interstitialAd!.show();
          CrashlyticsService().breadcrumb('ad_flow', 'interstitial_shown');
          _interstitialAd = null; // Prevent showing again until reloaded
        }
      }
    }
  }
}
