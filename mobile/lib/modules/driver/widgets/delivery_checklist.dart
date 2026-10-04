import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';

class DriverDeliveryChecklist extends StatefulWidget {
  final ValueChanged<bool>? onChanged;

  const DriverDeliveryChecklist({
    super.key,
    this.onChanged,
  });

  @override
  State<DriverDeliveryChecklist> createState() =>
      _DriverDeliveryChecklistState();
}

class _DriverDeliveryChecklistState
    extends State<DriverDeliveryChecklist> {
  final List<bool> checked = [
    false,
    false,
    false,
    false,
  ];

  final List<String> titles = [
    'Items verified',
    'Quantity verified',
    'Condition verified',
    'Delivery location confirmed',
  ];

  final List<String> subtitles = [
    'All assigned items were received',
    'Delivered quantity matches the order',
    'No visible damage was found',
    'Delivery was made to the correct outlet',
  ];

  bool get allChecked => checked.every((item) => item);

  void _update(int index, bool value) {
    setState(() {
      checked[index] = value;
    });

    widget.onChanged?.call(allChecked);
  }

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
          const Text(
            'Delivery Checklist',
            style: AppTextStyles.heading3,
          ),
          const SizedBox(height: 12),

          ...List.generate(
            titles.length,
            (index) => CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: checked[index],
              activeColor: AppColors.deepForestGreen,
              controlAffinity: ListTileControlAffinity.leading,
              onChanged: (value) {
                _update(index, value ?? false);
              },
              title: Text(
                titles[index],
                style: AppTextStyles.labelLarge,
              ),
              subtitle: Text(
                subtitles[index],
                style: AppTextStyles.labelSmall,
              ),
            ),
          ),

          const SizedBox(height: 5),

          Row(
            children: [
              Icon(
                allChecked
                    ? Icons.check_circle
                    : Icons.info_outline,
                size: 18,
                color: allChecked
                    ? AppColors.success
                    : AppColors.secondaryText,
              ),
              const SizedBox(width: 7),
              Text(
                allChecked
                    ? 'All checks completed'
                    : 'Complete all checks to continue',
                style: AppTextStyles.labelMedium,
              ),
            ],
          ),
        ],
      ),
    );
  }
}