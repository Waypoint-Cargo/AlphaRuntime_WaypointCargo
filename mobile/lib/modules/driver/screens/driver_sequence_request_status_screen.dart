import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/app_error_state.dart';
import '../../../core/widgets/app_loading_state.dart';
import '../../../models/driver_task.dart';
import '../../../providers/driver_provider.dart';

/// The stop-order requests made for the trip and what the dispatcher decided.
class DriverSequenceRequestStatusScreen extends StatefulWidget {
  final String tripId;

  const DriverSequenceRequestStatusScreen({super.key, required this.tripId});

  @override
  State<DriverSequenceRequestStatusScreen> createState() =>
      _DriverSequenceRequestStatusScreenState();
}

class _DriverSequenceRequestStatusScreenState
    extends State<DriverSequenceRequestStatusScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<DriverProvider>().loadSequenceRequests(widget.tripId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final driver = context.watch<DriverProvider>();
    final requests = driver.sequenceRequests;

    Widget body;
    if (requests.isEmpty && driver.isSequenceLoading) {
      body = const AppLoadingState(message: 'Loading requests...');
    } else if (requests.isEmpty && driver.sequenceError != null) {
      body = AppErrorState(
        title: "Couldn't load requests",
        message: driver.sequenceError!,
        actionLabel: 'Try again',
        onAction: () => driver.loadSequenceRequests(widget.tripId),
      );
    } else if (requests.isEmpty) {
      body = const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'You have not asked for a stop change on this trip.',
            style: AppTextStyles.bodySmall,
            textAlign: TextAlign.center,
          ),
        ),
      );
    } else {
      body = RefreshIndicator(
        color: AppColors.deepForestGreen,
        onRefresh: () => driver.loadSequenceRequests(widget.tripId),
        child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
          itemCount: requests.length,
          separatorBuilder: (context, index) => const SizedBox(height: 10),
          itemBuilder: (context, index) => _requestCard(requests[index]),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(title: const Text('Sequence Requests')),
      body: body,
    );
  }

  Widget _requestCard(SequenceRequest request) {
    final isPending = request.status == 'PENDING';
    final isApproved = request.status == 'APPROVED';
    final label = isApproved
        ? 'Approved'
        : isPending
            ? 'Pending'
            : 'Rejected';

    final Color statusColor = isApproved
        ? AppColors.success
        : isPending
            ? Colors.orange.shade800
            : Colors.red;

    final Color statusBackground = isApproved
        ? AppColors.successLight
        : isPending
            ? Colors.orange.shade50
            : Colors.red.shade50;

    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(15),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Stop order change',
                  style: AppTextStyles.heading3,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                decoration: BoxDecoration(
                  color: statusBackground,
                  borderRadius: BorderRadius.circular(7),
                ),
                child: Text(
                  label,
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            request.reason.isEmpty ? 'No reason given' : request.reason,
            style: AppTextStyles.bodySmall,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(
                Icons.access_time,
                size: 15,
                color: AppColors.secondaryText,
              ),
              const SizedBox(width: 5),
              Text(
                DateFormatter.formatDateTime(request.createdAt),
                style: AppTextStyles.labelSmall,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
