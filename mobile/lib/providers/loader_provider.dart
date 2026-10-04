import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import '../core/services/api_service.dart';
import '../core/services/loader_service.dart';
import '../models/loading_issue.dart';
import '../models/loading_summary.dart';
import '../models/loading_task.dart';

/// What went wrong, in terms the screens can act on.
class LoaderError {
  final String message;
  final int? statusCode;

  /// The API's machine-readable code (for example `TASK_LOCKED`), if it sent one.
  final String? code;
  final Map<String, dynamic> details;

  const LoaderError({
    required this.message,
    this.statusCode,
    this.code,
    this.details = const {},
  });

  factory LoaderError.from(Object error) {
    if (error is ApiException) {
      return LoaderError(
        message: error.message,
        statusCode: error.statusCode,
        code: error.code,
        details: error.detailsMap,
      );
    }
    return const LoaderError(
      message: 'An unexpected error occurred. Please try again.',
    );
  }

  /// Offline, timed out, or the server could not be reached.
  bool get isNetworkError => statusCode == 0 || statusCode == 408;

  /// The account has no depot, so there is nothing for it to load.
  bool get isNoDepot => code == 'NO_DEPOT';

  /// This loader cannot work on the task any more: somebody else holds it, it is
  /// on hold or finished, its vehicle is busy, or the trip is gone.
  bool get isTaskUnavailable => const {
        'TASK_LOCKED',
        'VEHICLE_BUSY',
        'TASK_ON_HOLD',
        'TASK_COMPLETED',
        'TASK_PAUSED',
        'TASK_NOT_STARTED',
        'TASK_NOT_FOUND',
        'TRIP_NOT_LOADABLE',
        'PLAN_CONSTRAINT_VIOLATION',
      }.contains(code);

  /// The dispatcher changed the plan under the screen, so what it shows is stale.
  bool get isPlanDrift => const {
        'PLAN_CHANGED',
        'QTY_EXCEEDS_PLANNED',
        'LINE_NOT_IN_PLAN',
      }.contains(code);

  /// The load cannot be completed yet; the details carry the reasons.
  bool get isCompletionBlocked => code == 'COMPLETION_BLOCKED';

  /// The reasons behind a blocked completion or a broken constraint.
  List<TaskIssue> get reasons {
    final list = details['blockers'] ?? details['violations'];
    if (list is! List) return const [];
    return [
      for (final item in list)
        if (item is Map) TaskIssue.fromJson(Map<String, dynamic>.from(item)),
    ];
  }
}

/// State for the loader screens: Home figures, the task pool, the task being
/// loaded and the actions on it (open, save quantities, pause, report a
/// shortfall, complete).
class LoaderProvider extends ChangeNotifier {
  final LoaderService _loaderService;
  final Duration _searchDelay;
  final Duration _saveDelay;

  LoaderProvider({
    LoaderService? loaderService,
    ApiService? apiService,
    Duration searchDelay = const Duration(milliseconds: 350),
    Duration saveDelay = const Duration(milliseconds: 400),
  })  : _loaderService = loaderService ?? LoaderService(apiService: apiService),
        _searchDelay = searchDelay,
        _saveDelay = saveDelay;

  bool _disposed = false;
  String? _userId;

  // ---- Home ---------------------------------------------------------------

  LoadingSummary? _summary;
  bool _isSummaryLoading = false;
  LoaderError? _summaryError;
  int _summaryRequest = 0;

  LoadingSummary? get summary => _summary;
  bool get isSummaryLoading => _isSummaryLoading;
  LoaderError? get summaryError => _summaryError;

  /// Loads today's figures for the Home screen. Figures already on screen stay
  /// until the new ones arrive.
  Future<void> loadSummary() async {
    final request = ++_summaryRequest;
    _isSummaryLoading = true;
    _summaryError = null;
    notifyListeners();

    try {
      final summary = await _loaderService.getSummary();
      if (request != _summaryRequest) return;
      _summary = summary;
    } catch (e) {
      if (request != _summaryRequest) return;
      _summaryError = LoaderError.from(e);
    } finally {
      if (request == _summaryRequest) {
        _isSummaryLoading = false;
        notifyListeners();
      }
    }
  }

  // ---- Task pool ----------------------------------------------------------

  TaskTab _tab = TaskTab.pending;
  String _search = '';
  String? _brand;
  List<LoadingTask> _tasks = const [];
  int _tasksTotal = 0;
  bool _isTasksLoading = false;
  LoaderError? _tasksError;
  int _tasksRequest = 0;
  Timer? _searchTimer;

