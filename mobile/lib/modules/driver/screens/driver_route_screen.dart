import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../models/driver_stop.dart';
import '../../driver/widgets/route_summary_card.dart';
import '../widgets/driver_stop_card.dart';
import '../screens/driver_stop_details_screen.dart';
import '../screens/driver_sequence_request_screen.dart';
import '../screens/driver_sequence_request_status_screen.dart';

class DriverRouteScreen extends StatelessWidget {
  const DriverRouteScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final stops = DriverStop.demoStops;

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(
        title: const Text('Today\'s Route'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Route Overview',
              style: AppTextStyles.heading2,
            ),
            const SizedBox(height: 10),

            const DriverRouteSummaryCard(
              routeId: 'R-005',
              vehicleId: 'V-012',
              totalStops: 8,
              completedStops: 3,
              eta: '11:20 AM',
            ),

            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              const DriverSequenceRequestScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.swap_vert_rounded),
                    label: const Text('Request Stop Change'),
                  ),
                ),
                const SizedBox(width: 10),
                IconButton(
                  tooltip: 'Sequence Requests',
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            const DriverSequenceRequestStatusScreen(),
                      ),
                    );
                  },
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
                const Text(
                  'Delivery Stops',
                  style: AppTextStyles.heading2,
                ),
                const Spacer(),
                Text(
                  '${stops.length} stops',
                  style: AppTextStyles.labelMedium,
                ),
              ],
            ),

            const SizedBox(height: 10),

            ...stops.map(
              (stop) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: DriverStopCard(
                  stop: stop,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            DriverStopDetailsScreen(stop: stop),
                      ),
                    );
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}