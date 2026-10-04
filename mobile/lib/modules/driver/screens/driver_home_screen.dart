import 'package:flutter/material.dart';
import '../../../../core/constants/role_navigation.dart';
import '../../../../widgets/app_scaffold.dart';
import '../../profile/screens/profile_screen.dart';
import '../../setting/screens/setting_screen.dart';
import '../screens/driver_issues_screen.dart';
import '../screens/driver_tasks_screen.dart';

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  int currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Waypoint Cargo',
      subtitle: 'Plan | Deliver | Stay Connected',
      currentIndex: currentIndex,
      navItems: RoleNavigation.driverItems,

      onNavTap: (index) {
        if (index == 2) {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const ProfileScreen()),
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
      },

      onNotificationTap: () {
        // Notifications screen can be added later.
      },
      body: _navigationBody(),
    );
  }

  Widget _navigationBody() {
    switch (currentIndex) {
      case 0:
        return const DriverTasksScreen();

      case 1:
        return const DriverIssuesScreen(showHeader: true);

      case 2:
        return const ProfileScreen();

      case 3:
        return const CommonSettingsScreen();

      default:
        return const DriverTasksScreen();
    }
  }
}
