import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_error_state.dart';
import '../../../../core/widgets/app_loading_state.dart';
import '../../../../core/widgets/inner_section_header.dart';
import '../../../../models/loading_summary.dart';
import '../../../../models/loading_task.dart';
import '../../../../providers/loader_provider.dart';
import '../widgets/brand_style.dart';
import 'task_screens.dart';

/// The record of a loading task: its totals and the manifest of outlets.
///
/// Opened with the [summary] a screen already has (after completing a load), or
/// with just the [tripId] to fetch it (from the Completed tab).
class TaskDetailsScreen extends StatefulWidget {
  final String? tripId;
  final LoadingTaskSummary? summary;

  const TaskDetailsScreen({
    super.key,
    this.tripId,
    this.summary,
  });

  @override
  State<TaskDetailsScreen> createState() => _TaskDetailsScreenState();
}

class _TaskDetailsScreenState extends State<TaskDetailsScreen> {
  @override
  void initState() {
    super.initState();
    final tripId = widget.tripId;
    if (widget.summary == null && tripId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.read<LoaderProvider>().loadTaskSummary(tripId);
      });
    }
  }

  void _onDone() {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const PendingTasksScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final loader = context.watch<LoaderProvider>();
    final tripId = widget.tripId;

    final loaded = loader.taskSummary;
    final summary = widget.summary ??
        (loaded != null && loaded.task.tripId == tripId ? loaded : null);

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: InnerSectionHeader(
        title: 'Task Details',
        onBack: () => Navigator.pop(context),
      ),
      body: summary != null
          ? _buildBody(summary)
          : _buildEmptyBody(loader, tripId),
    );
  }

  Widget _buildEmptyBody(LoaderProvider loader, String? tripId) {
    if (tripId == null) {
      return AppErrorState(
        icon: Icons.assignment_late_outlined,
        color: AppColors.pending,
        background: AppColors.pendingLight,
        title: 'Nothing to show',
        message: 'Pick a task from the list to see its details.',
        actionLabel: 'Back to Tasks',
        onAction: _onDone,
      );
    }

    final error = loader.taskSummaryError;
    if (error != null) {
      return AppErrorState(
        icon: error.isNetworkError ? Icons.wifi_off_rounded : Icons.error_outline_rounded,
        title: "Couldn't load this task",
        message: error.message,
        actionLabel: 'Try again',
        onAction: () => loader.loadTaskSummary(tripId),
        secondaryLabel: 'Back',
        onSecondary: () => Navigator.pop(context),
      );
    }

    return const AppLoadingState(message: 'Loading task...');
  }

  Widget _buildBody(LoadingTaskSummary summary) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Unified Task Details Card (All 6 details in one card)
          _buildUnifiedCard(summary),

          const SizedBox(height: 18),

          // 2. Delivery Manifest Section
          _buildOutletsManifestSection(summary),

          if (summary.shortfall != null) ...[
            const SizedBox(height: 18),
            _buildShortfallSection(summary.shortfall!),
          ],

          const SizedBox(height: 20),

          // 3. Return to Tasks Button (Below Delivery Manifest card)
          _buildReturnButton(),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // 1. UNIFIED TASK DETAILS CARD (6 Details in 1 Card)
  // -------------------------------------------------------------
  Widget _buildUnifiedCard(LoadingTaskSummary summary) {
    final task = summary.task;
    final progress = summary.progress;
    final isDone = task.status == TaskStatus.completed;
    final isShort = summary.departedShort || progress.remainingItems > 0;

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
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row: Route ID + Brand Badge & Status Pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    task.routeCode,
                    style: AppTextStyles.heading2,
                  ),
                  if (task.brand != null) ...[
                    const SizedBox(width: 8),
                    _buildBrandBadge(task.brand!),
                  ],
                ],
              ),
              _buildStatusPill(isDone: isDone, isShort: isShort),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.divider),
          const SizedBox(height: 14),

          // Row 1: Vehicle | Departure | Priority
          Row(
            children: [
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.local_shipping_outlined,
                  label: 'Vehicle',
                  value: task.vehicle.code,
                ),
              ),
              _buildDivider(),
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.access_time_rounded,
                  label: 'Departure',
                  value: DateFormatter.formatDeparture(task.plannedDeparture),
                ),
              ),
              _buildDivider(),
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.warning_amber_rounded,
                  iconColor: const Color(0xFFD97706),
                  label: 'Priority',
                  value: task.priority == TaskPriority.high ? 'High' : 'Normal',
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.divider),
          const SizedBox(height: 14),

          // Row 2: Total Items | Loaded Items | Outlets
          Row(
            children: [
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.inventory_2_outlined,
                  label: 'Total Items',
                  value: '${progress.totalItems} Items',
                ),
              ),
              _buildDivider(),
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.task_alt_rounded,
                  iconColor: AppColors.success,
                  label: 'Loaded Items',
                  value: '${progress.loadedItems} Items',
                ),
              ),
              _buildDivider(),
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.storefront_outlined,
                  label: 'Outlets',
                  value: summary.outlets.length == 1
                      ? '1 Outlet'
                      : '${summary.outlets.length} Outlets',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusPill({required bool isDone, required bool isShort}) {
    // Not finished yet (the review before completing), loaded short, or complete.
    final (String label, IconData icon, Color color, Color background) = !isDone
        ? ('In progress', Icons.timelapse_rounded, AppColors.info, AppColors.infoLight)
        : isShort
            ? ('Loaded short', Icons.warning_amber_rounded, AppColors.pending, AppColors.pendingLight)
            : ('Verified & Loaded', Icons.check_circle_rounded, AppColors.success, AppColors.successLight);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // 2. DELIVERY MANIFEST SECTION
  // -------------------------------------------------------------
  Widget _buildOutletsManifestSection(LoadingTaskSummary summary) {
    final outlets = summary.outlets;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Delivery Manifest',
              style: AppTextStyles.heading3,
            ),
            Flexible(
              child: Text(
                outlets.length == 1 ? '1 Outlet Scheduled' : '${outlets.length} Outlets Scheduled',
                style: AppTextStyles.bodySmall,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // Destination Order Cards
        ...outlets.map((outlet) {
          final isShort = outlet.status == StopStatus.short;

          return Container(
            margin: const EdgeInsets.only(bottom: 10.0),
            padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
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
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ],
            ),
            child: Row(
              children: [
                // Order circle index badge
                Container(
                  width: 28,
                  height: 28,
                  decoration: const BoxDecoration(
                    color: AppColors.deepForestGreen,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '${outlet.sequence}',
                    style: AppTextStyles.buttonLight.copyWith(fontSize: 13),
                  ),
                ),
                const SizedBox(width: 12),

                // Store name & Order ID
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        outlet.outletName,
                        style: AppTextStyles.labelLarge,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Order #${outlet.orderReferencesLabel}',
                        style: AppTextStyles.bodySmall,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),

                // Loaded Badge with Count
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: isShort ? AppColors.pendingLight : AppColors.successLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        isShort
                            ? '${outlet.loadedItems} of ${outlet.totalItems} Items'
                            : '${outlet.totalItems} Items',
                        style: isShort
                            ? AppTextStyles.statusPending
                            : AppTextStyles.statusSuccess,
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        isShort ? Icons.warning_amber_rounded : Icons.check,
                        size: 13,
                        color: isShort ? AppColors.pending : AppColors.success,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // -------------------------------------------------------------
  // SHORTFALL: what was reported short on this load
  // -------------------------------------------------------------
  Widget _buildShortfallSection(TaskShortfall shortfall) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Shortfall', style: AppTextStyles.heading3),
            if (shortfall.issueReference != null)
              Text(shortfall.issueReference!, style: AppTextStyles.bodySmall),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.cardPadding),
          decoration: BoxDecoration(
            color: AppColors.pendingLight,
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
            border: Border.all(color: AppColors.pending.withValues(alpha: 0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${shortfall.totalShortItems} items could not be loaded',
                style: AppTextStyles.labelLarge,
              ),
              const SizedBox(height: 6),
              for (final line in shortfall.lines)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    '${line.shortQty} x ${line.itemName} (${line.orderReference})',
                    style: AppTextStyles.bodySmall,
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  // -------------------------------------------------------------
  // 3. RETURN TO TASKS BUTTON (Below Delivery Manifest card)
  // -------------------------------------------------------------
  Widget _buildReturnButton() {
    return SizedBox(
      width: double.infinity,
      height: AppSpacing.buttonHeight,
      child: ElevatedButton(
        onPressed: _onDone,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.deepForestGreen,
          foregroundColor: AppColors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          ),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.check_circle_outline_rounded,
              size: 18,
              color: AppColors.white,
            ),
            SizedBox(width: 8),
            Text(
              'Return to Tasks',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // HELPER WIDGETS
  // -------------------------------------------------------------
  Widget _buildBrandBadge(TaskCategory category) {
    final Color textColor = BrandStyle.color(category);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: BrandStyle.background(category),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(BrandStyle.icon(category), size: 12, color: textColor),
          const SizedBox(width: 3),
          Text(
            BrandStyle.label(category),
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.bold,
              color: textColor,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetaItem({
    required IconData icon,
    Color? iconColor,
    required String label,
    required String value,
  }) {
    return Column(
      children: [
        Icon(
          icon,
          size: 15,
          color: iconColor ?? AppColors.primaryText,
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: AppTextStyles.labelSmall,
        ),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            value,
            style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 32,
      color: AppColors.divider,
    );
  }
}
