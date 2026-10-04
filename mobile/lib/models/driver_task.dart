import '../core/utils/helpers.dart';

/// One stop of a driver task, reduced to what the Tasks page shows.
class DriverTaskStop {
  final String id;
  final int sequence;
  final String outletName;
  final String district;

  const DriverTaskStop({
    required this.id,
    required this.sequence,
    required this.outletName,
    required this.district,
  });

  factory DriverTaskStop.fromJson(Map<String, dynamic> json) {
    final outlet = Helpers.toMap(json['outlet']);
    return DriverTaskStop(
      id: json['id']?.toString() ?? '',
      sequence: Helpers.toInt(json['sequence']),
      outletName: outlet['name']?.toString() ?? '',
      district: outlet['district']?.toString() ?? '',
    );
  }
}

/// A delivery route (trip) a driver can pick, or has picked.
///
/// Comes from `GET /api/deliveries/available` and `GET /api/deliveries/today`.
class DriverTask {
  final String id;
  final String code;
  final int tripNumber;

  /// The trip status: LOADED (ready to leave), IN_TRANSIT, COMPLETED, ...
  final String status;
  final String vehicleCode;
  final String vehicleType;
  final String depotName;
  final double plannedDistanceKm;
  final List<DriverTaskStop> stops;

  const DriverTask({
    required this.id,
    required this.code,
    required this.tripNumber,
    required this.status,
    required this.vehicleCode,
    required this.vehicleType,
    required this.depotName,
    required this.plannedDistanceKm,
    required this.stops,
  });

  factory DriverTask.fromJson(Map<String, dynamic> json) {
    final vehicle = Helpers.toMap(json['vehicle']);
    final depot = Helpers.toMap(json['depot']);
    final distance = json['plannedDistanceKm'];
    return DriverTask(
      id: json['id']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      tripNumber: Helpers.toInt(json['tripNumber'], 1),
      status: json['status']?.toString() ?? '',
      vehicleCode: vehicle['code']?.toString() ?? '',
      vehicleType: vehicle['type']?.toString() ?? '',
      depotName: depot['name']?.toString() ?? '',
      plannedDistanceKm: distance is num ? distance.toDouble() : 0,
      stops: [
        for (final stop in Helpers.toMapList(json['stops']))
          DriverTaskStop.fromJson(stop),
      ],
    );
  }

  bool get isInTransit => status == 'IN_TRANSIT';
  bool get isFinished => status == 'COMPLETED' || status == 'CANCELLED';
}
