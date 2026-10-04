import 'package:flutter/material.dart';
import '../../../../core/constants/role_navigation.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../widgets/app_scaffold.dart';
import '../../../../core/widgets/section_header.dart';
import '../../home/screens/loader_home_screen.dart';
import '../../task/screens/task_screens.dart';
import '../widgets/no_issues_empty_state.dart';
import '../widgets/reported_issue_card.dart';
import 'report_issue_screen.dart';

enum IssueFilterTab {
  pending,
  resolved,
}

class IssueDetailsScreen extends StatefulWidget {
  const IssueDetailsScreen({super.key});

  @override
  State<IssueDetailsScreen> createState() => _IssueDetailsScreenState();
}

class _IssueDetailsScreenState extends State<IssueDetailsScreen> {
  IssueFilterTab _selectedTab = IssueFilterTab.pending;
  int currentIndex = 2; // Issues tab

  // Initial list of reported issues
  final List<ReportedIssueItem> _issues = [
    const ReportedIssueItem(
      id: 'ISS-1021',
      type: IssueType.missingItems,
      orderId: 'ORD-1023',
      routeId: 'R-005',
      outletName: 'Retail Store #1023',
      itemCode: 'ITM-1001',
      itemName: 'Fresh Bananas',
      plannedQty: 25,
      actualQty: 20,
      description: '5 crates short from bay allocation. Warehouse notified.',
      reportedTime: '12 mins ago',
      status: 'Pending',
      hasPhoto: true,
    ),
    const ReportedIssueItem(
      id: 'ISS-1022',
      type: IssueType.quantityShort,
      orderId: 'ORD-1024',
      routeId: 'R-005',
      outletName: 'Retail Store #1024',
      itemCode: 'ITM-2001',
      itemName: 'Organic Bananas',
      plannedQty: 14,
      actualQty: 10,
      description: 'Stock count mismatch in cold storage zone 2.',
      reportedTime: '45 mins ago',
      status: 'Pending',
      hasPhoto: false,
    ),
    const ReportedIssueItem(
      id: 'ISS-1019',
      type: IssueType.damagedItems,
      orderId: 'ORD-1015',
      routeId: 'R-002',
      outletName: 'Retail Store #1015',
      itemCode: 'ITM-3001',
      itemName: 'Greek Yogurt 400g',
      plannedQty: 12,
      actualQty: 12,
      description: '2 damaged crates replaced during bay verification.',
      reportedTime: '2 hours ago',
      status: 'Resolved',
      hasPhoto: true,
    ),
  ];

  int get _pendingCount =>
      _issues.where((i) => i.status.toLowerCase() == 'pending').length;

  int get _resolvedCount =>
      _issues.where((i) => i.status.toLowerCase() == 'resolved').length;

