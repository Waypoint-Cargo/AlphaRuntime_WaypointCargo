import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../models/driver_task.dart';

class DriverStopCard extends StatelessWidget {
  final DriverTaskStop stop;

  /// The stop the driver goes to next (highlighted).
  final bool isCurrent;
  final VoidCallback onTap;

  const DriverStopCard({
    super.key,
    required this.stop,
    required this.onTap,
    this.isCurrent = false,
  });

  @override
  Widget build(BuildContext context) {
    final isCompleted = stop.isDone;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.cardBackground,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isCurrent
                ? AppColors.deepForestGreen
                : Colors.transparent,
            width: isCurrent ? 1.5 : 0,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x080D302D),
              blurRadius: 12,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: isCompleted
                    ? AppColors.greenSurface
                    : isCurrent
                        ? AppColors.deepForestGreen
                        : AppColors.screenBackground,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: isCompleted
                    ? const Icon(
                        Icons.check,
                        size: 19,
                        color: AppColors.success,
                      )
                    : Text(
                        '${stop.sequence}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: isCurrent
                              ? Colors.white
                              : AppColors.secondaryText,
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    stop.outlet.name,
                    style: AppTextStyles.heading3,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    stop.outlet.district,
                    style: AppTextStyles.bodySmall,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(
                        Icons.schedule_outlined,
                        size: 14,
                        color: AppColors.secondaryText,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        stop.outlet.windowLabel,
                        style: AppTextStyles.labelSmall,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            _statusBadge(),
            const SizedBox(width: 4),
            const Icon(
              Icons.chevron_right,
              color: AppColors.secondaryText,
            ),
          ],
        ),
      ),
    );
  }

  Widget _statusBadge() {
    String text;
    Color background;
    Color foreground;

    switch (stop.status) {
      case 'COMPLETED':
        text = 'Completed';
        background = AppColors.successLight;
        foreground = AppColors.success;
        break;

      case 'PARTIAL':
        text = 'Partial';
        background = AppColors.successLight;
        foreground = AppColors.success;
        break;

      case 'FAILED':
      case 'SKIPPED':
        text = stop.status == 'FAILED' ? 'Failed' : 'Skipped';
        background = AppColors.errorLight;
        foreground = AppColors.error;
        break;

      case 'ARRIVED':
      case 'UNLOADING':
        text = stop.status == 'ARRIVED' ? 'Arrived' : 'Unloading';
        background = AppColors.greenSurface;
        foreground = AppColors.deepForestGreen;
        break;

      default:
        text = isCurrent ? 'Next' : 'Upcoming';
        background =
            isCurrent ? AppColors.greenSurface : AppColors.screenBackground;
        foreground =
            isCurrent ? AppColors.deepForestGreen : AppColors.secondaryText;
    }

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 8,
        vertical: 5,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(7),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}