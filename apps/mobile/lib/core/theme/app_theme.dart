import 'package:flutter/material.dart';

class AppColors {
  // Deep Space Purple Palette
  static const background = Color(0xFF080312);
  static const surface    = Color(0xFF150A26);
  static const elevated   = Color(0xFF22113C);

  // Neon Accents
  static const primary    = Color(0xFF00F0FF); // Accent Blue (pagrindinis interakcijoms)
  static const secondary  = Color(0xFFFF007A); // Accent Pink
  static const green      = Color(0xFF00E676); // Kainų kritimui
  static const error      = Color(0xFFFF2A5F); // Accent Red

  // Text
  static const textMain   = Color(0xFFF4F0FF);
  static const textSub    = Color(0xFF9B92B3);
  
  static const border     = Color(0x1FFFFFFF); // rgba(255, 255, 255, 0.12)
}

class AppTheme {
  static ThemeData get light => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.background,
    colorScheme: const ColorScheme.dark(
      primary: AppColors.primary,
      secondary: AppColors.secondary,
      background: AppColors.background,
      surface: AppColors.surface,
      error: AppColors.error,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.background,
      foregroundColor: AppColors.textMain,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontWeight: FontWeight.w600,
        fontSize: 17,
        color: AppColors.textMain,
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.black,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface.withOpacity(0.6),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: AppColors.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
    ),
  );
}
