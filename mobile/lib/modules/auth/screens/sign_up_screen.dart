import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/utils/validators.dart';
import '../../../../providers/auth_provider.dart';
import '../widgets/auth_brand_header.dart';
import '../widgets/auth_text_field.dart';
import 'login_screen.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();

  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();
  final FocusNode _phoneFocusNode = FocusNode();

  String _selectedCountryCode = '+94';
  String? _selectedRole;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _agreeToTerms = false;
  bool _isLoading = false;

  final List<String> _countryCodes = ['+94', '+91', '+44'];
  final List<Map<String, String>> _roles = [
    {'value': 'loader', 'label': 'Loader'},
    {'value': 'driver', 'label': 'Driver'},
  ];

  @override
  void initState() {
    super.initState();
    _phoneFocusNode.addListener(() {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _phoneFocusNode.dispose();
    super.dispose();
  }

  Future<void> _onCreateAccount() async {
    FocusScope.of(context).unfocus();

    if (!_agreeToTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please agree to the Terms and Conditions and Privacy Policy.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    if (_formKey.currentState?.validate() ?? false) {
      setState(() {
        _isLoading = true;
      });

      final cleanPhone = _phoneController.text.trim().replaceAll(RegExp(r'[\s-]'), '');
      final fullPhone = cleanPhone.isNotEmpty ? '$_selectedCountryCode$cleanPhone' : '';
      final backendRole = (_selectedRole ?? '').toUpperCase();

      final authProvider = context.read<AuthProvider>();

      final success = await authProvider.register(
        fullName: _fullNameController.text.trim(),
        email: _emailController.text.trim().toLowerCase(),
        phone: fullPhone,
        password: _passwordController.text,
        role: backendRole,
      );

      if (!mounted) return;

      setState(() {
        _isLoading = false;
      });

      if (success) {
        final message = authProvider.lastRegisterResponse?.message ??
            'Registration received. An administrator must approve your account before you can sign in.';

        // Show registration received dialog matching web approval flow
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: AppColors.cardBackground,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            icon: Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppColors.successLight,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.check_circle_outline_rounded,
                color: AppColors.success,
                size: 32,
              ),
            ),
            title: const Text(
              'Registration Received',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: AppColors.deepForestGreen,
              ),
            ),
            content: Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13.5,
                color: AppColors.secondaryText,
                height: 1.4,
              ),
            ),
            actionsAlignment: MainAxisAlignment.center,
            actions: [
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(ctx).pop();
                    _onSignIn();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.gold,
                    foregroundColor: AppColors.deepForestGreen,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Back to Sign In',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      } else {
        String errorMessage = authProvider.errorMessage ?? 'Registration failed. Please try again.';
        if (authProvider.fieldErrors.isNotEmpty) {
          errorMessage = authProvider.fieldErrors.values.first;
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _onSignIn() {
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
                    // Top Brand Logo Header (WAYPOINT CARGO)
                    const AuthBrandHeader(),

                    const SizedBox(height: 24),

                    // Main Sign Up White Card
                    _buildSignUpCard(),

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

  Widget _buildSignUpCard() {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(maxWidth: 440),
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
            // Title & Subtitle
            Center(
              child: Column(
                children: [
                  Text(
                    'Create your Waypoint Cargo\naccount',
                    textAlign: TextAlign.center,
                    style: AppTextStyles.heading1.copyWith(
                      fontSize: 21,
                      fontWeight: FontWeight.w800,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Join our logistics network and keep deliveries moving.',
                    textAlign: TextAlign.center,
                    style: AppTextStyles.bodySmall.copyWith(
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 1. Full name
            _buildFieldLabel('Full name'),
            const SizedBox(height: 7),
            AuthTextField(
              controller: _fullNameController,
              hintText: 'e.g. Tharindu Perera',
              prefixIcon: const Icon(
                Icons.person_outline_rounded,
                size: 20,
                color: AppColors.mutedText,
              ),
              validator: Validators.validateFullName,
            ),

            const SizedBox(height: 16),

            // 2. Work email
            _buildFieldLabel('Work email'),
            const SizedBox(height: 7),
            AuthTextField(
              controller: _emailController,
              hintText: 'you@company.com',
              keyboardType: TextInputType.emailAddress,
              prefixIcon: const Icon(
                Icons.mail_outline_rounded,
                size: 20,
                color: AppColors.mutedText,
              ),
              validator: Validators.validateEmail,
            ),

            const SizedBox(height: 16),

            // 3. Phone number
            _buildFieldLabel('Phone number'),
            const SizedBox(height: 7),
            _buildPhoneField(),

            const SizedBox(height: 16),

            // 4. Password
            _buildFieldLabel('Password'),
            const SizedBox(height: 7),
            AuthTextField(
              controller: _passwordController,
              hintText: 'Create a password',
              obscureText: _obscurePassword,
              prefixIcon: const Icon(
                Icons.lock_outline_rounded,
                size: 20,
                color: AppColors.mutedText,
              ),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  size: 20,
                  color: AppColors.mutedText,
                ),
                onPressed: () {
                  setState(() {
                    _obscurePassword = !_obscurePassword;
                  });
                },
              ),
              validator: Validators.validatePassword,
            ),

            const SizedBox(height: 16),

            // 5. Confirm password
            _buildFieldLabel('Confirm password'),
            const SizedBox(height: 7),
            AuthTextField(
              controller: _confirmPasswordController,
              hintText: 'Re-enter your password',
              obscureText: _obscureConfirmPassword,
              prefixIcon: const Icon(
                Icons.lock_outline_rounded,
                size: 20,
                color: AppColors.mutedText,
              ),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureConfirmPassword
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  size: 20,
                  color: AppColors.mutedText,
                ),
                onPressed: () {
                  setState(() {
                    _obscureConfirmPassword = !_obscureConfirmPassword;
                  });
                },
              ),
              validator: (val) => Validators.validateConfirmPassword(
                val,
                _passwordController.text,
              ),
            ),

            const SizedBox(height: 16),

            // 6. Role (Loader & Driver only)
            _buildFieldLabel('Role'),
            const SizedBox(height: 7),
            _buildRoleDropdown(),

            const SizedBox(height: 16),

            // Terms and Conditions Checkbox
            _buildTermsCheckbox(),

            const SizedBox(height: 22),

            // Create Account Button (Brand Gold CTA)
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _onCreateAccount,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.gold,
                  foregroundColor: AppColors.deepForestGreen,
                  elevation: 1,
                  shadowColor: const Color(0x33EEB82C),
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
                          color: AppColors.deepForestGreen,
                        ),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Text(
                            'Create Account',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.deepForestGreen,
                            ),
                          ),
                          SizedBox(width: 6),
                          Icon(
                            Icons.arrow_forward_rounded,
                            size: 18,
                            color: AppColors.deepForestGreen,
                          ),
                        ],
                      ),
              ),
            ),

            const SizedBox(height: 20),

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

            // Footer: Already have an account? Sign In
            Center(
              child: Wrap(
                alignment: WrapAlignment.center,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  const Text(
                    'Already have an account? ',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.secondaryText,
                    ),
                  ),
                  GestureDetector(
                    onTap: _onSignIn,
                    child: const Text(
                      'Sign In',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForestGreen,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label) {
    return Text(
      label,
      style: AppTextStyles.labelLarge.copyWith(
        fontSize: 13,
      ),
    );
  }

  Widget _buildPhoneField() {
    final isFocused = _phoneFocusNode.hasFocus;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isFocused ? AppColors.deepForestGreen : AppColors.border,
          width: isFocused ? 1.5 : 1.2,
        ),
      ),
      child: Row(
        children: [
          // Left Country Code Dropdown Container
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: const BoxDecoration(
              color: AppColors.mutedBackground,
              borderRadius: BorderRadius.horizontal(left: Radius.circular(8.5)),
              border: Border(
                right: BorderSide(
                  color: AppColors.border,
                  width: 1.2,
                ),
              ),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedCountryCode,
                icon: const Icon(
                  Icons.keyboard_arrow_down_rounded,
                  size: 18,
                  color: AppColors.secondaryText,
                ),
                items: _countryCodes.map((code) {
                  return DropdownMenuItem<String>(
                    value: code,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.phone_outlined,
                          size: 16,
                          color: AppColors.secondaryText,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          code,
                          style: AppTextStyles.labelLarge.copyWith(
                            fontSize: 13.5,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() {
                      _selectedCountryCode = val;
                    });
                  }
                },
              ),
            ),
          ),

          // Right Phone Number Text Field (No inside border)
          Expanded(
            child: TextFormField(
              controller: _phoneController,
              focusNode: _phoneFocusNode,
              keyboardType: TextInputType.phone,
              style: AppTextStyles.bodyMedium.copyWith(
                fontWeight: FontWeight.w500,
              ),
              decoration: const InputDecoration(
                hintText: '77 123 4567',
                hintStyle: TextStyle(
                  fontSize: 14,
                  color: AppColors.mutedText,
                  fontWeight: FontWeight.normal,
                ),
                filled: true,
                fillColor: AppColors.white,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                errorBorder: InputBorder.none,
                focusedErrorBorder: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 13),
              ),
              validator: Validators.validatePhone,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoleDropdown() {
    return DropdownButtonFormField<String>(
      initialValue: _selectedRole,
      hint: const Text(
        'Select your role',
        style: TextStyle(
          fontSize: 14,
          color: AppColors.mutedText,
          fontWeight: FontWeight.normal,
        ),
      ),
      icon: const Icon(
        Icons.keyboard_arrow_down_rounded,
        size: 20,
        color: AppColors.mutedText,
      ),
      decoration: InputDecoration(
        filled: true,
        fillColor: AppColors.white,
        prefixIcon: const Icon(
          Icons.people_outline_rounded,
          size: 20,
          color: AppColors.mutedText,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(
            color: AppColors.border,
            width: 1.2,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(
            color: AppColors.deepForestGreen,
            width: 1.5,
          ),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(
            color: AppColors.error,
            width: 1.2,
          ),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(
            color: AppColors.error,
            width: 1.5,
          ),
        ),
      ),
      items: _roles.map((role) {
        return DropdownMenuItem<String>(
          value: role['value'],
          child: Text(
            role['label']!,
            style: AppTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        );
      }).toList(),
      onChanged: (val) {
        setState(() {
          _selectedRole = val;
        });
      },
      validator: Validators.validateRole,
    );
  }

  Widget _buildTermsCheckbox() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(
          width: 20,
          height: 20,
          child: Checkbox(
            value: _agreeToTerms,
            onChanged: (val) {
              setState(() {
                _agreeToTerms = val ?? false;
              });
            },
            activeColor: AppColors.deepForestGreen,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
            ),
            side: const BorderSide(
              color: AppColors.border,
              width: 1.5,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: GestureDetector(
            onTap: () {
              setState(() {
                _agreeToTerms = !_agreeToTerms;
              });
            },
            child: RichText(
              text: TextSpan(
                style: AppTextStyles.bodySmall.copyWith(
                  fontSize: 12.5,
                ),
                children: [
                  const TextSpan(text: 'I agree to the '),
                  WidgetSpan(
                    alignment: PlaceholderAlignment.baseline,
                    baseline: TextBaseline.alphabetic,
                    child: const Text(
                      'Terms and Conditions',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForestGreen,
                        fontSize: 12.5,
                      ),
                    ),
                  ),
                  const TextSpan(text: ' and '),
                  WidgetSpan(
                    alignment: PlaceholderAlignment.baseline,
                    baseline: TextBaseline.alphabetic,
                    child: const Text(
                      'Privacy Policy',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForestGreen,
                        fontSize: 12.5,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
