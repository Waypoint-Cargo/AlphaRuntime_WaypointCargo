import 'dart:math';
import 'package:flutter/foundation.dart';
import '../core/services/api_service.dart';
import '../core/services/driver_service.dart';
import '../models/driver_task.dart';

/// State for the driver screens: the tasks anyone can pick, the trip this
/// driver picked and everything done on it (leave, arrive, unload, prove the
/// delivery, ask for a new stop order, report an issue).
class DriverProvider extends ChangeNotifier {
  final DriverService _service;

  DriverProvider({DriverService? driverService, ApiService? apiService})
      : _service = driverService ?? DriverService(apiService: apiService);

  bool _disposed = false;
  String? _userId;
  int _request = 0;

  // ---- Tasks --------------------------------------------------------------

  List<DriverTask> _available = const [];
  List<DriverTask> _trips = const [];
  DriverSummary _summary = const DriverSummary();
  bool _isLoading = false;
  String? _error;
  bool _hasLoaded = false;

  /// Trips the loader finished that nobody has taken yet.
  List<DriverTask> get available => _available;

  /// Every trip this driver holds that is not finished yet.
  List<DriverTask> get myTasks =>
      _trips.where((task) => !task.isFinished).toList();

  /// The trip being driven (or about to be): the driver's first unfinished one.
  DriverTask? get activeTask => myTasks.isEmpty ? null : myTasks.first;

  DriverSummary get summary => _summary;
  bool get isLoading => _isLoading;
  bool get hasLoaded => _hasLoaded;
  String? get error => _error;

  /// A trip of this driver by id, finished or not; null when it is gone.
  DriverTask? taskById(String id) {
    for (final task in _trips) {
      if (task.id == id) return task;
    }
    return null;
  }

  /// Starts afresh whenever a different user signs in.
  void bindUser(String? userId) {
    if (userId == _userId) return;
    _userId = userId;
    _request++;
    _available = const [];
    _trips = const [];
    _summary = const DriverSummary();
    _isLoading = false;
    _hasLoaded = false;
    _error = null;
    _actionError = null;
    _issues = const [];
    _issuesError = null;
    _sequenceRequests = const [];
    _pendingIds.clear();
    _notify();
  }

  /// Loads the available tasks, the driver's own trips and the day's figures.
  /// What is already on screen stays until the new data arrives; a slow answer
  /// to an older request is dropped.
  Future<void> loadTasks() async {
    final request = ++_request;
    _isLoading = true;
    _error = null;
    _notify();

    try {
      final results = await Future.wait<Object>([
        _service.getAvailableTasks(),
        _service.getMyTasks(),
        _service.getSummary(),
      ]);
      if (request != _request) return;
      _available = results[0] as List<DriverTask>;
      _trips = results[1] as List<DriverTask>;
      _summary = results[2] as DriverSummary;
      _hasLoaded = true;
    } catch (e) {
      if (request != _request) return;
      _error = _message(e);
    } finally {
      if (request == _request) {
        _isLoading = false;
        _notify();
      }
    }
  }

  /// Quietly refreshes the driver's own trips after a change. Returns false
  /// (and keeps what is shown) when the server could not be reached.
  Future<bool> _reloadMine() async {
    try {
      final results = await Future.wait<Object>([
        _service.getMyTasks(),
        _service.getSummary(),
      ]);
      _trips = results[0] as List<DriverTask>;
      _summary = results[1] as DriverSummary;
      _notify();
      return true;
    } catch (_) {
      return false;
    }
  }

  // ---- Actions ------------------------------------------------------------

  String? _actionError;
  String? _actionCode;

  /// Why the last action failed; null after a success.
  String? get actionError => _actionError;

  /// The API's machine-readable code of that failure, if it sent one.
  String? get actionCode => _actionCode;

  // One id per action that is still unresolved: a retry after a lost answer
  // reuses it, so the server recognises the repeat instead of doing it twice.
  final Map<String, String> _pendingIds = {};
  final Random _random = Random();

  String _mutationId(String key) => _pendingIds.putIfAbsent(
        key,
        () =>
            'm${DateTime.now().microsecondsSinceEpoch}-${_random.nextInt(1 << 31)}',
      );

  /// Runs [action]; true on success. A failure sets [actionError]/[actionCode].
  Future<bool> _run(String key, Future<void> Function(String id) action) async {
    _actionError = null;
    _actionCode = null;
    final id = _mutationId(key);
    try {
      await action(id);
      _pendingIds.remove(key);
      return true;
    } catch (e) {
      // The server answered: this attempt is settled, a new one gets a new id.
      if (e is ApiException && (e.statusCode ?? 0) >= 400 && e.statusCode! < 500) {
        _pendingIds.remove(key);
      }
      _actionError = _message(e);
      _actionCode = e is ApiException ? e.code : null;
      _notify();
      return false;
    }
  }

