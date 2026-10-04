import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/section_header.dart';
import '../widgets/issue_card.dart';

class DriverIssuesScreen extends StatelessWidget {
  final bool showHeader;

  const DriverIssuesScreen({super.key, this.showHeader = true});

  static void showReportSheet(BuildContext parentContext, {String? stopName}) {
    String selectedType = 'Outlet access issue';
    final detailsController = TextEditingController();

    showModalBottomSheet(
      context: parentContext,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
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

                    const Text(
                      'Report an Issue',
                      style: AppTextStyles.heading2,
                    ),

                    if (stopName != null) ...[
                      const SizedBox(height: 4),
                      Text(stopName, style: AppTextStyles.bodySmall),
                    ],

                    const SizedBox(height: 18),

                    DropdownButtonFormField<String>(
                      initialValue: selectedType,
                      decoration: const InputDecoration(
                        labelText: 'Issue Type',
                        prefixIcon: Icon(Icons.warning_amber_outlined),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'Outlet access issue',
                          child: Text('Outlet access issue'),
                        ),
                        DropdownMenuItem(
                          value: 'Vehicle issue',
                          child: Text('Vehicle issue'),
                        ),
                        DropdownMenuItem(
                          value: 'Order mismatch',
                          child: Text('Order mismatch'),
                        ),
                        DropdownMenuItem(
                          value: 'Damaged item',
                          child: Text('Damaged item'),
                        ),
                        DropdownMenuItem(value: 'Other', child: Text('Other')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setModalState(() {
                            selectedType = value;
                          });
                        }
                      },
                    ),

                    const SizedBox(height: 12),

                    TextField(
                      controller: detailsController,
                      maxLines: 4,
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
                        onPressed: () {
                          // Later:
                          // POST /api/issues

                          Navigator.pop(sheetContext);

                          ScaffoldMessenger.of(parentContext).showSnackBar(
                            const SnackBar(
                              content: Text('Issue reported successfully'),
                            ),
                          );
                        },
                        icon: const Icon(Icons.send_outlined),
                        label: const Text('Submit Issue'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final issues = [
      (
        type: 'Outlet access issue',
        description: 'Receiving entrance was temporarily blocked.',
        outlet: 'Fresh Ja-Ela',
        time: '10:42 AM',
        status: 'Resolved',
      ),
      (
        type: 'Order mismatch',
        description: 'Two items were missing from the assigned load.',
        outlet: 'Fresh Wattala',
        time: '09:15 AM',
        status: 'Open',
      ),
      (
        type: 'Damaged item',
        description: 'One package had visible external damage.',
        outlet: 'Fresh Maharagama',
        time: '08:50 AM',
        status: 'Resolved',
      ),
    ];

    return Container(
      color: AppColors.screenBackground,
      child: Column(
        children: [
          if (showHeader) const SectionHeader(title: 'Reported Issues'),
          Expanded(
            child: Stack(
              children: [
                SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 100),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ...issues.map(
                        (issue) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: DriverIssueCard(
                            issueType: issue.type,
                            description: issue.description,
                            outletName: issue.outlet,
                            time: issue.time,
                            status: issue.status,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                Positioned(
                  left: 18,
                  right: 18,
                  bottom: 18,
                  child: SizedBox(
                    height: 52,
                    child: OutlinedButton.icon(
                      onPressed: () => showReportSheet(context),
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
