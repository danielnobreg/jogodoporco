namespace GameEngine.Domain;

public class GameState
{
    public Guid GameId { get; init; }
    public List<Guid> PlayerIds { get; init; } = new();
    public Dictionary<Guid, List<Card>> Hands { get; set; } = new();
    public Dictionary<Guid, string> PlayerLetters { get; set; } = new();  // "P", "PO"...
    public Guid CurrentTurnPlayerId { get; set; }
    public HashSet<Guid> BotPlayerIds { get; set; } = new();
    public Guid? CoringaHolderId { get; set; }
    public string Phase { get; set; } = "Playing";  // Playing, Slapping, RoundOver, GameOver

    // registra quem já "bateu" e quando — pra determinar a ordem
    public List<(Guid PlayerId, DateTime Timestamp)> SlapOrder { get; set; } = new();

    public Card? LastPassedCard { get; set; }
    public Guid? LastPassedCardToPlayerId { get; set; }
    public Guid? LastRoundLoserId { get; set; }

    public List<Card> DrawPile { get; set; } = new();
    public List<Card> DiscardPile { get; set; } = new();

    public const string LetrasCompletas = "PORCO";
}