import 'package:flutter/material.dart';

class AppColors {
  // --- DARK THEME (Neon Arcade) ---
  static const Color scaffoldDark = Color(0xFF090910);
  static const Color cardDark = Color(0xFF141424);
  static const Color primaryDark = Color(0xFF00F2FE); // Neon Blue
  static const Color secondaryDark = Color(0xFFFF007F); // Hot Pink
  static const Color accentDark = Color(0xFF39FF14); // Neon Green
  static const Color surfaceDark = Color(0xFF1E1E36);

  // --- LIGHT THEME (Synthwave Sunset) ---
  static const Color scaffoldLight = Color(0xFFFBE9D0); // Pale Sunset
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color primaryLight = Color(0xFFFF2A6D); // Cyber Pink
  static const Color secondaryLight = Color(0xFF05D9E8); // Cyan
  static const Color accentLight = Color(0xFFFFC200); // Yellow
  static const Color surfaceLight = Color(0xFFF0F0F0);

  // --- COMMON COLORS ---
  static const Color jetonGold = Color(0xFFFFD700);
  static const Color errorRed = Color(0xFFFF3366);
  static const Color successGreen = Color(0xFF00FF66);

  // --- SPECIFIC UI COLORS ---
  static const Color rpsComputerBg = Color(0x33FF007F);
  static const Color rpsPlayerBg = Color(0x3300F2FE);
  static const Color optionButtonBg = Color(0x1AFFFFFF);
  
  static const Color coinFlipHeads = Color(0xFFFFD700);
  static const Color coinFlipTails = Color(0xFF00F2FE);

  // Game Cards Gradients (Neon Vibes)
  static const List<List<Color>> cardGradients = [
    [Color(0xFF00F2FE), Color(0xFF4FACFE)], // Cyan to Light Blue
    [Color(0xFFFF007F), Color(0xFFFF6EB4)], // Hot Pink to Pink
    [Color(0xFF8A2BE2), Color(0xFF4B0082)], // Blue Violet to Indigo
    [Color(0xFF39FF14), Color(0xFF00D2FF)], // Neon Green to Cyan
    [Color(0xFFFFD700), Color(0xFFFF8C00)], // Gold to Dark Orange
  ];
}
