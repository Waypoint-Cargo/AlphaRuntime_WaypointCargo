import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/role_navigation.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/section_header.dart';
import '../../../../models/user.dart';
import '../../../../providers/auth_provider.dart';
import '../../../../routes/app_routes.dart';
import '../../../../widgets/app_scaffold.dart';
import '../../driver/screens/driver_home_screen.dart';
import '../../loader/home/screens/loader_home_screen.dart';
import '../../loader/report_issues/screens/issue_details_screen.dart';
import '../../loader/task/screens/task_screens.dart';
import '../../setting/screens/setting_screen.dart';
import '../widgets/profile_header.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  int _currentIndex = 0;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        try {
          context.read<AuthProvider>().fetchProfile();
        } catch (_) {}
      }
    });
  }

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
        setState(() {
          _currentIndex = 2;
        });
        return;
      }
      if (index == 1) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Issues tab selected')),
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
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => const CommonSettingsScreen(useScaffold: true),
          ),
        );
        return;
      }
    }

    setState(() {
      _currentIndex = index;
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
    AuthProvider? authProvider;
    try {
      authProvider = context.watch<AuthProvider>();
    } catch (_) {}
    final User? user = authProvider?.currentUser;

    final isDriver = user?.role.trim().toUpperCase() == 'DRIVER';
    if (!_isInitialized) {
      _currentIndex = isDriver ? 2 : 0;
      _isInitialized = true;
    }

    final fullName = user?.fullName.isNotEmpty == true
        ? user!.fullName
        : 'Tharindu Perera';
    final email = user?.email.isNotEmpty == true
        ? user!.email
        : 'tharindu.perera@waypointcargo.com';
    final phone = user?.phone?.isNotEmpty == true
        ? user!.phone!
        : '+94 77 123 4567';
    final role = user?.role.isNotEmpty == true
        ? user!.role.toUpperCase()
        : (isDriver ? 'DRIVER' : 'LOADER');
    final userId = user?.id.isNotEmpty == true ? user!.id : 'EMP-8842';

    return AppScaffold(
      title: 'Waypoint Cargo',
      subtitle: 'Plan | Deliver | Stay Connected',
      currentIndex: _currentIndex,
      navItems: isDriver ? RoleNavigation.driverItems : RoleNavigation.loaderItems,
      onNavTap: (index) => _onNavTap(index, isDriver),
      showMenu: !isDriver,
      onMenuSelected: (value) {
        if (value == 'profile') {
          // Already on Profile
        } else if (value == 'logout') {
          _logout();
        }
      },
      body: Column(
        children: [
          // Section Header Banner
          const SectionHeader(
            title: 'Profile',
            icon: Icons.person_outline,
          ),

          // Scrollable Profile Content with pull-to-refresh from backend API
          Expanded(
            child: RefreshIndicator(
              color: AppColors.deepForestGreen,
              onRefresh: () async {
                try {
                  await context.read<AuthProvider>().fetchProfile();
                } catch (_) {}
              },
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Profile Header Card (Avatar, Name, Email, Role)
                    ProfileHeader(
                      fullName: fullName,
                      email: email,
                      role: role,
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // Account Details Section Header
                    const Text(
                      'Account Details',
                      style: AppTextStyles.heading3,
                    ),
                    const SizedBox(height: 10),

                    // Account Details Card
                    _buildCard(
                      children: [
                        _buildDetailRow(
                          icon: Icons.person_outline_rounded,
                          label: 'Full Name',
                          value: fullName,
                        ),
                        const Divider(color: AppColors.divider, height: 16),
                        _buildDetailRow(
                          icon: Icons.email_outlined,
                          label: 'Work Email',
                          value: email,
                        ),
                        const Divider(color: AppColors.divider, height: 16),
                        _buildDetailRow(
                          icon: Icons.phone_outlined,
                          label: 'Phone Number',
                          value: phone,
                        ),
                        const Divider(color: AppColors.divider, height: 16),
                        _buildDetailRow(
                          icon: Icons.badge_outlined,
                          label: 'Employee ID',
                          value: userId,
                        ),
                        const Divider(color: AppColors.divider, height: 16),
                        _buildDetailRow(
                          icon: Icons.work_outline_rounded,
                          label: 'Assigned Role',
                          value: role,
                        ),
                        const Divider(color: AppColors.divider, height: 16),
                        _buildStatusRow(),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard({required List<Widget> children}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 1),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A0D302D),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: children,
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              color: AppColors.greenSurface,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 16,
              color: AppColors.deepForestGreen,
            ),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: AppTextStyles.labelMedium,
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
              style: AppTextStyles.labelLarge,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusRow() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              color: AppColors.greenSurface,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.verified_user_outlined,
              size: 16,
              color: AppColors.deepForestGreen,
            ),
          ),
          const SizedBox(width: 12),
          const Text(
            'Account Status',
            style: AppTextStyles.labelMedium,
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.successLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.check_circle,
                  size: 12,
                  color: AppColors.success,
                ),
                SizedBox(width: 4),
                Text(
                  'Active',
                  style: AppTextStyles.statusSuccess,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
