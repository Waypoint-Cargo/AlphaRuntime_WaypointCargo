import 'package:flutter/material.dart';
import '../modules/loader/home/screens/loader_home_screen.dart';
import '../modules/loader/report_issues/screens/issue_details_screen.dart';
import '../modules/loader/report_issues/screens/report_issue_screen.dart';
import '../modules/loader/task/screens/start_loading_screen.dart';
import '../modules/loader/task/screens/task_details.dart';
import '../modules/loader/task/screens/task_screens.dart';
import '../modules/loader/task/screens/verify_loading_screen.dart';

class AppRoutes {
  static const String loaderHome = '/loader-home';
  static const String pendingTasks = '/pending-tasks';
  static const String startLoading = '/start-loading';
  static const String verifyLoading = '/verify-loading';
  static const String verifyItems = '/verify-items';
  static const String taskDetails = '/task-details';
  static const String reportIssue = '/report-issue';
  static const String reportShortfall = '/report-shortfall';
  static const String issueDetails = '/issue-details';
  static const String reportedIssues = '/reported-issues';
  static const String driverHome = '/driver-home';
  static const String login = '/login';
  static const String signUp = '/sign-up';
  static const String forgotPassword = '/forgot-password';
  static const String profile = '/profile';
  static const String notifications = '/notifications';

  static Map<String, WidgetBuilder> get routes => {
        loaderHome: (context) => const LoaderHomeScreen(),
        pendingTasks: (context) => const PendingTasksScreen(),
        startLoading: (context) => const StartLoadingScreen(),
        verifyLoading: (context) => const VerifyLoadingScreen(),
        verifyItems: (context) => const StartLoadingScreen(),
        taskDetails: (context) => const TaskDetailsScreen(),
        reportIssue: (context) => const ReportLoadingIssueScreen(),
        reportShortfall: (context) => const ReportLoadingIssueScreen(),
        issueDetails: (context) => const IssueDetailsScreen(),
        reportedIssues: (context) => const IssueDetailsScreen(),
      };
}
