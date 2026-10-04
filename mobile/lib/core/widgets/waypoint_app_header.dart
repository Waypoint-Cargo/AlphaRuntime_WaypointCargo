import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../routes/app_routes.dart';
import '../theme/app_colors.dart';

class WaypointAppHeader extends StatelessWidget
    implements PreferredSizeWidget {
  final String title;
  final String subtitle;
  final VoidCallback? onNotificationTap;
  final bool showMenu;
  final ValueChanged<String>? onMenuSelected;

  const WaypointAppHeader({
    super.key,
    this.title = 'Waypoint Cargo',
    this.subtitle = 'Plan | Deliver | Stay Connected',
    this.onNotificationTap,
    this.showMenu = false,
    this.onMenuSelected,
  });

  @override
  Size get preferredSize => const Size.fromHeight(72);

  void _defaultMenuHandler(BuildContext context, String value) {
    if (value == 'profile') {
      Navigator.pushNamed(context, AppRoutes.profile);
    } else if (value == 'logout') {
      try {
        final auth = context.read<AuthProvider>();
        auth.logout();
      } catch (_) {}
      Navigator.pushNamedAndRemoveUntil(
        context,
        AppRoutes.login,
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.deepForestGreen,
      elevation: 0,
      automaticallyImplyLeading: false,
      titleSpacing: 16,
      title: Row(
        children: [
          SizedBox(
            width: 40,
            height: 40,
            child: Image.asset(
              'assets/images/logo.png',
              fit: BoxFit.contain,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: AppColors.white.withValues(alpha: 0.75),
                    fontSize: 9,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onNotificationTap,
            icon: const Icon(
              Icons.notifications_none_rounded,
              color: AppColors.white,
              size: 23,
            ),
          ),
          if (showMenu)
            PopupMenuButton<String>(
              onSelected: (value) {
                if (onMenuSelected != null) {
                  onMenuSelected!(value);
                } else {
                  _defaultMenuHandler(context, value);
                }
              },
              icon: const Icon(Icons.menu, color: AppColors.white, size: 23),
              color: AppColors.white,
              position: PopupMenuPosition.under,
              offset: const Offset(0, 8),
              itemBuilder: (context) => const [
                PopupMenuItem<String>(
                  value: 'profile',
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.person_outline),
                    title: Text('Profile'),
                  ),
                ),
                PopupMenuItem<String>(
                  value: 'logout',
                  child: ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(Icons.logout),
                    title: Text('Logout'),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }
}