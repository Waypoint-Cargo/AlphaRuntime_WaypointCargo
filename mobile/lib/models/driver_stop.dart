enum DriverStopStatus {
  completed,
  current,
  upcoming,
}

class DriverStop {
  final String id;
  final int sequence;
  final String outlet;
  final String location;
  final String address;
  final String deliveryWindow;
  final String eta;
  final String instructions;
  final String distance;
  final DriverStopStatus status;

  const DriverStop({
    required this.id,
    required this.sequence,
    required this.outlet,
    required this.location,
    required this.address,
    required this.deliveryWindow,
    required this.eta,
    required this.instructions,
    required this.distance,
    required this.status,
  });

  static const List<DriverStop> demoStops = [
    DriverStop(
      id: 'STOP-001',
      sequence: 1,
      outlet: 'Fresh Nugegoda',
      location: 'Colombo',
      address: '128 Stanley Thilakaratne Mawatha',
      deliveryWindow: '07:30 AM - 08:30 AM',
      eta: '07:35 AM',
      instructions: 'Deliver to cold room, call manager',
      distance: '2.4 km',
      status: DriverStopStatus.completed,
    ),
    DriverStop(
      id: 'STOP-002',
      sequence: 2,
      outlet: 'Fresh Maharagama',
      location: 'Maharagama',
      address: '45 High Level Road',
      deliveryWindow: '08:45 AM - 09:30 AM',
      eta: '08:48 AM',
      instructions: 'Use loading entrance',
      distance: '3.1 km',
      status: DriverStopStatus.completed,
    ),
    DriverStop(
      id: 'STOP-003',
      sequence: 3,
      outlet: 'Fresh Wattala',
      location: 'Wattala',
      address: '22 Negombo Road',
      deliveryWindow: '10:00 AM - 10:45 AM',
      eta: '10:05 AM',
      instructions: 'Call outlet manager on arrival',
      distance: '4.2 km',
      status: DriverStopStatus.completed,
    ),
    DriverStop(
      id: 'STOP-004',
      sequence: 4,
      outlet: 'Fresh Ja-Ela',
      location: 'Ja-Ela',
      address: '76 Colombo - Negombo Road',
      deliveryWindow: '11:15 AM - 12:00 PM',
      eta: '11:20 AM',
      instructions: 'Deliver to receiving area',
      distance: '5.8 km',
      status: DriverStopStatus.current,
    ),
    DriverStop(
      id: 'STOP-005',
      sequence: 5,
      outlet: 'Tech Outlet',
      location: 'Rajagiriya',
      address: '18 Parliament Road',
      deliveryWindow: '01:00 PM - 02:00 PM',
      eta: '01:08 PM',
      instructions: 'Handle fragile items carefully',
      distance: '4.5 km',
      status: DriverStopStatus.upcoming,
    ),
    DriverStop(
      id: 'STOP-006',
      sequence: 6,
      outlet: 'Style Mall',
      location: 'Colombo 03',
      address: '125 Galle Road',
      deliveryWindow: '02:30 PM - 03:30 PM',
      eta: '02:38 PM',
      instructions: 'Mall delivery window applies',
      distance: '3.8 km',
      status: DriverStopStatus.upcoming,
    ),
    DriverStop(
      id: 'STOP-007',
      sequence: 7,
      outlet: 'Fresh Kelaniya',
      location: 'Kelaniya',
      address: '34 Kandy Road',
      deliveryWindow: '04:00 PM - 04:45 PM',
      eta: '04:05 PM',
      instructions: 'Use rear receiving entrance',
      distance: '6.2 km',
      status: DriverStopStatus.upcoming,
    ),
    DriverStop(
      id: 'STOP-008',
      sequence: 8,
      outlet: 'Tech Rajagiriya',
      location: 'Rajagiriya',
      address: '89 Sri Jayawardenepura Mawatha',
      deliveryWindow: '05:00 PM - 06:00 PM',
      eta: '05:10 PM',
      instructions: 'Receiver must verify electronics',
      distance: '3.6 km',
      status: DriverStopStatus.upcoming,
    ),
  ];
}