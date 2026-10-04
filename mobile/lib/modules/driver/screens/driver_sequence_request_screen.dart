import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';

import '../models/driver_stop.dart';

class DriverSequenceRequestScreen
    extends StatefulWidget {
  const DriverSequenceRequestScreen({super.key});

  @override
  State<DriverSequenceRequestScreen> createState() =>
      _DriverSequenceRequestScreenState();
}

class _DriverSequenceRequestScreenState
    extends State<DriverSequenceRequestScreen> {
  String reason = 'Outlet access issue';

  final detailsController = TextEditingController();

  @override
  void dispose() {
    detailsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final stops = DriverStop.demoStops;

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(
        title: const Text('Request Stop Change'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          16,
          18,
          16,
          28,
        ),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            const Text(
              'Current Route',
              style: AppTextStyles.heading2,
            ),
            const SizedBox(height: 5),
            const Text(
              'Request a different stop sequence when the current route cannot be followed.',
              style: AppTextStyles.bodySmall,
            ),

            const SizedBox(height: 16),

            _routeCard(stops),

            const SizedBox(height: 18),

            const Text(
              'Reason',
              style: AppTextStyles.heading3,
            ),
            const SizedBox(height: 8),

            DropdownButtonFormField<String>(
              value: reason,
              decoration: const InputDecoration(
                prefixIcon:
                    Icon(Icons.warning_amber_outlined),
              ),
              items: const [
                DropdownMenuItem(
                  value: 'Outlet access issue',
                  child: Text('Outlet access issue'),
                ),
                DropdownMenuItem(
                  value: 'Traffic / road restriction',
                  child: Text(
                    'Traffic / road restriction',
                  ),
                ),
                DropdownMenuItem(
                  value: 'Vehicle issue',
                  child: Text('Vehicle issue'),
                ),
                DropdownMenuItem(
                  value: 'Customer request',
                  child: Text('Customer request'),
                ),
                DropdownMenuItem(
                  value: 'Other',
                  child: Text('Other'),
                ),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    reason = value;
                  });
                }
              },
            ),

            const SizedBox(height: 14),

            TextField(
              controller: detailsController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Additional details',
                hintText:
                    'Explain why the sequence needs to change...',
                alignLabelWithHint: true,
              ),
            ),

            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  // Later:
                  // POST /api/trips/:tripId/sequence-requests

                  ScaffoldMessenger.of(context)
                      .showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Sequence change request sent to dispatcher',
                      ),
                    ),
                  );

                  Navigator.pop(context);
                },
                icon: const Icon(Icons.send_outlined),
                label: const Text(
                  'Send Request',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _routeCard(List<DriverStop> stops) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: stops.take(4).map((stop) {
          return Padding(
            padding: const EdgeInsets.symmetric(
              vertical: 7,
            ),
            child: Row(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  decoration: BoxDecoration(
                    color: AppColors.greenSurface,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '${stop.sequence}',
                      style: AppTextStyles.labelLarge,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    stop.outlet,
                    style: AppTextStyles.labelLarge,
                  ),
                ),
                Text(
                  stop.eta,
                  style: AppTextStyles.labelMedium,
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}