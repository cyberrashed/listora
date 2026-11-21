import 'package:flutter/material.dart' show DateUtils;
import 'package:intl/intl.dart';

final _wholeDollars = NumberFormat.currency(
  locale: 'en_US',
  symbol: r'$',
  decimalDigits: 0,
);
final _dollarsAndCents = NumberFormat.currency(locale: 'en_US', symbol: r'$');
final _count = NumberFormat.decimalPattern('en_US');
final _date = DateFormat.yMMMd('en_US');
final _monthYear = DateFormat.yMMMM('en_US');
final _time = DateFormat.jm('en_US');
final _monthDay = DateFormat.MMMd('en_US');

/// Whole dollars read cleaner; cents show only when there are some.
String formatDollars(int cents) =>
    (cents % 100 == 0 ? _wholeDollars : _dollarsAndCents).format(cents / 100);

String formatCount(num value) => _count.format(value);

String formatDate(DateTime value) => _date.format(value.toLocal());

String formatMonthYear(DateTime value) => _monthYear.format(value.toLocal());

String formatTime(DateTime value) => _time.format(value.toLocal());

/// A day as a heading in a conversation: "Today", "Yesterday" or the date.
String formatDay(DateTime value, {DateTime? now}) {
  final day = DateUtils.dateOnly(value.toLocal());
  final today = DateUtils.dateOnly((now ?? DateTime.now()).toLocal());
  final days = today.difference(day).inDays;
  if (days == 0) return 'Today';
  if (days == 1) return 'Yesterday';
  return (day.year == today.year ? _monthDay : _date).format(day);
}

/// What someone typed as a dollar amount, in cents, or null when it isn't one.
int? parseDollars(String text) {
  final amount = double.tryParse(text.replaceAll(RegExp(r'[\s,$]'), ''));
  if (amount == null || amount.isNegative) return null;
  return (amount * 100).round();
}

/// A stored price as someone would type it: "4200" or "12.50".
String typedDollars(int? cents) {
  if (cents == null) return '';
  return cents % 100 == 0
      ? '${cents ~/ 100}'
      : (cents / 100).toStringAsFixed(2);
}

/// How long ago, the way a person would say it. Past a week it is the date.
String formatAgo(DateTime value, {DateTime? now}) {
  final elapsed = (now ?? DateTime.now()).difference(value);
  if (elapsed.inMinutes < 1) return 'just now';
  if (elapsed.inHours < 1) return '${elapsed.inMinutes} min ago';
  if (elapsed.inDays < 1) return '${elapsed.inHours} h ago';
  if (elapsed.inDays == 1) return 'yesterday';
  if (elapsed.inDays < 7) return '${elapsed.inDays} days ago';
  return formatDate(value);
}
