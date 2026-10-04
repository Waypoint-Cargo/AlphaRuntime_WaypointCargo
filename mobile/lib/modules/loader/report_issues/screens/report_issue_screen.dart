import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/inner_section_header.dart';
import '../../task/widgets/loading_item_card.dart';
import '../../task/widgets/task_card.dart';
import '../widgets/issue_type_selector.dart';
import '../widgets/report_issue_form_card.dart';

export '../widgets/issue_type_selector.dart' show IssueType;

class ReportLoadingIssueScreen extends StatefulWidget {
  final PendingTaskItem? task;
  final List<OutletOrder>? outlets;
  final String? initialOrderRoute;
  final String? initialItem;

  const ReportLoadingIssueScreen({
    super.key,
    this.task,
    this.outlets,
    this.initialOrderRoute,
    this.initialItem,
  });

  @override
  State<ReportLoadingIssueScreen> createState() =>
      _ReportLoadingIssueScreenState();
}

class _ReportLoadingIssueScreenState extends State<ReportLoadingIssueScreen> {
  IssueType? _selectedIssue;

  String? _selectedOrderRoute;
  String? _selectedItem;

  late final TextEditingController _plannedQtyController;
  late final TextEditingController _actualQtyController;
  late final TextEditingController _descriptionController;

  bool _hasPhoto = false;

  @override
  void initState() {
    super.initState();
    _selectedOrderRoute = widget.initialOrderRoute;
    _selectedItem = widget.initialItem;

    _plannedQtyController = TextEditingController();
    _actualQtyController = TextEditingController();
    _descriptionController = TextEditingController();

    if (_selectedItem != null) {
      _populatePlannedQuantity(_selectedItem!);
    }
  }

  @override
  void dispose() {
    _plannedQtyController.dispose();
    _actualQtyController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  List<String> get _availableOrderRoutes {
    if (widget.outlets != null && widget.outlets!.isNotEmpty) {
      final routeId = widget.task?.routeId ?? 'R-005';
      return widget.outlets!
          .map((outlet) => '${outlet.orderId} / $routeId')
          .toList();
    }
    return const [
      'ORD-109 / R-005',
      'ORD-1023 / R-005',
      'ORD-1024 / R-005',
      'ORD-1025 / R-005',
    ];
  }

  List<String> get _availableItems {
    if (widget.outlets != null && widget.outlets!.isNotEmpty) {
      if (_selectedOrderRoute != null) {
        final orderId = _selectedOrderRoute!.split(' / ').first.trim();
        final matchedOutlet = widget.outlets!.firstWhere(
          (o) => o.orderId == orderId,
          orElse: () => widget.outlets!.first,
        );
        return matchedOutlet.items
            .map((item) => '${item.code} - ${item.name}')
            .toList();
      }

      final items = <String>[];
      for (final outlet in widget.outlets!) {
        for (final item in outlet.items) {
          items.add('${item.code} - ${item.name}');
        }
      }
      return items;
    }
    return const [
      'ITM-1001 - Fresh Bananas',
      'ITM-1002 - Whole Milk 1L',
      'ITM-1003 - Brown Bread',
      'ITM-1004 - Large Eggs (12)',
      'ITM-1005 - Apples Red 1kg',
      'ITM-1006 - Greek Yogurt 400g',
    ];
  }

  void _populatePlannedQuantity(String itemStr) {
    if (widget.outlets != null) {
      final itemCode = itemStr.split(' - ').first.trim();
      for (final outlet in widget.outlets!) {
        for (final item in outlet.items) {
          if (item.code == itemCode) {
            _plannedQtyController.text = item.qtyToLoad.toString();
            return;
          }
        }
      }
    } else {
      _plannedQtyController.text = '25';
    }
  }

  void _onOrderRouteChanged(String? val) {
    setState(() {
      _selectedOrderRoute = val;
      _selectedItem = null;
      _plannedQtyController.clear();
    });
  }

  void _onItemChanged(String? val) {
    setState(() {
      _selectedItem = val;
      if (val != null) {
        _populatePlannedQuantity(val);
      } else {
        _plannedQtyController.clear();
      }
    });
  }

  void _onSubmitIssue() {
    if (_selectedIssue == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select an issue type from the cards above.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final targetOrderRoute = _selectedOrderRoute ?? 'Selected Route';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Issue Reported'),
        content: Text(
          'Issue "${_selectedIssue!.label}" for $targetOrderRoute has been successfully logged.',
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.deepForestGreen,
              foregroundColor: AppColors.white,
            ),
            onPressed: () {
              Navigator.pop(context); // close dialog
              Navigator.pop(context); // return from report screen
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Issue logged and notified to dispatcher.'),
                  backgroundColor: AppColors.deepForestGreen,
                ),
              );
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: InnerSectionHeader(
        title: 'Report an Issue',
        onBack: () => Navigator.pop(context),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. "Select Issue" Card Widget
            IssueTypeSelectorCard(
              selectedIssue: _selectedIssue,
              onIssueSelected: (issue) {
                setState(() {
                  _selectedIssue = issue;
                });
              },
            ),

            const SizedBox(height: 16),

            // 2. Form Details Card Widget
            ReportIssueFormCard(
              selectedOrderRoute: _selectedOrderRoute,
              availableOrderRoutes: _availableOrderRoutes,
              onOrderRouteChanged: _onOrderRouteChanged,
              selectedItem: _selectedItem,
              availableItems: _availableItems,
              onItemChanged: _onItemChanged,
              plannedQtyController: _plannedQtyController,
              actualQtyController: _actualQtyController,
              descriptionController: _descriptionController,
              hasPhoto: _hasPhoto,
              onPhotoUpdated: (val) {
                setState(() {
                  _hasPhoto = val;
                });
              },
            ),

            const SizedBox(height: 16),

            // 3. "Report Issue" Action Button (Positioned below the card)
            _buildSubmitButton(),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      width: double.infinity,
      height: AppSpacing.buttonHeight,
      child: ElevatedButton(
        onPressed: _onSubmitIssue,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.gold,
          foregroundColor: AppColors.deepForestGreen,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          ),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.near_me_outlined,
              size: 20,
              color: AppColors.deepForestGreen,
            ),
            SizedBox(width: 8),
            Text(
              'Report Issue',
              style: AppTextStyles.button,
            ),
          ],
        ),
      ),
    );
  }
}
