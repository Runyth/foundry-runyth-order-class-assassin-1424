export type Assassin1424ActorState = Readonly<{
  actorUuid: string;
  assassin: boolean;
  seizeTheMoment: Readonly<{
    actorUuid: string;
    combatUuid: string;
    round: number;
    turn: number;
    sneakAttackUses: number;
    active: true;
  }> | null;
  /** @deprecated Always 0 since v1.0.4; the custom Assassin Strike workflow was removed. */
  pendingAssassinStrikes: 0;
}>;

export type SynchronizationAction = Readonly<{
  type: string;
  identifier?: string;
  itemUuid?: string | null;
  sourceUuid?: string;
  keys?: string[];
}>;

export type SynchronizationReport = Readonly<{
  schemaVersion: 1;
  actorUuid: string;
  dryRun: boolean;
  changed: boolean;
  actions: SynchronizationAction[];
  warnings: Record<string, unknown>[];
  conflicts: Record<string, unknown>[];
}>;

export interface RunythOrderClassAssassin1424Api {
  readonly apiVersion: "1.0.0";
  isReady(): boolean;
  whenReady(): Promise<RunythOrderClassAssassin1424Api>;
  hasAssassin1424Subclass(actor: unknown): boolean;
  /** @deprecated Compatibility alias retained for integrations written before v1.0.3. */
  hasAssassinSubclass(actor: unknown): boolean;
  getActorState(actor: unknown): Assassin1424ActorState;
  syncActor(actor: unknown, options?: { dryRun?: boolean }): Promise<SynchronizationReport>;
  auditActor(actor: unknown): Promise<unknown>;
  activateDisappearingAct(actorOrToken: unknown, options?: Record<string, unknown>): Promise<unknown>;
  activateSeizeTheMoment(actorOrToken: unknown, options?: Record<string, unknown>): Promise<unknown>;
  openManager(options?: { actor?: unknown; position?: Record<string, number>; [key: string]: unknown }): unknown;
}

declare global {
  interface Game {
    modules: Map<string, { api?: RunythOrderClassAssassin1424Api }>;
  }
}
