enum DriverStopStatus {
  completed,
  current,
  upcoming,
}

class DriverStop {
  final int sequence;
  final String outlet;
  final String location;
  final String address;
  final String deliveryWindow;
  final String eta;
  final String distance;
  final String instructions;
  final DriverStopStatus status;

  const DriverStop({
    required this.sequence,
    required this.outlet,
    required this.location,
    required this.address,
    required this.deliveryWindow,
    required this.eta,
    required this.distance,
    required this.instructions,
    required this.status,
  });

  static const demoStops = [
    DriverStop(
      sequence: 1,
      outlet: 'Fresh Nugegoda',
      location: 'Colombo',
      address: '128 Stanley Thilakaratne Mawatha',
      deliveryWindow: '07:30 AM - 08:30 AM',
      eta: '07:35 AM',
      distance: '2.4 km',
      instructions: 'Deliver to cold room, call manager.',
      status: DriverStopStatus.completed,
    ),
    DriverStop(
      sequence: 2,
      outlet: 'Fresh Maharagama',
      location: 'Maharagama',
      address: '45 High Level Road, Maharagama',
      deliveryWindow: '08:45 AM - 09:30 AM',
      eta: '08:52 AM',
      distance: '4.8 km',
      instructions: 'Use the receiving entrance at the rear.',
      status: DriverStopStatus.current,
    ),
    DriverStop(
      sequence: 3,
      outlet: 'Fresh Wattala',
      location: 'Wattala',
      address: '72 Negombo Road, Wattala',
      deliveryWindow: '10:00 AM - 10:45 AM',
      eta: '10:08 AM',
      distance: '8.1 km',
      instructions: 'Call the outlet before unloading.',
      status: DriverStopStatus.upcoming,
    ),
    DriverStop(
      sequence: 4,
      outlet: 'Fresh Ja-Ela',
      location: 'Ja-Ela',
      address: '19 Colombo Road, Ja-Ela',
      deliveryWindow: '11:15 AM - 12:00 PM',
      eta: '11:20 AM',
      distance: '6.7 km',
      instructions: 'Deliver to the marked loading bay.',
      status: DriverStopStatus.upcoming,
    ),
  ];
}