import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/inner_section_header.dart';
import '../widgets/loading_item_card.dart';
import '../widgets/task_card.dart';
import 'task_details_screen.dart';
import 'task_screens.dart';

class VerifyLoadingScreen extends StatefulWidget {
  final PendingTaskItem? task;
  final int? totalItems;
  final int? loadedItems;
  final int? remainingItems;
  final List<OutletOrder>? outlets;
  final String startedAt;
  final String completedAt;
  final String loadingTime;

  const VerifyLoadingScreen({
    super.key,
    this.task,
    this.totalItems,
    this.loadedItems,
    this.remainingItems,
    this.outlets,
    this.startedAt = '06:20 AM',
    this.completedAt = '08:35 AM',
    this.loadingTime = '02h 15m',
  });

  @override
  State<VerifyLoadingScreen> createState() => _VerifyLoadingScreenState();
}

class _VerifyLoadingScreenState extends State<VerifyLoadingScreen> {
  late final PendingTaskItem _task;
  late final List<OutletOrder> _outlets;
  late final int _totalItems;
  late final int _loadedItems;
  late final int _remainingItems;

  @override
  void initState() {
    super.initState();
    _task = widget.task ??
        const PendingTaskItem(
          routeId: 'R-005',
          category: TaskCategory.fresh,
          priority: TaskPriority.high,
          vehicle: 'V-012',
          departure: '06:15 AM',
          outlets: '4 Outlets',
          items: '46 Items',
        );

    _outlets = widget.outlets ??
        [
          OutletOrder(
            index: 1,
            storeName: 'Retail Store #1023',
            orderId: 'ORD-1023',
            items: List.generate(
              16,
              (i) => OrderItem(code: 'ITM-10$i', name: 'Item $i', qtyToLoad: 1, loadedQty: 1),
            ),
          ),
          OutletOrder(
            index: 2,
            storeName: 'Retail Store #1024',
            orderId: 'ORD-1024',
            items: List.generate(
              14,
              (i) => OrderItem(code: 'ITM-20$i', name: 'Item $i', qtyToLoad: 1, loadedQty: 1),
            ),
          ),
          OutletOrder(
            index: 3,
            storeName: 'Retail Store #1025',
            orderId: 'ORD-1025',
            items: List.generate(
              8,
              (i) => OrderItem(code: 'ITM-30$i', name: 'Item $i', qtyToLoad: 1, loadedQty: 1),
            ),
          ),
          OutletOrder(
            index: 4,
            storeName: 'Retail Store #1026',
            orderId: 'ORD-1026',
            items: List.generate(
              8,
              (i) => OrderItem(code: 'ITM-40$i', name: 'Item $i', qtyToLoad: 1, loadedQty: 1),
            ),
          ),
        ];

    _totalItems = widget.totalItems ?? _outlets.fold(0, (sum, o) => sum + o.totalItemsToLoad);
    _loadedItems = widget.loadedItems ?? _outlets.fold(0, (sum, o) => sum + o.totalItemsLoaded);
    _remainingItems = widget.remainingItems ?? (_totalItems - _loadedItems);
  }

