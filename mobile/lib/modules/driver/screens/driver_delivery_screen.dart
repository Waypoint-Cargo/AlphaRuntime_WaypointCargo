import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../core/services/driver_service.dart';
import '../../../models/driver_task.dart';
import '../../../providers/driver_provider.dart';
import '../widgets/delivery_checklist.dart';
import '../widgets/delivery_info_card.dart';
import '../widgets/driver_feedback.dart';
import 'driver_delivery_complete_screen.dart';
import 'driver_route_screen.dart';

/// Unloading at a stop: what to hand over, the checks, and who receives it.
class DriverDeliveryScreen extends StatefulWidget {
  final String tripId;
  final String stopId;

  const DriverDeliveryScreen({
    super.key,
    required this.tripId,
    required this.stopId,
  });

  @override
  State<DriverDeliveryScreen> createState() => _DriverDeliveryScreenState();
}

class _DriverDeliveryScreenState extends State<DriverDeliveryScreen> {
  bool checklistCompleted = false;
  bool _partial = false;
  bool _startingUnload = false;
  bool _failing = false;
  String? _unloadError;

  // units handed over per order line, by order item id
  final Map<String, int> _delivered = {};

  final TextEditingController receiverController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _startUnloading();
    });
  }

  @override
  void dispose() {
    receiverController.dispose();
    super.dispose();
  }

  DriverTaskStop? get _stop =>
      context.read<DriverProvider>().taskById(widget.tripId)?.stopById(widget.stopId);

  /// Tells the server unloading began (the stop goes from ARRIVED to UNLOADING).
  Future<void> _startUnloading() async {
    final driver = context.read<DriverProvider>();
    final stop = _stop;
    if (stop == null || !stop.isArrived || _startingUnload) return;
    setState(() {
      _startingUnload = true;
      _unloadError = null;
    });
    final ok =
        await driver.recordStopEvent(stop.id, StopEventType.unloadingStarted);
    if (!mounted) return;
    setState(() {
      _startingUnload = false;
      _unloadError = ok ? null : (driver.actionError ?? 'Could not start unloading.');
    });
  }

  int _deliveredOf(DriverOrderItem item) =>
      _delivered[item.id] ?? item.loadedQty;

  /// Lines are sent when something was loaded short or the driver says some
  /// items were not handed over; otherwise the server delivers "as planned".
  bool _needsLines(DriverTaskStop stop) =>
      _partial || stop.items.any((i) => i.loadedQty < i.quantity);

  bool get _canContinue =>
      checklistCompleted &&
      receiverController.text.trim().length >= 2 &&
      !_startingUnload &&
      _unloadError == null;

  void _continue(DriverTaskStop stop) {
    final needsLines = _needsLines(stop);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => DriverDeliveryCompleteScreen(
          tripId: widget.tripId,
          stopId: widget.stopId,
          receiverName: receiverController.text.trim(),
          allDeliveredAsPlanned: !needsLines,
          lines: needsLines
              ? [
                  for (final item in stop.items)
                    DeliveredLine(
                      orderItemId: item.id,
                      deliveredQty: _deliveredOf(item),
                    ),
                ]
              : null,
        ),
      ),
    );
  }

  Future<void> _cannotDeliver(DriverTaskStop stop) async {
    final reason = await askDeliveryFailureReason(context, stop.outlet.name);
    if (reason == null || !mounted) return;
    final driver = context.read<DriverProvider>();
    setState(() => _failing = true);
    final ok = await driver.recordStopEvent(
      stop.id,
      StopEventType.failed,
      failureReason: reason,
    );
    if (!mounted) return;
    setState(() => _failing = false);
    if (!ok) {
      showDriverError(context, driver.actionError ?? 'Could not save that.');
      return;
    }
    showDriverInfo(context, 'The stop was marked as not delivered.');
    Navigator.popUntil(
      context,
      (route) =>
          route.settings.name == DriverRouteScreen.routeName || route.isFirst,
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
        appBar: AppBar(title: const Text('Delivery')),
        body: const Center(child: Text('This stop is no longer available.')),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(title: const Text('Delivery')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Delivery in Progress', style: AppTextStyles.heading2),
            const SizedBox(height: 5),
            const Text(
              'Verify the delivery before completing the stop.',
              style: AppTextStyles.bodySmall,
            ),
            if (_unloadError != null) ...[
              const SizedBox(height: 12),
              _errorBanner(_unloadError!),
            ],
            const SizedBox(height: 16),
            DriverDeliveryInfoCard(
              outletName: stop.outlet.name,
              location: stop.outlet.district,
              orderId: stop.orders.map((o) => o.reference).join(', '),
              deliveryWindow: stop.outlet.windowLabel,
              instructions: stop.instructions,
            ),
            const SizedBox(height: 16),
            _itemsCard(stop),
            const SizedBox(height: 16),
            DriverDeliveryChecklist(
              onChanged: (value) => setState(() => checklistCompleted = value),
            ),
            const SizedBox(height: 16),
            _receiverCard(),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _canContinue ? () => _continue(stop) : null,
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Continue to Complete'),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _failing || _startingUnload
                    ? null
                    : () => _cannotDeliver(stop),
                icon: _failing
                    ? const ButtonSpinner()
                    : const Icon(Icons.block_outlined),
                label: const Text('Cannot Deliver'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _errorBanner(String message) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.errorLight,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppColors.error, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(message, style: AppTextStyles.labelMedium)),
          TextButton(onPressed: _startUnloading, child: const Text('Retry')),
        ],
      ),
    );
  }

  Widget _itemsCard(DriverTaskStop stop) {
    final short = stop.items.any((i) => i.loadedQty < i.quantity);
    final editable = _partial;
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
          const Text('Items handed over', style: AppTextStyles.heading3),
          if (short) ...[
            const SizedBox(height: 6),
            const Text(
              'Some items left the depot short, so only what was loaded can be delivered.',
              style: AppTextStyles.labelSmall,
            ),
          ],
          const SizedBox(height: 10),
          for (final order in stop.orders) ...[
            Text(order.reference, style: AppTextStyles.labelMedium),
            for (final item in order.items)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(item.itemName, style: AppTextStyles.labelLarge),
                    ),
                    if (editable) ...[
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: _deliveredOf(item) > 0
                            ? () => setState(
                                  () => _delivered[item.id] = _deliveredOf(item) - 1,
                                )
                            : null,
                        icon: const Icon(Icons.remove_circle_outline),
                      ),
                      Text(
                        '${_deliveredOf(item)} / ${item.quantity}',
                        style: AppTextStyles.labelLarge,
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: _deliveredOf(item) < item.loadedQty
                            ? () => setState(
                                  () => _delivered[item.id] = _deliveredOf(item) + 1,
                                )
                            : null,
                        icon: const Icon(Icons.add_circle_outline),
                      ),
                    ] else
                      Text(
                        '${_deliveredOf(item)} / ${item.quantity} ${item.unit}',
                        style: AppTextStyles.labelMedium,
                      ),
                  ],
                ),
              ),
          ],
          const Divider(),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            activeThumbColor: AppColors.deepForestGreen,
            value: _partial,
            onChanged: (value) => setState(() {
              _partial = value;
              if (!value) _delivered.clear();
            }),
            title: const Text(
              'Some items were not handed over',
              style: AppTextStyles.labelLarge,
            ),
            subtitle: const Text(
              'Adjust the quantities that were delivered',
              style: AppTextStyles.labelSmall,
            ),
          ),
        ],
      ),
    );
  }

  Widget _receiverCard() {
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
          const Text('Receiver', style: AppTextStyles.heading3),
          const SizedBox(height: 10),
          TextField(
            controller: receiverController,
            onChanged: (_) => setState(() {}),
            textInputAction: TextInputAction.done,
            decoration: const InputDecoration(
              labelText: 'Receiver name',
              hintText: 'Enter receiver name',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
        ],
      ),
    );
  }
}
