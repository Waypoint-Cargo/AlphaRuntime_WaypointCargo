import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_style.dart';

class InnerSectionHeader extends StatelessWidget
    implements PreferredSizeWidget {
  final String title;
  final VoidCallback? onBack;

  const InnerSectionHeader({
    super.key,
    required this.title,
    this.onBack,
  });

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppColors.deepForestGreen,
      foregroundColor: AppColors.white,
      elevation: 0,
      automaticallyImplyLeading: false,
      titleSpacing: 0,
      leading: IconButton(
        onPressed: onBack ?? () => Navigator.of(context).maybePop(),
        icon: const Icon(Icons.arrow_back, size: 21),
        tooltip: 'Back',
      ),
      title: Text(
        title,
        style: AppTextStyles.buttonLight.copyWith(fontSize: 14),
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}