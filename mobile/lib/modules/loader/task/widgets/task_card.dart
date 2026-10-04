import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';

enum TaskCategory {
  fresh,
  style,
  tech,
}

enum TaskPriority {
  high,
  normal,
  low,
}

class PendingTaskItem {
  final String routeId;
  final TaskCategory category;
  final TaskPriority priority;
  final String vehicle;
  final String departure;
  final String outlets;
  final String items;
  final String status;
  final String subStatus;
  final bool isCompleted;

  const PendingTaskItem({
    required this.routeId,
    required this.category,
    required this.priority,
    required this.vehicle,
    required this.departure,
    required this.outlets,
    required this.items,
    this.status = 'Waiting to Load',
    this.subStatus = 'Not started yet',
    this.isCompleted = false,
  });
}

class TaskCardWidget extends StatelessWidget {
  final PendingTaskItem task;
  final VoidCallback? onOpenTask;

  const TaskCardWidget({
    super.key,
    required this.task,
    this.onOpenTask,
  });

  @override
  Widget build(BuildContext context) {
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
                    task.routeId,
                    style: AppTextStyles.heading2,
                  ),
                  const SizedBox(width: 8),
                  _buildCategoryBadge(task.category),
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
                  value: task.vehicle,
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
                    value: task.departure,
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
                  value: task.outlets,
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
                    value: task.items,
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
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: task.isCompleted ? AppColors.success : AppColors.pending,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        task.status,
                        style: AppTextStyles.labelLarge,
                      ),
                      Text(
                        task.subStatus,
                        style: AppTextStyles.bodySmall,
                      ),
                    ],
                  ),
                ],
              ),

              // Action Button
              ElevatedButton(
                onPressed: onOpenTask,
                style: ElevatedButton.styleFrom(
                  backgroundColor: task.isCompleted ? AppColors.successLight : AppColors.gold,
                  foregroundColor: task.isCompleted ? AppColors.success : AppColors.deepForestGreen,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  minimumSize: const Size(0, 40),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                    side: task.isCompleted
                        ? const BorderSide(color: AppColors.success, width: 1.0)
                        : BorderSide.none,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      task.isCompleted ? 'View Task' : 'Open Task',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: task.isCompleted ? AppColors.success : AppColors.deepForestGreen,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Icon(
                      task.isCompleted ? Icons.check_circle_outline_rounded : Icons.arrow_forward_rounded,
                      size: 16,
                      color: task.isCompleted ? AppColors.success : AppColors.deepForestGreen,
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

  Widget _buildCategoryBadge(TaskCategory category) {
    Color bg;
    Color textAndIconColor;
    String label;
    IconData icon;

    switch (category) {
      case TaskCategory.fresh:
        bg = const Color(0xFFD4ECE6);
        textAndIconColor = const Color(0xFF1B6A56);
        label = 'FRESH';
        icon = Icons.ac_unit_rounded;
        break;
      case TaskCategory.style:
        bg = const Color(0xFFEAE6FF);
        textAndIconColor = const Color(0xFF6B46C1);
        label = 'STYLE';
        icon = Icons.checkroom_outlined;
        break;
      case TaskCategory.tech:
        bg = const Color(0xFFE0F2FE);
        textAndIconColor = const Color(0xFF0284C7);
        label = 'TECH';
        icon = Icons.desktop_windows_outlined;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 13,
            color: textAndIconColor,
          ),
          const SizedBox(width: 4),
          Text(
            label,
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
    Color bg;
    Color textAndIconColor;
    String label;
    IconData icon;

    switch (priority) {
      case TaskPriority.high:
        bg = AppColors.pendingLight;
        textAndIconColor = const Color(0xFFD97706);
        label = 'High Priority';
        icon = Icons.keyboard_arrow_up_rounded;
        break;
      case TaskPriority.normal:
        bg = AppColors.pendingLight;
        textAndIconColor = const Color(0xFFB45309);
        label = 'Normal Priority';
        icon = Icons.remove_rounded;
        break;
      case TaskPriority.low:
        bg = const Color(0xFFF1F5F9);
        textAndIconColor = const Color(0xFF64748B);
        label = 'Low Priority';
        icon = Icons.keyboard_arrow_down_rounded;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: textAndIconColor,
          ),
          const SizedBox(width: 4),
          Text(
            label,
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
        Column(
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
            ),
          ],
        ),
      ],
    );
  }
}
