import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../models/loading_issue.dart';
import '../../../../models/loading_task.dart';
import 'issue_type_selector.dart';

/// What a shortfall report is called on the card: the kind of problem when all
/// its lines share one, otherwise just "Loading Shortfall".
({String title, IssueType type}) _kindOf(LoadingIssue issue) {
  return switch (issue.commonKind) {
    LineStatus.short => (title: 'Missing Items', type: IssueType.missingItems),
    LineStatus.damaged => (title: 'Damaged Items', type: IssueType.damagedItems),
    LineStatus.wrongItem => (title: 'Wrong Items', type: IssueType.wrongItems),
    _ => (title: 'Loading Shortfall', type: IssueType.quantityShort),
  };
}

String _lineKind(LineStatus status) => switch (status) {
      LineStatus.damaged => 'Damaged',
      LineStatus.wrongItem => 'Wrong item',
      _ => 'Missing',
    };

class ReportedIssueCard extends StatelessWidget {
  final LoadingIssue issue;
  final VoidCallback? onTap;

  /// Lines shown on the card; the rest are in the details.
  static const int _maxLinesOnCard = 3;

  const ReportedIssueCard({
    super.key,
    required this.issue,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final kind = _kindOf(issue);
    final shownLines = issue.lines.take(_maxLinesOnCard).toList();
    final hiddenLines = issue.lines.length - shownLines.length;
    final reason = issue.reason;
    final resolution = issue.resolutionNote;

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
                  issue.reference,
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
                        kind.type.icon,
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
                          kind.title,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primaryText,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          issue.orderAndRoute,
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

              // Item details & Quantities, one row per line the loader flagged
              for (final (index, line) in shownLines.indexed) ...[
                const SizedBox(height: 10),
                _buildLineRow(line, showCaption: index == 0),
              ],
              if (hiddenLines > 0) ...[
                const SizedBox(height: 8),
                Text(
                  hiddenLines == 1 ? '+1 more item' : '+$hiddenLines more items',
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.secondaryText,
                  ),
                ),
              ],

              if (reason != null && reason.isNotEmpty) ...[
                const SizedBox(height: 10),
                _buildNote(Icons.notes_rounded, reason, AppColors.mutedBackground, const Color(0xFF475569)),
              ],

              // The dispatcher's answer, once there is one
              if (issue.status.isResolved && resolution != null && resolution.isNotEmpty) ...[
                const SizedBox(height: 8),
                _buildNote(Icons.check_circle_outline_rounded, resolution, AppColors.successLight, AppColors.success),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLineRow(IssueLine line, {required bool showCaption}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (showCaption) ...[
                Text(
                  'ITEM',
                  style: AppTextStyles.labelSmall.copyWith(
                    fontSize: 9.5,
                    color: AppColors.mutedText,
                  ),
                ),
                const SizedBox(height: 2),
              ],
              Text(
                line.label,
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primaryText,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),

        // Planned vs Actual
        _buildQtyBadge(
          label: 'PLANNED',
          value: '${line.plannedQty}',
          color: AppColors.primaryText,
        ),
        const SizedBox(width: 6),
        _buildQtyBadge(
          label: 'ACTUAL',
          value: '${line.availableQty}',
          color: AppColors.deepForestGreen,
        ),
        if (line.shortQty > 0) ...[
          const SizedBox(width: 6),
          _buildQtyBadge(
            label: 'SHORTFALL',
            value: '-${line.shortQty}',
            color: AppColors.error,
            isAlert: true,
          ),
        ],
      ],
    );
  }

  Widget _buildNote(IconData icon, String text, Color background, Color color) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(icon, size: 14, color: color),
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 11.5,
                color: color,
                height: 1.25,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
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

  String get _statusText => switch (issue.status) {
        IssueStatus.open => 'Waiting for the dispatcher',
        IssueStatus.investigating => 'The dispatcher is looking into it',
        IssueStatus.resolved => 'Resolved',
      };

  void _showIssueDetailModal(BuildContext context) {
    final kind = _kindOf(issue);
    final reportedAt = issue.reportedAt;
    final resolvedAt = issue.resolvedAt;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.cardBackground,
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
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
                    'Issue Details (${issue.reference})',
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
              Flexible(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow('Issue Type', kind.title),
                      _buildDetailRow('Order / Route', issue.orderAndRoute),
                      _buildDetailRow('Status', _statusText),
                      if (issue.reportedByName != null)
                        _buildDetailRow('Reported By', issue.reportedByName!),
                      if (reportedAt != null)
                        _buildDetailRow(
                          'Reported',
                          '${DateFormatter.formatDateTime(reportedAt)} (${DateFormatter.formatAgo(reportedAt)})',
                        ),
                      if (issue.reason != null && issue.reason!.isNotEmpty)
                        _buildDetailRow('Notes', issue.reason!),
                      if (issue.status.isResolved) ...[
                        if (issue.resolvedByName != null)
                          _buildDetailRow('Resolved By', issue.resolvedByName!),
                        if (resolvedAt != null)
                          _buildDetailRow('Resolved', DateFormatter.formatDateTime(resolvedAt)),
                        if (issue.resolutionNote != null && issue.resolutionNote!.isNotEmpty)
                          _buildDetailRow('Resolution', issue.resolutionNote!),
                      ],
                      const SizedBox(height: 8),
                      const Divider(height: 1, color: AppColors.divider),
                      const SizedBox(height: 8),
                      Text(
                        issue.lines.length == 1 ? 'Item' : 'Items (${issue.lines.length})',
                        style: AppTextStyles.labelLarge,
                      ),
                      for (final line in issue.lines) _buildLineDetail(line),
                      const SizedBox(height: 4),
                      _buildDetailRow('Total Shortfall', '-${issue.totalShortItems} units', isError: true),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
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
      ),
    );
  }

  Widget _buildLineDetail(IssueLine line) {
    final note = line.note;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            line.label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.primaryText,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${line.orderReference}  |  ${_lineKind(line.status)}  |  '
            'Planned ${line.plannedQty}, actual ${line.availableQty}, short ${line.shortQty}',
            style: AppTextStyles.bodySmall.copyWith(color: AppColors.secondaryText),
          ),
          if (note != null && note.isNotEmpty)
            Text(
              note,
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.secondaryText),
            ),
        ],
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
