import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import 'issue_type_selector.dart';

class ReportedIssueItem {
  final String id;
  final IssueType type;
  final String orderId;
  final String routeId;
  final String? outletName;
  final String itemCode;
  final String itemName;
  final int plannedQty;
  final int actualQty;
  final String description;
  final String? reportedTime;
  final String status; // 'Pending', 'Resolved'
  final bool hasPhoto;

  const ReportedIssueItem({
    required this.id,
    required this.type,
    required this.orderId,
    required this.routeId,
    this.outletName,
    required this.itemCode,
    required this.itemName,
    required this.plannedQty,
    required this.actualQty,
    required this.description,
    this.reportedTime,
    this.status = 'Pending',
    this.hasPhoto = false,
  });

  int get shortfall => plannedQty - actualQty;
}

class ReportedIssueCard extends StatelessWidget {
  final ReportedIssueItem issue;
  final VoidCallback? onTap;

  const ReportedIssueCard({
    super.key,
    required this.issue,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap ?? () => _showIssueDetailModal(context),
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.cardPadding),
          decoration: BoxDecoration(
            color: AppColors.cardBackground,
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
            border: Border.all(
              color: AppColors.divider,
              width: 1.0,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0A0D302D),
                blurRadius: 8,
                offset: Offset(0, 3),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Row: Issue ID badge
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.mutedBackground,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  issue.id,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryText,
                  ),
                ),
              ),

              const SizedBox(height: 10),

              // Issue Category & Order / Route Row (No outlet name)
              Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: const BoxDecoration(
                      color: Color(0xFFE8F5EF),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Icon(
                        issue.type.icon,
                        color: const Color(0xFF1B6A56),
                        size: 17,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          issue.type.label,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primaryText,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${issue.orderId} / ${issue.routeId}',
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.secondaryText,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),
              const Divider(height: 1, color: AppColors.divider),
              const SizedBox(height: 10),

              // Item details & Quantities
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ITEM',
                          style: AppTextStyles.labelSmall.copyWith(
                            fontSize: 9.5,
                            color: AppColors.mutedText,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${issue.itemCode} - ${issue.itemName}',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primaryText,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Planned vs Actual
                  _buildQtyBadge(
                    label: 'PLANNED',
                    value: '${issue.plannedQty}',
                    color: AppColors.primaryText,
                  ),
                  const SizedBox(width: 6),
                  _buildQtyBadge(
                    label: 'ACTUAL',
                    value: '${issue.actualQty}',
                    color: AppColors.deepForestGreen,
                  ),
                  if (issue.shortfall > 0) ...[
                    const SizedBox(width: 6),
                    _buildQtyBadge(
                      label: 'SHORTFALL',
                      value: '-${issue.shortfall}',
                      color: AppColors.error,
                      isAlert: true,
                    ),
                  ],
                ],
              ),

              if (issue.description.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.mutedBackground,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 2),
                        child: Icon(
                          Icons.notes_rounded,
                          size: 14,
                          color: AppColors.secondaryText,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          issue.description,
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: Color(0xFF475569),
                            height: 1.25,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              if (issue.hasPhoto) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(
                      Icons.image_outlined,
                      size: 14,
                      color: Color(0xFF1B6A56),
                    ),
                    const SizedBox(width: 4),
                    const Text(
                      'Photo attached',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1B6A56),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQtyBadge({
    required String label,
    required String value,
    required Color color,
    bool isAlert = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: isAlert ? AppColors.errorLight : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 8,
              fontWeight: FontWeight.w700,
              color: isAlert ? AppColors.error : AppColors.mutedText,
            ),
          ),
          const SizedBox(height: 1),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  void _showIssueDetailModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.cardBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Issue Details (${issue.id})',
                  style: AppTextStyles.heading3,
                ),
                IconButton(
                  onPressed: () => Navigator.pop(ctx),
                  icon: const Icon(Icons.close, size: 20),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildDetailRow('Issue Type', issue.type.label),
            _buildDetailRow('Order / Route', '${issue.orderId} / ${issue.routeId}'),
            if (issue.outletName != null && issue.outletName!.isNotEmpty)
              _buildDetailRow('Outlet', issue.outletName!),
            _buildDetailRow('Item', '${issue.itemCode} - ${issue.itemName}'),
            _buildDetailRow('Planned Quantity', '${issue.plannedQty} units'),
            _buildDetailRow('Actual Quantity', '${issue.actualQty} units'),
            if (issue.shortfall > 0)
              _buildDetailRow('Shortfall', '-${issue.shortfall} units', isError: true),
            _buildDetailRow('Status', issue.status),
            if (issue.reportedTime != null && issue.reportedTime!.isNotEmpty)
              _buildDetailRow('Reported Time', issue.reportedTime!),
            if (issue.description.isNotEmpty)
              _buildDetailRow('Notes', issue.description),
            if (issue.hasPhoto)
              _buildDetailRow('Attachment', 'damage_report_01.jpg (Verified)'),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: AppSpacing.buttonHeight,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.deepForestGreen,
                  foregroundColor: AppColors.white,
                ),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close Details'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isError = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12.5,
                color: AppColors.secondaryText,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isError ? AppColors.error : AppColors.primaryText,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
