import 'package:flutter/material.dart';

import 'tokens.dart';

const _radius = BorderRadius.all(Radius.circular(8));
const _controlHeight = 48.0;

extension PaletteContext on BuildContext {
  Palette get palette => Theme.of(this).brightness == Brightness.dark
      ? Palette.dark
      : Palette.light;
}

ThemeData buildTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final p = dark ? Palette.dark : Palette.light;
  // Light screens sit on white and use the tint for wells; dark screens sit
  // on the ground and lift surfaces by lightness.
  final page = dark ? p.ground : p.surface;

  final scheme = ColorScheme(
    brightness: brightness,
    primary: p.primary,
    onPrimary: p.onPrimary,
    secondary: p.accent,
    onSecondary: p.onAccent,
    error: p.negative,
    onError: dark ? Colors.black : Colors.white,
    surface: page,
    onSurface: p.text,
    onSurfaceVariant: p.muted,
    surfaceContainer: p.raised,
    outline: p.control,
    outlineVariant: p.border,
  );

  final text = _textTheme(p);
  final controlShape = const RoundedRectangleBorder(borderRadius: _radius);
  final controlSize = const Size(64, _controlHeight);

  OutlineInputBorder inputBorder(Color color, [double width = 1]) =>
      OutlineInputBorder(
        borderRadius: _radius,
        borderSide: BorderSide(color: color, width: width),
      );

  return ThemeData(
    colorScheme: scheme,
    fontFamily: fontSans,
    textTheme: text,
    scaffoldBackgroundColor: page,
    splashFactory: InkRipple.splashFactory,
    dividerTheme: DividerThemeData(color: p.border, thickness: 1, space: 1),
    appBarTheme: AppBarTheme(
      backgroundColor: page,
      foregroundColor: p.text,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
      titleTextStyle: text.titleMedium,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: controlSize,
        shape: controlShape,
        textStyle: text.labelLarge,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: controlSize,
        shape: controlShape,
        foregroundColor: p.text,
        side: BorderSide(color: p.control),
        textStyle: text.labelLarge,
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        shape: controlShape,
        foregroundColor: p.text,
        textStyle: text.labelLarge,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      floatingLabelBehavior: FloatingLabelBehavior.never,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
      hintStyle: text.bodyLarge?.copyWith(color: p.muted),
      border: inputBorder(p.control),
      enabledBorder: inputBorder(p.control),
      focusedBorder: inputBorder(p.text, 1.5),
      errorBorder: inputBorder(p.negative),
      focusedErrorBorder: inputBorder(p.negative, 1.5),
    ),
    cardTheme: CardThemeData(
      color: page,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: _radius,
        side: BorderSide(color: p.border),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: page,
      surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(12)),
      ),
      titleTextStyle: text.titleLarge,
      contentTextStyle: text.bodyLarge?.copyWith(color: p.muted),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: page,
      selectedColor: p.active,
      checkmarkColor: p.text,
      labelStyle: text.bodyMedium,
      side: BorderSide(color: p.control),
      shape: controlShape,
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        shape: WidgetStatePropertyAll(controlShape),
        side: WidgetStatePropertyAll(BorderSide(color: p.control)),
        textStyle: WidgetStatePropertyAll(text.labelLarge),
        foregroundColor: WidgetStatePropertyAll(p.text),
        backgroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? p.active : page,
        ),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: page,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      indicatorColor: p.active,
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          size: 22,
          color: states.contains(WidgetState.selected) ? p.text : p.muted,
        ),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => states.contains(WidgetState.selected)
            ? text.bodySmall?.copyWith(fontWeight: FontWeight.w500)
            : text.bodySmall?.copyWith(color: p.muted),
      ),
    ),
  );
}

TextTheme _textTheme(Palette p) {
  TextStyle style(double size, double height, FontWeight weight) => TextStyle(
    fontFamily: fontSans,
    fontSize: size,
    height: height / size,
    fontWeight: weight,
    color: p.text,
    letterSpacing: size >= 20 ? -0.02 * size : 0,
  );

  return TextTheme(
    headlineMedium: style(28, 32, FontWeight.w600),
    titleLarge: style(20, 26, FontWeight.w600),
    titleMedium: style(16, 24, FontWeight.w600),
    bodyLarge: style(16, 24, FontWeight.w400),
    bodyMedium: style(14, 20, FontWeight.w400),
    bodySmall: style(12, 16, FontWeight.w400),
    labelLarge: style(14, 20, FontWeight.w500),
  );
}
