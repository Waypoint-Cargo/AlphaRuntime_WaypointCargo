import 'package:flutter/material.dart';
import '../../../../models/loading_task.dart';

/// How a Waypoint brand is shown on the loader screens: its colours and icon.
class BrandStyle {
  BrandStyle._();

  static Color color(TaskCategory category) => switch (category) {
        TaskCategory.fresh => const Color(0xFF1B6A56),
        TaskCategory.style => const Color(0xFF6B46C1),
        TaskCategory.tech => const Color(0xFF0284C7),
      };

  static Color background(TaskCategory category) => switch (category) {
        TaskCategory.fresh => const Color(0xFFD4ECE6),
        TaskCategory.style => const Color(0xFFEAE6FF),
        TaskCategory.tech => const Color(0xFFE0F2FE),
      };

  static IconData icon(TaskCategory category) => switch (category) {
        TaskCategory.fresh => Icons.ac_unit_rounded,
        TaskCategory.style => Icons.checkroom_outlined,
        TaskCategory.tech => Icons.desktop_windows_outlined,
      };

  /// "FRESH", "STYLE" or "TECH".
  static String label(TaskCategory category) => category.apiValue;
}
