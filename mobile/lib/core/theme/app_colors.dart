import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary brand color
  static const Color deepForestGreen = Color(0xFF0D302D);
  static const Color gold = Color(0xFFF2BE32);

  // Primary text colors
  static const Color primaryText = Color(0xFF0D302D);
  static const Color secondaryText = Color(0xFF6B7A78);
  static const Color mutedText = Color(0xFF8A9694);
  static const Color disabledText = Color(0xFFB5BFBD);

  // Basic colors
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);

  // Background colors for screens, cards, and muted surfaces
  static const Color screenBackground = Color(0xFFF4F6F8);
  static const Color cardBackground = Color(0xFFFFFFFF);
  static const Color mutedBackground = Color(0xFFEEF2F1);

  // Slightly tinted brand surfaces
  static const Color greenSurface = Color(0xFFE8F0EF);
  static const Color greenSurfaceDark = Color(0xFFD8E7E4);

  static const Color goldSurface = Color(0xFFFFF7DE);

  // Borders and dividers are used to separate content and provide visual structure.
  static const Color border = Color(0xFFD9E1DF);
  static const Color divider = Color(0xFFE7ECEB);

  // State colors for success, error, pending, and informational messages.
  // Success
  static const Color success = Color(0xFF2E7D5B);
  static const Color successLight = Color(0xFFE8F5EF);

  // Error
  static const Color error = Color(0xFFC94C4C);
  static const Color errorLight = Color(0xFFFCECEC);

  // Pending
  static const Color pending = Color(0xFFD99A16);
  static const Color pendingLight = Color(0xFFFFF5D9);

  // Info
  static const Color info = Color(0xFF3F7C8A);
  static const Color infoLight = Color(0xFFEAF4F6);

  // Overlay color is used for modal backgrounds, dimming the content behind it.
  static const Color overlay = Color(0x66000000);
}