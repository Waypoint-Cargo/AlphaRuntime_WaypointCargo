import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/services/loader_service.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/inner_section_header.dart';
import '../../../../models/loading_task.dart';
import '../../../../providers/loader_provider.dart';
import '../../task/widgets/loader_feedback.dart';
import '../widgets/issue_type_selector.dart';
import '../widgets/report_issue_form_card.dart';

export '../widgets/issue_type_selector.dart' show IssueType;

/// One item of a shortfall report: how many units are really there, and why not all.
class _ShortfallEntry {
  final LoadingLine line;
  final IssueType issueType;
  final int actualQty;

  const _ShortfallEntry({
    required this.line,
    required this.issueType,
    required this.actualQty,
  });

  /// Units that cannot be loaded.
  int get shortQty => line.plannedQty - actualQty;

  /// How the API classifies it; "quantity short" is missing units.
  ShortfallType get type => switch (issueType) {
        IssueType.damagedItems => ShortfallType.damaged,
        IssueType.wrongItems => ShortfallType.wrongItem,
        _ => ShortfallType.missing,
      };
}

/// The "Report an Issue" form.
///
/// Given a [shortfallTask] (opened from Start Loading) it files a real shortfall
/// on that task, and the load goes on hold for the dispatcher. Without one (from
/// the Issues tab) it behaves as before.
class ReportLoadingIssueScreen extends StatefulWidget {
  final LoadingTaskDetail? shortfallTask;
  final String? initialOrderRoute;
  final String? initialItem;

  const ReportLoadingIssueScreen({
    super.key,
    this.shortfallTask,
    this.initialOrderRoute,
    this.initialItem,
  });

  @override
  State<ReportLoadingIssueScreen> createState() =>
      _ReportLoadingIssueScreenState();
}

class _ReportLoadingIssueScreenState extends State<ReportLoadingIssueScreen> {
  // A shortfall can only name these: the API knows missing, damaged and wrong items.
  static const List<IssueType> _shortfallTypes = [
    IssueType.missingItems,
    IssueType.damagedItems,
    IssueType.wrongItems,
    IssueType.quantityShort,
  ];

  IssueType? _selectedIssue;

  String? _selectedOrderRoute;
  String? _selectedItem;

  late final TextEditingController _plannedQtyController;
  late final TextEditingController _actualQtyController;
  late final TextEditingController _descriptionController;

  bool _hasPhoto = false;

  // Items already added to the report, and whether it is being sent.
  final List<_ShortfallEntry> _entries = [];
  bool _isSubmitting = false;

  bool get _isShortfall => widget.shortfallTask != null;

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

  // ---- What the dropdowns offer -------------------------------------------

  String _orderLabel(LoadingLine line) =>
      '${line.orderReference} / ${widget.shortfallTask!.task.routeCode}';

  String _itemLabel(LoadingLine line, {required bool withOrder}) {
    final label = '${line.displayCode} - ${line.itemName}';
    return withOrder ? '$label (${line.orderReference})' : label;
  }

  // The lines the item dropdown offers, by label: those of the chosen order, or
  // every line (labelled with its order) until an order is chosen.
  Map<String, LoadingLine> get _itemsByLabel {
    final task = widget.shortfallTask!;
    final order = _selectedOrderRoute;
    final map = <String, LoadingLine>{};
    for (final line in task.lines) {
      if (order != null && _orderLabel(line) != order) continue;
      var label = _itemLabel(line, withOrder: order == null);
      // Two lines can share a code and name; the dropdown needs distinct labels.
      if (map.containsKey(label)) label = '$label #${line.lineNo}';
      map[label] = line;
    }
    return map;
  }

  List<String> get _availableOrderRoutes {
    if (_isShortfall) {
      final labels = <String>[];
      for (final line in widget.shortfallTask!.lines) {
        final label = _orderLabel(line);
        if (!labels.contains(label)) labels.add(label);
      }
      return labels;
    }
    return const [
      'ORD-109 / R-005',
      'ORD-1023 / R-005',
      'ORD-1024 / R-005',
      'ORD-1025 / R-005',
    ];
  }