  TaskTab get tab => _tab;
  String get search => _search;
  String? get brand => _brand;
  List<LoadingTask> get tasks => _tasks;
  int get tasksTotal => _tasksTotal;
  bool get isTasksLoading => _isTasksLoading;
  LoaderError? get tasksError => _tasksError;
  bool get hasTaskFilters => _search.isNotEmpty || _brand != null;

  /// Loads the current tab with the current search and brand filter. The list
  /// already on screen stays until the new one arrives; a slow answer to an
  /// older request is dropped.
  Future<void> loadTasks() async {
    final request = ++_tasksRequest;
    _isTasksLoading = true;
    _tasksError = null;
    notifyListeners();

    try {
      final page = await _loaderService.getTasks(
        tab: _tab,
        search: _search,
        brand: _brand,
      );
      if (request != _tasksRequest) return;
      _tasks = page.items;
      _tasksTotal = page.total;
    } catch (e) {
      if (request != _tasksRequest) return;
      _tasksError = LoaderError.from(e);
    } finally {
      if (request == _tasksRequest) {
        _isTasksLoading = false;
        notifyListeners();
      }
    }
  }

  /// Opens the task pool afresh: Pending tab, no search or brand filter.
  Future<void> showTasks() {
    // Cards of another tab or filter must not flash up before the new list; the
    // last Pending list is fine to show while it refreshes.
    if (_tab != TaskTab.pending || hasTaskFilters) {
      _tasks = const [];
      _tasksTotal = 0;
    }
    _tab = TaskTab.pending;
    _search = '';
    _brand = null;
    _searchTimer?.cancel();
    return loadTasks();
  }

  void setTab(TaskTab tab) {
    if (tab == _tab) return;
    _tab = tab;
    // The other tab's cards must not linger while this one loads.
    _tasks = const [];
    _tasksTotal = 0;
    loadTasks();
  }

  void setBrand(String? brand) {
    if (brand == _brand) return;
    _brand = brand;
    loadTasks();
  }

  /// Searches route and vehicle codes, a moment after the loader stops typing.
  void setSearch(String text) {
    final value = text.trim();
    if (value == _search) return;
    _search = value;
    _searchTimer?.cancel();
    _searchTimer = Timer(_searchDelay, loadTasks);
  }

  // ---- Issues -------------------------------------------------------------

  IssueTab _issueTab = IssueTab.pending;
  List<LoadingIssue> _issues = const [];
  int _pendingIssueCount = 0;
  int _resolvedIssueCount = 0;
  bool _hasIssueCounts = false;
  bool _isIssuesLoading = false;
  LoaderError? _issuesError;
  int _issuesRequest = 0;

  IssueTab get issueTab => _issueTab;
  List<LoadingIssue> get issues => _issues;
  bool get isIssuesLoading => _isIssuesLoading;
  LoaderError? get issuesError => _issuesError;

  /// How many reports are on each tab; null until the server has said.
  int? get pendingIssueCount => _hasIssueCounts ? _pendingIssueCount : null;
  int? get resolvedIssueCount => _hasIssueCounts ? _resolvedIssueCount : null;

  /// Loads the current tab of shortfall reports. The list already on screen
  /// stays until the new one arrives; a slow answer to an older request is dropped.
  Future<void> loadIssues() async {
    final request = ++_issuesRequest;
    _isIssuesLoading = true;
    _issuesError = null;
    notifyListeners();

    try {
      final page = await _loaderService.getIssues(tab: _issueTab);
      if (request != _issuesRequest) return;
      _issues = page.items;
      _pendingIssueCount = page.pendingCount;
      _resolvedIssueCount = page.resolvedCount;
      _hasIssueCounts = true;
    } catch (e) {
      if (request != _issuesRequest) return;
      _issuesError = LoaderError.from(e);
    } finally {
      if (request == _issuesRequest) {
        _isIssuesLoading = false;
        notifyListeners();
      }
    }
  }

  /// Opens the Issues screen afresh: Pending tab, asking the server.
  Future<void> showIssues() {
    if (_issueTab != IssueTab.pending) {
      _issues = const [];
      _issueTab = IssueTab.pending;
    }
    return loadIssues();
  }

  void setIssueTab(IssueTab tab) {
    if (tab == _issueTab) return;
    _issueTab = tab;
    // The other tab's reports must not linger while this one loads.
    _issues = const [];
    loadIssues();
  }

  // ---- The task being loaded ----------------------------------------------

  LoadingTaskDetail? _activeTask;
  bool _isActionRunning = false;
  LoaderError? _actionError;
  LoaderError? _taskConflict;
  String? _saveError;
  bool _planChanged = false;
  String? _lastShortfallReference;

