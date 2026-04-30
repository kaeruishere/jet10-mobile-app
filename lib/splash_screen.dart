import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'core/theme/app_colors.dart';
import 'ui/screens/ana_menu_screen.dart';

// Services
import 'data/services/auth_service.dart';
import 'data/services/coin_service.dart';
import 'data/services/settings_service.dart';
import 'data/services/audio_service.dart';
import 'data/services/notification_service.dart';
import 'data/services/ad_service.dart';
import 'data/services/crashlytics_service.dart';

class CustomSplashScreen extends StatefulWidget {
  const CustomSplashScreen({super.key});

  @override
  State<CustomSplashScreen> createState() => _CustomSplashScreenState();
}

class _CustomSplashScreenState extends State<CustomSplashScreen> with TickerProviderStateMixin {
  late AnimationController _introController;
  late AnimationController _progressController;
  
  late Animation<double> _logoSlideAnimation;
  late Animation<double> _fadeAnimation;
  late Animation<double> _frameFadeAnimation;
  
  @override
  void initState() {
    super.initState();
    
    _introController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );

    _logoSlideAnimation = Tween<double>(begin: 0, end: -120).animate(
      CurvedAnimation(parent: _introController, curve: Curves.easeInOutBack)
    );
    
    _frameFadeAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _introController, curve: Curves.easeOut)
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _introController, curve: const Interval(0.5, 1.0, curve: Curves.easeIn))
    );

    _startSequence();
  }

  Future<void> _startSequence() async {
    await Future.delayed(const Duration(milliseconds: 200));
    
    if (!mounted) return;
    await _introController.forward();
    
    // Start Initialization
    try {
      // Step 1: Firebase
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      _progressController.animateTo(0.2);

      // Step 2: Critical Services
      final authService = AuthService();
      final settingsService = SettingsService();
      final crashlyticsService = CrashlyticsService();
      
      await settingsService.init();
      _progressController.animateTo(0.4);
      
      await authService.init();
      _progressController.animateTo(0.6);
      
      await crashlyticsService.init();
      _progressController.animateTo(0.7);

      // Step 3: Other Services
      await CoinService().init();
      await AdService().init();
      await AudioService().init();
      _progressController.animateTo(0.9);
      
      await NotificationService().init();
      _progressController.animateTo(1.0);

      // Finish
      await Future.delayed(const Duration(milliseconds: 300));
    } catch (e) {
      debugPrint("Initialization Error: $e");
      // Ensure we still try to initialize settings to allow the app to boot
      try {
        await SettingsService().init();
      } catch (_) {}
    }
  }

  @override
  void dispose() {
    _introController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.scaffoldDark,
      body: Center(
        child: AnimatedBuilder(
          animation: Listenable.merge([_introController, _progressController]),
          builder: (context, child) {
            return Stack(
              alignment: Alignment.center,
              children: [
                Opacity(
                  opacity: _fadeAnimation.value,
                  child: Transform.translate(
                    offset: const Offset(0, 60), 
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'JET10',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            color: AppColors.primaryDark,
                            letterSpacing: 4.0,
                            shadows: [
                              Shadow(color: AppColors.primaryDark, blurRadius: 20),
                              Shadow(color: AppColors.primaryDark, blurRadius: 40),
                            ],
                          ),
                        ),
                        const SizedBox(height: 50),
                        Container(
                          height: 8,
                          width: 250,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Stack(
                            children: [
                              Container(
                                width: 250 * _progressController.value,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF00F2FE), Color(0xFF4FACFE)],
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF00F2FE).withOpacity(0.5),
                                      blurRadius: 10,
                                    ),
                                  ],
                                ),
                              ),
                            ]
                          ),
                        ),
                        const SizedBox(height: 15),
                        const Text(
                          'Oyunlar Yükleniyor...',
                          style: TextStyle(color: Colors.white54, fontSize: 13, letterSpacing: 1.2),
                        )
                      ],
                    ),
                  ),
                ),

                Transform.translate(
                  offset: Offset(0, _logoSlideAnimation.value),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Opacity(
                        opacity: _frameFadeAnimation.value,
                        child: Container(
                          width: 150, 
                          height: 150,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(48), 
                          ),
                        ),
                      ),
                      Image.asset('assets/logo.png', width: 100, height: 100),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