  /// "Select Task": takes [task]. False (with [actionError]) when another
  /// driver was faster or this driver still has a task to finish.
  Future<bool> selectTask(DriverTask task) async {
    final ok = await _run('select:${task.id}', (_) async {
      await _service.selectTask(task.id);
    });
    if (ok) await loadTasks();
    return ok;
  }

  /// "Start Trip": the vehicle leaves the depot.
  Future<bool> depart(String tripId) async {
    final ok = await _run(
      'depart:$tripId',
      (id) => _service.depart(tripId, clientMutationId: id),
    );
    if (ok) await _reloadMine();
    return ok;
  }

  /// The driver arrived, started unloading, or could not deliver at a stop.
  Future<bool> recordStopEvent(
    String stopId,
    StopEventType type, {
    String? failureReason,
  }) async {
    final ok = await _run(
      'event:$stopId:${type.apiValue}',
      (id) => _service.recordStopEvent(
        stopId,
        type,
        failureReason: failureReason,
        clientMutationId: id,
      ),
    );
    if (ok) await _reloadMine();
    return ok;
  }

  /// Uploads the signature, then files the proof of delivery. [tripFinished]
  /// tells whether that was the trip's last stop.
  Future<bool> submitProof(
    String stopId, {
    required String receiverName,
    required Uint8List signaturePng,
    required bool allDeliveredAsPlanned,
    List<DeliveredLine>? lines,
  }) async {
    _tripFinished = false;
    final ok = await _run('proof:$stopId', (id) async {
      final signatureId = await _service.uploadImage(
        signaturePng,
        kind: 'SIGNATURE',
        clientFileId: 'sig-$id',
      );
      await _service.submitProof(
        stopId,
        receiverName: receiverName,
        signatureFileId: signatureId,
        allDeliveredAsPlanned: allDeliveredAsPlanned,
        lines: lines,
        clientMutationId: id,
      );
    });
    if (ok) {
      final reloaded = await _reloadMine();
      // The stop's trip is gone from the list or finished once nothing is left.
      _tripFinished = reloaded && _stopsLeft(stopId) == 0;
      _notify();
    }
    return ok;
  }

  bool _tripFinished = false;

  /// True after [submitProof] when the delivery just filed was the last one.
  bool get tripFinished => _tripFinished;

  int _stopsLeft(String stopId) {
    for (final task in _trips) {
      if (task.stopById(stopId) != null) {
        return task.isFinished ? 0 : task.stops.where((s) => !s.isDone).length;
      }
    }
    return 0; // the trip left the list: it is finished
  }

  // ---- Stop order requests --------------------------------------------------

  List<SequenceRequest> _sequenceRequests = const [];
  bool _isSequenceLoading = false;
  String? _sequenceError;

  List<SequenceRequest> get sequenceRequests => _sequenceRequests;
  bool get isSequenceLoading => _isSequenceLoading;
  String? get sequenceError => _sequenceError;

  /// Asks the dispatcher to visit the waiting stops in [orderedStopIds] order.
  Future<bool> requestSequenceChange(
    String tripId, {
    required List<String> orderedStopIds,
    String? reason,
  }) {
    return _run(
      'sequence:$tripId',
      (_) => _service.requestSequenceChange(
        tripId,
        proposedStopIds: orderedStopIds,
        reason: reason,
      ),
    );
  }

  Future<void> loadSequenceRequests(String tripId) async {
    _isSequenceLoading = true;
    _sequenceError = null;
    _notify();
    try {
      _sequenceRequests = await _service.getSequenceRequests(tripId);
    } catch (e) {
      _sequenceError = _message(e);
    } finally {
      _isSequenceLoading = false;
      _notify();
    }
  }

  // ---- Issues ---------------------------------------------------------------

  List<DriverIssue> _issues = const [];
  bool _isIssuesLoading = false;
  String? _issuesError;

  List<DriverIssue> get issues => _issues;
  bool get isIssuesLoading => _isIssuesLoading;
  String? get issuesError => _issuesError;

  Future<void> loadIssues() async {
    _isIssuesLoading = true;
    _issuesError = null;
    _notify();
    try {
      _issues = await _service.getIssues();
    } catch (e) {
      _issuesError = _message(e);
    } finally {
      _isIssuesLoading = false;
      _notify();
    }
  }

  /// Reports a problem on the trip (and one of its stops). Refreshes the list.
  Future<bool> reportIssue({
    required DriverIssueType type,
    required String tripId,
    String? stopId,
    String? description,
  }) async {
    final ok = await _run(
      'issue:$tripId:${stopId ?? ''}:${type.apiValue}:${description ?? ''}',
      (id) => _service.reportIssue(
        type: type,
        tripId: tripId,
        stopId: stopId,
        description: description,
        clientMutationId: id,
      ),
    );
    if (ok) await loadIssues();
    return ok;
  }

  String _message(Object e) => e is ApiException
      ? e.message
      : 'An unexpected error occurred. Please try again.';

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
