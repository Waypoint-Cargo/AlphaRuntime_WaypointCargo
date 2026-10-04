import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../models/driver_stop.dart';
import 'driver_map_screen.dart';
import 'driver_issues_screen.dart';

class DriverStopDetailsScreen extends StatelessWidget {
  final DriverStop stop;

  const DriverStopDetailsScreen({super.key, required this.stop});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(title: const Text('Stop Details')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _header(),
            const SizedBox(height: 18),

            _informationCard(),

            const SizedBox(height: 16),

            _instructionsCard(),

            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => DriverMapScreen(stop: stop),
                    ),
                  );
                },
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
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => DriverMapScreen(stop: stop),
                    ),
                  );
                },
                icon: const Icon(Icons.navigation_outlined),
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                label: const Text('Start Stop'),
              ),
            ),

            const SizedBox(height: 10),

            SizedBox(
              width: double.infinity,
              height: 52,
              child: TextButton.icon(
                onPressed: () {
                  DriverIssuesScreen.showReportSheet(
                    context,
                    stopName: stop.outlet,
                  );
                },
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

  Widget _header() {
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: AppColors.deepForestGreen,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Center(
            child: Text('F', style: AppTextStyles.buttonLight),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(stop.outlet, style: AppTextStyles.heading2),
              const SizedBox(height: 3),
              Text(stop.location, style: AppTextStyles.bodySmall),
            ],
          ),
        ),
      ],
    );
  }

  Widget _informationCard() {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Delivery Information', style: AppTextStyles.heading3),
          const SizedBox(height: 14),
          _row(Icons.schedule_outlined, 'Delivery Window', stop.deliveryWindow),
          _row(Icons.access_time, 'Expected Arrival', stop.eta),
          _row(Icons.location_on_outlined, 'Address', stop.address),
          _row(Icons.local_shipping_outlined, 'Vehicle', 'V-012'),
          _row(Icons.route_outlined, 'Distance', stop.distance),
        ],
      ),
    );
  }

  Widget _instructionsCard() {
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
