import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/app_error_state.dart';
import '../../../../core/widgets/app_notice.dart';
import '../../../../core/widgets/inner_section_header.dart';
import '../../../../models/loading_summary.dart';
import '../../../../models/loading_task.dart';
import '../../../../providers/loader_provider.dart';
import '../../report_issues/screens/report_issue_screen.dart';
import '../widgets/brand_style.dart';
import '../widgets/loader_feedback.dart';
import '../widgets/loading_item_card.dart';
import '../widgets/verification_summary.dart';
import 'verify_loading_screen.dart';

typedef VerifyItemsScreen = StartLoadingScreen;

/// Loads the task that [LoaderProvider.activeTask] holds. The Tasks (or Home)
/// screen claims the task first, so this screen is only ever opened for a task
/// the loader holds.
class StartLoadingScreen extends StatefulWidget {
  const StartLoadingScreen({super.key});

  @override
  State<StartLoadingScreen> createState() => _StartLoadingScreenState();
}

class _StartLoadingScreenState extends State<StartLoadingScreen> {
  // Outlets stay collapsed until tapped; what is open is purely screen state.
  final Set<String> _expandedStops = {};
  final Set<String> _showAllStops = {};

  late final LoaderProvider _loader;
  Timer? _heartbeat;
  bool _conflictShown = false;

  @override
  void initState() {
    super.initState();
    _loader = context.read<LoaderProvider>();
    _loader.addListener(_onLoaderChanged);

    // While the screen is open, check in a few times per lock timeout: it keeps
    // the task ours and picks up changes the dispatcher made to the plan.
    final ttlSec = _loader.activeTask?.task.lock?.ttlSec ?? 900;
    _heartbeat = Timer.periodic(
      Duration(seconds: math.max(ttlSec ~/ 3, 30)),
      (_) => _loader.refreshActiveTask(),
    );
  }

  @override
  void dispose() {
    _heartbeat?.cancel();
    _loader.removeListener(_onLoaderChanged);
    // Whatever was tapped last is still saved once the screen is gone.
    unawaited(_loader.flushPendingSaves());
    super.dispose();
  }

