import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../models/driver_task.dart';
import '../../../providers/driver_provider.dart';
import '../widgets/driver_feedback.dart';

/// Asks the dispatcher to visit the stops that are still waiting in another order.
class DriverSequenceRequestScreen extends StatefulWidget {
  final String tripId;

  const DriverSequenceRequestScreen({super.key, required this.tripId});

  @override
  State<DriverSequenceRequestScreen> createState() =>
      _DriverSequenceRequestScreenState();
}

class _DriverSequenceRequestScreenState
    extends State<DriverSequenceRequestScreen> {
  String reason = 'Outlet access issue';
  final detailsController = TextEditingController();

  // the waiting stops in the order the driver wants; null until first built
  List<DriverTaskStop>? _order;
  List<String> _original = const [];
  bool _sending = false;

  @override
  void dispose() {
    detailsController.dispose();
    super.dispose();
  }

  bool get _changed {
    final order = _order;
    if (order == null) return false;
    for (var i = 0; i < order.length; i++) {
      if (order[i].id != _original[i]) return true;
    }
    return false;
  }

  Future<void> _send() async {
    final order = _order;
    if (order == null || !_changed || _sending) return;
    final driver = context.read<DriverProvider>();
    final details = detailsController.text.trim();
    final text = details.isEmpty ? reason : '$reason: $details';
    setState(() => _sending = true);
    final ok = await driver.requestSequenceChange(
      widget.tripId,
      orderedStopIds: [for (final stop in order) stop.id],
      reason: text.length > 300 ? text.substring(0, 300) : text,
    );
    if (!mounted) return;
    setState(() => _sending = false);
    if (!ok) {
      showDriverError(context, driver.actionError ?? 'Could not send the request.');
      return;
    }
    showDriverInfo(context, 'Sequence change request sent to dispatcher');
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final task = context.watch<DriverProvider>().taskById(widget.tripId);
    if (task != null && _order == null) {
      _order = task.pendingStops;
      _original = [for (final stop in _order!) stop.id];
    }
    final order = _order ?? const <DriverTaskStop>[];

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(title: const Text('Request Stop Change')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Current Route', style: AppTextStyles.heading2),
            const SizedBox(height: 5),
            const Text(
              'Drag the stops that are still waiting into the order you want to drive them.',
              style: AppTextStyles.bodySmall,
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.cardBackground,
                borderRadius: BorderRadius.circular(16),
              ),
              child: ReorderableListView(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                buildDefaultDragHandles: true,
                onReorder: (from, to) => setState(() {
                  if (to > from) to -= 1;
                  order.insert(to, order.removeAt(from));
                }),
                children: [
                  for (var i = 0; i < order.length; i++)
                    ListTile(
                      key: ValueKey(order[i].id),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10),
                      leading: Container(
                        width: 30,
                        height: 30,
                        decoration: const BoxDecoration(
                          color: AppColors.greenSurface,
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text('${i + 1}', style: AppTextStyles.labelLarge),
                        ),
                      ),
                      title: Text(
                        order[i].outlet.name,
                        style: AppTextStyles.labelLarge,
                      ),
                      subtitle: Text(
                        DateFormatter.formatTime(order[i].predictedArrival),
                        style: AppTextStyles.labelMedium,
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            const Text('Reason', style: AppTextStyles.heading3),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: reason,
              isExpanded: true,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.warning_amber_outlined),
              ),
              items: const [
                DropdownMenuItem(
                  value: 'Outlet access issue',
                  child: Text('Outlet access issue'),
                ),
                DropdownMenuItem(
                  value: 'Traffic / road restriction',
                  child: Text('Traffic / road restriction'),
                ),
                DropdownMenuItem(
                  value: 'Vehicle issue',
                  child: Text('Vehicle issue'),
                ),
                DropdownMenuItem(
                  value: 'Customer request',
                  child: Text('Customer request'),
                ),
                DropdownMenuItem(value: 'Other', child: Text('Other')),
              ],
              onChanged: (value) {
                if (value != null) setState(() => reason = value);
              },
            ),
            const SizedBox(height: 14),
            TextField(
              controller: detailsController,
              maxLines: 4,
              maxLength: 200,
              decoration: const InputDecoration(
                labelText: 'Additional details',
                hintText: 'Explain why the sequence needs to change...',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _changed && !_sending ? _send : null,
                icon: _sending
                    ? const ButtonSpinner()
                    : const Icon(Icons.send_outlined),
                label: const Text('Send Request'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
