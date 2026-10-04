import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';

enum IssueType {
  missingItems('Missing Items', Icons.inventory_2_outlined),
  damagedItems('Damaged Items', Icons.inventory_outlined),
  wrongItems('Wrong Items', Icons.swap_horiz_rounded),
  quantityShort('Quantity Short', Icons.layers_outlined),
  vehicleProblem('Vehicle Problem', Icons.local_shipping_outlined),
  other('Other', Icons.more_horiz_rounded);

  final String label;
  final IconData icon;
  const IssueType(this.label, this.icon);
}

class IssueTypeSelectorCard extends StatelessWidget {
  final IssueType? selectedIssue;
  final ValueChanged<IssueType> onIssueSelected;

  /// The types offered, in order. Defaults to all of them.
  final List<IssueType> types;

  const IssueTypeSelectorCard({
    super.key,
    required this.selectedIssue,
    required this.onIssueSelected,
    this.types = IssueType.values,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppColors.divider,
          width: 1.0,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A0D302D),
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Select Issue',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.deepForestGreen,
            ),
          ),
          const SizedBox(height: 14),
          _buildIssueGrid(),
        ],
      ),
    );
  }

  Widget _buildIssueGrid() {
    // Three cards per row; a short last row keeps the same card width.
    const perRow = 3;
    final rows = <Widget>[];

    for (var start = 0; start < types.length; start += perRow) {
      if (rows.isNotEmpty) rows.add(const SizedBox(height: 8));

      final cells = <Widget>[];
      for (var i = start; i < start + perRow; i++) {
        if (i > start) cells.add(const SizedBox(width: 8));
        cells.add(
          Expanded(
            child: i < types.length ? _buildIssueItem(types[i]) : const SizedBox(),
          ),
        );
      }
      rows.add(Row(children: cells));
    }

    return Column(children: rows);
  }

  Widget _buildIssueItem(IssueType issue) {
    final bool isSelected = selectedIssue == issue;

    return GestureDetector(
      onTap: () => onIssueSelected(issue),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        height: 94,
        padding: const EdgeInsets.all(8.0),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE8F5EF) : AppColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFF1B6A56) : const Color(0xFFE2E8F0),
            width: isSelected ? 1.5 : 1.0,
          ),
          boxShadow: const [
            BoxShadow(
              color: Color(0x06000000),
              blurRadius: 4,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Icon in soft circular badge
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFFD4ECE6)
                    : const Color(0xFFE8F5EF),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Icon(
                  issue.icon,
                  color: const Color(0xFF1B6A56),
                  size: 17,
                ),
              ),
            ),
            // Label + Radio circle
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Text(
                    issue.label,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isSelected
                          ? const Color(0xFF1B6A56)
                          : const Color(0xFF6B7280),
                      height: 1.1,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 4),
                // Radio indicator
                Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected
                          ? const Color(0xFF1B6A56)
                          : const Color(0xFFCBD5E1),
                      width: isSelected ? 4.5 : 1.5,
                    ),
                    color: AppColors.white,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
