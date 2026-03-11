import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme.dart';
import '../models/game_model.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../widgets/jeton_bar.dart';
import '../widgets/game_card.dart';
import 'earn_screen.dart';
import 'webview_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _auth = AuthService();
  final _firestore = FirestoreService();
  int _navIndex = 0;

  @override
  Widget build(BuildContext context) {
    final uid = _auth.currentUser!.uid;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: IndexedStack(
        index: _navIndex,
        children: [
          _buildGameList(uid),
          EarnScreen(uid: uid),
          _buildProfile(uid),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildGameList(String uid) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // App Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                RichText(
                  text: TextSpan(
                    children: [
                      TextSpan(
                        text: 'JET',
                        style: GoogleFonts.orbitron(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: AppColors.neonYellow,
                          shadows: [
                            Shadow(
                              color: AppColors.neonYellow.withOpacity(0.7),
                              blurRadius: 16,
                            ),
                          ],
                        ),
                      ),
                      TextSpan(
                        text: '10',
                        style: GoogleFonts.orbitron(
                          fontSize: 28,
                          fontWeight: FontWeight.w900,
                          color: AppColors.neonOrange,
                          shadows: [
                            Shadow(
                              color: AppColors.neonOrange.withOpacity(0.7),
                              blurRadius: 16,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const Text('⚡', style: TextStyle(fontSize: 24)),
              ],
            ),
          ),

          // Jeton bar
          StreamBuilder<UserModel>(
            stream: _firestore.userStream(uid),
            builder: (_, snap) {
              final jetons = snap.data?.jetons ?? 0;
              return JetonBar(
                jetons: jetons,
                onEarnTap: () => setState(() => _navIndex = 1),
              );
            },
          ),

          // Game list
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
            child: Text(
              'OYUNLAR',
              style: GoogleFonts.orbitron(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.textDim,
                letterSpacing: 3,
              ),
            ),
          ),

          Expanded(
            child: StreamBuilder<List<GameModel>>(
              stream: _firestore.gamesStream(),
              builder: (_, gameSnap) {
                return StreamBuilder<UserModel>(
                  stream: _firestore.userStream(uid),
                  builder: (_, userSnap) {
                    final games = gameSnap.data ?? [];
                    final user = userSnap.data;
                    final unlocked = user?.unlockedGames ?? [];

                    if (games.isEmpty) {
                      return Center(
                        child: Text(
                          'Oyunlar yükleniyor...',
                          style: GoogleFonts.rajdhani(
                            color: AppColors.textDim,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      );
                    }

                    return GridView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.0,
                      ),
                      itemCount: games.length,
                      itemBuilder: (_, i) {
                        final game = games[i];
                        final isUnlocked = unlocked.contains(game.id);

                        return GameCard(
                          game: game,
                          isUnlocked: isUnlocked,
                          onTap: () => _handleGameTap(game, isUnlocked, user),
                        );
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _handleGameTap(GameModel game, bool isUnlocked, UserModel? user) {
    if (game.isFree || isUnlocked) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => WebViewScreen(game: game)),
      );
    } else {
      _showUnlockDialog(game, user);
    }
  }

  void _showUnlockDialog(GameModel game, UserModel? user) {
    final hasEnough = (user?.jetons ?? 0) >= game.cost;

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          game.name,
          style: GoogleFonts.orbitron(
            color: AppColors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Bu oyunu açmak için',
              style: GoogleFonts.rajdhani(
                color: AppColors.textDim,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '🪙 ${game.cost} Jeton',
              style: GoogleFonts.orbitron(
                color: AppColors.neonYellow,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (!hasEnough) ...[
              const SizedBox(height: 8),
              Text(
                'Yetersiz jeton! Önce jeton kazan.',
                style: GoogleFonts.rajdhani(
                  color: AppColors.neonPink,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('İptal',
                style: GoogleFonts.rajdhani(color: AppColors.textDim, fontSize: 15)),
          ),
          if (hasEnough)
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.neonYellow,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () async {
                Navigator.pop(context);
                final uid = _auth.currentUser!.uid;
                final ok = await _firestore.unlockGame(uid, game.id, game.cost);
                if (ok && mounted) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => WebViewScreen(game: game)),
                  );
                }
              },
              child: Text(
                'Kilidi Aç',
                style: GoogleFonts.orbitron(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            )
          else
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.neonOrange,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () {
                Navigator.pop(context);
                setState(() => _navIndex = 1);
              },
              child: Text('Jeton Kazan',
                  style: GoogleFonts.orbitron(fontSize: 12, fontWeight: FontWeight.w700)),
            ),
        ],
      ),
    );
  }

  Widget _buildProfile(String uid) {
    return SafeArea(
      child: StreamBuilder<UserModel>(
        stream: _firestore.userStream(uid),
        builder: (_, snap) {
          final user = snap.data;
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('👤', style: TextStyle(fontSize: 64)),
                const SizedBox(height: 16),
                Text(
                  'JET10 Oyuncusu',
                  style: GoogleFonts.orbitron(
                    color: AppColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '🪙 ${user?.jetons ?? 0} Jeton',
                  style: GoogleFonts.rajdhani(
                    color: AppColors.neonYellow,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '🔓 ${user?.unlockedGames.length ?? 0} Oyun Açık',
                  style: GoogleFonts.rajdhani(
                    color: AppColors.textDim,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildBottomNav() {
    const items = [
      BottomNavigationBarItem(icon: Text('🏠', style: TextStyle(fontSize: 22)), label: 'Ana Sayfa'),
      BottomNavigationBarItem(icon: Text('🪙', style: TextStyle(fontSize: 22)), label: 'Kazan'),
      BottomNavigationBarItem(icon: Text('👤', style: TextStyle(fontSize: 22)), label: 'Profil'),
    ];

    return BottomNavigationBar(
      currentIndex: _navIndex,
      onTap: (i) => setState(() => _navIndex = i),
      items: items,
      selectedLabelStyle: GoogleFonts.rajdhani(fontWeight: FontWeight.w700, fontSize: 11),
      unselectedLabelStyle: GoogleFonts.rajdhani(fontWeight: FontWeight.w600, fontSize: 11),
    );
  }
}