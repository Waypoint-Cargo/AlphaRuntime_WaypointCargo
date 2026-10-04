import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';

class DriverSequenceRequestStatusScreen
    extends StatelessWidget {
  const DriverSequenceRequestStatusScreen({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final requests = [
      (
        reason: 'Outlet access issue',
        details:
            'Requested Ja-Ela before Wattala due to outlet access restriction.',
        date: 'Today, 10:20 AM',
        status: 'Pending',
      ),
      (
        reason: 'Traffic / road restriction',
        details:
            'Requested route sequence change due to road closure.',
        date: 'Yesterday, 02:15 PM',
        status: 'Approved',
      ),
      (
        reason: 'Customer request',
        details:
            'Customer requested an earlier delivery sequence.',
        date: 'Yesterday, 09:40 AM',
        status: 'Rejected',
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: AppBar(
        title: const Text('Sequence Requests'),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.fromLTRB(
          16,
          18,
          16,
          28,
        ),
        itemCount: requests.length,
        separatorBuilder: (context, index) =>
            const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final request = requests[index];

          return _requestCard(
            reason: request.reason,
            details: request.details,
            date: request.date,
            status: request.status,
          );
        },
      ),
    );
  }

  Widget _requestCard({
    required String reason,
    required String details,
    required String date,
    required String status,
  }) {
    final isPending = status == 'Pending';
    final isApproved = status == 'Approved';

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
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  reason,
                  style: AppTextStyles.heading3,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 9,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: statusBackground,
                  borderRadius:
                      BorderRadius.circular(7),
                ),
                child: Text(
                  status,
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
            details,
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
                date,
                style: AppTextStyles.labelSmall,
              ),
            ],
          ),
        ],
      ),
    );
  }
}