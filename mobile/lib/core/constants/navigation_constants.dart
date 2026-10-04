import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class AppNavItem {
  final String label;
  final IconData icon;

  const AppNavItem({
    required this.label,
    required this.icon,
  });
}

class AppBottomNav extends StatelessWidget {
  final int currentIndex;
  final List<AppNavItem> items;
  final ValueChanged<int> onTap;

  const AppBottomNav({
    super.key,
    required this.currentIndex,
    required this.items,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(
          top: BorderSide(
            color: AppColors.divider,
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 68,
          child: Row(
            children: List.generate(
              items.length,
              (index) {
                final item = items[index];
                final isSelected = currentIndex == index;

                return Expanded(
                  child: InkWell(
                    onTap: () => onTap(index),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          item.icon,
                          size: 22,
                          color: isSelected
                              ? AppColors.deepForestGreen
                              : AppColors.secondaryText,
                        ),

                        const SizedBox(height: 4),

                        Text(
                          item.label,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: isSelected
                                ? FontWeight.w700
                                : FontWeight.w500,
                            color: isSelected
                                ? AppColors.deepForestGreen
                                : AppColors.secondaryText,
                          ),
                        ),

                        const SizedBox(height: 5),

                        // Active indicator
                        AnimatedContainer(
                          duration: const Duration(
                            milliseconds: 180,
                          ),
                          height: 3,
                          width: isSelected ? 28 : 0,
                          decoration: BoxDecoration(
                            color: AppColors.gold,
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}