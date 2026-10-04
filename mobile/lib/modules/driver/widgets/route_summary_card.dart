import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';

class DriverRouteSummaryCard extends StatelessWidget {
  final String routeId;
  final String vehicleId;
  final int totalStops;
  final int completedStops;
  final String eta;

  /// A short status such as 'In transit'; no badge when null.
  final String? statusLabel;

  const DriverRouteSummaryCard({
    super.key,
    required this.routeId,
    required this.vehicleId,
    required this.totalStops,
    required this.completedStops,
    required this.eta,
    this.statusLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A0D302D),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: _item('ROUTE', routeId),
              ),
              Expanded(
                child: _item('VEHICLE', vehicleId),
              ),
              Expanded(
                child: _item('STOPS', '$totalStops'),
              ),
              Expanded(
                child: _item(
                  'COMPLETED',
                  '$completedStops / $totalStops',
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.schedule_outlined,
                size: 20,
                color: AppColors.secondaryText,
              ),
              const SizedBox(width: 8),
              const Text(
                'Current ETA',
                style: AppTextStyles.labelMedium,
              ),
              const Spacer(),
              Text(
                eta,
                style: AppTextStyles.heading3,
              ),
              if (statusLabel != null) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: AppColors.successLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  statusLabel!,
                  style: AppTextStyles.statusSuccess,
                ),
              ),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _item(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: AppTextStyles.labelSmall,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: AppTextStyles.heading3,
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}