  // Quantity changes the loader made that the server has not confirmed, by order line.
  final Map<String, int> _pendingSaves = {};
  Timer? _saveTimer;
  Future<void>? _saveLoop;

  // Makes a retried shortfall report safe: the server files it only once.
  String? _shortfallSignature;
  String? _shortfallRequestId;

  /// The task opened for loading, or null when none is.
  LoadingTaskDetail? get activeTask => _activeTask;

  /// True while an action (open, pause, review, complete, report) is in flight.
  bool get isActionRunning => _isActionRunning;

  /// Why the last action failed.
  LoaderError? get actionError => _actionError;

  /// Set when the server says this loader no longer holds the task (somebody
  /// took it over, it was put on hold, the trip was cancelled...).
  LoaderError? get taskConflict => _taskConflict;

  /// Set when quantity changes could not be saved; they are kept and retried.
  String? get saveError => _saveError;

  /// True while quantity changes are waiting to be saved or being saved.
  bool get hasUnsavedChanges => _pendingSaves.isNotEmpty || _saveLoop != null;

  /// The reference ("ISS-001") of the shortfall issue filed last.
  String? get lastShortfallReference => _lastShortfallReference;

  /// Whether the plan changed under the screen since this was last asked.
  /// Reading it resets it, so the screen tells the loader once.
  bool takePlanChanged() {
    final changed = _planChanged;
    _planChanged = false;
    return changed;
  }

  void clearTaskConflict() {
    _taskConflict = null;
    notifyListeners();
  }

  /// "Open Task": claims the task for this loader (or resumes it) and makes it
  /// the active task. When it fails, [actionError] says why, for instance
  /// `TASK_LOCKED` when another loader holds it.
  Future<bool> openTask(String tripId) async {
    final opened = await _guard(() async {
      final detail = await _loaderService.startTask(tripId);
      _setActiveTask(detail);
      return true;
    });
    return opened ?? false;
  }

  /// Checks in on the active task: extends this loader's lock and picks up any
  /// change the dispatcher made to the plan. Does nothing while changes are
  /// waiting to be saved (the save does the same job). Failures are quiet apart
  /// from losing the task, which is reported through [taskConflict].
  Future<void> refreshActiveTask() async {
    final task = _activeTask;
    if (task == null || hasUnsavedChanges || _isActionRunning) return;

    try {
      final detail = await _loaderService.startTask(task.task.tripId);
      if (!identical(_activeTask, task) || hasUnsavedChanges) return;
      _setActiveTask(detail);
      notifyListeners();
    } catch (e) {
      final error = LoaderError.from(e);
      if (error.isTaskUnavailable && identical(_activeTask, task)) {
        _taskConflict = error;
        notifyListeners();
      }
      // Offline or a server hiccup: the next check-in tries again.
    }
  }

  /// Reads the active task again from the plan, for when the loader needs to see
  /// what the dispatcher changed.
  Future<void> reloadActiveTask() async {
    await _reloadActiveTask();
    notifyListeners();
  }

  /// Sets how many units of [line] are loaded. The screen moves at once and the
  /// change is saved shortly after, together with any others.
  void setLoadedQty(LoadingLine line, int quantity) {
    if (_activeTask == null) return;
    final target = max(quantity, 0);
    if (target == line.loadedQty) return;
    // Loading more than allowed is refused; unloading is always allowed (the
    // plan may have shrunk below what is already on the vehicle).
    if (target > line.maxLoadableQty && target > line.loadedQty) return;

    line.loadedQty = target;
    _queueSave(line.orderItemId, target);
  }

  /// Marks units of an order that left the route as taken off the vehicle.
  void unloadRemovedLine(RemovedLine removed) {
    if (_activeTask == null || removed.loadedQty == 0) return;
    removed.loadedQty = 0;
    _queueSave(removed.orderItemId, 0);
  }

  void _queueSave(String orderItemId, int quantity) {
    _pendingSaves[orderItemId] = quantity;
    notifyListeners();
    _saveTimer?.cancel();
    _saveTimer = Timer(_saveDelay, () => _runSaves());
  }

  /// Saves what is waiting right now; true when nothing is left unsaved.
  Future<bool> flushPendingSaves() async {
    _saveTimer?.cancel();
    await _runSaves();
    return _pendingSaves.isEmpty && _saveError == null && _taskConflict == null;
  }

  /// Tries again after a failed save.
  Future<void> retrySaves() => _runSaves();

  Future<void> _runSaves() {
    return _saveLoop ??= _drainSaves().whenComplete(() {
      _saveLoop = null;
      notifyListeners();
    });
  }

