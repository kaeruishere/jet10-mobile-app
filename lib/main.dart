import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import 'dart:ui';

import 'firebase_options.dart';
import 'splash_screen.dart';
import 'ui/screens/ana_menu_screen.dart';

// Core
import 'core/theme/app_theme.dart';
import 'core/theme/app_strings.dart';

// Data Layer
import 'data/services/coin_service.dart';
import 'data/services/auth_service.dart';
import 'data/services/settings_service.dart';
import 'data/services/audio_service.dart';
import 'data/services/notification_service.dart';
import 'data/services/ad_service.dart';
import 'data/services/crashlytics_service.dart';

// Providers (View Models)
import 'providers/game_provider.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint("Handling a background message: ${message.messageId}");
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  final authService = AuthService();
  final coinService = CoinService();
  final settingsService = SettingsService();
  final adService = AdService();
  final notificationService = NotificationService();
  final crashlyticsService = CrashlyticsService();

  runZonedGuarded(() {
    // Background Messaging Setup
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    FlutterError.onError = (FlutterErrorDetails details) {
      crashlyticsService.recordFlutterError(details);
    };

    PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
      crashlyticsService.recordPlatformError(error, stack);
      return true;
    };

    runApp(
      MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: authService),
          ChangeNotifierProvider.value(value: coinService),
          ChangeNotifierProvider.value(value: settingsService),
          ChangeNotifierProvider.value(value: adService),
          ChangeNotifierProvider(create: (context) => GameProvider(coinService)),
        ],
        child: Jet10App(
          notificationService: notificationService,
          crashlyticsService: crashlyticsService,
        ),
      ),
    );
  }, (error, stack) {
    crashlyticsService.recordError(
      error,
      stack,
      reason: 'Uncaught zoned error',
      fatal: true,
    );
  });
}

class Jet10App extends StatefulWidget {
  final NotificationService notificationService;
  final CrashlyticsService crashlyticsService;
  const Jet10App({
    super.key,
    required this.notificationService,
    required this.crashlyticsService,
  });

  @override
  State<Jet10App> createState() => _Jet10AppState();
}

class _Jet10AppState extends State<Jet10App> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    // Fire-and-forget cleanup.
    widget.notificationService.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    widget.crashlyticsService.breadcrumb('app_lifecycle', state.name);
    if (state == AppLifecycleState.resumed) {
      widget.notificationService.init();
    } else if (state == AppLifecycleState.detached) {
      widget.notificationService.dispose();
      AudioService().dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<SettingsService, AuthService>(
      builder: (context, settings, auth, _) {
        if (!settings.isInitialized) {
          return const MaterialApp(
            debugShowCheckedModeBanner: false,
            home: CustomSplashScreen(),
          );
        }

        AppStrings.setLanguage(settings.currentLanguage);
        
        // Analytics & Metadata (Now safe because Firebase is initialized)
        unawaited(widget.crashlyticsService.setUserId(auth.uid));
        unawaited(widget.crashlyticsService.setCustomKey('is_anonymous', auth.isAnonymous));
        unawaited(widget.crashlyticsService.setCustomKey('account_type', auth.isAnonymous ? 'anonymous' : 'linked'));
        unawaited(widget.crashlyticsService.setCustomKey('language', settings.currentLanguage));

        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: AppStrings.appName,
          themeMode: settings.isDarkMode ? ThemeMode.dark : ThemeMode.light,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          navigatorObservers: [widget.crashlyticsService.routeObserver],
          home: const AnaMenuScreen(),
        );
      },
    );
  }
}