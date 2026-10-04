import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';

class DriverIssueCard extends StatelessWidget {
  final String issueType;
  final String description;
  final String outletName;
  final String time;
  final String status;

  const DriverIssueCard({
    super.key,
    required this.issueType,
    required this.description,
    required this.outletName,
    required this.time,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final resolved = status.toLowerCase() == 'resolved';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(15),
      ),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  issueType,
                  style: AppTextStyles.heading3,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: resolved
                      ? AppColors.successLight
                      : AppColors.errorLight,
                  borderRadius:
                      BorderRadius.circular(7),
                ),
                child: Text(
                  status,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: resolved
                        ? AppColors.success
                        : AppColors.error,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          Text(
            description,
            style: AppTextStyles.bodySmall,
          ),

          const SizedBox(height: 12),

          Row(
            children: [
              const Icon(
                Icons.store_outlined,
                size: 16,
                color: AppColors.secondaryText,
              ),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  outletName,
                  style: AppTextStyles.labelMedium,
                ),
              ),
              const Icon(
                Icons.access_time,
                size: 15,
                color: AppColors.secondaryText,
              ),
              const SizedBox(width: 4),
              Text(
                time,
                style: AppTextStyles.labelSmall,
              ),
            ],
          ),
        ],
      ),
    );
  }
}