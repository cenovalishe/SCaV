/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: hooks/useGame.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: React hook for real-time Firebase subscriptions to game state
 *
 * DESCRIPTION:
 *   This hook manages all real-time Firebase subscriptions for the SCaV game,
 *   providing reactive state updates for players, enemies, and night cycle data.
 *   It implements 6 independent Firebase listeners with proper cleanup and
 *   automatic initialization logic.
 *
 * ARCHITECTURE:
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │                        useGame Hook                             │
 *   ├─────────────────────────────────────────────────────────────────┤
 *   │ Subscription 1: Current Player (onSnapshot)                     │
 *   │ Subscription 2: All Players (polling every 5s)                  │
 *   │ Subscription 3: Enemies (onSnapshot)                            │
 *   │ Subscription 4: Global Game Document (onSnapshot)               │
 *   │ Subscription 5: Auto-initialization trigger (reactive)          │
 *   │ Subscription 6: Night cycle value sync (reactive)               │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * KEY FEATURES:
 *   • Real-time player state synchronization
 *   • Automatic night cycle initialization on manual activation
 *   • Firebase values as source of truth (no client-side calculations)
 *   • Proper subscription cleanup on unmount
 *   • Backward compatibility for field name changes
 *
 * USAGE EXAMPLE:
 *   ```tsx
 *   const { player, allPlayers, enemies, nightCycle, calculatedNight } =
 *     useGame('game_alpha', 'player_123');
 *
 *   if (loading) return <Spinner />;
 *   return <GameBoard player={player} enemies={enemies} />;
 *   ```
 *
 * FIREBASE SCHEMA:
 *   games/{gameId}
 *     ├─ globalNightCycle: GlobalNightCycle
 *     ├─ players/{playerId}: PlayerState
 *     └─ enemies/{enemyId}: AnimatronicState
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2026-01-01 | VERSION: 2.3.0 (Firebase values = source of truth)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { dbClient } from '@/lib/firebaseClient';
import { PlayerState, AnimatronicState, GlobalNightCycle } from '@/lib/types';
// Убран calculateNightAndHour - теперь значения берутся напрямую из Firebase
import { syncNightCycle } from '@/app/actions/nightCycleActions';

/**
 * Default night cycle state used when no data is available from Firebase.
 *
 * @constant
 * @type {GlobalNightCycle}
 */
const DEFAULT_NIGHT_CYCLE: GlobalNightCycle = {
  isActive: false,
  currentNight: 1,
  currentHour: 1,
  startedAt: null,
  timerEndAt: null,
  lastHourUpdateAt: null,
  lastNightUpdateAt: null
};

