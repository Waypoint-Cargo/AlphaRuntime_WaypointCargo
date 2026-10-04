import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/role_navigation.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/app_error_state.dart';
import '../../../../core/widgets/app_loading_state.dart';
import '../../../../core/widgets/app_notice.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../../models/loading_task.dart';
import '../../../../providers/auth_provider.dart';
import '../../../../providers/loader_provider.dart';
import '../../../../routes/app_routes.dart';
import '../../../../widgets/app_scaffold.dart';
import '../../home/screens/loader_home_screen.dart';
import '../../report_issues/screens/issue_details_screen.dart';
import '../../../setting/screens/setting_screen.dart';
import 'start_loading_screen.dart';
import 'task_details_screen.dart';
import '../widgets/loader_feedback.dart';
import '../widgets/task_card.dart';
import '../widgets/task_filter.dart';

class PendingTasksScreen extends StatefulWidget {
  const PendingTasksScreen({super.key});

  @override
  State<PendingTasksScreen> createState() => _PendingTasksScreenState();
}

class _PendingTasksScreenState extends State<PendingTasksScreen> {
  final TextEditingController _searchController = TextEditingController();
  int currentIndex = 1;

  // The task being claimed right now; its card shows a spinner.
  String? _openingTripId;

  @override
  void initState() {
    super.initState();
    // Every visit starts on the Pending tab with no filters and asks the server.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<LoaderProvider>().showTasks();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onNavTap(int index) {
    if (index == 0) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoaderHomeScreen()),
      );
      return;
    }

    if (index == 2) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const IssueDetailsScreen()),
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

  /// "Open Task": claims the task, then opens the loading screen. If somebody
  /// else holds it (or it cannot be opened for another reason) the loader is told
  /// why and stays here, with the list refreshed to show the current state.
  Future<void> _openTask(LoadingTask task) async {
    if (_openingTripId != null) return;
    final loader = context.read<LoaderProvider>();

    if (task.status == TaskStatus.completed) {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => TaskDetailsScreen(tripId: task.tripId),
        ),
      );
      return;
    }

    setState(() => _openingTripId = task.tripId);
    final opened = await loader.openTask(task.tripId);
    if (!mounted) return;
    setState(() => _openingTripId = null);

    if (!opened) {
      final error = loader.actionError;
      if (error != null) await showLoaderError(context, error);
      if (mounted) loader.loadTasks();
      return;
    }

    await Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const StartLoadingScreen()),
    );
    if (mounted) loader.loadTasks();
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
          // Section Header Banner
          const SectionHeader(
            title: 'Tasks',
            icon: Icons.assignment_outlined,
          ),

          // A thin bar while a refresh runs behind the cards already shown
          SizedBox(
            height: 2,
            child: loader.isTasksLoading && loader.tasks.isNotEmpty
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
              onRefresh: loader.loadTasks,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Segmented Toggle Tabs: [Pending] | [Completed]
                    _buildToggleTabs(loader),

                    const SizedBox(height: 16),

                    // Search Bar and Brand Filter
                    TaskFilterBar(
                      searchController: _searchController,
                      onSearchChanged: loader.setSearch,
                      selectedBrand: loader.brand,
                      onBrandSelected: loader.setBrand,
                    ),

                    const SizedBox(height: 16),

                    ..._buildTaskList(loader),

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

  /// The body under the filters: spinner, error, empty message or the cards.
  List<Widget> _buildTaskList(LoaderProvider loader) {
    final tasks = loader.tasks;
    final error = loader.tasksError;

    if (tasks.isEmpty && loader.isTasksLoading) {
      return const [
        SizedBox(
          height: 260,
          child: AppLoadingState(message: 'Loading tasks...'),
        ),
      ];
    }

    if (tasks.isEmpty && error != null) {
      return [
        SizedBox(
          height: 360,
          child: error.isNoDepot
              ? AppErrorState(
                  icon: Icons.warehouse_outlined,
                  title: 'No depot assigned',
                  message:
                      "Your account isn't assigned to a depot yet, so there are no loads to show. Ask your manager to assign you to one.",
                  actionLabel: 'Try again',
                  onAction: loader.loadTasks,
                )
              : AppErrorState(
                  icon: error.isNetworkError
                      ? Icons.wifi_off_rounded
                      : Icons.error_outline_rounded,
                  title: "Couldn't load tasks",
                  message: error.message,
                  actionLabel: 'Try again',
                  onAction: loader.loadTasks,
                ),
        ),
      ];
    }

    if (tasks.isEmpty) {
      return [_buildEmptyState(loader)];
    }

    return [
      // A refresh failed but the last list is still useful: keep it and say so.
      if (error != null) ...[
        AppNotice(
          message: "Couldn't refresh. ${error.message}",
          actionLabel: 'Retry',
          onAction: loader.loadTasks,
        ),
        const SizedBox(height: 12),
      ],
      ...tasks.map(
        (task) => TaskCardWidget(
          task: task,
          isOpening: _openingTripId == task.tripId,
          onOpenTask: () => _openTask(task),
        ),
      ),
    ];
  }

  Widget _buildEmptyState(LoaderProvider loader) {
    final isPending = loader.tab == TaskTab.pending;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      alignment: Alignment.center,
      child: Column(
        children: [
          const Icon(
            Icons.inbox_outlined,
            size: 48,
            color: AppColors.secondaryText,
          ),
          const SizedBox(height: 12),
          Text(
            isPending ? 'No pending tasks found' : 'No completed tasks found',
            style: AppTextStyles.heading3,
          ),
          const SizedBox(height: 4),
          Text(
            loader.hasTaskFilters
                ? 'Try adjusting your search or brand filter'
                : (isPending
                    ? 'New loads appear here once the dispatcher publishes the plan'
                    : 'Loads you finish today appear here'),
            style: AppTextStyles.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

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
          _buildTabButton(loader, TaskTab.pending, 'Pending'),
          _buildTabButton(loader, TaskTab.completed, 'Completed'),
        ],
      ),
    );
  }

  Widget _buildTabButton(LoaderProvider loader, TaskTab tab, String label) {
    final bool isSelected = loader.tab == tab;

    return Expanded(
      child: GestureDetector(
        onTap: () => loader.setTab(tab),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeInOut,
          decoration: BoxDecoration(
            color: isSelected ? AppColors.deepForestGreen : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            boxShadow: isSelected
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
            label,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.bold,
              color: isSelected ? AppColors.white : AppColors.secondaryText,
            ),
          ),
        ),
      ),
    );
  }
}
