import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/theme/app_text_style.dart';
import '../../../core/widgets/app_error_state.dart';
import '../../../core/widgets/app_loading_state.dart';
import '../../../core/widgets/app_notice.dart';
import '../../../models/driver_task.dart';
import '../../../providers/driver_provider.dart';
import 'driver_route_screen.dart';

/// The driver Task page: the routes ready to be driven. Nobody is assigned at
/// planning time; the driver picks one here and then carries on with it.
class DriverTasksScreen extends StatefulWidget {
  const DriverTasksScreen({super.key});

  @override
  State<DriverTasksScreen> createState() => _DriverTasksScreenState();
}

class _DriverTasksScreenState extends State<DriverTasksScreen> {
  // The task being selected right now; its button shows a spinner.
  String? _selectingId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<DriverProvider>().loadTasks();
    });
  }

  void _openRoute() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const DriverRouteScreen()),
    );
  }

  Future<void> _select(DriverTask task) async {
    if (_selectingId != null) return;
    final driver = context.read<DriverProvider>();
    setState(() => _selectingId = task.id);
    final ok = await driver.selectTask(task);
    if (!mounted) return;
    setState(() => _selectingId = null);

    if (!ok) {
      final message = driver.actionError;
      if (message != null) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(message)));
      }
      // Show what is really available now.
      driver.loadTasks();
      return;
    }
    _openRoute();
  }

  @override
  Widget build(BuildContext context) {
    final driver = context.watch<DriverProvider>();
    final nothingShown = driver.available.isEmpty && driver.myTasks.isEmpty;

    if (nothingShown && driver.isLoading) {
      return const AppLoadingState(message: 'Loading tasks...');
    }
    if (nothingShown && driver.error != null) {
      return AppErrorState(
        title: "Couldn't load tasks",
        message: driver.error!,
        actionLabel: 'Try again',
        onAction: driver.loadTasks,
      );
    }

    return RefreshIndicator(
      color: AppColors.deepForestGreen,
      onRefresh: driver.loadTasks,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (driver.error != null) ...[
              AppNotice(
                message: "Couldn't refresh. ${driver.error}",
                actionLabel: 'Retry',
                onAction: driver.loadTasks,
              ),
              const SizedBox(height: 12),
            ],
            if (driver.myTasks.isNotEmpty) ...[
              const Text('My Task', style: AppTextStyles.heading3),
              const SizedBox(height: 10),
              for (final task in driver.myTasks)
                _TaskCard(
                  task: task,
                  actionLabel: task.isInTransit
                      ? 'Continue Delivery'
                      : 'Start Delivery',
                  onAction: _openRoute,
                ),
              const SizedBox(height: 14),
            ],
            const Text('Available Tasks', style: AppTextStyles.heading3),
            const SizedBox(height: 10),
            if (driver.available.isEmpty)
              const _EmptyState()
            else
              for (final task in driver.available)
                _TaskCard(
                  task: task,
                  actionLabel: 'Select Task',
                  isBusy: _selectingId == task.id,
                  // One task at a time: the server refuses a second one anyway.
                  onAction: _selectingId == null ? () => _select(task) : null,
                ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      alignment: Alignment.center,
      child: const Column(
        children: [
          Icon(Icons.inbox_outlined, size: 48, color: AppColors.secondaryText),
          SizedBox(height: 12),
          Text('No available tasks', style: AppTextStyles.heading3),
          SizedBox(height: 4),
          Text(
            'Routes appear here once they are loaded and ready to go',
            style: AppTextStyles.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  final DriverTask task;
  final String actionLabel;
  final VoidCallback? onAction;
  final bool isBusy;

  const _TaskCard({
    required this.task,
    required this.actionLabel,
    required this.onAction,
    this.isBusy = false,
  });

  @override
  Widget build(BuildContext context) {
    final outlets = task.stops.map((s) => s.outletName).join(' → ');

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(AppSpacing.lg),
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Route ${task.code}',
                  style: AppTextStyles.heading3,
                ),
              ),
              Text(
                'Trip ${task.tripNumber}',
                style: AppTextStyles.labelMedium,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${task.vehicleCode} · ${task.stops.length} stop(s)'
            '${task.plannedDistanceKm > 0 ? ' · ${task.plannedDistanceKm.toStringAsFixed(1)} km' : ''}',
            style: AppTextStyles.bodySmall,
          ),
          if (task.depotName.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text('From ${task.depotName}', style: AppTextStyles.bodySmall),
          ],
          if (outlets.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              outlets,
              style: AppTextStyles.labelMedium,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: isBusy ? null : onAction,
              child: isBusy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(actionLabel),
            ),
          ),
        ],
      ),
    );
  }
}
