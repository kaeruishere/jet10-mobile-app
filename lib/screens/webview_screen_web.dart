import 'dart:ui_web' as ui;
import 'dart:html' as html;
import 'package:flutter/material.dart';
import '../core/theme.dart';

Widget buildGameView(String url) {
  // Web'de iframe kullan
  final viewId = 'game-iframe-${url.hashCode}';

  // ignore: undefined_prefixed_name
  ui.platformViewRegistry.registerViewFactory(viewId, (int id) {
    final iframe = html.IFrameElement()
      ..src = url
      ..style.border = 'none'
      ..style.width = '100%'
      ..style.height = '100%'
      ..allowFullscreen = true;
    return iframe;
  });

  return HtmlElementView(viewType: viewId);
}
