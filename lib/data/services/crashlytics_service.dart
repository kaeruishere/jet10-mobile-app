import 'dart:async';
import 'dart:io';
import 'dart:ui';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class CrashlyticsService {
  static final CrashlyticsService _instance = CrashlyticsService._internal();
  factory CrashlyticsService() => _instance;
  CrashlyticsService._internal() {
    routeObserver = _CrashlyticsRouteObserver(this);
  }

  static bool _isInitialized = false;
  FirebaseCrashlytics get _crashlytics => FirebaseCrashlytics.instance;
  FirebaseAnalytics get _analytics => FirebaseAnalytics.instance;
  late final NavigatorObserver routeObserver;

  Future<void> init() async {
    _isInitialized = true;
    await _crashlytics.setCrashlyticsCollectionEnabled(!kDebugMode);
    await _setDeviceMetadata();
  }

  Future<void> log(String message) async {
    if (!_isInitialized) return;
    await _crashlytics.log(message);
  }

  Future<void> breadcrumb(String category, String step) async {
    if (!_isInitialized) return;
    await _crashlytics.log('[$category] $step');
  }

  Future<void> setUserId(String? uid) async {
    if (!_isInitialized) return;
    final value = (uid == null || uid.isEmpty) ? 'anonymous' : uid;
    await _crashlytics.setUserIdentifier(value);
  }

  Future<void> setCustomKey(String key, Object value) async {
    if (!_isInitialized) return;
    await _crashlytics.setCustomKey(key, value);
  }

  Future<void> trackScreen(String screenName) async {
    if (!_isInitialized) return;
    await _crashlytics.setCustomKey('last_screen', screenName);
    await _analytics.logScreenView(screenName: screenName);
  }

  Future<void> recordError(
    dynamic exception,
    StackTrace? stack, {
    String? reason,
    bool fatal = false,
  }) async {
    if (!_isInitialized) return;
    await _crashlytics.recordError(
      exception,
      stack,
      reason: reason,
      fatal: fatal,
    );
  }

  Future<void> recordFlutterError(FlutterErrorDetails details) async {
    if (!_isInitialized) return;
    await _crashlytics.recordFlutterFatalError(details);
  }

  Future<void> recordPlatformError(Object error, StackTrace stack) async {
    if (!_isInitialized) return;
    await _crashlytics.recordError(error, stack, fatal: true);
  }

  void simulateCrash() {
    FirebaseCrashlytics.instance.crash();
  }

  Future<void> _setDeviceMetadata() async {
    final info = DeviceInfoPlugin();

    if (Platform.isAndroid) {
      final android = await info.androidInfo;
      final isLowRam = android.isLowRamDevice;
      final totalMemory = android.physicalRamSize;
      final isEntryLevel = isLowRam || totalMemory <= 4096;

      await setCustomKey('platform', 'android');
      await setCustomKey('is_low_ram_device', isLowRam);
      await setCustomKey('is_entry_level_phone', isEntryLevel);
      await setCustomKey('device_sdk_int', android.version.sdkInt);
      await setCustomKey('device_model', android.model);
      return;
    }

    if (Platform.isIOS) {
      final ios = await info.iosInfo;
      await setCustomKey('platform', 'ios');
      await setCustomKey('is_low_ram_device', false);
      await setCustomKey('is_entry_level_phone', false);
      await setCustomKey('device_model', ios.utsname.machine);
      return;
    }

    await setCustomKey('platform', defaultTargetPlatform.name);
  }
}

class _CrashlyticsRouteObserver extends NavigatorObserver {
  final CrashlyticsService _crashService;
  _CrashlyticsRouteObserver(this._crashService);

  Future<void> _logRoute(Route<dynamic>? route) async {
    if (route == null) return;
    final name = route.settings.name ?? route.runtimeType.toString();
    await _crashService.trackScreen(name);
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    unawaited(_logRoute(route));
    super.didPush(route, previousRoute);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    unawaited(_logRoute(previousRoute));
    super.didPop(route, previousRoute);
  }
}
