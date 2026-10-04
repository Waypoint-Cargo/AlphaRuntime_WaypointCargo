import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';

class TodayOverviewCard extends StatelessWidget {
  final String itemsToLoad;
  final String estLoadTime;
  final String departures;
  final String onTimeTarget;

  const TodayOverviewCard({
    super.key,
    this.itemsToLoad = '248',
    this.estLoadTime = '4h 15m',
    this.departures = '3',
    this.onTimeTarget = '92%',
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
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
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Today's Overview",
            style: AppTextStyles.heading3,
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildMetricItem(
                icon: Icons.inventory_2_outlined,
                label: 'Items to load',
                value: itemsToLoad,
              ),
              _buildMetricItem(
                icon: Icons.access_time_rounded,
                label: 'Est. load time',
                value: estLoadTime,
              ),
              _buildMetricItem(
                icon: Icons.local_shipping_outlined,
                label: 'Departures',
                value: departures,
              ),
              _buildMetricItem(
                icon: Icons.track_changes_rounded,
                label: 'On-time target',
                value: onTimeTarget,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Circular icon badge
          Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              color: AppColors.greenSurfaceDark,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Icon(
                icon,
                color: AppColors.deepForestGreen,
                size: 20,
              ),
            ),
          ),
          const SizedBox(height: 8),
          // Label
          Text(
            label,
            textAlign: TextAlign.center,
            style: AppTextStyles.labelSmall,
            maxLines: 2,
          ),
          const SizedBox(height: 4),
          // Value
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              textAlign: TextAlign.center,
              style: AppTextStyles.heading3,
            ),
          ),
        ],
      ),
    );
  }
}
