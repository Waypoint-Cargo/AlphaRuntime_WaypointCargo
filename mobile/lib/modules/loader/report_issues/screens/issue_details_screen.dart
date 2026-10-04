import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/role_navigation.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_error_state.dart';
import '../../../../core/widgets/app_loading_state.dart';
import '../../../../core/widgets/app_notice.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../../models/loading_issue.dart';
import '../../../../providers/auth_provider.dart';
import '../../../../providers/loader_provider.dart';
import '../../../../routes/app_routes.dart';
import '../../../../widgets/app_scaffold.dart';
import '../../home/screens/loader_home_screen.dart';
import '../../../setting/screens/setting_screen.dart';
import '../../task/screens/task_screens.dart';
import '../widgets/no_issues_empty_state.dart';
import '../widgets/reported_issue_card.dart';

/// The shortfalls the loaders reported. A report stays under Pending until the
/// dispatcher resolves it, then moves to Resolved.
class IssueDetailsScreen extends StatefulWidget {
  const IssueDetailsScreen({super.key});

  @override
  State<IssueDetailsScreen> createState() => _IssueDetailsScreenState();
}

class _IssueDetailsScreenState extends State<IssueDetailsScreen> {
  int currentIndex = 2; // Issues tab

  @override
  void initState() {
    super.initState();
    // Every visit starts on Pending and asks the server, so a report the
    // dispatcher has resolved meanwhile is already in the right place.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<LoaderProvider>().showIssues();
    });
  }

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

    if (index == 3) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => const CommonSettingsScreen(useScaffold: true),
        ),
      );
      return;
    }

    setState(() {
      currentIndex = index;
    });
  }

  Future<void> _logout() async {
    try {
      final authProvider = context.read<AuthProvider>();
      await authProvider.logout();
    } catch (_) {}

    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(
      context,
      AppRoutes.login,
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final loader = context.watch<LoaderProvider>();

    return AppScaffold(
      title: 'Waypoint Cargo',
      subtitle: 'Plan | Deliver | Stay Connected',
      currentIndex: currentIndex,
      navItems: RoleNavigation.loaderItems,
      onNavTap: _onNavTap,
      showMenu: true,
      onMenuSelected: (value) {
        if (value == 'profile') {
          Navigator.pushNamed(context, AppRoutes.profile);
        } else if (value == 'logout') {
          _logout();
        }
      },
      body: Column(
        children: [
          // Section Header (No back button)
          const SectionHeader(
            title: 'Reported Issues',
            icon: Icons.report_problem_outlined,
          ),

          // A thin bar while a refresh runs behind the reports already shown
          SizedBox(
            height: 2,
            child: loader.isIssuesLoading && loader.issues.isNotEmpty
                ? const LinearProgressIndicator(
                    color: AppColors.deepForestGreen,
                    backgroundColor: AppColors.mutedBackground,
                  )
                : null,
          ),

          // Scrollable Content
          Expanded(
            child: RefreshIndicator(
              color: AppColors.deepForestGreen,
              onRefresh: loader.loadIssues,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding:
                    const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Segmented Toggle Tabs with counts
                    _buildToggleTabs(loader),

                    const SizedBox(height: 14),

                    ..._buildIssueList(loader),

                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// The body under the tabs: spinner, error, empty message or the reports.
  List<Widget> _buildIssueList(LoaderProvider loader) {
    final issues = loader.issues;
    final error = loader.issuesError;

    if (issues.isEmpty && loader.isIssuesLoading) {
      return const [
        SizedBox(
          height: 260,
          child: AppLoadingState(message: 'Loading issues...'),
        ),
      ];
    }

    if (issues.isEmpty && error != null) {
      return [
        SizedBox(
          height: 360,
          child: error.isNoDepot
              ? AppErrorState(
                  icon: Icons.warehouse_outlined,
                  title: 'No depot assigned',
                  message:
                      "Your account isn't assigned to a depot yet, so there are no issues to show. Ask your manager to assign you to one.",
                  actionLabel: 'Try again',
                  onAction: loader.loadIssues,
                )
              : AppErrorState(
                  icon: error.isNetworkError
                      ? Icons.wifi_off_rounded
                      : Icons.error_outline_rounded,
                  title: "Couldn't load issues",
                  message: error.message,
                  actionLabel: 'Try again',
                  onAction: loader.loadIssues,
                ),
        ),
      ];
    }

    if (issues.isEmpty) {
      return [NoIssuesEmptyState(isPending: loader.issueTab == IssueTab.pending)];
    }

    return [
      // A refresh failed but the last list is still useful: keep it and say so.
      if (error != null) ...[
        AppNotice(
          message: "Couldn't refresh. ${error.message}",
          actionLabel: 'Retry',
          onAction: loader.loadIssues,
        ),
        const SizedBox(height: 12),
      ],
      for (final issue in issues)
        Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: ReportedIssueCard(issue: issue),
        ),
    ];
  }

  // Segmented Toggle Tabs: [Pending (count)] | [Resolved (count)]
  Widget _buildToggleTabs(LoaderProvider loader) {
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
          _buildTabButton(loader, IssueTab.pending, 'Pending', loader.pendingIssueCount),
          _buildTabButton(loader, IssueTab.resolved, 'Resolved', loader.resolvedIssueCount),
        ],
      ),
    );
  }

  Widget _buildTabButton(LoaderProvider loader, IssueTab tab, String label, int? count) {
    final bool isSelected = loader.issueTab == tab;
    final bool isPending = tab == IssueTab.pending;

    final Color activeBgColor = isPending ? AppColors.gold : AppColors.deepForestGreen;
    final Color activeTextColor = isPending ? AppColors.deepForestGreen : AppColors.white;
    final BoxShadow activeShadow = isPending
        ? const BoxShadow(
            color: Color(0x22F2BE32),
            blurRadius: 4,
            offset: Offset(0, 2),
          )
        : const BoxShadow(
            color: Color(0x140D302D),
            blurRadius: 4,
            offset: Offset(0, 2),
          );

    return Expanded(
      child: GestureDetector(
        onTap: () => loader.setIssueTab(tab),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeInOut,
          decoration: BoxDecoration(
            color: isSelected ? activeBgColor : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: isSelected ? [activeShadow] : null,
          ),
          alignment: Alignment.center,
          child: Text(
            count == null ? label : '$label ($count)',
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.bold,
              color: isSelected ? activeTextColor : AppColors.secondaryText,
            ),
          ),
        ),
      ),
    );
  }
}
