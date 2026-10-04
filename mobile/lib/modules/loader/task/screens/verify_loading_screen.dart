import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/app_error_state.dart';
import '../../../../core/widgets/inner_section_header.dart';
import '../../../../models/loading_summary.dart';
import '../../../../models/loading_task.dart';
import '../widgets/brand_style.dart';
import 'task_details_screen.dart';
import 'task_screens.dart';

/// The "Loading Completed" screen: shown right after a load is completed, with
/// the summary the server returned.
class VerifyLoadingScreen extends StatefulWidget {
  final LoadingTaskSummary? summary;

  const VerifyLoadingScreen({
    super.key,
    this.summary,
  });

  @override
  State<VerifyLoadingScreen> createState() => _VerifyLoadingScreenState();
}

class _VerifyLoadingScreenState extends State<VerifyLoadingScreen> {
  void _onPickAnotherTask() {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const PendingTasksScreen()),
      (route) => false,
    );
  }

  void _onViewTaskDetails(LoadingTaskSummary summary) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TaskDetailsScreen(
          tripId: summary.task.tripId,
          summary: summary,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final summary = widget.summary;

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: InnerSectionHeader(
        title: 'Loading Completed',
        onBack: () => Navigator.pop(context),
      ),
      body: summary == null
          ? AppErrorState(
              icon: Icons.assignment_late_outlined,
              color: AppColors.pending,
              background: AppColors.pendingLight,
              title: 'Nothing to show',
              message: 'Complete a loading task to see its summary here.',
              actionLabel: 'Back to Tasks',
              onAction: _onPickAnotherTask,
            )
          : _buildBody(summary),
    );
  }

  Widget _buildBody(LoadingTaskSummary summary) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Success Hero Card
          _buildSuccessHeroCard(summary),

          const SizedBox(height: 18),

          // 2. Loading Summary Section
          _buildLoadingSummarySection(summary),

          const SizedBox(height: 18),

          // 3. Outlet Summary Section
          _buildOutletSummarySection(summary),

          const SizedBox(height: 20),

          // 4. Action Buttons (View Task Details & Pick Another Task in same row)
          Row(
            children: [
              // View Task Details (Outlined Button)
              Expanded(
                child: SizedBox(
                  height: AppSpacing.buttonHeight,
                  child: OutlinedButton(
                    onPressed: () => _onViewTaskDetails(summary),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: AppColors.white,
                      foregroundColor: AppColors.primaryText,
                      side: const BorderSide(color: AppColors.border, width: 1.0),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.description_outlined,
                          size: 18,
                          color: AppColors.primaryText,
                        ),
                        SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            'View Task Details',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryText,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 12),

              // Pick Another Task (Deep Forest Green Button)
              Expanded(
                child: SizedBox(
                  height: AppSpacing.buttonHeight,
                  child: ElevatedButton(
                    onPressed: _onPickAnotherTask,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.deepForestGreen,
                      foregroundColor: AppColors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.add_circle_outline_rounded,
                          size: 18,
                          color: AppColors.white,
                        ),
                        SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            'Pick Another Task',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppColors.white,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // 1. SUCCESS HERO CARD
  // -------------------------------------------------------------
  Widget _buildSuccessHeroCard(LoadingTaskSummary summary) {
    final task = summary.task;
    final brand = task.brand;
    final short = summary.departedShort;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 20.0),
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
        children: [
          // Centered Green Checkmark Circle with Confetti Micro Dots
          SizedBox(
            width: 100,
            height: 90,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Soft glow circle
                Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    color: short ? AppColors.pendingLight : AppColors.successLight,
                    shape: BoxShape.circle,
                  ),
                ),
                // Solid circle with checkmark (amber when the load left short)
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: short ? AppColors.pending : AppColors.success,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: (short ? AppColors.pending : AppColors.success)
                            .withValues(alpha: 0.2),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.check,
                    color: AppColors.white,
                    size: 34,
                  ),
                ),
                // Micro celebratory dots
                Positioned(
                  top: 10,
                  left: 18,
                  child: Container(
                    width: 5,
                    height: 5,
                    decoration: const BoxDecoration(
                      color: Color(0xFF86EFAC),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Positioned(
                  top: 14,
                  right: 20,
                  child: Container(
                    width: 4.5,
                    height: 4.5,
                    decoration: const BoxDecoration(
                      color: AppColors.gold,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Positioned(
                  bottom: 14,
                  left: 20,
                  child: Container(
                    width: 4,
                    height: 4,
                    decoration: const BoxDecoration(
                      color: Color(0xFF4ADE80),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Positioned(
                  bottom: 18,
                  right: 18,
                  child: Container(
                    width: 5,
                    height: 5,
                    decoration: const BoxDecoration(
                      color: Color(0xFF86EFAC),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Headline
          Text(
            short
                ? 'Loaded with a shortfall'
                : 'All items have been loaded successfully!',
            style: AppTextStyles.heading2,
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 4),

          // Subtitle
          Text(
            short
                ? '${summary.progress.remainingItems} items were not loaded. The shortfall is on record for the dispatcher.'
                : 'You can now proceed to the next task.',
            style: AppTextStyles.bodySmall,
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 16),
          const Divider(height: 1, color: AppColors.divider),
          const SizedBox(height: 14),

          // 5-Column Grid: Route | Vehicle | Started At | Completed At | Brand
          Row(
            children: [
              // 1. Route
              Expanded(
                child: _buildMetaCol(
                  label: 'Route',
                  valueWidget: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      task.routeCode,
                      style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
              _buildDivider(),

              // 2. Vehicle
              Expanded(
                child: _buildMetaCol(
                  label: 'Vehicle',
                  valueWidget: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.local_shipping_outlined,
                          size: 14,
                          color: AppColors.primaryText,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          task.vehicle.code,
                          style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              _buildDivider(),

              // 3. Started At
              Expanded(
                child: _buildMetaCol(
                  label: 'Started At',
                  valueWidget: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      DateFormatter.formatTime(summary.startedAt),
                      style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
              _buildDivider(),

              // 4. Completed At
              Expanded(
                child: _buildMetaCol(
                  label: 'Completed At',
                  valueWidget: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      DateFormatter.formatTime(summary.completedAt),
                      style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
              _buildDivider(),

              // 5. Brand
              Expanded(
                child: _buildMetaCol(
                  label: 'Brand',
                  valueWidget: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: brand == null
                        ? const Text('--', style: AppTextStyles.labelLarge)
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(BrandStyle.icon(brand), size: 14, color: BrandStyle.color(brand)),
                              const SizedBox(width: 2),
                              Text(
                                BrandStyle.label(brand),
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.bold,
                                  color: BrandStyle.color(brand),
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // 2. LOADING SUMMARY SECTION
  // -------------------------------------------------------------
  Widget _buildLoadingSummarySection(LoadingTaskSummary summary) {
    final progress = summary.progress;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Loading Summary',
          style: AppTextStyles.heading3,
        ),
        const SizedBox(height: 10),
        Container(
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
          child: Row(
            children: [
              // Total Items
              Expanded(
                child: _buildSummaryMetric(
                  icon: const Icon(
                    Icons.inventory_2_outlined,
                    size: 18,
                    color: AppColors.deepForestGreen,
                  ),
                  label: 'Total Items',
                  value: '${progress.totalItems}',
                  valueColor: AppColors.primaryText,
                ),
              ),
              // Loaded Items
              Expanded(
                child: _buildSummaryMetric(
                  icon: const Icon(
                    Icons.check_circle_outline_rounded,
                    size: 20,
                    color: AppColors.success,
                  ),
                  label: 'Loaded Items',
                  value: '${progress.loadedItems}',
                  valueColor: AppColors.success,
                ),
              ),
              // Remaining Items
              Expanded(
                child: _buildSummaryMetric(
                  icon: const Icon(
                    Icons.format_list_bulleted_rounded,
                    size: 20,
                    color: AppColors.pending,
                  ),
                  label: 'Remaining Items',
                  value: '${progress.remainingItems}',
                  valueColor: AppColors.pending,
                ),
              ),
              // Loading Time
              Expanded(
                child: _buildSummaryMetric(
                  icon: const Icon(
                    Icons.access_time_rounded,
                    size: 20,
                    color: AppColors.deepForestGreen,
                  ),
                  label: 'Loading Time',
                  value: DateFormatter.formatDuration(summary.loadingSec),
                  valueColor: AppColors.primaryText,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryMetric({
    required Widget icon,
    required String label,
    required String value,
    required Color valueColor,
  }) {
    return Column(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: const BoxDecoration(
            color: AppColors.greenSurfaceDark,
            shape: BoxShape.circle,
          ),
          child: Center(child: icon),
        ),
        const SizedBox(height: 6),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            label,
            style: AppTextStyles.labelSmall,
          ),
        ),
        const SizedBox(height: 4),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: valueColor,
            ),
          ),
        ),
      ],
    );
  }

  // -------------------------------------------------------------
  // 3. OUTLET SUMMARY SECTION
  // -------------------------------------------------------------
  Widget _buildOutletSummarySection(LoadingTaskSummary summary) {
    final outlets = summary.outlets;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Outlet Summary',
          style: AppTextStyles.heading3,
        ),
        const SizedBox(height: 10),
        Container(
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
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
            child: Column(
              children: [
                // Table Header (Mint green banner)
                Container(
                  width: double.infinity,
                  color: AppColors.greenSurface,
                  padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                  child: const Row(
                    children: [
                      Expanded(
                        flex: 5,
                        child: Text(
                          'OUTLET / ORDER',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepForestGreen,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          'ITEMS',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepForestGreen,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          'STATUS',
                          textAlign: TextAlign.right,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepForestGreen,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Table Rows
                ...outlets.asMap().entries.map((entry) {
                  final index = entry.key;
                  final outlet = entry.value;
                  final isLast = index == outlets.length - 1;

                  return Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                        child: Row(
                          children: [
                            // Outlet & Order
                            Expanded(
                              flex: 5,
                              child: Row(
                                children: [
                                  // Green index circle
                                  Container(
                                    width: 24,
                                    height: 24,
                                    decoration: const BoxDecoration(
                                      color: AppColors.deepForestGreen,
                                      shape: BoxShape.circle,
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      '${outlet.sequence}',
                                      style: AppTextStyles.buttonLight.copyWith(fontSize: 12),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          outlet.outletName,
                                          style: AppTextStyles.labelMedium.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primaryText,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        Text(
                                          'Order #${outlet.orderReferencesLabel}',
                                          style: AppTextStyles.bodySmall,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Items count
                            Expanded(
                              flex: 2,
                              child: Text(
                                '${outlet.loadedItems}',
                                textAlign: TextAlign.center,
                                style: AppTextStyles.heading3,
                              ),
                            ),

                            // Status Badge
                            Expanded(
                              flex: 2,
                              child: Align(
                                alignment: Alignment.centerRight,
                                child: _buildStatusBadge(outlet.status),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (!isLast) const Divider(height: 1, color: AppColors.divider),
                    ],
                  );
                }),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusBadge(StopStatus status) {
    final bool isLoaded = status == StopStatus.loaded;
    final bool isShort = status == StopStatus.short;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: isLoaded
            ? AppColors.successLight
            : (isShort ? AppColors.pendingLight : AppColors.mutedBackground),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        isLoaded ? 'Loaded' : (isShort ? 'Short' : 'Pending'),
        style: isLoaded
            ? AppTextStyles.statusSuccess
            : (isShort ? AppTextStyles.statusPending : AppTextStyles.labelSmall),
      ),
    );
  }

  Widget _buildMetaCol({
    required String label,
    required Widget valueWidget,
  }) {
    return Column(
      children: [
        // five columns share the width: a longer label ("Completed At") shrinks instead of wrapping
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            label,
            style: AppTextStyles.labelSmall,
          ),
        ),
        const SizedBox(height: 4),
        valueWidget,
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 28,
      color: AppColors.divider,
    );
  }
}