  // One request at a time, always with the latest value of every line: the API
  // takes totals, so overlapping requests could arrive out of order and an old
  // value would win.
  Future<void> _drainSaves() async {
    while (_pendingSaves.isNotEmpty) {
      final task = _activeTask;
      if (task == null) {
        _pendingSaves.clear();
        return;
      }

      final batch = Map<String, int>.of(_pendingSaves);
      _pendingSaves.clear();

      try {
        final result = await _loaderService.saveLines(
          task.task.tripId,
          batch,
          planRevision: task.planRevision,
        );
        if (!identical(_activeTask, task)) return;
        _applySaveResult(task, result);
        _saveError = null;
        notifyListeners();
      } catch (e) {
        final error = LoaderError.from(e);
        // Keep what the loader entered, unless a newer tap already replaced it.
        for (final entry in batch.entries) {
          _pendingSaves.putIfAbsent(entry.key, () => entry.value);
        }

        if (error.isTaskUnavailable) {
          _pendingSaves.clear();
          _taskConflict = error;
        } else if (error.isPlanDrift) {
          _pendingSaves.clear();
          _planChanged = true;
          await _reloadActiveTask();
        } else {
          _saveError = error.message;
        }
        notifyListeners();
        return;
      }
    }
  }

  void _applySaveResult(LoadingTaskDetail task, LineUpdateResult result) {
    if (result.planRevision.isNotEmpty) task.planRevision = result.planRevision;

    for (final saved in result.lines) {
      final line = task.findLine(saved.orderItemId);
      // A newer tap is waiting to be saved and wins over the confirmed value.
      if (line == null || _pendingSaves.containsKey(line.orderItemId)) continue;
      line.loadedQty = saved.loadedQty;
      line.status = saved.status;
    }

    final stillLoaded = {
      for (final removed in result.removedLines) removed.orderItemId: removed.loadedQty,
    };
    task.removedLines = [
      for (final removed in task.removedLines)
        if (stillLoaded.containsKey(removed.orderItemId))
          removed..loadedQty = stillLoaded[removed.orderItemId]!,
    ];
  }

  // The plan changed: show the loader what it looks like now.
  Future<void> _reloadActiveTask() async {
    final task = _activeTask;
    if (task == null) return;

    try {
      final fresh = await _loaderService.getTask(task.task.tripId);
      if (!identical(_activeTask, task)) return;
      if (!fresh.task.actions.canUpdateLines) {
        _taskConflict = const LoaderError(
          message: 'You are no longer loading this task.',
          statusCode: 409,
          code: 'TASK_LOCKED',
        );
        return;
      }
      _setActiveTask(fresh);
    } catch (e) {
      final error = LoaderError.from(e);
      if (error.isTaskUnavailable) {
        _taskConflict = error;
      } else {
        _saveError = error.message;
      }
    }
  }

  void _setActiveTask(LoadingTaskDetail detail) {
    // Taps that are still waiting to be saved stay on screen.
    for (final entry in _pendingSaves.entries) {
      detail.findLine(entry.key)?.loadedQty = entry.value;
    }
    _activeTask = detail;
    _taskConflict = null;
  }

  void _clearActiveTask() {
    _activeTask = null;
    _pendingSaves.clear();
    _saveTimer?.cancel();
    _saveError = null;
    _taskConflict = null;
  }

  /// Hands the task back to the shared pool with every quantity kept.
  Future<bool> pauseTask() async {
    final task = _activeTask;
    if (task == null) return false;

    final paused = await _guard(() async {
      await _requireSaved();
      await _loaderService.pauseTask(task.task.tripId);
      _clearActiveTask();
      return true;
    });
    return paused ?? false;
  }

  /// The review before completing: totals and anything that still blocks it.
  Future<LoadingTaskSummary?> reviewTask() async {
    final task = _activeTask;
    if (task == null) return null;

    return _guard(() async {
      await _requireSaved();
      return _loaderService.getTaskSummary(task.task.tripId);
    });
  }

  /// Finishes loading. [planRevision] is the revision of the review the loader
  /// just saw, so a plan changed in the meantime is caught.
  Future<LoadingTaskSummary?> completeTask({String? planRevision}) async {
    final task = _activeTask;
    if (task == null) return null;

    return _guard(() async {
      final summary = await _loaderService.completeTask(
        task.task.tripId,
        planRevision: planRevision,
      );
      _clearActiveTask();
      return summary;
    });
  }