  void _onPickAnotherTask() {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const PendingTasksScreen()),
      (route) => false,
    );
  }

  void _onViewTaskDetails() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TaskDetailsScreen(
          task: _task,
          outlets: _outlets,
          totalItems: _totalItems,
          loadedItems: _loadedItems,
          remainingItems: _remainingItems,
          startedAt: widget.startedAt,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: InnerSectionHeader(
        title: 'Loading Completed',
        onBack: () => Navigator.pop(context),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Success Hero Card
            _buildSuccessHeroCard(),

            const SizedBox(height: 18),

            // 2. Loading Summary Section
            _buildLoadingSummarySection(),

            const SizedBox(height: 18),

            // 3. Outlet Summary Section
            _buildOutletSummarySection(),

            const SizedBox(height: 20),

            // 4. Action Buttons (View Task Details & Pick Another Task in same row)
            Row(
              children: [
                // View Task Details (Outlined Button)
                Expanded(
                  child: SizedBox(
                    height: AppSpacing.buttonHeight,
                    child: OutlinedButton(
                      onPressed: _onViewTaskDetails,
                      style: OutlinedButton.styleFrom(
                        backgroundColor: AppColors.white,
                        foregroundColor: AppColors.primaryText,
                        side: const BorderSide(color: AppColors.border, width: 1.0),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.description_outlined,
                            size: 18,
                            color: AppColors.primaryText,
                          ),
                          SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              'View Task Details',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryText,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 12),

                // Pick Another Task (Deep Forest Green Button)
                Expanded(
                  child: SizedBox(
                    height: AppSpacing.buttonHeight,
                    child: ElevatedButton(
                      onPressed: _onPickAnotherTask,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.deepForestGreen,
                        foregroundColor: AppColors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.add_circle_outline_rounded,
                            size: 18,
                            color: AppColors.white,
                          ),
                          SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              'Pick Another Task',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.white,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // 1. SUCCESS HERO CARD
  // -------------------------------------------------------------
  Widget _buildSuccessHeroCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 20.0),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
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
        children: [
          // Centered Green Checkmark Circle with Confetti Micro Dots
          SizedBox(
            width: 100,
            height: 90,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Soft glow circle
                Container(
                  width: 76,
                  height: 76,
                  decoration: const BoxDecoration(
                    color: AppColors.successLight,
                    shape: BoxShape.circle,
                  ),
                ),
                // Solid green circle with checkmark
                Container(
                  width: 58,
                  height: 58,
                  decoration: const BoxDecoration(
                    color: AppColors.success,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Color(0x3316A34A),
                        blurRadius: 10,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.check,
                    color: AppColors.white,
                    size: 34,
                  ),
                ),
                // Micro celebratory dots
                Positioned(
                  top: 10,
                  left: 18,
                  child: Container(
                    width: 5,
                    height: 5,
                    decoration: const BoxDecoration(
                      color: Color(0xFF86EFAC),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Positioned(
                  top: 14,
                  right: 20,
                  child: Container(
                    width: 4.5,
                    height: 4.5,
                    decoration: const BoxDecoration(
                      color: AppColors.gold,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Positioned(
                  bottom: 14,
                  left: 20,
                  child: Container(
                    width: 4,
                    height: 4,
                    decoration: const BoxDecoration(
                      color: Color(0xFF4ADE80),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
                Positioned(
                  bottom: 18,
                  right: 18,
                  child: Container(
                    width: 5,
                    height: 5,
                    decoration: const BoxDecoration(
                      color: Color(0xFF86EFAC),
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Headline
          const Text(
            'All items have been loaded successfully!',
            style: AppTextStyles.heading2,
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 4),

          // Subtitle
          const Text(
            'You can now proceed to the next task.',
            style: AppTextStyles.bodySmall,
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 16),
          const Divider(height: 1, color: AppColors.divider),
          const SizedBox(height: 14),

          // 5-Column Grid: Route | Vehicle | Started At | Completed At | Brand
          Row(
            children: [
              // 1. Route
              Expanded(
                child: _buildMetaCol(
                  label: 'Route',
                  valueWidget: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      _task.routeId,
                      style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
              _buildDivider(),

              // 2. Vehicle
              Expanded(
                child: _buildMetaCol(
                  label: 'Vehicle',
                  valueWidget: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.local_shipping_outlined,
                          size: 14,
                          color: AppColors.primaryText,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          _task.vehicle,
                          style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              _buildDivider(),

              // 3. Started At
              Expanded(
                child: _buildMetaCol(
                  label: 'Started At',
                  valueWidget: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      widget.startedAt,
                      style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
              _buildDivider(),

              // 4. Completed At
              Expanded(
                child: _buildMetaCol(
                  label: 'Completed At',
                  valueWidget: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      widget.completedAt,
                      style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
              _buildDivider(),

              // 5. Brand
              Expanded(
                child: _buildMetaCol(
                  label: 'Brand',
                  valueWidget: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _getBrandIcon(_task.category),
                        const SizedBox(width: 2),
                        Text(
                          _task.category.name.toUpperCase(),
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
                            color: _getBrandColor(_task.category),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // 2. LOADING SUMMARY SECTION
  // -------------------------------------------------------------
  Widget _buildLoadingSummarySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Loading Summary',
          style: AppTextStyles.heading3,
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(AppSpacing.cardPadding),
          decoration: BoxDecoration(
            color: AppColors.cardBackground,
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
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
          child: Row(
            children: [
              // Total Items
              Expanded(
                child: _buildSummaryMetric(
                  icon: const Icon(
                    Icons.inventory_2_outlined,
                    size: 18,
                    color: AppColors.deepForestGreen,
                  ),
                  label: 'Total Items',
                  value: '$_totalItems',
                  valueColor: AppColors.primaryText,
                ),
              ),
              // Loaded Items
              Expanded(
                child: _buildSummaryMetric(
                  icon: const Icon(
                    Icons.check_circle_outline_rounded,
                    size: 20,
                    color: AppColors.success,
                  ),
                  label: 'Loaded Items',
                  value: '$_loadedItems',
                  valueColor: AppColors.success,
                ),
              ),
              // Remaining Items
              Expanded(
                child: _buildSummaryMetric(
                  icon: const Icon(
                    Icons.format_list_bulleted_rounded,
                    size: 20,
                    color: AppColors.pending,
                  ),
                  label: 'Remaining Items',
                  value: '$_remainingItems',
                  valueColor: AppColors.pending,
                ),
              ),
              // Loading Time
              Expanded(
                child: _buildSummaryMetric(
                  icon: const Icon(
                    Icons.access_time_rounded,
                    size: 20,
                    color: AppColors.deepForestGreen,
                  ),
                  label: 'Loading Time',
                  value: widget.loadingTime,
                  valueColor: AppColors.primaryText,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryMetric({
    required Widget icon,
    required String label,
    required String value,
    required Color valueColor,
  }) {
    return Column(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: const BoxDecoration(
            color: AppColors.greenSurfaceDark,
            shape: BoxShape.circle,
          ),
          child: Center(child: icon),
        ),
        const SizedBox(height: 6),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            label,
            style: AppTextStyles.labelSmall,
          ),
        ),
        const SizedBox(height: 4),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: valueColor,
            ),
          ),
        ),
      ],
    );
  }

  // -------------------------------------------------------------
  // 3. OUTLET SUMMARY SECTION
  // -------------------------------------------------------------
  Widget _buildOutletSummarySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Outlet Summary',
          style: AppTextStyles.heading3,
        ),
        const SizedBox(height: 10),
        Container(
          decoration: BoxDecoration(
            color: AppColors.cardBackground,
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
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
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
            child: Column(
              children: [
                // Table Header (Mint green banner)
                Container(
                  width: double.infinity,
                  color: AppColors.greenSurface,
                  padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                  child: const Row(
                    children: [
                      Expanded(
                        flex: 5,
                        child: Text(
                          'OUTLET / ORDER',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepForestGreen,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          'ITEMS',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepForestGreen,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          'STATUS',
                          textAlign: TextAlign.right,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.deepForestGreen,
                            letterSpacing: 0.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Table Rows
                ..._outlets.asMap().entries.map((entry) {
                  final index = entry.key;
                  final outlet = entry.value;
                  final isLast = index == _outlets.length - 1;

                  return Column(
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                        child: Row(
                          children: [
                            // Outlet & Order
                            Expanded(
                              flex: 5,
                              child: Row(
                                children: [
                                  // Green index circle
                                  Container(
                                    width: 24,
                                    height: 24,
                                    decoration: const BoxDecoration(
                                      color: AppColors.deepForestGreen,
                                      shape: BoxShape.circle,
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      '${outlet.index}',
                                      style: AppTextStyles.buttonLight.copyWith(fontSize: 12),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          outlet.storeName,
                                          style: AppTextStyles.labelMedium.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primaryText,
                                          ),
                                        ),
                                        Text(
                                          'Order #${outlet.orderId}',
                                          style: AppTextStyles.bodySmall,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Items count
                            Expanded(
                              flex: 2,
                              child: Text(
                                '${outlet.totalItemsLoaded}',
                                textAlign: TextAlign.center,
                                style: AppTextStyles.heading3,
                              ),
                            ),

                            // Status Badge
                            Expanded(
                              flex: 2,
                              child: Align(
                                alignment: Alignment.centerRight,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.successLight,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Text(
                                    'Loaded',
                                    style: AppTextStyles.statusSuccess,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (!isLast) const Divider(height: 1, color: AppColors.divider),
                    ],
                  );
                }),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMetaCol({
    required String label,
    required Widget valueWidget,
  }) {
    return Column(
      children: [
        Text(
          label,
          style: AppTextStyles.labelSmall,
        ),
        const SizedBox(height: 4),
        valueWidget,
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 28,
      color: AppColors.divider,
    );
  }

  Widget _getBrandIcon(TaskCategory category) {
    switch (category) {
      case TaskCategory.fresh:
        return const Icon(
          Icons.ac_unit_rounded,
          size: 14,
          color: Color(0xFF1B6A56),
        );
      case TaskCategory.style:
        return const Icon(
          Icons.checkroom_outlined,
          size: 14,
          color: Color(0xFF6B46C1),
        );
      case TaskCategory.tech:
        return const Icon(
          Icons.desktop_windows_outlined,
          size: 14,
          color: Color(0xFF0284C7),
        );
    }
  }

  Color _getBrandColor(TaskCategory category) {
    switch (category) {
      case TaskCategory.fresh:
        return const Color(0xFF1B6A56);
      case TaskCategory.style:
        return const Color(0xFF6B46C1);
      case TaskCategory.tech:
        return const Color(0xFF0284C7);
    }
  }
}
