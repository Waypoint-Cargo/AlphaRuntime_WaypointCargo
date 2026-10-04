import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../core/services/driver_service.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../models/driver_task.dart';
import '../../../providers/driver_provider.dart';
import '../widgets/driver_feedback.dart';
import 'driver_delivery_screen.dart';
import 'driver_issues_screen.dart';
import 'driver_map_screen.dart';

/// One stop of the trip: where, when, what to hand over and how.
class DriverStopDetailsScreen extends StatefulWidget {
  final String tripId;
  final String stopId;

  const DriverStopDetailsScreen({
    super.key,
    required this.tripId,
    required this.stopId,
  });

  @override
  State<DriverStopDetailsScreen> createState() =>
      _DriverStopDetailsScreenState();
}

class _DriverStopDetailsScreenState extends State<DriverStopDetailsScreen> {
  bool _busy = false;

  /// "Start Stop": heads to the stop, or straight on to the delivery when the
  /// driver already arrived.
  void _start(DriverTaskStop stop) {
    final Widget next = stop.isPending
        ? DriverMapScreen(tripId: widget.tripId, stopId: stop.id)
        : DriverDeliveryScreen(tripId: widget.tripId, stopId: stop.id);
    Navigator.push(context, MaterialPageRoute(builder: (_) => next));
  }

