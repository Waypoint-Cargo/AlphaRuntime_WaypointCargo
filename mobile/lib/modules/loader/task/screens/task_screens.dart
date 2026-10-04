import 'package:flutter/material.dart';
import '../../../../core/constants/role_navigation.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../../core/widgets/app_scaffold.dart';
import '../../home/screens/loader_home_screen.dart';
import '../../report_issues/screens/issue_details_screen.dart';
import 'start_loading_screen.dart';
import '../widgets/task_card.dart';
import '../widgets/task_filter.dart';

enum TaskTab {
  pending,
  completed,
}

class PendingTasksScreen extends StatefulWidget {
  const PendingTasksScreen({super.key});

  @override
  State<PendingTasksScreen> createState() => _PendingTasksScreenState();
}

class _PendingTasksScreenState extends State<PendingTasksScreen> {
  final TextEditingController _searchController = TextEditingController();
  TaskTab _selectedTab = TaskTab.pending;
  String _searchQuery = '';
  String? _selectedBrand;
  int currentIndex = 1;

  // Pending Tasks
  final List<PendingTaskItem> _pendingTasks = const [
    PendingTaskItem(
      routeId: 'R-005',
      category: TaskCategory.fresh,
      priority: TaskPriority.high,
      vehicle: 'V-012',
      departure: '06:15 AM',
      outlets: '4 Outlets',
      items: '46 Items',
      status: 'Waiting to Load',
      subStatus: 'Not started yet',
      isCompleted: false,
    ),
    PendingTaskItem(
      routeId: 'R-006',
      category: TaskCategory.style,
      priority: TaskPriority.normal,
      vehicle: 'V-008',
      departure: '06:40 AM',
      outlets: '3 Outlets',
      items: '32 Items',
      status: 'Waiting to Load',
      subStatus: 'Not started yet',
      isCompleted: false,
    ),
    PendingTaskItem(
      routeId: 'R-007',
      category: TaskCategory.tech,
      priority: TaskPriority.normal,
      vehicle: 'V-021',
      departure: '07:05 AM',
      outlets: '3 Outlets',
      items: '28 Items',
      status: 'Waiting to Load',
      subStatus: 'Not started yet',
      isCompleted: false,
    ),
    PendingTaskItem(
      routeId: 'R-008',
      category: TaskCategory.tech,
      priority: TaskPriority.low,
      vehicle: 'V-015',
      departure: '07:30 AM',
      outlets: '4 Outlets',
      items: '52 Items',
      status: 'Waiting to Load',
      subStatus: 'Not started yet',
      isCompleted: false,
    ),
  ];

  // Completed Tasks
  final List<PendingTaskItem> _completedTasks = const [
    PendingTaskItem(
      routeId: 'R-001',
      category: TaskCategory.fresh,
      priority: TaskPriority.high,
      vehicle: 'V-002',
      departure: '05:30 AM',
      outlets: '3 Outlets',
      items: '38 Items',
      status: 'Completed',
      subStatus: 'Verified & Loaded',
      isCompleted: true,
    ),
    PendingTaskItem(
      routeId: 'R-002',
      category: TaskCategory.tech,
      priority: TaskPriority.normal,
      vehicle: 'V-009',
      departure: '05:45 AM',
      outlets: '4 Outlets',
      items: '50 Items',
      status: 'Completed',
      subStatus: 'Verified & Loaded',
      isCompleted: true,
    ),
    PendingTaskItem(
      routeId: 'R-003',
      category: TaskCategory.style,
      priority: TaskPriority.normal,
      vehicle: 'V-004',
      departure: '06:00 AM',
      outlets: '3 Outlets',
      items: '24 Items',
      status: 'Completed',
      subStatus: 'Verified & Loaded',
      isCompleted: true,
    ),
  ];

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

    setState(() {
      currentIndex = index;
    });

    if (index == 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Settings tab selected')),
      );
    }
  }

  List<PendingTaskItem> get _currentList {
    return _selectedTab == TaskTab.pending ? _pendingTasks : _completedTasks;
  }

  List<PendingTaskItem> get _filteredTasks {
    return _currentList.where((task) {
      final query = _searchQuery.toLowerCase();
      final matchesSearch = query.isEmpty ||
          task.routeId.toLowerCase().contains(query) ||
          task.vehicle.toLowerCase().contains(query);

      final matchesBrand = _selectedBrand == null ||
          task.category.name.toUpperCase() == _selectedBrand!.toUpperCase();

      return matchesSearch && matchesBrand;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final tasksToDisplay = _filteredTasks;

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
          // Section Header Banner
          const SectionHeader(
            title: 'Tasks',
            icon: Icons.assignment_outlined,
          ),

          // Scrollable Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Segmented Toggle Tabs: [Pending] | [Completed]
                  _buildToggleTabs(),

                  const SizedBox(height: 16),

                  // Search Bar and Brand Filter
                  TaskFilterBar(
                    searchController: _searchController,
                    onSearchChanged: (val) {
                      setState(() {
                        _searchQuery = val;
                      });
                    },
                    selectedBrand: _selectedBrand,
                    onBrandSelected: (val) {
                      setState(() {
                        _selectedBrand = val;
                      });
                    },
                  ),

                  const SizedBox(height: 16),

                  // Task Cards List
                  if (tasksToDisplay.isEmpty)
                    Container(
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
                            _selectedTab == TaskTab.pending
                                ? 'No pending tasks found'
                                : 'No completed tasks found',
                            style: AppTextStyles.heading3,
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Try adjusting your search or brand filter',
                            style: AppTextStyles.bodySmall,
                          ),
                        ],
                      ),
                    )
                  else
                    ...tasksToDisplay.map(
                      (task) => TaskCardWidget(
                        task: task,
                        onOpenTask: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => StartLoadingScreen(task: task),
                            ),
                          );
                        },
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
                if (_selectedTab != TaskTab.pending) {
                  setState(() {
                    _selectedTab = TaskTab.pending;
                  });
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeInOut,
                decoration: BoxDecoration(
                  color: _selectedTab == TaskTab.pending
                      ? AppColors.deepForestGreen
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _selectedTab == TaskTab.pending
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
                  'Pending',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                    color: _selectedTab == TaskTab.pending
                        ? AppColors.white
                        : AppColors.secondaryText,
                  ),
                ),
              ),
            ),
          ),

          // Completed Tab Button
          Expanded(
            child: GestureDetector(
              onTap: () {
                if (_selectedTab != TaskTab.completed) {
                  setState(() {
                    _selectedTab = TaskTab.completed;
                  });
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                curve: Curves.easeInOut,
                decoration: BoxDecoration(
                  color: _selectedTab == TaskTab.completed
                      ? AppColors.deepForestGreen
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: _selectedTab == TaskTab.completed
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
                  'Completed',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                    color: _selectedTab == TaskTab.completed
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
}
