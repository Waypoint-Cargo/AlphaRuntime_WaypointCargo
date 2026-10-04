import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../models/loading_task.dart';
import 'brand_style.dart';

class TaskCardWidget extends StatelessWidget {
  final LoadingTask task;
  final VoidCallback? onOpenTask;

  /// True while this task is being claimed: the button shows a spinner.
  final bool isOpening;

  const TaskCardWidget({
    super.key,
    required this.task,
    this.onOpenTask,
    this.isOpening = false,
  });

  bool get _isCompleted => task.status == TaskStatus.completed;

  @override
  Widget build(BuildContext context) {
    final status = _statusInfo();

    return Container(
      margin: const EdgeInsets.only(bottom: 14.0),
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
          // Header: Route ID + Category Badge on left, Priority Badge on right
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Route ID + Category Badge
              Row(
                children: [
                  Text(
                    task.routeCode,
                    style: AppTextStyles.heading2,
                  ),
                  if (task.brand != null) ...[
                    const SizedBox(width: 8),
                    _buildCategoryBadge(task.brand!),
                  ],
                ],
              ),

              // Priority Badge
              _buildPriorityBadge(task.priority),
            ],
          ),

          const SizedBox(height: 14),

          // 2x2 Grid with Metrics
          Row(
            children: [
              Expanded(
                child: _buildMetricItem(
                  icon: Icons.local_shipping_outlined,
                  title: 'Vehicle',
                  value: task.vehicle.code,
                ),
              ),
              Container(
                width: 1,
                height: 36,
                color: AppColors.divider,
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(left: 12.0),
                  child: _buildMetricItem(
                    icon: Icons.access_time_rounded,
                    title: 'Departure',
                    value: DateFormatter.formatDeparture(task.plannedDeparture),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),
          const Divider(height: 1, color: AppColors.divider),
          const SizedBox(height: 10),

          Row(
            children: [
              Expanded(
                child: _buildMetricItem(
                  icon: Icons.storefront_outlined,
                  title: 'Outlets',
                  value: task.outletCount == 1
                      ? '1 Outlet'
                      : '${task.outletCount} Outlets',
                ),
              ),
              Container(
                width: 1,
                height: 36,
                color: AppColors.divider,
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(left: 12.0),
                  child: _buildMetricItem(
                    icon: Icons.inventory_2_outlined,
                    title: 'Items',
                    value: '${task.itemCount} Items',
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Footer: Status on left, "Open Task / View Task" button on right
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Status with dot
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: status.color,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            status.title,
                            style: AppTextStyles.labelLarge,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            status.subtitle,
                            style: AppTextStyles.bodySmall,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),

              // Action Button
              ElevatedButton(
                onPressed: isOpening ? null : onOpenTask,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _isCompleted ? AppColors.successLight : AppColors.gold,
                  foregroundColor: _isCompleted ? AppColors.success : AppColors.deepForestGreen,
                  disabledBackgroundColor: AppColors.gold,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  minimumSize: const Size(0, 40),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                    side: _isCompleted
                        ? const BorderSide(color: AppColors.success, width: 1.0)
                        : BorderSide.none,
                  ),
                ),
                child: isOpening
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.deepForestGreen,
                        ),
                      )
                    : Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            _isCompleted ? 'View Task' : 'Open Task',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: _isCompleted ? AppColors.success : AppColors.deepForestGreen,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Icon(
                            _isCompleted ? Icons.check_circle_outline_rounded : Icons.arrow_forward_rounded,
                            size: 16,
                            color: _isCompleted ? AppColors.success : AppColors.deepForestGreen,
                          ),
                        ],
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// What the footer says about the task: the headline, the detail under it
  /// and the colour of the dot.
  ({String title, String subtitle, Color color}) _statusInfo() {
    final progress = task.progress;

    switch (task.status) {
      case TaskStatus.pending:
        // A route that breaks an operating constraint cannot be opened yet.
        if (task.violations.isNotEmpty) {
          return (
            title: 'Needs the dispatcher',
            subtitle: task.violations.first.message,
            color: AppColors.error,
          );
        }
        return (
          title: 'Waiting to Load',
          subtitle: 'Not started yet',
          color: AppColors.pending,
        );

      case TaskStatus.inProgress:
        final lock = task.lock;
        if (lock == null || lock.isMine) {
          return (
            title: 'In Progress',
            subtitle: '${progress.loadedItems} of ${progress.totalItems} items loaded',
            color: AppColors.info,
          );
        }
        if (lock.isExpired) {
          return (
            title: 'Available',
            subtitle: 'Left by ${lock.heldByName ?? 'another loader'}',
            color: AppColors.pending,
          );
        }
        return (
          title: 'In Use',
          subtitle: 'Being loaded by ${lock.heldByName ?? 'another loader'}',
          color: AppColors.info,
        );

      case TaskStatus.paused:
        return (
          title: 'Paused',
          subtitle: '${progress.loadedItems} of ${progress.totalItems} items loaded',
          color: AppColors.pending,
        );

      case TaskStatus.onHold:
        return (
          title: 'On Hold',
          subtitle: 'Waiting for the dispatcher',
          color: AppColors.error,
        );

      case TaskStatus.completed:
        return (
          title: 'Completed',
          subtitle: progress.remainingItems > 0
              ? 'Loaded short by ${progress.remainingItems} items'
              : 'Verified & Loaded',
          color: AppColors.success,
        );
    }
  }

  Widget _buildCategoryBadge(TaskCategory category) {
    final Color textAndIconColor = BrandStyle.color(category);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: BrandStyle.background(category),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            BrandStyle.icon(category),
            size: 13,
            color: textAndIconColor,
          ),
          const SizedBox(width: 4),
          Text(
            BrandStyle.label(category),
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.bold,
              color: textAndIconColor,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPriorityBadge(TaskPriority priority) {
    final bool isHigh = priority == TaskPriority.high;
    final Color textAndIconColor =
        isHigh ? const Color(0xFFD97706) : const Color(0xFFB45309);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.pendingLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isHigh ? Icons.keyboard_arrow_up_rounded : Icons.remove_rounded,
            size: 14,
            color: textAndIconColor,
          ),
          const SizedBox(width: 4),
          Text(
            isHigh ? 'High Priority' : 'Normal Priority',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: textAndIconColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: const BoxDecoration(
            color: AppColors.greenSurfaceDark,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Icon(
              icon,
              size: 17,
              color: AppColors.deepForestGreen,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTextStyles.labelSmall,
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: AppTextStyles.heading3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
