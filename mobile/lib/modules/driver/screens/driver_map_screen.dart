import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../models/driver_stop.dart';
import '../../driver/widgets/map_placeholder.dart';
import 'driver_delivery_screen.dart';

class DriverMapScreen extends StatelessWidget {
  final DriverStop stop;

  const DriverMapScreen({
    super.key,
    required this.stop,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(
        title: const Text('Route'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Navigate to',
              style: AppTextStyles.heading2,
            ),
            const SizedBox(height: 4),
            Text(
              stop.outlet,
              style: AppTextStyles.bodySmall,
            ),

            const SizedBox(height: 14),

            DriverMapPlaceholder(
              destination: stop.outlet,
              eta: stop.eta,
              distance: stop.distance,
            ),

            const SizedBox(height: 16),

            _destinationCard(),

            const SizedBox(height: 18),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {

                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => DriverDeliveryScreen(
                        stop: stop,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.location_on_outlined),
                label: const Text("I've Arrived"),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _destinationCard() {
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
                Text(
                  stop.outlet,
                  style: AppTextStyles.heading3,
                ),
                const SizedBox(height: 4),
                Text(
                  stop.address,
                  style: AppTextStyles.bodySmall,
                ),
                const SizedBox(height: 8),
                Text(
                  'Delivery window: ${stop.deliveryWindow}',
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