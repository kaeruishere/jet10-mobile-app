import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme.dart';
import '../models/game_model.dart';

// WebView sadece mobilde import edilir
import 'webview_screen_mobile.dart'
    if (dart.library.html) 'webview_screen_web.dart';

class WebViewScreen extends StatelessWidget {
  final GameModel game;
  const WebViewScreen({super.key, required this.game});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.textPrimary, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          game.name,
          style: GoogleFonts.orbitron(
            color: AppColors.neonYellow,
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: buildGameView(game.url),
    );
  }
}
