import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../models/driver_stop.dart';

class DriverDeliveryCompleteScreen extends StatefulWidget {
  final DriverStop stop;
  final String receiverName;

  const DriverDeliveryCompleteScreen({
    super.key,
    required this.stop,
    required this.receiverName,
  });

  @override
  State<DriverDeliveryCompleteScreen> createState() =>
      _DriverDeliveryCompleteScreenState();
}

class _DriverDeliveryCompleteScreenState
    extends State<DriverDeliveryCompleteScreen> {
  bool signatureAdded = false;
  bool photoAdded = false;

  bool get ready => signatureAdded && photoAdded;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(
        title: const Text('Complete Delivery'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Delivery Proof',
              style: AppTextStyles.heading2,
            ),
            const SizedBox(height: 5),
            const Text(
              'Add proof of delivery before completing the stop.',
              style: AppTextStyles.bodySmall,
            ),

            const SizedBox(height: 18),

            _proofCard(
              icon: Icons.draw_outlined,
              title: 'Receiver Signature',
              subtitle: signatureAdded
                  ? 'Signature captured'
                  : 'Tap to add receiver signature',
              completed: signatureAdded,
              onTap: () {
                setState(() {
                  signatureAdded = true;
                });
              },
            ),

            const SizedBox(height: 12),

            _proofCard(
              icon: Icons.camera_alt_outlined,
              title: 'Delivery Photo',
              subtitle: photoAdded
                  ? 'Photo captured'
                  : 'Tap to add delivery photo',
              completed: photoAdded,
              onTap: () {
                setState(() {
                  photoAdded = true;
                });
              },
            ),

            const SizedBox(height: 18),

            _summaryCard(),

            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: ready ? _completeDelivery : null,
                icon: const Icon(Icons.check_circle_outline),
                label: const Text('Complete Delivery'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _proofCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool completed,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(15),
      child: Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: AppColors.cardBackground,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
            color: completed
                ? AppColors.success
                : Colors.transparent,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: completed
                    ? AppColors.successLight
                    : AppColors.greenSurface,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                completed ? Icons.check : icon,
                color: completed
                    ? AppColors.success
                    : AppColors.deepForestGreen,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.heading3,
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: AppTextStyles.bodySmall,
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: AppColors.secondaryText,
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryCard() {
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
          const Text(
            'Delivery Summary',
            style: AppTextStyles.heading3,
          ),
          const SizedBox(height: 12),
          _row('Outlet', widget.stop.outlet),
          _row('Address', widget.stop.address),
          _row('Vehicle', 'V-012'),
          _row('Receiver', widget.receiverName),
          _row(
            'Status',
            ready ? 'Ready to complete' : 'Proof required',
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
            child: Text(
              label,
              style: AppTextStyles.labelMedium,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTextStyles.labelLarge,
            ),
          ),
        ],
      ),
    );
  }

  void _completeDelivery() {
    // Later:
    // POST /api/deliveries/stops/:stopId/proof
    //
    // Send:
    // - receiver
    // - signature
    // - photo
    // - delivery result

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          icon: const Icon(
            Icons.check_circle,
            color: AppColors.success,
            size: 48,
          ),
          title: const Text('Delivery Completed'),
          content: Text(
            '${widget.stop.outlet} has been successfully completed.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();

                Navigator.of(context).popUntil(
                  (route) => route.isFirst,
                );
              },
              child: const Text('Done'),
            ),
          ],
        );
      },
    );
  }
}