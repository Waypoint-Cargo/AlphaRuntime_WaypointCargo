import 'package:flutter/material.dart';
import '../../../../core/constants/role_navigation.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/app_scaffold.dart';

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
        setState(() {
          currentIndex = index;
        });
      },

      onNotificationTap: () {
        // Open notifications
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
            const Text("Today's Overview", style: AppTextStyles.heading3),
            const SizedBox(height: 10),
            _overviewCard(),
            const SizedBox(height: 20),
            _tripCard(),
            const SizedBox(height: 26),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Next Stop', style: AppTextStyles.heading3),
                TextButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.arrow_forward, size: 16),
                  label: const Text('View All'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.secondaryText,
                    textStyle: AppTextStyles.labelMedium,
                    padding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _nextStopCard(),
          ],
        ),
      );
  }

  Widget _overviewCard() {
    const stats = [
      ('Total Stops', '8', Icons.location_on_outlined),
      ('Completed', '3 / 8', Icons.schedule_outlined),
      ('Remaining\nDistance', '12.4 km', Icons.local_shipping_outlined),
      ('On-time status', '92%', Icons.bar_chart_rounded),
    ];

    return _card(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: stats.map((stat) => _statItem(stat.$1, stat.$2, stat.$3)).toList(),
      ),
    );
  }

  Widget _statItem(String label, String value, IconData icon) => Expanded(
        child: Column(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: const BoxDecoration(color: AppColors.greenSurfaceDark, shape: BoxShape.circle),
              child: Icon(icon, color: AppColors.deepForestGreen, size: 20),
            ),
            const SizedBox(height: 7),
            Text(label, textAlign: TextAlign.center, style: AppTextStyles.labelSmall),
            const SizedBox(height: 2),
            Text(value, textAlign: TextAlign.center, style: AppTextStyles.heading2),
          ],
        ),
      );

  Widget _tripCard() => _card(
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _tripStat('ROUTE', 'R-005'),
                _tripStat('VEHICLE', 'V-012'),
                _tripStat('STOPS', '8'),
                _tripStat('COMPLETED', '3 / 8'),
              ],
            ),
            const Padding(padding: EdgeInsets.symmetric(vertical: 14), child: Divider()),
            Row(
              children: [
                _iconCircle(Icons.schedule_outlined),
                const SizedBox(width: 10),
                const Expanded(child: _LabelValue(label: 'Current ETA', value: '07:24 AM')),
                _iconCircle(Icons.check, color: AppColors.successLight, iconColor: AppColors.success),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                  decoration: BoxDecoration(color: AppColors.successLight, borderRadius: BorderRadius.circular(8)),
                  child: const Text('On schedule', style: AppTextStyles.statusSuccess),
                ),
              ],
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.play_arrow_rounded, size: 19),
                label: const Text('Continue Delivery'),
              ),
            ),
          ],
        ),
      );

  Widget _tripStat(String label, String value) => Column(
        children: [
          Text(label, style: AppTextStyles.labelSmall),
          const SizedBox(height: 4),
          Text(value, style: AppTextStyles.heading3),
        ],
      );

  Widget _nextStopCard() => _card(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(color: AppColors.deepForestGreen, borderRadius: BorderRadius.circular(9)),
                  child: const Center(child: Text('F', style: AppTextStyles.buttonLight)),
                ),
                const SizedBox(width: 10),
                const Expanded(child: _LabelValue(label: 'Fresh Nugegoda', value: 'Colombo', boldLabel: true)),
                const Icon(Icons.chevron_right, color: AppColors.secondaryText),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.screenBackground, borderRadius: BorderRadius.circular(10)),
              child: const Column(
                children: [
                  _DetailRow(Icons.schedule_outlined, 'Delivery window:', '07:30 AM - 08:30 AM'),
                  _DetailRow(Icons.access_time, 'Expected arrival:', '07:35 AM (On time)'),
                  _DetailRow(Icons.route_outlined, 'Address:', '128 Stanley Thilakaratne Mawatha'),
                  _DetailRow(Icons.signal_cellular_alt, 'Instructions:', 'Deliver to cold room, call mgr'),
                ],
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.navigation_outlined, size: 18),
                label: const Text('Start Stop'),
              ),
            ),
          ],
        ),
      );

  Widget _card({required Widget child}) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: AppColors.cardBackground,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [BoxShadow(color: Color(0x0A0D302D), blurRadius: 18, offset: Offset(0, 6))],
        ),
        child: child,
      );

  Widget _iconCircle(IconData icon, {Color? color, Color? iconColor}) => Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(color: color ?? AppColors.greenSurface, shape: BoxShape.circle),
        child: Icon(icon, size: 18, color: iconColor ?? AppColors.secondaryText),
      );
}

class _LabelValue extends StatelessWidget {
  final String label;
  final String value;
  final bool boldLabel;

  const _LabelValue({required this.label, required this.value, this.boldLabel = false});

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: boldLabel ? AppTextStyles.heading3 : AppTextStyles.labelMedium),
          const SizedBox(height: 2),
          Text(value, style: AppTextStyles.bodySmall),
        ],
      );
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          children: [
            Icon(icon, size: 15, color: AppColors.secondaryText),
            const SizedBox(width: 7),
            Text(label, style: AppTextStyles.labelMedium),
            const SizedBox(width: 5),
            Expanded(child: Text(value, style: AppTextStyles.labelLarge, overflow: TextOverflow.ellipsis)),
          ],
        ),
      );
}