  Future<void> _cannotDeliver(DriverTaskStop stop) async {
    final reason = await askDeliveryFailureReason(context, stop.outlet.name);
    if (reason == null || !mounted) return;
    final driver = context.read<DriverProvider>();
    setState(() => _busy = true);
    final ok = await driver.recordStopEvent(
      stop.id,
      StopEventType.failed,
      failureReason: reason,
    );
    if (!mounted) return;
    setState(() => _busy = false);
    if (!ok) {
      showDriverError(context, driver.actionError ?? 'Could not save that.');
      return;
    }
    showDriverInfo(context, 'The stop was marked as not delivered.');
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final driver = context.watch<DriverProvider>();
    final task = driver.taskById(widget.tripId);
    final stop = task?.stopById(widget.stopId);

    if (task == null || stop == null) {
      return Scaffold(
        backgroundColor: AppColors.screenBackground,
        appBar: AppBar(title: const Text('Stop Details')),
        body: const Center(child: Text('This stop is no longer available.')),
      );
    }

    final canWork = task.isInTransit && !stop.isDone;

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(title: const Text('Stop Details')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _header(stop),
            const SizedBox(height: 18),
            _informationCard(task, stop),
            const SizedBox(height: 16),
            _itemsCard(stop),
            const SizedBox(height: 16),
            _instructionsCard(stop),
            if (stop.isDone && stop.failureReason.isNotEmpty) ...[
              const SizedBox(height: 16),
              _failureCard(stop),
            ],
            const SizedBox(height: 20),
            if (!stop.isDone && !task.isInTransit)
              const Padding(
                padding: EdgeInsets.only(bottom: 10),
                child: Text(
                  'Start the trip from the route screen before working on a stop.',
                  style: AppTextStyles.labelMedium,
                ),
              ),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => DriverMapScreen(
                      tripId: widget.tripId,
                      stopId: stop.id,
                      viewOnly: true,
                    ),
                  ),
                ),
                icon: const Icon(Icons.map_outlined),
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                label: const Text('View Route'),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: canWork && !_busy ? () => _start(stop) : null,
                icon: const Icon(Icons.navigation_outlined),
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                label: Text(
                  stop.isPending ? 'Start Stop' : 'Continue Delivery',
                ),
              ),
            ),
            if (canWork) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : () => _cannotDeliver(stop),
                  icon: _busy
                      ? const ButtonSpinner()
                      : const Icon(Icons.block_outlined),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  label: const Text('Cannot Deliver'),
                ),
              ),
            ],
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: TextButton.icon(
                onPressed: () => DriverIssuesScreen.showReportSheet(
                  context,
                  tripId: task.id,
                  stopId: stop.id,
                  stopName: stop.outlet.name,
                ),
                icon: const Icon(
                  Icons.report_problem_outlined,
                  color: AppColors.error,
                ),
                label: const Text(
                  'Report an Issue',
                  style: TextStyle(color: AppColors.error),
                ),
                style: TextButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  side: const BorderSide(color: AppColors.error),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header(DriverTaskStop stop) {
    final initial = stop.outlet.name.isEmpty ? '?' : stop.outlet.name[0];
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.deepForestGreen,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(child: Text(initial, style: AppTextStyles.buttonLight)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(stop.outlet.name, style: AppTextStyles.heading2),
              const SizedBox(height: 3),
              Text(stop.outlet.district, style: AppTextStyles.bodySmall),
            ],
          ),
        ),
      ],
    );
  }

  Widget _informationCard(DriverTask task, DriverTaskStop stop) {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Delivery Information', style: AppTextStyles.heading3),
          const SizedBox(height: 14),
          _row(Icons.schedule_outlined, 'Delivery Window', stop.outlet.windowLabel),
          _row(
            Icons.access_time,
            'Expected Arrival',
            DateFormatter.formatTime(stop.predictedArrival),
          ),
          _row(
            Icons.location_on_outlined,
            'Address',
            stop.outlet.address.isEmpty ? stop.outlet.district : stop.outlet.address,
          ),
          if (stop.outlet.phone.isNotEmpty)
            _row(Icons.phone_outlined, 'Phone', stop.outlet.phone),
          _row(Icons.local_shipping_outlined, 'Vehicle', task.vehicleCode),
          _row(Icons.flag_outlined, 'Status', _statusLabel(stop.status)),
        ],
      ),
    );
  }

  Widget _itemsCard(DriverTaskStop stop) {
    final items = stop.items;
    final units = items.fold<int>(0, (sum, item) => sum + item.loadedQty);
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text('Items to deliver', style: AppTextStyles.heading3),
              ),
              Text('$units units', style: AppTextStyles.labelMedium),
            ],
          ),
          const SizedBox(height: 10),
          for (final order in stop.orders) ...[
            Text(order.reference, style: AppTextStyles.labelMedium),
            const SizedBox(height: 4),
            for (final item in order.items)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 3),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(item.itemName, style: AppTextStyles.labelLarge),
                    ),
                    Text(
                      '${item.loadedQty} ${item.unit}',
                      style: AppTextStyles.labelMedium,
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 6),
          ],
        ],
      ),
    );
  }

  Widget _instructionsCard(DriverTaskStop stop) {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Instructions', style: AppTextStyles.heading3),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.info_outline,
                size: 19,
                color: AppColors.secondaryText,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(stop.instructions, style: AppTextStyles.bodySmall),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _failureCard(DriverTaskStop stop) {
    return _card(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, color: AppColors.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text(stop.failureReason, style: AppTextStyles.bodySmall),
          ),
        ],
      ),
    );
  }

  static String _statusLabel(String status) {
    switch (status) {
      case 'PENDING':
        return 'Waiting';
      case 'ARRIVED':
        return 'Arrived';
      case 'UNLOADING':
        return 'Unloading';
      case 'COMPLETED':
        return 'Delivered';
      case 'PARTIAL':
        return 'Partly delivered';
      case 'FAILED':
        return 'Not delivered';
      case 'SKIPPED':
        return 'Skipped';
      default:
        return status;
    }
  }

  Widget _row(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.secondaryText),
          const SizedBox(width: 8),
          SizedBox(
            width: 105,
            child: Text(label, style: AppTextStyles.labelMedium),
          ),
          Expanded(child: Text(value, style: AppTextStyles.labelLarge)),
        ],
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x080D302D),
            blurRadius: 14,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: child,
    );
  }
}
