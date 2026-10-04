import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../models/driver_stop.dart';
import '../../driver/widgets/delivery_checklist.dart';
import '../../driver/widgets/delivery_info_card.dart';
import 'driver_delivery_complete_screen.dart';

class DriverDeliveryScreen extends StatefulWidget {
  final DriverStop stop;

  const DriverDeliveryScreen({
    super.key,
    required this.stop,
  });

  @override
  State<DriverDeliveryScreen> createState() =>
      _DriverDeliveryScreenState();
}

class _DriverDeliveryScreenState
    extends State<DriverDeliveryScreen> {
  bool checklistCompleted = false;

  final TextEditingController receiverController =
      TextEditingController();

  @override
  void dispose() {
    receiverController.dispose();
    super.dispose();
  }

  bool get canContinue =>
      checklistCompleted &&
      receiverController.text.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(
        title: const Text('Delivery'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Delivery in Progress',
              style: AppTextStyles.heading2,
            ),
            const SizedBox(height: 5),
            const Text(
              'Verify the delivery before completing the stop.',
              style: AppTextStyles.bodySmall,
            ),

            const SizedBox(height: 16),

            DriverDeliveryInfoCard(
              outletName: widget.stop.outlet,
              location: widget.stop.location,
              orderId: 'ORD-${widget.stop.sequence}04',
              deliveryWindow: widget.stop.deliveryWindow,
              instructions: widget.stop.instructions,
            ),

            const SizedBox(height: 16),

            DriverDeliveryChecklist(
              onChanged: (value) {
                setState(() {
                  checklistCompleted = value;
                });
              },
            ),

            const SizedBox(height: 16),

            _receiverCard(),

            const SizedBox(height: 20),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: canContinue
                    ? () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) =>
                                DriverDeliveryCompleteScreen(
                              stop: widget.stop,
                              receiverName:
                                  receiverController.text.trim(),
                            ),
                          ),
                        );
                      }
                    : null,
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Continue to Complete'),
              ),
            ),
          ],
        ),
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
          const Text(
            'Receiver',
            style: AppTextStyles.heading3,
          ),
          const SizedBox(height: 10),
          TextField(
            controller: receiverController,
            onChanged: (_) {
              setState(() {});
            },
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