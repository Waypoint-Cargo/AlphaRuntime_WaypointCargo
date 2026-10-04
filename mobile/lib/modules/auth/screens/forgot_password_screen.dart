import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../widgets/auth_brand_header.dart';
import '../widgets/auth_text_field.dart';
import 'login_screen.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _emailController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _onSendResetLink() {
    if (_formKey.currentState?.validate() ?? false) {
      setState(() {
        _isLoading = true;
      });

      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          setState(() {
            _isLoading = false;
          });

          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Password reset link sent to ${_emailController.text.trim()}',
              ),
              backgroundColor: AppColors.success,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          );

          // Return to login after sending
          Future.delayed(const Duration(seconds: 1), () {
            if (mounted) {
              _onBackToSignIn();
            }
          });
        }
      });
    }
  }

  void _onBackToSignIn() {
    if (Navigator.canPop(context)) {
      Navigator.pop(context);
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 1. Background Image with subtle dark overlay
          Positioned.fill(
            child: Image.asset(
              'assets/images/bg.png',
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  color: AppColors.deepForestGreen,
                );
              },
            ),
          ),
          Positioned.fill(
            child: Container(
              color: AppColors.overlay,
            ),
          ),

          // 2. Scrollable Content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Top Logo Header (WAYPOINT CARGO)
                    const AuthBrandHeader(),

                    const SizedBox(height: 28),

                    // Main White Card
                    _buildForgotPasswordCard(),

                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildForgotPasswordCard() {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(maxWidth: 420),
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(28.0),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2E000000),
            blurRadius: 28,
            offset: Offset(0, 10),
          ),
        ],
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Top Key Badge & Header
            Center(
              child: Column(
                children: [
                  // Dark Green Square with Gold Key Icon
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppColors.deepForestGreen,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x140D302D),
                          blurRadius: 8,
                          offset: Offset(0, 3),
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.vpn_key_rounded,
                        color: AppColors.gold,
                        size: 26,
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  // Title
                  Text(
                    'Forgot your password?',
                    textAlign: TextAlign.center,
                    style: AppTextStyles.heading1.copyWith(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Subtitle
                  Text(
                    "Enter your email and we'll send you a link to reset it.",
                    textAlign: TextAlign.center,
                    style: AppTextStyles.bodySmall.copyWith(
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 26),

            // Work email Label
            Text(
              'Work email',
              style: AppTextStyles.labelLarge.copyWith(
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 8),
            AuthTextField(
              controller: _emailController,
              hintText: 'you@company.com',
              keyboardType: TextInputType.emailAddress,
              prefixIcon: const Icon(
                Icons.mail_outline_rounded,
                size: 20,
                color: AppColors.mutedText,
              ),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return 'Please enter your work email';
                }
                if (!val.contains('@') || !val.contains('.')) {
                  return 'Please enter a valid email address';
                }
                return null;
              },
            ),

            const SizedBox(height: 24),

            // Send Reset Link Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _onSendResetLink,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.deepForestGreen,
                  foregroundColor: AppColors.white,
                  elevation: 2,
                  shadowColor: const Color(0x330D302D),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.white,
                        ),
                      )
                    : const Text(
                        'Send Reset Link',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: AppColors.white,
                        ),
                      ),
              ),
            ),

            const SizedBox(height: 22),

            // Divider with 'or'
            Row(
              children: const [
                Expanded(
                  child: Divider(
                    color: AppColors.divider,
                    thickness: 1,
                  ),
                ),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12.0),
                  child: Text(
                    'or',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.mutedText,
                    ),
                  ),
                ),
                Expanded(
                  child: Divider(
                    color: AppColors.divider,
                    thickness: 1,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Footer: Back to Sign In
            Center(
              child: GestureDetector(
                onTap: _onBackToSignIn,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Icon(
                      Icons.arrow_back_rounded,
                      size: 16,
                      color: AppColors.deepForestGreen,
                    ),
                    SizedBox(width: 6),
                    Text(
                      'Back to Sign In',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForestGreen,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
