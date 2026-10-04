import 'package:flutter/foundation.dart';
import '../core/services/api_service.dart';
import '../core/services/driver_service.dart';
import '../models/driver_task.dart';

/// State for the driver Tasks page: the tasks anyone can pick, the ones this
/// driver already picked, and the "Select Task" action.
class DriverProvider extends ChangeNotifier {
  final DriverService _service;

  DriverProvider({DriverService? driverService, ApiService? apiService})
      : _service = driverService ?? DriverService(apiService: apiService);

  bool _disposed = false;
  String? _userId;
  int _request = 0;

  List<DriverTask> _available = const [];
  List<DriverTask> _mine = const [];
  bool _isLoading = false;
  String? _error;
  String? _actionError;

  List<DriverTask> get available => _available;

  /// Picked tasks that are not finished yet.
  List<DriverTask> get myTasks => _mine;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Why the last "Select Task" failed; null after a success.
  String? get actionError => _actionError;

  /// Starts afresh whenever a different user signs in.
  void bindUser(String? userId) {
    if (userId == _userId) return;
    _userId = userId;
    _request++;
    _available = const [];
    _mine = const [];
    _isLoading = false;
    _error = null;
    _actionError = null;
    _notify();
  }

  /// Loads both lists. What is already on screen stays until the new data
  /// arrives; a slow answer to an older request is dropped.
  Future<void> loadTasks() async {
    final request = ++_request;
    _isLoading = true;
    _error = null;
    _notify();

    try {
      final results = await Future.wait([
        _service.getAvailableTasks(),
        _service.getMyTasks(),
      ]);
      if (request != _request) return;
      _available = results[0];
      _mine = results[1].where((task) => !task.isFinished).toList();
    } catch (e) {
      if (request != _request) return;
      _error = e is ApiException
          ? e.message
          : 'An unexpected error occurred. Please try again.';
    } finally {
      if (request == _request) {
        _isLoading = false;
        _notify();
      }
    }
  }

  /// Takes [task]. Returns false (with [actionError] set) when it could not be
  /// taken, for example because another driver was faster.
  Future<bool> selectTask(DriverTask task) async {
    _actionError = null;
    try {
      await _service.selectTask(task.id);
    } catch (e) {
      _actionError = _selectMessage(e);
      _notify();
      return false;
    }
    await loadTasks();
    return true;
  }

  String _selectMessage(Object e) {
    if (e is! ApiException) {
      return 'An unexpected error occurred. Please try again.';
    }
    // The server's own sentence says it best (TASK_TAKEN, TASK_NOT_AVAILABLE,
    // DRIVER_HAS_ACTIVE_TASK).
    return e.message;
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
