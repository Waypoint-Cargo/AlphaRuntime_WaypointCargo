import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../providers/loader_provider.dart';

/// Shows a failed loader action the way it deserves: a dialog when the task
/// itself is the problem (somebody else holds it, it is on hold...), a red
/// SnackBar for anything else (offline, server error), like the auth screens do.
Future<void> showLoaderError(BuildContext context, LoaderError error) {
  if (error.isTaskUnavailable || error.isCompletionBlocked) {
    return showTaskUnavailableDialog(context, error);
  }
  showLoaderSnackBar(context, error.message);
  return Future.value();
}

void showLoaderSnackBar(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..clearSnackBars()
    ..showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.error,
      ),
    );
}

({String title, IconData icon}) _describe(LoaderError error) {
  return switch (error.code) {
    'TASK_LOCKED' => (title: 'Task in use', icon: Icons.lock_outline_rounded),
    'VEHICLE_BUSY' => (title: 'Vehicle in use', icon: Icons.local_shipping_outlined),
    'TASK_ON_HOLD' => (title: 'Task on hold', icon: Icons.pause_circle_outline_rounded),
    'TASK_COMPLETED' => (title: 'Already loaded', icon: Icons.check_circle_outline_rounded),
    'TASK_PAUSED' => (title: 'Task paused', icon: Icons.pause_circle_outline_rounded),
    'TRIP_NOT_LOADABLE' => (title: 'Route unavailable', icon: Icons.block_rounded),
    'PLAN_CONSTRAINT_VIOLATION' => (title: "Can't load this route", icon: Icons.report_problem_outlined),
    'COMPLETION_BLOCKED' => (title: "Can't complete yet", icon: Icons.inventory_2_outlined),
    _ => (title: 'Task unavailable', icon: Icons.info_outline_rounded),
  };
}

/// Explains why the task cannot be used: the server's own message, plus its
/// reasons (broken constraints, lines still to load) when it lists any.
Future<void> showTaskUnavailableDialog(BuildContext context, LoaderError error) {
  final description = _describe(error);
  final reasons = error.reasons;

  return showDialog<void>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      icon: Icon(description.icon, color: AppColors.pending, size: 32),
      title: Text(description.title, textAlign: TextAlign.center),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(error.message, style: AppTextStyles.bodyMedium),
            if (reasons.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.md),
              for (final reason in reasons)
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 6, right: 8),
                        child: Icon(Icons.circle, size: 5, color: AppColors.secondaryText),
                      ),
                      Expanded(
                        child: Text(reason.message, style: AppTextStyles.bodySmall),
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
      actions: [
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.deepForestGreen,
            foregroundColor: AppColors.white,
          ),
          onPressed: () => Navigator.pop(dialogContext),
          child: const Text('OK'),
        ),
      ],
    ),
  );
}
