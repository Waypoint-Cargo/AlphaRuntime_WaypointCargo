import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTextStyles {
  AppTextStyles._();

  // ============================================================
  // HEADINGS
  // ============================================================

  static const TextStyle display = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: AppColors.primaryText,
  );

  static const TextStyle heading1 = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w700,
    color: AppColors.primaryText,
  );

  static const TextStyle heading2 = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w700,
    color: AppColors.primaryText,
  );

  static const TextStyle heading3 = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w700,
    color: AppColors.primaryText,
  );

  // ============================================================
  // BODY
  // ============================================================

  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: AppColors.primaryText,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.primaryText,
  );

  static const TextStyle bodySmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.secondaryText,
  );

  // ============================================================
  // LABELS
  // ============================================================

  static const TextStyle labelLarge = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AppColors.primaryText,
  );

  static const TextStyle labelMedium = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: AppColors.secondaryText,
  );

  static const TextStyle labelSmall = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    color: AppColors.secondaryText,
  );

  // ============================================================
  // NAVIGATION
  // ============================================================

  static const TextStyle navLabel = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    color: AppColors.secondaryText,
  );

  static const TextStyle navLabelActive = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w700,
    color: AppColors.deepForestGreen,
  );

  // ============================================================
  // BUTTONS
  // ============================================================

  static const TextStyle button = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    color: AppColors.deepForestGreen,
  );

  static const TextStyle buttonLight = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    color: AppColors.white,
  );

  // ============================================================
  // STATUS
  // ============================================================

  static const TextStyle statusSuccess = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: AppColors.success,
  );

  static const TextStyle statusPending = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: AppColors.pending,
  );

  static const TextStyle statusError = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: AppColors.error,
  );

  static const TextStyle statusInfo = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
    color: AppColors.info,
  );
}