import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsService extends ChangeNotifier {
  static final SettingsService _instance = SettingsService._internal();
  factory SettingsService() => _instance;
  SettingsService._internal();

  late SharedPreferences _prefs;

  bool _isAudioEnabled = true;
  String _currentLanguage = 'tr';
  bool _isDarkMode = true;
  bool _isInitialized = false;

  bool get isAudioEnabled => _isAudioEnabled;
  String get currentLanguage => _currentLanguage;
  bool get isDarkMode => _isDarkMode;
  bool get isInitialized => _isInitialized;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    _isAudioEnabled = _prefs.getBool('isAudioEnabled') ?? true;
    _currentLanguage = _prefs.getString('currentLanguage') ?? 'tr';
    _isDarkMode = _prefs.getBool('isDarkMode') ?? true;
    _isInitialized = true;
    notifyListeners();
  }

  Future<void> toggleAudio() async {
    _isAudioEnabled = !_isAudioEnabled;
    await _prefs.setBool('isAudioEnabled', _isAudioEnabled);
    notifyListeners();
  }

  Future<void> setLanguage(String lang) async {
    _currentLanguage = lang;
    await _prefs.setString('currentLanguage', lang);
    notifyListeners();
  }

  Future<void> toggleTheme() async {
    _isDarkMode = !_isDarkMode;
    await _prefs.setBool('isDarkMode', _isDarkMode);
    notifyListeners();
  }
}
