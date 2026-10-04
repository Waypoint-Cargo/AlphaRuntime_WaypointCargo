import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';

enum AppNoticeTone { error, warning, info }

/// A slim message strip for something that needs attention without replacing the
/// screen: a refresh that failed, changes not saved, a broken constraint.
class AppNotice extends StatelessWidget {
  final String message;
  final AppNoticeTone tone;
  final String? actionLabel;
  final VoidCallback? onAction;

  const AppNotice({
    super.key,
    required this.message,
    this.tone = AppNoticeTone.error,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final (Color color, Color background, IconData icon) = switch (tone) {
      AppNoticeTone.error => (
          AppColors.error,
          AppColors.errorLight,
          Icons.error_outline_rounded,
        ),
      AppNoticeTone.warning => (
          AppColors.pending,
          AppColors.pendingLight,
          Icons.warning_amber_rounded,
        ),
      AppNoticeTone.info => (
          AppColors.info,
          AppColors.infoLight,
          Icons.info_outline_rounded,
        ),
    };

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: color,
              ),
            ),
          ),
          if (actionLabel != null)
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text(
                actionLabel!,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
