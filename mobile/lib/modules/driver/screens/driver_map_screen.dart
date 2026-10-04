import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../core/services/driver_service.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../providers/driver_provider.dart';
import '../widgets/driver_feedback.dart';
import '../widgets/map_placeholder.dart';
import 'driver_delivery_screen.dart';

/// Heading to a stop. "I've Arrived" tells the server and opens the delivery.
class DriverMapScreen extends StatefulWidget {
  final String tripId;
  final String stopId;

  /// Only look at the route: no arrival button.
  final bool viewOnly;

  const DriverMapScreen({
    super.key,
    required this.tripId,
    required this.stopId,
    this.viewOnly = false,
  });

  @override
  State<DriverMapScreen> createState() => _DriverMapScreenState();
}

class _DriverMapScreenState extends State<DriverMapScreen> {
  bool _arriving = false;

  Future<void> _arrived() async {
    if (_arriving) return;
    final driver = context.read<DriverProvider>();
    final stop = driver.taskById(widget.tripId)?.stopById(widget.stopId);
    if (stop == null) return;

    if (stop.isPending) {
      setState(() => _arriving = true);
      final ok = await driver.recordStopEvent(stop.id, StopEventType.arrived);
      if (!mounted) return;
      setState(() => _arriving = false);
      if (!ok) {
        showDriverError(context, driver.actionError ?? 'Could not record the arrival.');
        return;
      }
    }

    // The map is only a stepping stone: the delivery replaces it.
    await Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) =>
            DriverDeliveryScreen(tripId: widget.tripId, stopId: widget.stopId),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final driver = context.watch<DriverProvider>();
    final task = driver.taskById(widget.tripId);
    final stop = task?.stopById(widget.stopId);

    if (task == null || stop == null) {
      return Scaffold(
        backgroundColor: AppColors.screenBackground,
        appBar: AppBar(title: const Text('Route')),
        body: const Center(child: Text('This stop is no longer available.')),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(title: const Text('Route')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Navigate to', style: AppTextStyles.heading2),
            const SizedBox(height: 4),
            Text(stop.outlet.name, style: AppTextStyles.bodySmall),
            const SizedBox(height: 14),
            DriverMapPlaceholder(
              destination: stop.outlet.name,
              eta: DateFormatter.formatTime(stop.predictedArrival),
              distance: '${stop.sequence} of ${task.stops.length}',
              distanceLabel: 'Stop',
            ),
            const SizedBox(height: 16),
            _destinationCard(stop.outlet.name, stop.outlet.address,
                stop.outlet.district, stop.outlet.windowLabel),
            if (!widget.viewOnly) ...[
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _arriving ? null : _arrived,
                  icon: _arriving
                      ? const ButtonSpinner()
                      : const Icon(Icons.location_on_outlined),
                  label: const Text("I've Arrived"),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _destinationCard(
    String name,
    String address,
    String district,
    String window,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.location_on_outlined,
            color: AppColors.deepForestGreen,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: AppTextStyles.heading3),
                const SizedBox(height: 4),
                Text(
                  address.isEmpty ? district : address,
                  style: AppTextStyles.bodySmall,
                ),
                const SizedBox(height: 8),
                Text(
                  'Delivery window: $window',
                  style: AppTextStyles.labelMedium,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
