/// Formats times the way the loader screens show them.
class DateFormatter {
  DateFormatter._();

  // The business runs in Sri Lanka, which is always UTC+05:30 (no daylight
  // saving). Showing Colombo time keeps the screens in step with the server's
  // idea of "today" whatever timezone the phone is set to.
  static const Duration _colomboOffset = Duration(hours: 5, minutes: 30);

  /// "06:15 AM" in Colombo time, or "--:--" when there is no time yet.
  static String formatTime(DateTime? time) {
    if (time == null) return '--:--';
    final local = time.toUtc().add(_colomboOffset);
    final hour12 = local.hour % 12 == 0 ? 12 : local.hour % 12;
    final period = local.hour < 12 ? 'AM' : 'PM';
    final hh = hour12.toString().padLeft(2, '0');
    final mm = local.minute.toString().padLeft(2, '0');
    return '$hh:$mm $period';
  }

  /// What "now" is for the relative formats below; tests replace it.
  static DateTime Function() clock = DateTime.now;

  /// A departure time: "06:15 AM" for today, "Tomorrow, 06:15 AM" for the next
  /// day and "6 Oct, 06:15 AM" for any other day (the loader list also holds the
  /// routes planned for the coming days). "--:--" when there is no time yet.
  static String formatDeparture(DateTime? time, {DateTime? now}) {
    if (time == null) return '--:--';
    final today = (now ?? clock()).toUtc().add(_colomboOffset);
    final day = time.toUtc().add(_colomboOffset);
    final daysAway = DateTime.utc(day.year, day.month, day.day)
        .difference(DateTime.utc(today.year, today.month, today.day))
        .inDays;
    if (daysAway == 0) return formatTime(time);
    if (daysAway == 1) return 'Tomorrow, ${formatTime(time)}';
    return formatDateTime(time);
  }

  /// "4 Oct, 05:54 PM" in Colombo time, or an empty string when there is no time.
  static String formatDateTime(DateTime? time) {
    if (time == null) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final local = time.toUtc().add(_colomboOffset);
    return '${local.day} ${months[local.month - 1]}, ${formatTime(time)}';
  }

  /// "Just now", "12 mins ago", "3 hours ago", "Yesterday" or "5 days ago"; the
  /// date itself ("12 Sep") once it is over a week old. [now] is for tests.
  static String formatAgo(DateTime? time, {DateTime? now}) {
    if (time == null) return '';
    final current = (now ?? DateTime.now()).toUtc();
    final diff = current.difference(time.toUtc());
    if (diff.inSeconds < 60) return 'Just now';
    if (diff.inMinutes < 60) {
      final m = diff.inMinutes;
      return m == 1 ? '1 min ago' : '$m mins ago';
    }
    if (diff.inHours < 24) {
      final h = diff.inHours;
      return h == 1 ? '1 hour ago' : '$h hours ago';
    }
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final local = time.toUtc().add(_colomboOffset);
    return '${local.day} ${months[local.month - 1]}';
  }

  /// "02h 15m", "25m", or "<1m" for a span given in seconds.
  static String formatDuration(int seconds) {
    if (seconds < 60) return '<1m';
    final hours = seconds ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    if (hours == 0) return '${minutes}m';
    return '${hours.toString().padLeft(2, '0')}h ${minutes.toString().padLeft(2, '0')}m';
  }
}
