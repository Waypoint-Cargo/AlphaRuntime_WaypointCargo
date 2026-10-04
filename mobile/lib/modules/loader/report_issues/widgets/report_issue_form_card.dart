import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';

class ReportIssueFormCard extends StatelessWidget {
  final String? selectedOrderRoute;
  final List<String> availableOrderRoutes;
  final ValueChanged<String?> onOrderRouteChanged;

  final String? selectedItem;
  final List<String> availableItems;
  final ValueChanged<String?> onItemChanged;

  final TextEditingController plannedQtyController;
  final TextEditingController actualQtyController;
  final TextEditingController descriptionController;

  final bool hasPhoto;
  final ValueChanged<bool> onPhotoUpdated;

  const ReportIssueFormCard({
    super.key,
    required this.selectedOrderRoute,
    required this.availableOrderRoutes,
    required this.onOrderRouteChanged,
    required this.selectedItem,
    required this.availableItems,
    required this.onItemChanged,
    required this.plannedQtyController,
    required this.actualQtyController,
    required this.descriptionController,
    required this.hasPhoto,
    required this.onPhotoUpdated,
  });

  void _showPhotoOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.cardBackground,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Add Photo',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.deepForestGreen,
                    ),
                  ),
                  if (hasPhoto)
                    TextButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        onPhotoUpdated(false);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Attached photo removed.'),
                            duration: Duration(seconds: 1),
                          ),
                        );
                      },
                      icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                      label: const Text(
                        'Remove',
                        style: TextStyle(color: AppColors.error, fontSize: 13),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    color: AppColors.greenSurface,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.camera_alt_outlined,
                    color: AppColors.deepForestGreen,
                    size: 20,
                  ),
                ),
                title: const Text(
                  'Take Photo',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1E293B),
                  ),
                ),
                subtitle: const Text(
                  'Use camera to take a photo of the issue',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  onPhotoUpdated(true);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Photo captured from camera.'),
                      backgroundColor: AppColors.deepForestGreen,
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: const BoxDecoration(
                    color: AppColors.greenSurface,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.photo_library_outlined,
                    color: AppColors.deepForestGreen,
                    size: 20,
                  ),
                ),
                title: const Text(
                  'Choose from Gallery',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1E293B),
                  ),
                ),
                subtitle: const Text(
                  'Select image from device photo library',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  onPhotoUpdated(true);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Photo selected from gallery.'),
                      backgroundColor: AppColors.deepForestGreen,
                      duration: Duration(seconds: 2),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

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
          // Order/route Field
          _buildFieldLabel('Order/route'),
          const SizedBox(height: 6),
          _buildOrderRouteDropdown(),

          const SizedBox(height: 16),

          // Item Dropdown
          _buildFieldLabel('Item'),
          const SizedBox(height: 6),
          _buildItemDropdown(),

          const SizedBox(height: 16),

          // Planned Quantity (Non-editable) & Actual Quantity (Editable)
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Planned quantity'),
                    const SizedBox(height: 6),
                    _buildQtyTextField(
                      controller: plannedQtyController,
                      prefixIcon: Icons.inventory_2_outlined,
                      hintText: '0',
                      readOnly: true, // Non-editable, automatically filled
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel('Actual quantity'),
                    const SizedBox(height: 6),
                    _buildQtyTextField(
                      controller: actualQtyController,
                      prefixIcon: Icons.inventory_2_outlined,
                      hintText: '0',
                      readOnly: false, // User can type actual quantity
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Description
          _buildFieldLabel('Description'),
          const SizedBox(height: 6),
          _buildDescriptionField(),

          const SizedBox(height: 16),

          // Optional Photo Section
          _buildFieldLabel('Optional Photo'),
          const SizedBox(height: 6),
          _buildPhotoUploader(context),
        ],
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.bold,
        color: Color(0xFF4B5563),
      ),
    );
  }

  Widget _buildOrderRouteDropdown() {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFD1D5DB), width: 1.0),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.location_on_outlined,
            size: 18,
            color: Color(0xFF9CA3AF),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: selectedOrderRoute,
                isExpanded: true,
                hint: const Text(
                  'Select order/route',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF9CA3AF),
                    fontWeight: FontWeight.w400,
                  ),
                ),
                icon: const Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: Color(0xFF9CA3AF),
                  size: 20,
                ),
                items: availableOrderRoutes.map((orderRoute) {
                  return DropdownMenuItem<String>(
                    value: orderRoute,
                    child: Text(
                      orderRoute,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                }).toList(),
                onChanged: onOrderRouteChanged,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItemDropdown() {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFD1D5DB), width: 1.0),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.inventory_2_outlined,
            size: 18,
            color: Color(0xFF9CA3AF),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: selectedItem,
                isExpanded: true,
                hint: const Text(
                  'Select item',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF9CA3AF),
                    fontWeight: FontWeight.w400,
                  ),
                ),
                icon: const Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: Color(0xFF9CA3AF),
                  size: 20,
                ),
                items: availableItems.map((item) {
                  return DropdownMenuItem<String>(
                    value: item,
                    child: Text(
                      item,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                }).toList(),
                onChanged: onItemChanged,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQtyTextField({
    required TextEditingController controller,
    required IconData prefixIcon,
    required String hintText,
    required bool readOnly,
  }) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: readOnly ? const Color(0xFFF8FAFC) : AppColors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: readOnly ? const Color(0xFFE2E8F0) : const Color(0xFFD1D5DB),
          width: 1.0,
        ),
      ),
      child: TextField(
        controller: controller,
        readOnly: readOnly,
        keyboardType: TextInputType.number,
        style: TextStyle(
          fontSize: 13.5,
          fontWeight: FontWeight.w600,
          color: readOnly ? const Color(0xFF64748B) : const Color(0xFF1E293B),
        ),
        decoration: InputDecoration(
          isDense: true,
          hintText: hintText,
          hintStyle: const TextStyle(
            fontSize: 13,
            color: Color(0xFF9CA3AF),
            fontWeight: FontWeight.w400,
          ),
          prefixIcon: Icon(
            prefixIcon,
            size: 18,
            color: readOnly ? const Color(0xFF94A3B8) : const Color(0xFF9CA3AF),
          ),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        ),
      ),
    );
  }

  Widget _buildDescriptionField() {
    return Container(
      height: 90,
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFD1D5DB), width: 1.0),
      ),
      child: TextField(
        controller: descriptionController,
        maxLines: 4,
        style: const TextStyle(
          fontSize: 13.5,
          color: Color(0xFF1E293B),
        ),
        decoration: const InputDecoration(
          hintText: 'Describe the issue...',
          hintStyle: TextStyle(
            fontSize: 13,
            color: Color(0xFF9CA3AF),
            fontWeight: FontWeight.w400,
          ),
          prefixIcon: Padding(
            padding: EdgeInsets.only(bottom: 44.0),
            child: Icon(
              Icons.edit_outlined,
              size: 18,
              color: Color(0xFF9CA3AF),
            ),
          ),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        ),
      ),
    );
  }

  Widget _buildPhotoUploader(BuildContext context) {
    return InkWell(
      onTap: () => _showPhotoOptions(context),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
        decoration: BoxDecoration(
          color: hasPhoto ? const Color(0xFFE8F5EF) : const Color(0xFFFAFAFA),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: hasPhoto
                ? const Color(0xFF1B6A56)
                : const Color(0xFFCBD5E1),
            width: 1.0,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              hasPhoto ? Icons.check_circle : Icons.camera_alt_outlined,
              color: const Color(0xFF1B6A56),
              size: 26,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    hasPhoto
                        ? 'Photo Attached (Tap to change)'
                        : 'Tap to add photo',
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.bold,
                      color: hasPhoto
                          ? const Color(0xFF1B6A56)
                          : const Color(0xFF334155),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    hasPhoto
                        ? 'damage_report_01.jpg (2.4 MB)'
                        : 'Take Photo or Choose from Gallery',
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                ],
              ),
            ),
            if (hasPhoto)
              const Icon(
                Icons.edit_outlined,
                size: 18,
                color: Color(0xFF1B6A56),
              ),
          ],
        ),
      ),
    );
  }
}