  List<String> get _availableItems {
    if (_isShortfall) return _itemsByLabel.keys.toList();
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
    if (_isShortfall) {
      final line = _itemsByLabel[itemStr];
      _plannedQtyController.text = line == null ? '' : '${line.plannedQty}';
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
      if (val == null) {
        _plannedQtyController.clear();
        return;
      }

      if (_isShortfall && _selectedOrderRoute == null) {
        // Picking an item first also picks its order.
        final line = _itemsByLabel[val];
        if (line != null) {
          _selectedOrderRoute = _orderLabel(line);
          _selectedItem = _itemLabel(line, withOrder: false);
        }
      }
      _populatePlannedQuantity(_selectedItem!);
    });
  }

  // ---- Building the report -------------------------------------------------

  /// The item currently in the form as an entry, or the reason it cannot be one.
  ({_ShortfallEntry? entry, String? error}) _entryFromForm() {
    final issue = _selectedIssue;
    if (issue == null) {
      return (entry: null, error: 'Please select an issue type from the cards above.');
    }

    final label = _selectedItem;
    final line = label == null ? null : _itemsByLabel[label];
    if (line == null) {
      return (entry: null, error: 'Select the item that is short.');
    }

    final actual = int.tryParse(_actualQtyController.text.trim());
    if (actual == null || actual < 0) {
      return (entry: null, error: 'Enter the actual quantity you have for this item.');
    }
    if (actual >= line.plannedQty) {
      return (
        entry: null,
        error: 'The actual quantity must be less than the planned quantity (${line.plannedQty}).',
      );
    }
    if (actual < line.loadedQty) {
      return (
        entry: null,
        error: 'You have already loaded ${line.loadedQty} of this item. '
            'Enter at least ${line.loadedQty}, or lower the loaded quantity first.',
      );
    }

    return (
      entry: _ShortfallEntry(line: line, issueType: issue, actualQty: actual),
      error: null,
    );
  }

  void _addEntry(_ShortfallEntry entry) {
    _entries.removeWhere((e) => e.line.orderItemId == entry.line.orderItemId);
    _entries.add(entry);
  }

  void _onAddAnotherItem() {
    final result = _entryFromForm();
    if (result.error != null) {
      showLoaderSnackBar(context, result.error!);
      return;
    }

    setState(() {
      _addEntry(result.entry!);
      // Ready for the next item; the order and the issue type usually stay.
      _selectedItem = null;
      _plannedQtyController.clear();
      _actualQtyController.clear();
    });
  }

  Future<void> _onSubmitIssue() async {
    if (_isShortfall) {
      await _submitShortfall();
      return;
    }

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

  Future<void> _submitShortfall() async {
    if (_isSubmitting) return;

    // Whatever is in the form counts too, so a one-item report needs no extra tap.
    final entries = List<_ShortfallEntry>.of(_entries);
    final formStarted =
        _selectedItem != null || _actualQtyController.text.trim().isNotEmpty;
    if (formStarted || entries.isEmpty) {
      final result = _entryFromForm();
      if (result.error != null) {
        showLoaderSnackBar(context, result.error!);
        return;
      }
      entries.removeWhere((e) => e.line.orderItemId == result.entry!.line.orderItemId);
      entries.add(result.entry!);
    }

    final loader = context.read<LoaderProvider>();
    setState(() => _isSubmitting = true);
    final reported = await loader.reportShortfall(
      lines: [
        for (final entry in entries)
          ShortfallLineRequest(
            orderItemId: entry.line.orderItemId,
            type: entry.type,
            shortQty: entry.shortQty,
          ),
      ],
      reason: _descriptionController.text,
    );
    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (!reported) {
      final error = loader.actionError;
      if (error != null) await showLoaderError(context, error);
      // If the task is out of the loader's hands (taken over, already on hold),
      // there is nothing left to report on: go back to the list.
      if (error != null && error.isTaskUnavailable && mounted) {
        Navigator.pop(context, true);
      }
      return;
    }

    final reference = loader.lastShortfallReference;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Shortfall Reported'),
        content: Text(
          '${reference != null ? '$reference was logged. ' : ''}'
          'This load is on hold until the dispatcher reviews it.',
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.deepForestGreen,
              foregroundColor: AppColors.white,
            ),
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('OK'),
          ),
        ],
      ),
    );
    if (mounted) Navigator.pop(context, true);
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
              types: _isShortfall ? _shortfallTypes : IssueType.values,
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
              // A shortfall report cannot carry a photo (the API takes none).
              showPhoto: !_isShortfall,
              onPhotoUpdated: (val) {
                setState(() {
                  _hasPhoto = val;
                });
              },
            ),

            if (_isShortfall) ...[
              const SizedBox(height: 12),
              _buildAddedEntries(),
              _buildAddAnotherButton(),
            ],

            const SizedBox(height: 16),

            // 3. "Report Issue" Action Button (Positioned below the card)
            _buildSubmitButton(),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // The items already added to this report, each removable.
  Widget _buildAddedEntries() {
    if (_entries.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Items in this report (${_entries.length})', style: AppTextStyles.labelLarge),
          for (final entry in _entries)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                children: [
                  Icon(entry.issueType.icon, size: 16, color: AppColors.deepForestGreen),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${entry.line.itemName} - ${entry.issueType.label}',
                      style: AppTextStyles.bodyMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text('${entry.shortQty} short', style: AppTextStyles.statusError),
                  IconButton(
                    tooltip: 'Remove',
                    visualDensity: VisualDensity.compact,
                    onPressed: () => setState(() => _entries.remove(entry)),
                    icon: const Icon(Icons.close_rounded, size: 18, color: AppColors.secondaryText),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildAddAnotherButton() {
    return SizedBox(
      width: double.infinity,
      height: 44,
      child: OutlinedButton.icon(
        onPressed: _isSubmitting ? null : _onAddAnotherItem,
        icon: const Icon(Icons.add_rounded, size: 18, color: AppColors.deepForestGreen),
        label: const Text(
          'Add another item',
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: FontWeight.w600,
            color: AppColors.deepForestGreen,
          ),
        ),
        style: OutlinedButton.styleFrom(
          backgroundColor: AppColors.white,
          side: const BorderSide(color: AppColors.deepForestGreen),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          ),
        ),
      ),
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      width: double.infinity,
      height: AppSpacing.buttonHeight,
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : _onSubmitIssue,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.gold,
          foregroundColor: AppColors.deepForestGreen,
          disabledBackgroundColor: AppColors.gold,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          ),
        ),
        child: _isSubmitting
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.deepForestGreen,
                ),
              )
            : const Row(
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
