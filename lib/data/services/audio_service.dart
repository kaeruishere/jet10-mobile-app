import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'settings_service.dart';

class AudioService {
  static final AudioService _instance = AudioService._internal();
  factory AudioService() => _instance;
  AudioService._internal();

  Future<void> init() async {
    // Optionally preload sounds
  }

  Future<void> playClick() async {
    if (SettingsService().isAudioEnabled) {
      await _playSound('audio/button_click.mp3');
    }
  }

  Future<void> playCoinFlip() async {
    if (SettingsService().isAudioEnabled) {
      await _playSound('audio/coin_flip.mp3');
    }
  }

  Future<void> playRPS() async {
    if (SettingsService().isAudioEnabled) {
      await _playSound('audio/rock_paper_scissors.mp3');
    }
  }

  Future<void> playUnlock() async {
    if (SettingsService().isAudioEnabled) {
      await _playSound('audio/game_unlock.mp3');
    }
  }

  Future<void> playError() async {
    if (SettingsService().isAudioEnabled) {
      await _playSound('audio/error_boop.mp3');
    }
  }

  Future<void> playWin() async {
    if (SettingsService().isAudioEnabled) {
      await _playSound('audio/win.mp3');
    }
  }

  Future<void> playLose() async {
    if (SettingsService().isAudioEnabled) {
      await _playSound('audio/lose.mp3');
    }
  }

  Future<void> playRockWin() async {
    if (SettingsService().isAudioEnabled) {
      await _playSound('audio/rock_win.mp3');
    }
  }

  Future<void> playPaperWin() async {
    if (SettingsService().isAudioEnabled) {
      await _playSound('audio/paper_win.mp3');
    }
  }

  Future<void> playScissorsWin() async {
    if (SettingsService().isAudioEnabled) {
      await _playSound('audio/scissor_win.mp3');
    }
  }

  Future<void> _playSound(String path) async {
    try {
      final player = AudioPlayer();
      player.onPlayerComplete.listen((_) => player.dispose());
      await player.play(AssetSource(path));
    } catch (e) {
      debugPrint("Audio Error [$path]: $e");
    }
  }

  Future<void> dispose() async {
    // No-op for now. Players are short-lived and disposed on completion.
  }
}
