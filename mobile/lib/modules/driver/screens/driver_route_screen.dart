import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../models/driver_task.dart';
import '../../../providers/driver_provider.dart';
import '../widgets/driver_feedback.dart';
import '../widgets/driver_stop_card.dart';
import '../widgets/route_summary_card.dart';
import 'driver_sequence_request_screen.dart';
import 'driver_sequence_request_status_screen.dart';
import 'driver_stop_details_screen.dart';

/// The picked trip: its stops, and "Start Trip" while it waits at the depot.
class DriverRouteScreen extends StatefulWidget {
  /// The route name the screen is pushed under, so flows can pop back to it.
  static const routeName = '/driver-route';

  final String tripId;

  const DriverRouteScreen({super.key, required this.tripId});

  @override
  State<DriverRouteScreen> createState() => _DriverRouteScreenState();
}

class _DriverRouteScreenState extends State<DriverRouteScreen> {
  bool _departing = false;

  Future<void> _startTrip(DriverTask task) async {
    if (_departing) return;
    final driver = context.read<DriverProvider>();
    setState(() => _departing = true);
    final ok = await driver.depart(task.id);
    if (!mounted) return;
    setState(() => _departing = false);
    if (!ok) {
      showDriverError(context, driver.actionError ?? 'Could not start the trip.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final driver = context.watch<DriverProvider>();
    final task = driver.taskById(widget.tripId);

    if (task == null) {
      return Scaffold(
        backgroundColor: AppColors.screenBackground,
        appBar: AppBar(title: const Text("Today's Route")),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'This trip is no longer in your list.',
              style: AppTextStyles.bodySmall,
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    final next = task.nextStop;
    final statusLabel = task.isInTransit
        ? 'In transit'
        : task.isLoaded
            ? 'Ready to leave'
            : task.isFinished
                ? 'Completed'
                : null;

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(title: const Text("Today's Route")),
      body: RefreshIndicator(
        color: AppColors.deepForestGreen,
        onRefresh: driver.loadTasks,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Route Overview', style: AppTextStyles.heading2),
              const SizedBox(height: 10),
              DriverRouteSummaryCard(
                routeId: task.code,
                vehicleId: task.vehicleCode,
                totalStops: task.stops.length,
                completedStops: task.doneStops,
                eta: next?.predictedArrival == null
                    ? '--:--'
                    : DateFormatter.formatTime(next!.predictedArrival),
                statusLabel: statusLabel,
              ),
              const SizedBox(height: 16),
              if (task.isLoaded) ...[
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _departing ? null : () => _startTrip(task),
                    icon: _departing
                        ? const ButtonSpinner()
                        : const Icon(Icons.local_shipping_outlined),
                    label: const Text('Start Trip'),
                  ),
                ),
                const SizedBox(height: 4),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 6),
                  child: Text(
                    'Start the trip when the vehicle leaves the depot.',
                    style: AppTextStyles.labelSmall,
                  ),
                ),
                const SizedBox(height: 8),
              ],
              if (task.isFinished) ...[
                _completedBanner(),
                const SizedBox(height: 16),
              ],
              if (!task.isFinished)
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: task.canRequestSequenceChange
                            ? () => Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => DriverSequenceRequestScreen(
                                      tripId: task.id,
                                    ),
                                  ),
                                )
                            : null,
                        icon: const Icon(Icons.swap_vert_rounded),
                        label: const Text('Request Stop Change'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    IconButton(
                      tooltip: 'Sequence Requests',
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => DriverSequenceRequestStatusScreen(
                            tripId: task.id,
                          ),
                        ),
                      ),
                      icon: const Icon(
                        Icons.history_outlined,
                        color: AppColors.deepForestGreen,
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 22),
              Row(
                children: [
                  const Text('Delivery Stops', style: AppTextStyles.heading2),
                  const Spacer(),
                  Text(
                    '${task.stops.length} stops',
                    style: AppTextStyles.labelMedium,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ...task.stops.map(
                (stop) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: DriverStopCard(
                    stop: stop,
                    isCurrent: task.isInTransit && stop.id == next?.id,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => DriverStopDetailsScreen(
                          tripId: task.id,
                          stopId: stop.id,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _completedBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.successLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Row(
        children: [
          Icon(Icons.check_circle, color: AppColors.success),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Trip completed. Every stop has been handled.',
              style: AppTextStyles.labelLarge,
            ),
          ),
        ],
      ),
    );
  }
}
