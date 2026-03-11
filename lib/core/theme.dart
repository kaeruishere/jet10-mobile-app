import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const bg = Color(0xFF0A0A0F);
  static const surface = Color(0xFF12121A);
  static const card = Color(0xFF1A1A28);
  static const border = Color(0xFF2A2A40);

  static const neonYellow = Color(0xFFF5E642);
  static const neonOrange = Color(0xFFFF6B1A);
  static const neonCyan = Color(0xFF00E5FF);
  static const neonPink = Color(0xFFFF2D6B);

  static const textPrimary = Color(0xFFE8E8F0);
  static const textDim = Color(0xFF6B6B8A);
}

class AppTheme {
  static ThemeData get dark => ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.bg,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.neonYellow,
          secondary: AppColors.neonOrange,
          surface: AppColors.surface,
        ),
        textTheme: GoogleFonts.rajdhaniTextTheme(
          ThemeData.dark().textTheme,
        ).apply(
          bodyColor: AppColors.textPrimary,
          displayColor: AppColors.textPrimary,
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.bg,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: GoogleFonts.orbitron(
            color: AppColors.neonYellow,
            fontSize: 22,
            fontWeight: FontWeight.w900,
          ),
          iconTheme: const IconThemeData(color: AppColors.textPrimary),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: AppColors.surface,
          selectedItemColor: AppColors.neonYellow,
          unselectedItemColor: AppColors.textDim,
          type: BottomNavigationBarType.fixed,
          elevation: 0,
        ),
      );
}