  void _onNavTap(int index) {
    if (index == currentIndex) return;

    if (index == 0) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoaderHomeScreen()),
      );
      return;
    }

    if (index == 1) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const PendingTasksScreen()),
      );
      return;
    }

    setState(() {
      currentIndex = index;
    });

    if (index == 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Settings tab selected')),
      );
    }
  }

  void _navigateToReportLoadingIssue() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const ReportLoadingIssueScreen(),
      ),
    ).then((_) {
      if (mounted) {
        setState(() {});
      }
    });
  }

  List<ReportedIssueItem> get _filteredIssues {
    return _issues.where((issue) {
      if (_selectedTab == IssueFilterTab.pending &&
          issue.status.toLowerCase() != 'pending') {
        return false;
      }
      if (_selectedTab == IssueFilterTab.resolved &&
          issue.status.toLowerCase() != 'resolved') {
        return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Waypoint Cargo',
      subtitle: 'Plan | Deliver | Stay Connected',
      currentIndex: currentIndex,
      navItems: RoleNavigation.loaderItems,
      onNavTap: _onNavTap,
      showMenu: true,
      onMenuSelected: (value) {
        if (value == 'profile') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile selected')),
          );
        } else if (value == 'logout') {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Logout selected')),
          );
        }
      },
      body: Column(
        children: [
          // Section Header (No back button)
          const SectionHeader(
            title: 'Reported Issues',
            icon: Icons.report_problem_outlined,
          ),

          // Scrollable Content
          Expanded(
            child: SingleChildScrollView(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Found Loading Issues Action Card
                  _buildReportActionCard(),

                  const SizedBox(height: 14),

                  // 2. Segmented Toggle Tabs below the card with counts
                  _buildToggleTabs(),

                  const SizedBox(height: 14),

                  // 3. Issues List or Empty State
                  if (_filteredIssues.isEmpty)
                    NoIssuesEmptyState(
                      onReportIssueTap: _navigateToReportLoadingIssue,
                    )
                  else
                    ..._filteredIssues.map(
                      (issue) => Padding(
                        padding: const EdgeInsets.only(bottom: 12.0),
                        child: ReportedIssueCard(issue: issue),
                      ),
                    ),

                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Segmented Toggle Tabs: [Pending (count)] | [Resolved (count)]
  Widget _buildToggleTabs() {
    return Container(
      width: double.infinity,
      height: 44,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: AppColors.mutedBackground,
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      ),
      child: Row(
        children: [
          // Pending Tab Button
          Expanded(
            child: GestureDetector(
              onTap: () {
                if (_selectedTab != IssueFilterTab.pending) {
                  setState(() {
                    _selectedTab = IssueFilterTab.pending;
                  });
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeInOut,
                decoration: BoxDecoration(
                  color: _selectedTab == IssueFilterTab.pending
                      ? AppColors.deepForestGreen
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _selectedTab == IssueFilterTab.pending
                      ? const [
                          BoxShadow(
                            color: Color(0x140D302D),
                            blurRadius: 4,
                            offset: Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                alignment: Alignment.center,
                child: Text(
                  'Pending ($_pendingCount)',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                    color: _selectedTab == IssueFilterTab.pending
                        ? AppColors.white
                        : AppColors.secondaryText,
                  ),
                ),
              ),
            ),
          ),

          // Resolved Tab Button
          Expanded(
            child: GestureDetector(
              onTap: () {
                if (_selectedTab != IssueFilterTab.resolved) {
                  setState(() {
                    _selectedTab = IssueFilterTab.resolved;
                  });
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeInOut,
                decoration: BoxDecoration(
                  color: _selectedTab == IssueFilterTab.resolved
                      ? AppColors.deepForestGreen
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _selectedTab == IssueFilterTab.resolved
                      ? const [
                          BoxShadow(
                            color: Color(0x140D302D),
                            blurRadius: 4,
                            offset: Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                alignment: Alignment.center,
                child: Text(
                  'Resolved ($_resolvedCount)',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                    color: _selectedTab == IssueFilterTab.resolved
                        ? AppColors.white
                        : AppColors.secondaryText,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReportActionCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
      decoration: BoxDecoration(
        color: AppColors.goldSurface,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(
          color: const Color(0xFFF3E7BE),
          width: 1.0,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              color: Color(0xFFFDEAC3),
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(
                Icons.warning_amber_rounded,
                color: AppColors.pending,
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Found a Loading Issue?',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                    color: AppColors.deepForestGreen,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Report shortfalls, damages or missing items immediately.',
                  style: AppTextStyles.bodySmall.copyWith(
                    fontSize: 11.5,
                    color: AppColors.secondaryText,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          ElevatedButton.icon(
            onPressed: _navigateToReportLoadingIssue,
            icon: const Icon(
              Icons.add_rounded,
              size: 18,
              color: AppColors.deepForestGreen,
            ),
            label: const Text(
              'Report',
              style: AppTextStyles.button,
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.gold,
              foregroundColor: AppColors.deepForestGreen,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              minimumSize: const Size(0, 38),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
