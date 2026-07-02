import { PlayerStatsTreeSchema } from "../src/core/ApiSchemas";
import { GameType } from "../src/core/game/Game";
import {
  GameInfoSchema,
  IntentSchema,
  OpenToPublicIntentSchema,
  PublicGamesSchema,
} from "../src/core/Schemas";

// Schema coverage for the "open custom lobbies to the public" feature.
// These are pure zod parses (no DOM), so they exercise the wire contract that
// carries a lobby's public visibility from host -> server -> joining clients.

describe("OpenToPublicIntentSchema", () => {
  it("accepts opening under each public category", () => {
    for (const publicGameType of ["ffa", "team", "special"] as const) {
      const result = OpenToPublicIntentSchema.safeParse({
        type: "open_to_public",
        publicGameType,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts null to close the lobby to the public", () => {
    const result = OpenToPublicIntentSchema.safeParse({
      type: "open_to_public",
      publicGameType: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown public category", () => {
    const result = OpenToPublicIntentSchema.safeParse({
      type: "open_to_public",
      publicGameType: "duos",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing publicGameType (undefined is not null)", () => {
    const result = OpenToPublicIntentSchema.safeParse({
      type: "open_to_public",
    });
    expect(result.success).toBe(false);
  });

  it("is part of the Intent discriminated union", () => {
    const result = IntentSchema.safeParse({
      type: "open_to_public",
      publicGameType: "ffa",
    });
    expect(result.success).toBe(true);
  });
});

describe("GameInfoSchema.openCustomType", () => {
  const base = { gameID: "abcd1234", serverTime: 1 };

  it("accepts a non-null open custom type", () => {
    const result = GameInfoSchema.safeParse({
      ...base,
      openCustomType: "team",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null (closed) and omission (legacy payloads)", () => {
    expect(
      GameInfoSchema.safeParse({ ...base, openCustomType: null }).success,
    ).toBe(true);
    expect(GameInfoSchema.safeParse(base).success).toBe(true);
  });
});

describe("PublicGamesSchema.openLobbies", () => {
  const lobby = {
    gameID: "abcd1234",
    numClients: 1,
    publicGameType: "ffa" as const,
  };

  // The server always populates every scheduled-game bucket (see
  // MasterLobbyService.getAllLobbies), so games carries all three categories.
  const emptyGames = { ffa: [], team: [], special: [] };

  it("carries the open custom lobby list alongside scheduled games", () => {
    const result = PublicGamesSchema.safeParse({
      serverTime: 1,
      games: emptyGames,
      openLobbies: [lobby],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.openLobbies).toHaveLength(1);
    }
  });

  it("stays valid when openLobbies is omitted (backwards compatible)", () => {
    const result = PublicGamesSchema.safeParse({
      serverTime: 1,
      games: emptyGames,
    });
    expect(result.success).toBe(true);
  });
});

describe("Custom game type", () => {
  it("exposes a dedicated Custom game type", () => {
    expect(GameType.Custom).toBe("Custom");
  });

  it("tracks Custom stats in the player stats tree", () => {
    const result = PlayerStatsTreeSchema.safeParse({ Custom: {} });
    expect(result.success).toBe(true);
  });
});
