import 'package:flutter/material.dart';
import '../../../../core/constants/role_navigation.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../widgets/app_scaffold.dart';
import '../../report_issues/screens/issue_details_screen.dart';
import '../../task/screens/task_screens.dart';
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
    );
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
      body: _navigationBody(),
    );
  }

  Widget _navigationBody() {
    if (currentIndex != 0) {
      return const SizedBox.shrink();
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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
                count: '4',
                icon: Icons.inventory_2_outlined,
                iconColor: AppColors.pending,
                iconBgColor: AppColors.pendingLight,
                onTap: _navigateToPendingTasks,
              ),
              const SizedBox(width: 10),
              TodayGlanceCard(
                title: 'Ready',
                count: '2',
                icon: Icons.local_shipping_outlined,
                iconColor: AppColors.success,
                iconBgColor: AppColors.successLight,
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Viewing Ready Loads (2)')),
                  );
                },
              ),
              const SizedBox(width: 10),
              TodayGlanceCard(
                title: 'Issues',
                count: '1',
                icon: Icons.warning_amber_rounded,
                iconColor: AppColors.pending,
                iconBgColor: AppColors.pendingLight,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const IssueDetailsScreen()),
                  );
                },
              ),
            ],
          ),

          const SizedBox(height: 22),

          // Section 2: Today's Overview
          const TodayOverviewCard(
            itemsToLoad: '248',
            estLoadTime: '4h 15m',
            departures: '3',
            onTimeTarget: '92%',
          ),

          const SizedBox(height: 22),

          // Section 3: Your next step
          const Text(
            'Your next step',
            style: AppTextStyles.heading3,
          ),
          const SizedBox(height: 12),
          NextStepCard(
            title: 'You have loads ready to begin.',
            subtitle: 'View your ready loads and start loading.',
            buttonText: 'View Tasks',
            onButtonTap: _navigateToPendingTasks,
          ),

          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
