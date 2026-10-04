import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/role_navigation.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_style.dart';
import '../../../core/widgets/section_header.dart';
import '../../../models/user.dart';
import '../../../providers/auth_provider.dart';
import '../../../routes/app_routes.dart';
import '../../../widgets/app_scaffold.dart';
import '../../driver/screens/driver_home_screen.dart';
import '../../loader/home/screens/loader_home_screen.dart';
import '../../loader/report_issues/screens/issue_details_screen.dart';
import '../../loader/task/screens/task_screens.dart';
import '../widgets/setting_tile.dart';

class CommonSettingsScreen extends StatefulWidget {
  final bool useScaffold;
  final bool? isDriver;

  const CommonSettingsScreen({
    super.key,
    this.useScaffold = false,
    this.isDriver,
  });

  @override
  State<CommonSettingsScreen> createState() => _CommonSettingsScreenState();
}

class _CommonSettingsScreenState extends State<CommonSettingsScreen> {
  bool notificationsEnabled = true;

  void _onNavTap(int index, bool isDriver) {
    if (isDriver) {
      if (index == 0) {
        if (Navigator.canPop(context)) {
          Navigator.pop(context);
        } else {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const DriverHomeScreen()),
          );
        }
        return;
      }
      if (index == 2) {
        Navigator.pushReplacementNamed(context, AppRoutes.profile);
        return;
      }
      if (index == 3) {
        return;
      }
    } else {
      if (index == 0) {
        if (Navigator.canPop(context)) {
          Navigator.pop(context);
        } else {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const LoaderHomeScreen()),
          );
        }
        return;
      }
      if (index == 1) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const PendingTasksScreen()),
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
        return;
      }
    }
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
    AuthProvider? authProvider;
    try {
      authProvider = context.watch<AuthProvider>();
    } catch (_) {}
    final User? user = authProvider?.currentUser;
    final isDriver = widget.isDriver ??
        (user?.role.trim().toUpperCase() == 'DRIVER' || !widget.useScaffold);

    if (widget.useScaffold) {
      return AppScaffold(
        title: 'Waypoint Cargo',
        subtitle: 'Plan | Deliver | Stay Connected',
        currentIndex: 3,
        navItems:
            isDriver ? RoleNavigation.driverItems : RoleNavigation.loaderItems,
        onNavTap: (index) => _onNavTap(index, isDriver),
        showMenu: !isDriver,
        onMenuSelected: (value) {
          if (value == 'profile') {
            Navigator.pushNamed(context, AppRoutes.profile);
          } else if (value == 'logout') {
            _logout();
          }
        },
        body: _buildContent(isDriver),
      );
    }

    return _buildContent(isDriver);
  }

  Widget _buildContent(bool isDriver) {
    return Container(
      color: AppColors.screenBackground,
      child: Column(
        children: [
          const SectionHeader(title: 'Settings', icon: Icons.settings_outlined),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sectionTitle('Account'),

                  SettingsTile(
                    icon: Icons.lock_outline,
                    title: 'Change Password',
                    subtitle: 'Update your account password',
                    onTap: () {
                      Navigator.pushNamed(context, AppRoutes.forgotPassword);
                    },
                  ),

                  const SizedBox(height: 22),

                  _sectionTitle('Preferences'),

                  SettingsTile(
                    icon: Icons.notifications_none_outlined,
                    title: 'Notifications',
                    subtitle: 'Manage delivery and system notifications',
                    trailing: Switch(
                      value: notificationsEnabled,
                      activeTrackColor: AppColors.greenSurface,
                      activeThumbColor: AppColors.deepForestGreen,
                      onChanged: (value) {
                        setState(() {
                          notificationsEnabled = value;
                        });
                      },
                    ),
                  ),

                  SettingsTile(
                    icon: Icons.language_outlined,
                    title: 'Language',
                    subtitle: 'English',
                    onTap: () {
                      _showLanguageDialog();
                    },
                  ),

                  const SizedBox(height: 22),

                  _sectionTitle('App'),

                  SettingsTile(
                    icon: Icons.info_outline,
                    title: 'About Waypoint Cargo',
                    subtitle: 'Information about the application',
                    onTap: () {
                      _showAboutDialog();
                    },
                  ),

                  const SettingsTile(
                    icon: Icons.system_update_outlined,
                    title: 'App Version',
                    subtitle: 'Version 1.0.0',
                  ),

                  // Logout button is only displayed on Driver's settings screen
                  if (isDriver) ...[
                    const SizedBox(height: 28),
                    _logoutButton(),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(title, style: AppTextStyles.heading3),
    );
  }

  Widget _logoutButton() {
    return SizedBox(
      width: double.infinity,
      height: 50,
      child: OutlinedButton.icon(
        onPressed: () {
          _showLogoutDialog();
        },
        icon: const Icon(Icons.logout_outlined, color: AppColors.error),
        label: const Text('Logout', style: TextStyle(color: AppColors.error)),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.error),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }

  void _showLanguageDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Language'),
          content: const Text('English is currently selected.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  void _showAboutDialog() {
    showAboutDialog(
      context: context,
      applicationName: 'Waypoint Cargo',
      applicationVersion: '1.0.0',
      applicationLegalese: 'Plan | Deliver | Stay Connected',
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Logout'),
          content: const Text('Are you sure you want to logout?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                await _logout();
              },
              child: const Text('Logout'),
            ),
          ],
        );
      },
    );
  }
}