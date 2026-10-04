import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';

/// A red snack bar with the reason an action failed.
void showDriverError(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(content: Text(message), backgroundColor: AppColors.error),
    );
}

/// A plain confirmation snack bar.
void showDriverInfo(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

/// A small spinner for the inside of a button.
class ButtonSpinner extends StatelessWidget {
  const ButtonSpinner({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox(
        width: 18,
        height: 18,
        child: CircularProgressIndicator(strokeWidth: 2),
      );
}

/// Asks why a stop cannot be delivered; null when the driver backs out.
Future<String?> askDeliveryFailureReason(
  BuildContext context,
  String outletName,
) {
  return showDialog<String>(
    context: context,
    builder: (_) => _FailureReasonDialog(outletName: outletName),
  );
}

// Owns its text controller so it is disposed only once the dialog has left.
class _FailureReasonDialog extends StatefulWidget {
  final String outletName;

  const _FailureReasonDialog({required this.outletName});

  @override
  State<_FailureReasonDialog> createState() => _FailureReasonDialogState();
}

class _FailureReasonDialogState extends State<_FailureReasonDialog> {
  final TextEditingController _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final text = _controller.text.trim();
    return AlertDialog(
      title: const Text('Cannot deliver'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${widget.outletName}: the orders for this stop are marked as failed and the dispatcher is told.',
            style: AppTextStyles.bodySmall,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            maxLines: 3,
            maxLength: 300,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: 'Reason',
              hintText: 'For example: outlet closed, nobody to receive',
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Back'),
        ),
        TextButton(
          onPressed: text.length >= 3 ? () => Navigator.pop(context, text) : null,
          child: const Text('Mark as failed'),
        ),
      ],
    );
  }
}
