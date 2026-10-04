import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/role_navigation.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/app_error_state.dart';
import '../../../../core/widgets/app_loading_state.dart';
import '../../../../core/widgets/app_notice.dart';
import '../../../../models/loading_summary.dart';
import '../../../../providers/auth_provider.dart';
import '../../../../providers/loader_provider.dart';
import '../../../../routes/app_routes.dart';
import '../../../../widgets/app_scaffold.dart';
import '../../report_issues/screens/issue_details_screen.dart';
import '../../task/screens/start_loading_screen.dart';
import '../../task/screens/task_screens.dart';
import '../../task/widgets/loader_feedback.dart';
import '../widgets/quick_action.dart';
import '../widgets/today_glance_card.dart';
import '../widgets/today_overview_card.dart';

class LoaderHomeScreen extends StatefulWidget {
  const LoaderHomeScreen({super.key});

  @override
  State<LoaderHomeScreen> createState() => _LoaderHomeScreenState();
}

class _LoaderHomeScreenState extends State<LoaderHomeScreen> {
  int currentIndex = 0;
  bool _isLoggingOut = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<LoaderProvider>().loadSummary();
    });
  }

  Future<void> _logout() async {
    if (_isLoggingOut) return;

    setState(() {
      _isLoggingOut = true;
    });

    await context.read<AuthProvider>().logout();

    if (!mounted) return;
    Navigator.pushNamedAndRemoveUntil(
      context,
      AppRoutes.login,
      (route) => false,
    );
  }

  // The figures change while the loader works on other screens, so they are
  // read again whenever they come back here.
  void _reloadSummary() {
    if (mounted) context.read<LoaderProvider>().loadSummary();
  }

  void _onNavTap(int index) {
    if (index == 1) {
      // Navigate to Tasks
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const PendingTasksScreen()),
      ).then((_) {
        if (mounted) {
          setState(() {
            currentIndex = 0;
          });
          _reloadSummary();
        }
      });
      return;
    }

    if (index == 2) {
      // Navigate to Issues
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => const IssueDetailsScreen()),
      ).then((_) {
        if (mounted) {
          setState(() {
            currentIndex = 0;
          });
          _reloadSummary();
        }
      });
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

  void _navigateToPendingTasks() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const PendingTasksScreen()),
    ).then((_) => _reloadSummary());
  }

  // "Continue": back into the task this loader already holds.
  Future<void> _continueLoading(LoadingNextStep step) async {
    final loader = context.read<LoaderProvider>();
    final opened = await loader.openTask(step.tripId!);
    if (!mounted) return;

    if (!opened) {
      final error = loader.actionError;
      if (error != null) await showLoaderError(context, error);
      _reloadSummary();
      return;
    }

    await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const StartLoadingScreen()),
    );
    _reloadSummary();
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
          _logout();
        }
      },
      body: _navigationBody(),
    );
  }

  Widget _navigationBody() {
    if (currentIndex != 0) {
      return const SizedBox.shrink();
    }

    final loader = context.watch<LoaderProvider>();
    final summary = loader.summary;
    final error = loader.summaryError;

    // Nothing to show yet: the first load is running or it failed.
    if (summary == null) {
      if (error == null) {
        return const AppLoadingState(message: 'Loading today...');
      }

      return error.isNoDepot
          ? AppErrorState(
              icon: Icons.warehouse_outlined,
              title: 'No depot assigned',
              message:
                  "Your account isn't assigned to a depot yet, so there are no loads to show. Ask your manager to assign you to one.",
              actionLabel: 'Try again',
              onAction: loader.loadSummary,
            )
          : AppErrorState(
              icon: error.isNetworkError
                  ? Icons.wifi_off_rounded
                  : Icons.error_outline_rounded,
              title: "Couldn't load today",
              message: error.message,
              actionLabel: 'Try again',
              onAction: loader.loadSummary,
            );
    }

    final step = summary.nextStep;

    return RefreshIndicator(
      color: AppColors.deepForestGreen,
      onRefresh: loader.loadSummary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // A refresh failed but the last figures are still useful: keep them and say so.
            if (error != null) ...[
              AppNotice(
                message: "Couldn't refresh. ${error.message}",
                actionLabel: 'Retry',
                onAction: loader.loadSummary,
              ),
              const SizedBox(height: 14),
            ],

            // Section 1: Today at a glance
            const Text(
              'Today at a glance',
              style: AppTextStyles.heading3,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                TodayGlanceCard(
                  title: 'Pending Loads',
                  count: '${summary.pendingLoads}',
                  icon: Icons.inventory_2_outlined,
                  iconColor: AppColors.pending,
                  iconBgColor: AppColors.pendingLight,
                  onTap: _navigateToPendingTasks,
                ),
                const SizedBox(width: 10),
                TodayGlanceCard(
                  title: 'Issues',
                  count: '${summary.openIssues}',
                  icon: Icons.warning_amber_rounded,
                  iconColor: AppColors.pending,
                  iconBgColor: AppColors.pendingLight,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const IssueDetailsScreen()),
                    ).then((_) => _reloadSummary());
                  },
                ),
              ],
            ),

            const SizedBox(height: 22),

            // Section 2: Today's Overview
            TodayOverviewCard(
              itemsToLoad: '${summary.itemsToLoad}',
              departures: '${summary.departures}',
            ),

            const SizedBox(height: 22),

            // Section 3: Your next step
            const Text(
              'Your next step',
              style: AppTextStyles.heading3,
            ),
            const SizedBox(height: 12),
            NextStepCard(
              title: step.title,
              subtitle: step.message,
              buttonText: step.isResume ? 'Continue' : 'View Tasks',
              onButtonTap: step.isAllClear
                  ? null
                  : (step.isResume
                      ? () => _continueLoading(step)
                      : _navigateToPendingTasks),
            ),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}