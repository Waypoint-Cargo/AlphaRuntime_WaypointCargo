import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/app_error_state.dart';
import '../../../core/widgets/app_loading_state.dart';
import '../../../models/driver_task.dart';
import '../../../providers/driver_provider.dart';
import '../widgets/driver_feedback.dart';
import '../widgets/issue_card.dart';

class DriverIssuesScreen extends StatefulWidget {
  final bool showHeader;

  const DriverIssuesScreen({super.key, this.showHeader = true});

  /// The "Report an Issue" sheet. It files the issue against [tripId] (the
  /// active trip when none is given) and, when known, one of its stops.
  static void showReportSheet(
    BuildContext parentContext, {
    String? tripId,
    String? stopId,
    String? stopName,
  }) {
    final driver = parentContext.read<DriverProvider>();
    final trip = tripId ?? driver.activeTask?.id;
    if (trip == null) {
      showDriverInfo(
        parentContext,
        'Select a task first: issues are reported on a trip.',
      );
      return;
    }

    showModalBottomSheet(
      context: parentContext,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ReportIssueSheet(
        parentContext: parentContext,
        driver: driver,
        tripId: trip,
        stopId: stopId,
        stopName: stopName,
      ),
    );
  }

  @override
  State<DriverIssuesScreen> createState() => _DriverIssuesScreenState();
}

class _DriverIssuesScreenState extends State<DriverIssuesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<DriverProvider>().loadIssues();
    });
  }

  static String _statusLabel(DriverIssue issue) {
    switch (issue.status) {
      case 'RESOLVED':
        return 'Resolved';
      case 'INVESTIGATING':
        return 'In review';
      default:
        return 'Open';
    }
  }

  @override
  Widget build(BuildContext context) {
    final driver = context.watch<DriverProvider>();
    final issues = driver.issues;

    Widget list;
    if (issues.isEmpty && driver.isIssuesLoading) {
      list = const AppLoadingState(message: 'Loading issues...');
    } else if (issues.isEmpty && driver.issuesError != null) {
      list = AppErrorState(
        title: "Couldn't load issues",
        message: driver.issuesError!,
        actionLabel: 'Try again',
        onAction: driver.loadIssues,
      );
    } else if (issues.isEmpty) {
      list = const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'No issues reported yet.',
            style: AppTextStyles.bodySmall,
          ),
        ),
      );
    } else {
      list = RefreshIndicator(
        color: AppColors.deepForestGreen,
        onRefresh: driver.loadIssues,
        child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 100),
          itemCount: issues.length,
          separatorBuilder: (context, index) => const SizedBox(height: 10),
          itemBuilder: (context, index) {
            final issue = issues[index];
            return DriverIssueCard(
              issueType: issue.typeLabel,
              description: issue.description.isNotEmpty
                  ? issue.description
                  : (issue.resolutionNote.isNotEmpty
                      ? issue.resolutionNote
                      : issue.reference),
              outletName:
                  issue.outletName.isNotEmpty ? issue.outletName : 'Route ${issue.tripCode}',
              time: DateFormatter.formatTime(issue.createdAt),
              status: _statusLabel(issue),
            );
          },
        ),
      );
    }

    return Container(
      color: AppColors.screenBackground,
      child: Column(
        children: [
          if (widget.showHeader) const SectionHeader(title: 'Reported Issues'),
          Expanded(
            child: Stack(
              children: [
                Positioned.fill(child: list),
                Positioned(
                  left: 18,
                  right: 18,
                  bottom: 18,
                  child: SizedBox(
                    height: 52,
                    child: OutlinedButton.icon(
                      onPressed: () =>
                          DriverIssuesScreen.showReportSheet(context),
                      icon: const Icon(
                        Icons.report_problem_outlined,
                        color: AppColors.error,
                      ),
                      label: const Text(
                        'Report an Issue',
                        style: TextStyle(color: AppColors.error),
                      ),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: AppColors.cardBackground,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        side: const BorderSide(color: AppColors.error),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// The sheet owns its text controller so it is disposed only once the sheet has left.
class _ReportIssueSheet extends StatefulWidget {
  final BuildContext parentContext;
  final DriverProvider driver;
  final String tripId;
  final String? stopId;
  final String? stopName;

  const _ReportIssueSheet({
    required this.parentContext,
    required this.driver,
    required this.tripId,
    this.stopId,
    this.stopName,
  });

  @override
  State<_ReportIssueSheet> createState() => _ReportIssueSheetState();
}

class _ReportIssueSheetState extends State<_ReportIssueSheet> {
  final TextEditingController _details = TextEditingController();
  DriverIssueType _type = DriverIssueType.outletClosed;
  bool _sending = false;

  @override
  void dispose() {
    _details.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_sending) return;
    setState(() => _sending = true);
    final ok = await widget.driver.reportIssue(
      type: _type,
      tripId: widget.tripId,
      stopId: widget.stopId,
      description: _details.text,
    );
    if (!mounted) return;
    setState(() => _sending = false);
    if (!ok) {
      showDriverError(
        context,
        widget.driver.actionError ?? 'Could not report the issue.',
      );
      return;
    }
    final parent = widget.parentContext;
    Navigator.pop(context);
    if (parent.mounted) showDriverInfo(parent, 'Issue reported successfully');
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 18),
            const Text('Report an Issue', style: AppTextStyles.heading2),
            if (widget.stopName != null) ...[
              const SizedBox(height: 4),
              Text(widget.stopName!, style: AppTextStyles.bodySmall),
            ],
            const SizedBox(height: 18),
            DropdownButtonFormField<DriverIssueType>(
              initialValue: _type,
              decoration: const InputDecoration(
                labelText: 'Issue Type',
                prefixIcon: Icon(Icons.warning_amber_outlined),
              ),
              items: [
                for (final type in DriverIssueType.values)
                  DropdownMenuItem(value: type, child: Text(type.label)),
              ],
              onChanged: (value) {
                if (value != null) setState(() => _type = value);
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _details,
              maxLines: 4,
              maxLength: 200,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'Describe the issue...',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _sending ? null : _submit,
                icon: _sending
                    ? const ButtonSpinner()
                    : const Icon(Icons.send_outlined),
                label: const Text('Submit Issue'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
