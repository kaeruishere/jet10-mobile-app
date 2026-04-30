import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primaryLight,
        secondary: AppColors.secondaryLight,
        surface: AppColors.scaffoldLight,
        background: AppColors.scaffoldLight,
        error: AppColors.errorRed,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: Color(0xFF2C2C2C),
        onBackground: Color(0xFF2C2C2C),
        tertiary: AppColors.accentLight,
      ),
      scaffoldBackgroundColor: AppColors.scaffoldLight,
      cardTheme: const CardThemeData(
        color: AppColors.cardLight,
        elevation: 8,
        shadowColor: Color(0x4D6C63FF), // primaryLight with 0.3 opacity (6C63FF)
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
          side: BorderSide(color: AppColors.primaryLight, width: 2),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: Color(0xFF2C2C2C)),
        titleTextStyle: TextStyle(color: Color(0xFF2C2C2C), fontSize: 24, fontWeight: FontWeight.bold),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryLight,
          foregroundColor: Colors.white,
          elevation: 6,
          shadowColor: AppColors.primaryLight.withOpacity(0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFF2C2C2C), width: 2),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      textTheme: GoogleFonts.vt323TextTheme(ThemeData.light().textTheme).copyWith(
        displayLarge: GoogleFonts.vt323(fontSize: 32, fontWeight: FontWeight.bold, color: const Color(0xFF2C2C2C)),
        titleLarge: GoogleFonts.vt323(fontSize: 24, fontWeight: FontWeight.bold, color: const Color(0xFF2C2C2C)),
        bodyLarge: GoogleFonts.vt323(fontSize: 18, color: const Color(0xFF2C2C2C)),
        bodyMedium: GoogleFonts.vt323(fontSize: 16, color: const Color(0xFF555555)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryLight, width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF2C2C2C), width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryLight, width: 3),
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primaryDark,
        secondary: AppColors.secondaryDark,
        surface: AppColors.surfaceDark,
        background: AppColors.scaffoldDark,
        error: AppColors.errorRed,
        onPrimary: Colors.black,
        onSecondary: Colors.white,
        onSurface: Colors.white,
        onBackground: Colors.white,
        tertiary: AppColors.accentDark,
      ),
      scaffoldBackgroundColor: AppColors.scaffoldDark,
      cardTheme: const CardThemeData(
        color: AppColors.cardDark,
        elevation: 12,
        shadowColor: Color(0x66BB86FC), // primaryDark with 0.4 opacity (BB86FC)
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16)),
          side: BorderSide(color: AppColors.primaryDark, width: 2),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: Colors.white),
        titleTextStyle: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryDark,
          foregroundColor: Colors.black, // Neon feels better with dark text
          elevation: 8,
          shadowColor: AppColors.primaryDark,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.primaryDark, width: 2),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      textTheme: GoogleFonts.vt323TextTheme(ThemeData.dark().textTheme).copyWith(
        displayLarge: GoogleFonts.vt323(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
        titleLarge: GoogleFonts.vt323(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
        bodyLarge: GoogleFonts.vt323(fontSize: 18, color: Colors.white),
        bodyMedium: GoogleFonts.vt323(fontSize: 16, color: Colors.white70),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryDark, width: 2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Colors.white30, width: 2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryDark, width: 3),
        ),
      ),
    );
  }
}