  /// Reports items that cannot be loaded in full. The load goes on hold until
  /// the dispatcher reviews it, so the task stops being the active one.
  Future<bool> reportShortfall({
    required List<ShortfallLineRequest> lines,
    String? reason,
  }) async {
    final task = _activeTask;
    if (task == null) return false;

    // The same report sent again (after a timeout, say) reuses its id, so the
    // server files it once.
    final signature = '${task.task.tripId}|$reason|'
        '${[for (final l in lines) '${l.orderItemId}:${l.type.apiValue}:${l.shortQty}:${l.note}'].join(',')}';
    if (signature != _shortfallSignature) {
      _shortfallSignature = signature;
      _shortfallRequestId = _newRequestId();
    }

    final reported = await _guard(() async {
      // The server compares what is loaded with what is available, so it must be current.
      await _requireSaved();
      final detail = await _loaderService.reportShortfall(
        task.task.tripId,
        lines: lines,
        reason: reason,
        clientMutationId: _shortfallRequestId,
      );
      _lastShortfallReference = detail.shortfall?.issueReference;
      _shortfallSignature = null;
      _shortfallRequestId = null;
      _clearActiveTask();
      return true;
    });
    return reported ?? false;
  }

  // Pending quantity changes go to the server before anything that depends on them.
  Future<void> _requireSaved() async {
    if (await flushPendingSaves()) return;

    final conflict = _taskConflict;
    if (conflict != null) {
      throw ApiException(
        message: conflict.message,
        statusCode: conflict.statusCode,
        details: {'code': conflict.code},
      );
    }
    throw ApiException(
      message: _saveError ??
          'Your latest changes could not be saved. Check your connection and try again.',
      statusCode: 0,
    );
  }

  /// Runs an action, recording any failure in [actionError]. Resolves null on failure.
  Future<T?> _guard<T>(Future<T> Function() action) async {
    _isActionRunning = true;
    _actionError = null;
    notifyListeners();

    try {
      return await action();
    } catch (e) {
      _actionError = LoaderError.from(e);
      return null;
    } finally {
      _isActionRunning = false;
      notifyListeners();
    }
  }

  String _newRequestId() {
    final random = Random.secure();
    return List.generate(
      16,
      (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ).join();
  }

  // ---- A finished task ----------------------------------------------------

  LoadingTaskSummary? _taskSummary;
  bool _isTaskSummaryLoading = false;
  LoaderError? _taskSummaryError;
  int _taskSummaryRequest = 0;

  LoadingTaskSummary? get taskSummary => _taskSummary;
  bool get isTaskSummaryLoading => _isTaskSummaryLoading;
  LoaderError? get taskSummaryError => _taskSummaryError;

  /// Loads the record of a task (the Task Details screen).
  Future<void> loadTaskSummary(String tripId) async {
    final request = ++_taskSummaryRequest;
    if (_taskSummary?.task.tripId != tripId) _taskSummary = null;
    _isTaskSummaryLoading = true;
    _taskSummaryError = null;
    notifyListeners();

    try {
      final summary = await _loaderService.getTaskSummary(tripId);
      if (request != _taskSummaryRequest) return;
      _taskSummary = summary;
    } catch (e) {
      if (request != _taskSummaryRequest) return;
      _taskSummaryError = LoaderError.from(e);
    } finally {
      if (request == _taskSummaryRequest) {
        _isTaskSummaryLoading = false;
        notifyListeners();
      }
    }
  }

  // ---- Session ------------------------------------------------------------

  /// Forgets everything when a different person signs in (or nobody does), so
  /// one loader never sees another's tasks. Called as the signed-in user changes.
  void bindUser(String? userId) {
    if (userId == _userId) return;
    _userId = userId;

    _saveTimer?.cancel();
    _searchTimer?.cancel();
    _summaryRequest++;
    _tasksRequest++;
    _taskSummaryRequest++;
    _issuesRequest++;
    _summary = null;
    _isSummaryLoading = false;
    _summaryError = null;
    _tab = TaskTab.pending;
    _search = '';
    _brand = null;
    _tasks = const [];
    _tasksTotal = 0;
    _isTasksLoading = false;
    _tasksError = null;
    _issueTab = IssueTab.pending;
    _issues = const [];
    _hasIssueCounts = false;
    _isIssuesLoading = false;
    _issuesError = null;
    _clearActiveTask();
    _actionError = null;
    _taskSummary = null;
    _isTaskSummaryLoading = false;
    _taskSummaryError = null;
  }

  // The server keeps answering after a screen is gone; do not notify a disposed provider.
  @override
  void notifyListeners() {
    if (!_disposed) super.notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _saveTimer?.cancel();
    _searchTimer?.cancel();
    super.dispose();
  }
}
