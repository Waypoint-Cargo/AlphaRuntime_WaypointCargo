import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';

class NoIssuesEmptyState extends StatelessWidget {
  final VoidCallback onReportIssueTap;

  const NoIssuesEmptyState({
    super.key,
    required this.onReportIssueTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 36.0),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(
          color: AppColors.divider,
          width: 1.0,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A0D302D),
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Soft Green Circle with Check/Inbox icon
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: Color(0xFFE8F5EF),
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(
                Icons.check_circle_outline_rounded,
                color: Color(0xFF1B6A56),
                size: 32,
              ),
            ),
          ),
          const SizedBox(height: 18),

          // Title
          const Text(
            'No Report Issues Found',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              color: AppColors.deepForestGreen,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),

          // Subtitle
          const Text(
            'All loading sessions are operating smoothly. If you encounter any stock shortfall or vehicle discrepancy, report it here.',
            style: AppTextStyles.bodySmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),

          // Navigation Button to Report Loading Issue Screen
          SizedBox(
            width: double.infinity,
            height: AppSpacing.buttonHeight,
            child: ElevatedButton.icon(
              onPressed: onReportIssueTap,
              icon: const Icon(
                Icons.near_me_outlined,
                size: 20,
                color: AppColors.deepForestGreen,
              ),
              label: const Text(
                'Report Loading Issue',
                style: AppTextStyles.button,
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.gold,
                foregroundColor: AppColors.deepForestGreen,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