  // Dialogs and messages are side effects, so they happen here rather than in build().
  void _onLoaderChanged() {
    if (!mounted) return;

    if (_loader.takePlanChanged()) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ScaffoldMessenger.of(context)
          ..clearSnackBars()
          ..showSnackBar(
            const SnackBar(
              content: Text('The plan for this route changed. Quantities were refreshed.'),
            ),
          );
      });
    }

    final conflict = _loader.taskConflict;
    if (conflict != null && !_conflictShown) {
      _conflictShown = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _leaveAfterConflict(conflict));
    }
  }

  // The task is no longer ours (somebody took it over, it went on hold...):
  // say so and go back to the list.
  Future<void> _leaveAfterConflict(LoaderError conflict) async {
    if (!mounted) return;
    await showTaskUnavailableDialog(context, conflict);
    if (!mounted) return;
    _loader.clearTaskConflict();
    Navigator.pop(context);
  }

  // A failed action: the loader is told why, and sent back if the task is gone.
  Future<void> _handleActionError(LoaderError error) async {
    if (error.code == 'PLAN_CHANGED') {
      await _loader.reloadActiveTask();
      if (mounted) {
        showLoaderSnackBar(
          context,
          'The plan for this route changed. Check the quantities and try again.',
        );
      }
      return;
    }

    await showLoaderError(context, error);
    if (error.isTaskUnavailable && mounted) Navigator.pop(context);
  }

  Future<void> _onPauseLoading() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Pause Loading Session'),
        content: const Text('Do you want to pause this loading session? Progress will be saved.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.deepForestGreen,
            ),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Pause & Exit', style: TextStyle(color: AppColors.white)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final paused = await _loader.pauseTask();
    if (!mounted) return;

    final error = _loader.actionError;
    if (!paused) {
      if (error != null) await _handleActionError(error);
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    Navigator.pop(context);
    messenger.showSnackBar(
      const SnackBar(content: Text('Loading session paused.')),
    );
  }

  Future<void> _onReportShortfall() async {
    final detail = _loader.activeTask;
    if (detail == null) return;

    // The report screen answers true when the task is out of the loader's hands.
    final taskGone = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => ReportLoadingIssueScreen(shortfallTask: detail),
      ),
    );
    if (taskGone == true && mounted) Navigator.pop(context);
  }

  // Review first (it also saves pending taps), then ask, then complete.
  Future<void> _onReviewAndComplete() async {
    final review = await _loader.reviewTask();
    if (!mounted) return;
    if (review == null) {
      final error = _loader.actionError;
      if (error != null) await _handleActionError(error);
      return;
    }

    if (!review.completion.canComplete) {
      await showTaskUnavailableDialog(
        context,
        LoaderError(
          message: 'Finish loading before you complete this route.',
          statusCode: 422,
          code: 'COMPLETION_BLOCKED',
          details: {
            'blockers': [
              for (final b in review.completion.blockers)
                {'code': b.code, 'message': b.message},
            ],
          },
        ),
      );
      return;
    }

    final confirmed = await _confirmComplete(review);
    if (confirmed != true || !mounted) return;

    final summary = await _loader.completeTask(planRevision: review.planRevision);
    if (!mounted) return;
    if (summary == null) {
      final error = _loader.actionError;
      if (error != null) await _handleActionError(error);
      return;
    }

    // The finished screen replaces this one: there is nothing left to do here.
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => VerifyLoadingScreen(summary: summary)),
    );
  }

  Future<bool?> _confirmComplete(LoadingTaskSummary review) {
    final progress = review.progress;
    final routeCode = review.task.routeCode;
    final message = review.completion.willDepartShort
        ? '${progress.loadedItems} of ${progress.totalItems} items are loaded on $routeCode. '
            'The ${progress.remainingItems} items reported short will not be on the vehicle. '
            'Mark this route as loaded?'
        : 'All ${progress.totalItems} items are loaded on $routeCode. '
            'Mark it as loaded and ready for the driver?';

    return showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Complete Loading'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.deepForestGreen,
            ),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Complete', style: TextStyle(color: AppColors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final loader = context.watch<LoaderProvider>();
    final detail = loader.activeTask;

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: InnerSectionHeader(
        title: 'Start Loading',
        onBack: () => Navigator.pop(context),
      ),
      body: detail == null
          ? AppErrorState(
              icon: Icons.assignment_late_outlined,
              color: AppColors.pending,
              background: AppColors.pendingLight,
              title: 'No task open',
              message: 'Open a task from the Tasks list to start loading.',
              actionLabel: 'Back to Tasks',
              onAction: () => Navigator.pop(context),
            )
          : _buildBody(loader, detail),
    );
  }

  Widget _buildBody(LoaderProvider loader, LoadingTaskDetail detail) {
    final task = detail.task;
    final progress = detail.progress;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Top Route Metadata Card
          _buildRouteInfoCard(task),

          const SizedBox(height: 14),

          // Anything the loader has to know before loading on
          for (final violation in task.violations) ...[
            AppNotice(message: violation.message),
            const SizedBox(height: 10),
          ],
          if (loader.saveError != null) ...[
            AppNotice(
              message: "Changes not saved. ${loader.saveError}",
              actionLabel: 'Retry',
              onAction: loader.retrySaves,
            ),
            const SizedBox(height: 10),
          ],

          // 2. Summary Stats Card (Above loading items)
          VerificationSummaryCard(
            totalItems: progress.totalItems,
            loadedItems: progress.loadedItems,
            remainingItems: progress.remainingItems,
            progressPercent: progress.percent,
          ),

          const SizedBox(height: 14),

          if (detail.removedLines.isNotEmpty) ...[
            _buildRemovedLinesCard(loader, detail),
            const SizedBox(height: 14),
          ],

          // 3. Outlets / Orders Accordion List (Default collapsed)
          if (detail.stops.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'There is nothing to load on this route.',
                  style: AppTextStyles.bodySmall,
                ),
              ),
            )
          else
            ...detail.stops.map(
              (stop) => LoadingItemCard(
                stop: stop,
                isExpanded: _expandedStops.contains(stop.stopId),
                showAllItems: _showAllStops.contains(stop.stopId),
                onToggleExpand: () => setState(() {
                  if (!_expandedStops.remove(stop.stopId)) {
                    _expandedStops.add(stop.stopId);
                  }
                }),
                onToggleShowAll: () => setState(() {
                  if (!_showAllStops.remove(stop.stopId)) {
                    _showAllStops.add(stop.stopId);
                  }
                }),
                onQtyChanged: loader.setLoadedQty,
              ),
            ),

          const SizedBox(height: 16),

          // 4. Action Buttons (Pause Loading, Review & Complete, Report Shortfall) - Below order cards
          VerificationBottomBar(
            totalItems: progress.totalItems,
            loadedItems: progress.loadedItems,
            isBusy: loader.isActionRunning,
            onPauseLoading: _onPauseLoading,
            onReviewAndComplete: _onReviewAndComplete,
            onReportShortfall: _onReportShortfall,
            padding: EdgeInsets.zero,
          ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  // Units loaded for an order that left the route: they must come off the vehicle.
  Widget _buildRemovedLinesCard(LoaderProvider loader, LoadingTaskDetail detail) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.pendingLight,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(color: AppColors.pending.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.warning_amber_rounded, size: 18, color: AppColors.pending),
              SizedBox(width: 8),
              Text('Take these off the vehicle', style: AppTextStyles.labelLarge),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'They belong to orders the dispatcher removed from this route.',
            style: AppTextStyles.bodySmall,
          ),
          const SizedBox(height: 8),
          for (final removed in detail.removedLines)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${removed.loadedQty} x ${removed.itemName}'
                      '${removed.orderReference != null ? ' (${removed.orderReference})' : ''}',
                      style: AppTextStyles.bodyMedium,
                    ),
                  ),
                  TextButton(
                    onPressed: () => loader.unloadRemovedLine(removed),
                    child: const Text(
                      'Unloaded',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForestGreen,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildRouteInfoCard(LoadingTask task) {
    final isHigh = task.priority == TaskPriority.high;
    final brand = task.brand;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 16.0),
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
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Route
          Expanded(
            child: _buildMetaCol(
              label: 'Route',
              valueWidget: Text(
                task.routeCode,
                style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
              ),
            ),
          ),
          _buildDivider(),

          // Vehicle
          Expanded(
            child: _buildMetaCol(
              label: 'Vehicle',
              // Codes like V-REEFER-1 are long: shrink a little rather than cut them off
              valueWidget: FittedBox(
                fit: BoxFit.scaleDown,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.local_shipping_outlined,
                      size: 15,
                      color: AppColors.primaryText,
                    ),
                    const SizedBox(width: 4),
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

          // Priority
          Expanded(
            child: _buildMetaCol(
              label: 'Priority',
              valueWidget: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    size: 15,
                    color: isHigh ? const Color(0xFFD97706) : AppColors.primaryText,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    isHigh ? 'High' : 'Normal',
                    style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
          _buildDivider(),

          // Brand
          Expanded(
            child: _buildMetaCol(
              label: 'Brand',
              valueWidget: brand == null
                  ? const Text('--', style: AppTextStyles.labelLarge)
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(BrandStyle.icon(brand), size: 14, color: BrandStyle.color(brand)),
                        const SizedBox(width: 4),
                        Text(
                          BrandStyle.label(brand),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: BrandStyle.color(brand),
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetaCol({
    required String label,
    required Widget valueWidget,
  }) {
    return Column(
      children: [
        Text(
          label,
          style: AppTextStyles.labelSmall,
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
