import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';

/// Holds what the receiver has drawn and turns it into a PNG for upload.
class SignatureController extends ChangeNotifier {
  final List<List<Offset>> _strokes = [];
  Size _size = Size.zero;

  List<List<Offset>> get strokes => List.unmodifiable(_strokes);
  bool get isEmpty => _strokes.every((stroke) => stroke.length < 2);

  void _start(Offset point) {
    _strokes.add([point]);
    notifyListeners();
  }

  void _extend(Offset point) {
    if (_strokes.isEmpty) return;
    _strokes.last.add(point);
    notifyListeners();
  }

  void clear() {
    _strokes.clear();
    notifyListeners();
  }

  /// The drawing as a black-on-white PNG, twice the size it was drawn at.
  Future<Uint8List> toPng() async {
    final size = _size == Size.zero ? const Size(300, 160) : _size;
    const scale = 2.0;
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder)..scale(scale);
    canvas.drawRect(Offset.zero & size, Paint()..color = Colors.white);
    _paintStrokes(canvas, _strokes, Colors.black);
    final image = await recorder
        .endRecording()
        .toImage((size.width * scale).round(), (size.height * scale).round());
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    return data!.buffer.asUint8List();
  }
}

void _paintStrokes(Canvas canvas, List<List<Offset>> strokes, Color color) {
  final paint = Paint()
    ..color = color
    ..strokeWidth = 2.6
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round
    ..style = PaintingStyle.stroke;
  for (final stroke in strokes) {
    if (stroke.length < 2) continue;
    final path = Path()..moveTo(stroke.first.dx, stroke.first.dy);
    for (final point in stroke.skip(1)) {
      path.lineTo(point.dx, point.dy);
    }
    canvas.drawPath(path, paint);
  }
}

/// A box the receiver signs in with a finger.
class SignaturePad extends StatelessWidget {
  final SignatureController controller;
  final double height;

  const SignaturePad({super.key, required this.controller, this.height = 180});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.divider),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          controller._size = Size(constraints.maxWidth, constraints.maxHeight);
          return GestureDetector(
            behavior: HitTestBehavior.opaque,
            onPanStart: (d) => controller._start(d.localPosition),
            onPanUpdate: (d) => controller._extend(d.localPosition),
            child: ListenableBuilder(
              listenable: controller,
              builder: (context, _) => Stack(
                children: [
                  if (controller.isEmpty)
                    const Center(
                      child: Text(
                        'Sign here',
                        style: AppTextStyles.bodySmall,
                      ),
                    ),
                  CustomPaint(
                    size: Size.infinite,
                    painter: _SignaturePainter(controller.strokes),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SignaturePainter extends CustomPainter {
  final List<List<Offset>> strokes;

  _SignaturePainter(this.strokes);

  @override
  void paint(Canvas canvas, Size size) =>
      _paintStrokes(canvas, strokes, AppColors.primaryText);

  @override
  bool shouldRepaint(_SignaturePainter old) => true;
}
