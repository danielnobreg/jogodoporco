namespace SharedContracts;

// Publicado pelo Gateway quando um jogador passa uma carta
public record CardPassed(
    Guid GameId,
    Guid FromPlayerId,
    Guid ToPlayerId,
    string CardSuit,    // naipe: Copas, Ouros, Espadas, Paus
    string CardValue,   // valor: As, 2, 3... K, Coringa
    DateTime SentAt
);

// Publicado pelo Gateway quando um jogador clica em BATER!
// Timestamp é crítico — determina a ordem das batidas
public record PlayerSlapped(
    Guid GameId,
    Guid PlayerId,
    DateTime Timestamp  // momento exato do clique em UTC
);

// Publicado pelo GameEngine após processar o turno
// Gateway recebe e faz broadcast via SignalR para os clientes
public record SlapInfo(Guid PlayerId, DateTime Timestamp);

public record GameStateUpdated(
    Guid GameId,
    string Phase,           // "Playing", "Slapping", "RoundOver", "GameOver"
    Dictionary<Guid, int> HandSizes,   // quantas cartas cada jogador tem
    Guid? CurrentTurnPlayerId,
    Dictionary<Guid, List<Card>> Hands,
    Card? LastPassedCard = null,
    Guid? LastPassedCardToPlayerId = null,
    Guid? LastRoundLoserId = null,
    int DrawPileCount = 0,
    Card? DiscardPileTop = null,
    List<SlapInfo>? SlapOrder = null
);

// Publicado pelo GameEngine quando a rodada termina
// novo — notifica quando a rodada termina
public record RoundCompleted(
    Guid GameId,
    Guid LoserPlayerId,
    Guid? CoringaHolderId,
    Dictionary<Guid, string> PlayerLetters,
    bool GameOver,
    Guid? GameLoserPlayerId  // se GameOver = true, quem perdeu de vez
);

public record GameStarted(
    Guid GameId,
    List<Guid> PlayerIds,
    List<Guid>? BotPlayerIds = null
);

public record StartNextRound(
    Guid GameId,
    Guid HostId
);

public record PlayerDrawn(
    Guid GameId,
    Guid PlayerId,
    string Source
);

