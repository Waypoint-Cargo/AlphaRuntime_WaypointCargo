import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../core/services/driver_service.dart';
import '../../../providers/driver_provider.dart';
import '../widgets/driver_feedback.dart';
import '../widgets/signature_pad.dart';
import 'driver_route_screen.dart';

/// The last step of a stop: the receiver signs, and the proof is filed.
class DriverDeliveryCompleteScreen extends StatefulWidget {
  final String tripId;
  final String stopId;
  final String receiverName;

  /// True when every item goes over as loaded; otherwise [lines] says how many.
  final bool allDeliveredAsPlanned;
  final List<DeliveredLine>? lines;

  const DriverDeliveryCompleteScreen({
    super.key,
    required this.tripId,
    required this.stopId,
    required this.receiverName,
    required this.allDeliveredAsPlanned,
    this.lines,
  });

  @override
  State<DriverDeliveryCompleteScreen> createState() =>
      _DriverDeliveryCompleteScreenState();
}

class _DriverDeliveryCompleteScreenState
    extends State<DriverDeliveryCompleteScreen> {
  final SignatureController _signature = SignatureController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _signature.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _signature.dispose();
    super.dispose();
  }

  bool get ready => !_signature.isEmpty && !_submitting;

  Future<void> _completeDelivery() async {
    if (!ready) return;
    final driver = context.read<DriverProvider>();
    setState(() => _submitting = true);
    final png = await _signature.toPng();
    final ok = await driver.submitProof(
      widget.stopId,
      receiverName: widget.receiverName,
      signaturePng: png,
      allDeliveredAsPlanned: widget.allDeliveredAsPlanned,
      lines: widget.lines,
    );
    if (!mounted) return;
    setState(() => _submitting = false);

    if (!ok) {
      showDriverError(
        context,
        driver.actionError ?? 'Could not complete the delivery.',
      );
      return;
    }

    final tripDone = driver.tripFinished;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          icon: const Icon(
            Icons.check_circle,
            color: AppColors.success,
            size: 48,
          ),
          title: Text(tripDone ? 'Trip Completed' : 'Delivery Completed'),
          content: Text(
            tripDone
                ? 'That was the last stop. Great work!'
                : 'The stop has been successfully completed.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Done'),
            ),
          ],
        );
      },
    );
    if (!mounted) return;

    // Back to the route, or to the Tasks page once there is nothing left.
    Navigator.of(context).popUntil(
      (route) =>
          route.isFirst ||
          (!tripDone && route.settings.name == DriverRouteScreen.routeName),
    );
    if (tripDone) driver.loadTasks();
  }

  @override
  Widget build(BuildContext context) {
    final driver = context.watch<DriverProvider>();
    final task = driver.taskById(widget.tripId);
    final stop = task?.stopById(widget.stopId);

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(title: const Text('Complete Delivery')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Delivery Proof', style: AppTextStyles.heading2),
            const SizedBox(height: 5),
            const Text(
              'The receiver signs below to confirm the delivery.',
              style: AppTextStyles.bodySmall,
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                const Expanded(
                  child: Text('Receiver Signature', style: AppTextStyles.heading3),
                ),
                TextButton(
                  onPressed: _signature.isEmpty || _submitting
                      ? null
                      : _signature.clear,
                  child: const Text('Clear'),
                ),
              ],
            ),
            const SizedBox(height: 6),
            SignaturePad(controller: _signature),
            const SizedBox(height: 18),
            _summaryCard(
              outlet: stop?.outlet.name ?? '',
              address: stop?.outlet.address ?? '',
              vehicle: task?.vehicleCode ?? '',
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: ready ? _completeDelivery : null,
                icon: _submitting
                    ? const ButtonSpinner()
                    : const Icon(Icons.check_circle_outline),
                label: const Text('Complete Delivery'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryCard({
    required String outlet,
    required String address,
    required String vehicle,
  }) {
    final delivered = widget.lines?.fold<int>(0, (a, l) => a + l.deliveredQty);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Delivery Summary', style: AppTextStyles.heading3),
          const SizedBox(height: 12),
          _row('Outlet', outlet),
          if (address.isNotEmpty) _row('Address', address),
          _row('Vehicle', vehicle),
          _row('Receiver', widget.receiverName),
          _row(
            'Items',
            delivered == null ? 'All items as loaded' : '$delivered units delivered',
          ),
          _row(
            'Status',
            _signature.isEmpty ? 'Signature required' : 'Ready to complete',
          ),
        ],
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 85,
            child: Text(label, style: AppTextStyles.labelMedium),
          ),
          Expanded(child: Text(value, style: AppTextStyles.labelLarge)),
        ],
      ),
    );
  }
}
