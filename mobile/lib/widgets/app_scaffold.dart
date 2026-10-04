import 'package:flutter/material.dart';
import '../core/widgets/app_bottom_navbar.dart';
import '../core/theme/app_colors.dart';
import '../core/widgets/waypoint_app_header.dart';

class AppScaffold extends StatelessWidget {
  final Widget body;

  final String title;
  final String subtitle;

  final int currentIndex;
  final List<AppNavItem> navItems;
  final ValueChanged<int> onNavTap;

  final VoidCallback? onNotificationTap;
  final bool showMenu;
  final ValueChanged<String>? onMenuSelected;

  const AppScaffold({
    super.key,
    required this.body,
    required this.currentIndex,
    required this.navItems,
    required this.onNavTap,
    this.title = 'Waypoint Cargo',
    this.subtitle = 'Plan | Deliver | Stay Connected',
    this.onNotificationTap,
    this.showMenu = false,
    this.onMenuSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.screenBackground,

      appBar: WaypointAppHeader(
        title: title,
        subtitle: subtitle,
        onNotificationTap: onNotificationTap,
        showMenu: showMenu,
        onMenuSelected: onMenuSelected,
      ),

      body: SafeArea(
        top: false,
        child: body,
      ),

      bottomNavigationBar: AppBottomNav(
        currentIndex: currentIndex,
        items: navItems,
        onTap: onNavTap,
      ),
    );
  }
}