/**
 * Main game state hook that manages real-time Firebase subscriptions.
 *
 * This hook establishes 6 concurrent Firebase listeners and reactive effects:
 * 1. Current player document (real-time via onSnapshot)
 * 2. All players collection (polling every 5 seconds)
 * 3. Enemies collection (real-time via onSnapshot)
 * 4. Global game document for night cycle (real-time via onSnapshot)
 * 5. Auto-initialization on manual night cycle activation
 * 6. Calculated night/hour sync from Firebase values
 *
 * **IMPORTANT**: All subscriptions are cleaned up on unmount or dependency changes
 * to prevent memory leaks and orphaned listeners.
 *
 * @param {string} gameId - The unique game identifier (e.g., "game_alpha")
 * @param {string} playerId - The current player's unique identifier
 *
 * @returns {Object} Game state object
 * @returns {PlayerState | null} returns.player - Current player's state (null during load)
 * @returns {PlayerState[]} returns.allPlayers - Array of all players in the game
 * @returns {AnimatronicState[]} returns.enemies - Array of all enemy animatronics
 * @returns {boolean} returns.loading - Loading state (true until first player load)
 * @returns {GlobalNightCycle} returns.nightCycle - Global night cycle state from Firebase
 * @returns {number} returns.calculatedNight - Current night number (synced from Firebase)
 * @returns {number} returns.calculatedHour - Current hour number (synced from Firebase)
 *
 * @example
 * ```tsx
 * function GameComponent() {
 *   const { player, enemies, nightCycle, loading } = useGame('game_alpha', 'player_1');
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <PlayerInfo player={player} />
 *       <NightDisplay night={nightCycle.currentNight} hour={nightCycle.currentHour} />
 *       <EnemyList enemies={enemies} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useGame(gameId: string, playerId: string) {
  /**
   * Current player's state synchronized from Firebase.
   * Null during initial load, populated by Subscription 1.
   */
  const [player, setPlayer] = useState<PlayerState | null>(null);

  /**
   * Array of all players in the game.
   * Updated via polling every 5 seconds (Subscription 2).
   */
  const [allPlayers, setAllPlayers] = useState<PlayerState[]>([]);

  /**
   * Array of all enemy animatronics in the game.
   * Real-time synchronized via onSnapshot (Subscription 3).
   */
  const [enemies, setEnemies] = useState<AnimatronicState[]>([]);

  /**
   * Loading state for the current player.
   * True until the first player snapshot is received, then false.
   */
  const [loading, setLoading] = useState(true);

  /**
   * Global night cycle state from Firebase.
   * Contains timing data, current night/hour, and active status.
   * Real-time synchronized via onSnapshot (Subscription 4).
   */
  const [nightCycle, setNightCycle] = useState<GlobalNightCycle>(DEFAULT_NIGHT_CYCLE);

  /**
   * Calculated current night number (1-5).
   * Synchronized directly from Firebase nightCycle.currentNight.
   * Previously computed client-side, now uses server values as source of truth.
   */
  const [calculatedNight, setCalculatedNight] = useState(1);

  /**
   * Calculated current hour number (1-6).
   * Synchronized directly from Firebase nightCycle.currentHour.
   * Previously computed client-side, now uses server values as source of truth.
   */
  const [calculatedHour, setCalculatedHour] = useState(1);

  /**
   * Ref to prevent duplicate auto-initialization of night cycle.
   * Set to true while syncNightCycle() is in progress, preventing concurrent calls.
   * Used in Subscription 5 to detect manual Firebase Console activation.
   */
  const isAutoInitializing = useRef(false);

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * SUBSCRIPTION 1: Current Player Document
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Listens to: games/{gameId}/players/{playerId}
   * Trigger: Runs when gameId or playerId changes
   * Updates: player state, loading state
   * Cleanup: Unsubscribes from onSnapshot listener
   *
   * This subscription provides real-time updates for the current player's state,
   * including position, inventory, stats, and combat status.
   */
  useEffect(() => {
    if (!gameId || !playerId) return;

    const playerRef = doc(dbClient, 'games', gameId, 'players', playerId);
    const unsubscribe = onSnapshot(playerRef, (doc) => {
      if (doc.exists()) {
        setPlayer({ id: doc.id, ...doc.data() } as PlayerState);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameId, playerId]);

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * SUBSCRIPTION 2: All Players Collection (Polling)
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Listens to: games/{gameId}/players (collection)
   * Trigger: Runs when gameId changes
   * Updates: allPlayers state
   * Polling interval: 5000ms (5 seconds)
   * Cleanup: Clears interval timer
   *
   * Uses polling instead of real-time subscription to reduce Firebase read costs.
   * Fetches all players via getDocs() and updates state periodically.
   */
  useEffect(() => {
    if (!gameId) return;

    const fetchPlayers = async () => {
      const playersRef = collection(dbClient, 'games', gameId, 'players');
      const querySnapshot = await getDocs(playersRef);
      const players = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlayerState));
      setAllPlayers(players);
    };

    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);

    return () => clearInterval(interval);
  }, [gameId]);

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * SUBSCRIPTION 3: Enemies Collection
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Listens to: games/{gameId}/enemies (collection)
   * Trigger: Runs when gameId changes
   * Updates: enemies state
   * Cleanup: Unsubscribes from onSnapshot listener
   *
   * Real-time subscription to enemy animatronic positions and states.
   * Critical for rendering enemy positions on the game map and combat encounters.
   */
  useEffect(() => {
    if (!gameId) return;

    const enemiesRef = collection(dbClient, 'games', gameId, 'enemies');
    const unsubscribe = onSnapshot(enemiesRef, (snapshot) => {
      const enemiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnimatronicState));
      setEnemies(enemiesData);
    });

    return () => unsubscribe();
  }, [gameId]);

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * SUBSCRIPTION 4: Global Game Document (Night Cycle)
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Listens to: games/{gameId}
   * Trigger: Runs when gameId changes
   * Updates: nightCycle state
   * Cleanup: Unsubscribes from onSnapshot listener
   *
   * Monitors the global game document for night cycle state changes.
   * Supports backward compatibility by checking both 'globalNightCycle' and
   * 'nightCycle' field names.
   *
   * ERROR HANDLING: Logs errors to console if document read fails.
   */
  useEffect(() => {
    if (!gameId) return;

    // Слушаем документ самой игры (games/game_alpha)
    const gameRef = doc(dbClient, 'games', gameId);

    const unsubscribe = onSnapshot(gameRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        // ★ FIX: Поддержка обоих имён полей для совместимости
        const cycleData = data.globalNightCycle || data.nightCycle;
        if (cycleData) {
          setNightCycle(cycleData);
        }
      }
    }, (error) => {
        console.error("Error listening to game document:", error);
    });

    return () => unsubscribe();
  }, [gameId]);

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * SUBSCRIPTION 5: Auto-Initialization Trigger
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Listens to: nightCycle.isActive, nightCycle.startedAt (reactive)
   * Trigger: Runs when gameId, isActive, or startedAt changes
   * Updates: Calls syncNightCycle() server action
   * Cleanup: None (reactive effect)
   *
   * CRITICAL FIX: Detects manual night cycle activation in Firebase Console.
   * When isActive=true but startedAt=null (manual toggle), automatically
   * initializes the night cycle by calling syncNightCycle().
   *
   * RACE CONDITION PREVENTION:
   *   Uses isAutoInitializing ref to prevent duplicate concurrent calls.
   *   The ref is set to true during initialization and reset after completion.
   *
   * USE CASE: Allows admins to activate night cycle via Firebase Console
   * without needing to manually set all timestamp fields.
   */
  useEffect(() => {
    if (!gameId) return;

    // Проверяем условие: isActive=true и startedAt=null (ручное переключение)
    if (nightCycle.isActive && !nightCycle.startedAt && !isAutoInitializing.current) {
      isAutoInitializing.current = true;

      console.log('[NightCycle] Detected manual activation, auto-initializing...');

      syncNightCycle(gameId)
        .then((result) => {
          console.log('[NightCycle] Auto-initialization result:', result);
          isAutoInitializing.current = false;
        })
        .catch((error) => {
          console.error('[NightCycle] Auto-initialization error:', error);
          isAutoInitializing.current = false;
        });
    }
  }, [gameId, nightCycle.isActive, nightCycle.startedAt]);

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * SUBSCRIPTION 6: Night/Hour Value Sync
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Listens to: nightCycle.currentNight, nightCycle.currentHour (reactive)
   * Trigger: Runs when currentNight or currentHour changes in Firebase
   * Updates: calculatedNight, calculatedHour states
   * Cleanup: None (reactive effect)
   *
   * CRITICAL FIX: Synchronizes calculated values directly from Firebase.
   * Previously, night/hour were computed client-side, causing desync issues.
   * Now Firebase values are the single source of truth.
   *
   * BENEFIT: Manual changes to currentNight/currentHour in Firebase Console
   * are immediately reflected in the UI without requiring page refresh.
   *
   * FALLBACK: Defaults to 1 if Firebase values are null/undefined.
   */
  useEffect(() => {
    setCalculatedNight(nightCycle.currentNight || 1);
    setCalculatedHour(nightCycle.currentHour || 1);
  }, [nightCycle.currentNight, nightCycle.currentHour]);

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * RETURN VALUE
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Returns an object containing all synchronized game state:
   *
   * @property {PlayerState | null} player - Current player (null during load)
   * @property {PlayerState[]} allPlayers - All players in game (updated every 5s)
   * @property {AnimatronicState[]} enemies - All enemies (real-time)
   * @property {boolean} loading - Loading state (false after first player load)
   * @property {GlobalNightCycle} nightCycle - Global night cycle state (real-time)
   * @property {number} calculatedNight - Current night (1-5, synced from Firebase)
   * @property {number} calculatedHour - Current hour (1-6, synced from Firebase)
   */
  return {
    player,
    allPlayers,
    enemies,
    loading,
    nightCycle,
    calculatedNight,
    calculatedHour
  };
}
