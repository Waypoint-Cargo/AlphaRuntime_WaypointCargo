import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/theme/app_text_style.dart';

class AppTheme {
  AppTheme._();

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,

    // ==========================================================
    // COLORS
    // ==========================================================

    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.deepForestGreen,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppColors.deepForestGreen,
      onPrimary: AppColors.white,

      secondary: AppColors.gold,
      onSecondary: AppColors.deepForestGreen,

      surface: AppColors.cardBackground,
      onSurface: AppColors.primaryText,

      error: AppColors.error,
      onError: AppColors.white,
    ),

    scaffoldBackgroundColor: AppColors.screenBackground,

    // ==========================================================
    // APP BAR
    // ==========================================================

    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.deepForestGreen,
      foregroundColor: AppColors.white,
      elevation: 0,
      centerTitle: false,
      toolbarHeight: AppSpacing.appBarHeight,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: AppColors.white,
      ),
    ),

    // ==========================================================
    // CARD
    // ==========================================================

    cardTheme: CardThemeData(
      color: AppColors.cardBackground,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        side: const BorderSide(
          color: AppColors.divider,
        ),
      ),
    ),

    // ==========================================================
    // ELEVATED BUTTON
    // ==========================================================

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.gold,
        foregroundColor: AppColors.deepForestGreen,
        elevation: 0,
        minimumSize: const Size(
          double.infinity,
          AppSpacing.buttonHeight,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(
            AppSpacing.buttonRadius,
          ),
        ),
        textStyle: AppTextStyles.button,
      ),
    ),

    // ==========================================================
    // INPUT
    // ==========================================================

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.white,

      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),

      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(
          AppSpacing.inputRadius,
        ),
        borderSide: const BorderSide(
          color: AppColors.border,
        ),
      ),

      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(
          AppSpacing.inputRadius,
        ),
        borderSide: const BorderSide(
          color: AppColors.border,
        ),
      ),

      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(
          AppSpacing.inputRadius,
        ),
        borderSide: const BorderSide(
          color: AppColors.deepForestGreen,
          width: 1.5,
        ),
      ),

      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(
          AppSpacing.inputRadius,
        ),
        borderSide: const BorderSide(
          color: AppColors.error,
        ),
      ),
    ),

    // ==========================================================
    // DIVIDER
    // ==========================================================

    dividerTheme: const DividerThemeData(
      color: AppColors.divider,
      thickness: 1,
      space: 1,
    ),

    // ==========================================================
    // TEXT
    // ==========================================================

    textTheme: const TextTheme(
      headlineLarge: AppTextStyles.display,
      headlineMedium: AppTextStyles.heading1,
      headlineSmall: AppTextStyles.heading2,

      titleLarge: AppTextStyles.heading2,
      titleMedium: AppTextStyles.heading3,

      bodyLarge: AppTextStyles.bodyLarge,
      bodyMedium: AppTextStyles.bodyMedium,
      bodySmall: AppTextStyles.bodySmall,

      labelLarge: AppTextStyles.labelLarge,
      labelMedium: AppTextStyles.labelMedium,
      labelSmall: AppTextStyles.labelSmall,
    ),
  );
}