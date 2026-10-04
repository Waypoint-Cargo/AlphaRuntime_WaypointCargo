import '../../models/driver_task.dart';
import '../constants/api_constants.dart';
import '../utils/helpers.dart';
import 'api_service.dart';

/// Driver service for the mobile application: the delivery task APIs.
class DriverService {
  final ApiService _apiService;

  DriverService({ApiService? apiService})
      : _apiService = apiService ?? ApiService();

  List<DriverTask> _trips(Map<String, dynamic> response) {
    final data = Helpers.toMap(response['data']);
    return [
      for (final trip in Helpers.toMapList(data['trips']))
        DriverTask.fromJson(trip),
    ];
  }

  /// Tasks any driver can pick: loaded routes nobody has taken yet.
  ///
  /// Calls `GET /api/deliveries/available`.
  Future<List<DriverTask>> getAvailableTasks() async {
    return _trips(await _apiService.get(ApiConstants.deliveriesAvailable));
  }

  /// The tasks this driver has picked for today.
  ///
  /// Calls `GET /api/deliveries/today`.
  Future<List<DriverTask>> getMyTasks() async {
    return _trips(await _apiService.get(ApiConstants.deliveriesToday));
  }

  /// "Select Task": the driver takes an available task.
  ///
  /// Calls `POST /api/deliveries/tasks/:tripId/select`. Throws [ApiException]
  /// 409 (`TASK_TAKEN`, `TASK_NOT_AVAILABLE`, `DRIVER_HAS_ACTIVE_TASK`) when it
  /// cannot be taken.
  Future<DriverTask> selectTask(String tripId) async {
    final response =
        await _apiService.post(ApiConstants.deliveryTaskSelect(tripId));
    final trip = Helpers.toMap(Helpers.toMap(response['data'])['trip']);
    return DriverTask.fromJson(trip);
  }
}
