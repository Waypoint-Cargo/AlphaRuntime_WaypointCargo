import 'package:flutter/material.dart';
import '../widgets/app_bottom_navbar.dart';

class RoleNavigation {
  RoleNavigation._();

  // The driver's first tab is the Task page, where available tasks are picked.
  static const driverItems = <AppNavItem>[
    AppNavItem(label: 'Tasks', icon: Icons.task_outlined),
    AppNavItem(label: 'Issues', icon: Icons.warning_amber_rounded),
    AppNavItem(label: 'Profile', icon: Icons.account_circle_outlined),
    AppNavItem(label: 'Settings', icon: Icons.settings_outlined),
  ];

  // Loader navigation intentionally has only three destinations.
  static const loaderItems = <AppNavItem>[
    AppNavItem(label: 'Home', icon: Icons.home_outlined),
    AppNavItem(label: 'Tasks', icon: Icons.task_outlined),
    AppNavItem(label: 'Issues', icon: Icons.warning_amber_rounded),
    AppNavItem(label: 'Settings', icon: Icons.settings_outlined),
  ];
}