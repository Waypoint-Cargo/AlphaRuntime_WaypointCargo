import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';

class TaskFilterBar extends StatefulWidget {
  final TextEditingController? searchController;
  final ValueChanged<String>? onSearchChanged;
  final String? selectedBrand;
  final ValueChanged<String?>? onBrandSelected;

  const TaskFilterBar({
    super.key,
    this.searchController,
    this.onSearchChanged,
    this.selectedBrand,
    this.onBrandSelected,
  });

  @override
  State<TaskFilterBar> createState() => _TaskFilterBarState();
}

class _TaskFilterBarState extends State<TaskFilterBar> {
  final FocusNode _searchFocusNode = FocusNode();
  bool _isSearchFocused = false;

  @override
  void initState() {
    super.initState();
    _searchFocusNode.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    _searchFocusNode.removeListener(_onFocusChange);
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    setState(() {
      _isSearchFocused = _searchFocusNode.hasFocus;
    });
  }

  @override
  Widget build(BuildContext context) {
    final bool hasSelectedBrand = widget.selectedBrand != null;

    return Row(
      children: [
        // 1. Search Bar
        Expanded(
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
              border: Border.all(
                color: _isSearchFocused ? AppColors.deepForestGreen : AppColors.border,
                width: _isSearchFocused ? 1.5 : 1.0,
              ),
            ),
            child: TextField(
              controller: widget.searchController,
              focusNode: _searchFocusNode,
              onChanged: widget.onSearchChanged,
              style: AppTextStyles.bodyMedium,
              decoration: InputDecoration(
                hintText: 'Search route or vehicle...',
                hintStyle: AppTextStyles.bodyMedium.copyWith(color: AppColors.secondaryText),
                prefixIcon: Icon(
                  Icons.search_rounded,
                  color: _isSearchFocused ? AppColors.deepForestGreen : AppColors.secondaryText,
                  size: 20,
                ),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
          ),
        ),

        const SizedBox(width: 10),

        // 2. Brand Selection Dropdown
        PopupMenuButton<String>(
          onSelected: (value) {
            if (widget.onBrandSelected != null) {
              widget.onBrandSelected!(value == 'All' ? null : value);
            }
          },
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.divider),
          ),
          color: AppColors.white,
          itemBuilder: (context) => [
            PopupMenuItem<String>(
              value: 'All',
              child: Text(
                'All Brands',
                style: TextStyle(
                  fontSize: 13.5,
                  color: widget.selectedBrand == null ? AppColors.deepForestGreen : AppColors.primaryText,
                  fontWeight: widget.selectedBrand == null ? FontWeight.bold : FontWeight.w500,
                ),
              ),
            ),
            const PopupMenuDivider(height: 1),
            PopupMenuItem<String>(
              value: 'FRESH',
              child: Text(
                'FRESH',
                style: TextStyle(
                  fontSize: 13.5,
                  color: widget.selectedBrand == 'FRESH' ? AppColors.deepForestGreen : AppColors.primaryText,
                  fontWeight: widget.selectedBrand == 'FRESH' ? FontWeight.bold : FontWeight.w500,
                ),
              ),
            ),
            PopupMenuItem<String>(
              value: 'STYLE',
              child: Text(
                'STYLE',
                style: TextStyle(
                  fontSize: 13.5,
                  color: widget.selectedBrand == 'STYLE' ? AppColors.deepForestGreen : AppColors.primaryText,
                  fontWeight: widget.selectedBrand == 'STYLE' ? FontWeight.bold : FontWeight.w500,
                ),
              ),
            ),
            PopupMenuItem<String>(
              value: 'TECH',
              child: Text(
                'TECH',
                style: TextStyle(
                  fontSize: 13.5,
                  color: widget.selectedBrand == 'TECH' ? AppColors.deepForestGreen : AppColors.primaryText,
                  fontWeight: widget.selectedBrand == 'TECH' ? FontWeight.bold : FontWeight.w500,
                ),
              ),
            ),
          ],
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
              border: Border.all(
                color: hasSelectedBrand ? AppColors.deepForestGreen : AppColors.border,
                width: hasSelectedBrand ? 1.5 : 1.0,
              ),
            ),
            alignment: Alignment.center,
            child: Text(
              widget.selectedBrand ?? 'Brand',
              style: TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.bold,
                color: hasSelectedBrand ? AppColors.deepForestGreen : AppColors.primaryText,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
