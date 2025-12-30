'use client'

import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query } from 'firebase/firestore';
import { dbClient } from '@/lib/firebaseClient';

/**
 * Represents the current state of a player in the game.
 *
 * This type is synchronized in real-time with Firebase Firestore and reflects
 * the player's position, combat status, vital statistics, and inventory.
 */
export type PlayerState = {
  /** Unique identifier for the player (matches Firestore document ID) */
  id: string;

  /** ID of the map node where the player is currently located */
  currentNode: string;

  /**
   * Current activity status of the player:
   * - `IDLE`: Not performing any action, can move or use items
   * - `MOVING`: Currently in transit between nodes (temporary state)
   * - `IN_COMBAT`: Engaged in combat with an enemy
   * - `DEAD`: Player has been defeated (HP reached 0)
   */
  status: "IDLE" | "MOVING" | "IN_COMBAT" | "DEAD";

  /**
   * Player's vital statistics
   * - `hp`: Health Points (0-100). Reduced by enemy attacks, reaching 0 results in DEAD status
   * - `san`: Sanity Points (0-100). Represents mental state, may be affected by events
   */
  stats: { hp: number; san: number };

  /**
   * Array of item IDs currently in the player's inventory.
   * Items can be used via `useItem()` action to affect stats or game state.
   */
  inventory: string[];
};

/**
 * Represents the current state of an enemy NPC in the game.
 *
 * Enemies move autonomously between nodes and can engage players in combat.
 */
export type EnemyState = {
  /** Unique identifier for the enemy (matches Firestore document ID) */
  id: string;

  /** ID of the map node where the enemy is currently located */
  currentNode: string;

  /**
   * Enemy type identifier (e.g., "Freddy", "Bonnie").
   * Determines enemy appearance and potentially behavior/difficulty.
   */
  type: string;

  /**
   * Enemy's current health points.
   * Reduced by successful player attacks. Enemy is removed when HP reaches 0.
   */
  hp: number;
};

/**
 * Real-time game state synchronization hook for multiplayer horror game.
 *
 * This hook establishes Firebase Firestore listeners to synchronize game state
 * in real-time across all connected clients. It tracks the current player's state,
 * all other players in the game, and all enemy positions/states.
 *
 * ## How It Works
 *
 * The hook sets up two persistent Firestore listeners:
 * 1. **Players Collection**: Monitors `/games/{gameId}/players` for all player states
 * 2. **Enemies Collection**: Monitors `/games/{gameId}/enemies` for all enemy states
 *
 * These listeners remain active for the component's lifetime and automatically
 * update local state when any changes occur in the database, ensuring all clients
 * see the same game state with minimal latency.
 *
 * ## Memory Management
 *
 * The hook properly cleans up listeners when the component unmounts or when
 * `gameId`/`playerId` changes, preventing memory leaks and unnecessary network traffic.
 *
 * @param gameId - Unique identifier for the game session. If empty, no listeners are created.
 * @param playerId - Unique identifier for the current player. If empty, no listeners are created.
 *
 * @returns Game state object containing:
 * - `player`: Current player's state, or `null` if not yet loaded or player doesn't exist
 * - `allPlayers`: Array of all players in the game (including current player)
 * - `enemies`: Array of all active enemies in the game
 * - `isCombat`: Convenience boolean indicating if current player is in combat (`player.status === 'IN_COMBAT'`)
 * - `loading`: `true` until the initial player data snapshot is received
 *
 * @example
 * ```tsx
 * function GameBoard() {
 *   const { player, allPlayers, enemies, isCombat, loading } = useGame('game_123', 'player_456');
 *
 *   if (loading) return <div>Loading game state...</div>;
 *   if (!player) return <div>Player not found in this game</div>;
 *
 *   return (
 *     <div>
 *       <h1>HP: {player.stats.hp}</h1>
 *       {isCombat && <CombatUI />}
 *       <PlayerList players={allPlayers} />
 *       <EnemyList enemies={enemies} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Conditional rendering based on game state
 * const { player, enemies } = useGame(gameId, playerId);
 *
 * const enemiesAtMyNode = enemies.filter(e => e.currentNode === player?.currentNode);
 * const isUnderThreat = enemiesAtMyNode.length > 0;
 * ```
 *
 * @remarks
 * - **Performance**: Each active hook instance creates 2 real-time listeners.
 *   For games with many players/enemies, consider memoizing derived state.
 * - **Network**: Firestore listeners use persistent WebSocket connections.
 *   The hook automatically manages connection lifecycle.
 * - **Race Conditions**: Initial `loading` state prevents rendering with stale data.
 *   Always check `loading === false` before using player/enemy data.
 * - **Error Handling**: This hook does not handle Firestore errors. Consider
 *   wrapping in error boundaries or adding `onSnapshot` error callbacks.
 *
 * @see {@link PlayerState} for player data structure
 * @see {@link EnemyState} for enemy data structure
 */
export function useGame(gameId: string, playerId: string) {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerState[]>([]);
  const [enemies, setEnemies] = useState<EnemyState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guard clause: Don't set up listeners if required IDs are missing
    if (!gameId || !playerId) return;

    // Listener 1: Monitor all players in this game session
    const playersRef = collection(dbClient, 'games', gameId, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      // Convert Firestore documents to PlayerState objects
      const playersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PlayerState));
      setAllPlayers(playersList);

      // Extract the current player's state from the full player list
      const me = playersList.find(p => p.id === playerId);
      if (me) setPlayer(me);

      // Mark loading complete after first snapshot
      setLoading(false);
    });

    // Listener 2: Monitor all enemies in this game session
    const enemiesRef = collection(dbClient, 'games', gameId, 'enemies');
    const unsubEnemies = onSnapshot(enemiesRef, (snapshot) => {
      // Convert Firestore documents to EnemyState objects
      const enemiesList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EnemyState));
      setEnemies(enemiesList);
    });

    // Cleanup function: Unsubscribe from both listeners when effect re-runs or component unmounts
    return () => {
      unsubPlayers();
      unsubEnemies();
    };
  }, [gameId, playerId]);

  // Derived state: Convenience flag for combat status
  const isCombat = player?.status === 'IN_COMBAT';

  return { player, allPlayers, enemies, isCombat, loading };
}