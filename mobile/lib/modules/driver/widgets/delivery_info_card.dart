import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';

class DriverDeliveryInfoCard extends StatelessWidget {
  final String outletName;
  final String location;
  final String orderId;
  final String deliveryWindow;
  final String instructions;

  const DriverDeliveryInfoCard({
    super.key,
    required this.outletName,
    required this.location,
    required this.orderId,
    required this.deliveryWindow,
    required this.instructions,
  });

  @override
  Widget build(BuildContext context) {
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
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.greenSurface,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.store_outlined,
                  color: AppColors.deepForestGreen,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      outletName,
                      style: AppTextStyles.heading3,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      location,
                      style: AppTextStyles.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(),
          const SizedBox(height: 10),

          _row('Order ID', orderId),
          _row('Delivery Window', deliveryWindow),
          _row('Instructions', instructions),
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
            width: 110,
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
}