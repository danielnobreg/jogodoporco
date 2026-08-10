using GameEngine.Domain;
using MassTransit;
using SharedContracts;

namespace GameEngine.Services;

public class BotService
{
    private readonly GameStateStore _store;
    private readonly GameLogicService _logic;
    private readonly IPublishEndpoint _publishEndpoint;

    public BotService(GameStateStore store, GameLogicService logic, IPublishEndpoint publishEndpoint)
    {
        _store = store;
        _logic = logic;
        _publishEndpoint = publishEndpoint;
    }

    public void TriggerBotCheck(Guid gameId)
    {
        _ = Task.Run(() => ProcessBotActionsAsync(gameId));
    }

    private async Task ProcessBotActionsAsync(Guid gameId)
    {
        try
        {
            var state = _store.Obter(gameId);
            if (state == null) return;

            if (state.Phase == "Playing")
            {
                var activeId = state.CurrentTurnPlayerId;

                // Check if current turn belongs to a bot
                if (state.BotPlayerIds.Contains(activeId))
                {
                    await Task.Delay(Random.Shared.Next(700, 1200));

                    lock (state)
                    {
                        if (state.Phase != "Playing" || state.CurrentTurnPlayerId != activeId)
                            return;
                    }

                    var botHand = state.Hands[activeId];

                    // 1. If Bot has 9 cards, it needs to DRAW
                    if (botHand.Count == 9)
                    {
                        string source = "deck";
                        if (state.DiscardPile.Count > 0)
                        {
                            var topDiscard = state.DiscardPile.Last();
                            if (botHand.Any(c => c.Value == topDiscard.Value))
                            {
                                source = "pile";
                            }
                        }

                        var updated1 = _logic.ProcessarCompraDeCarta(gameId, activeId, source);
                        await PublishState(updated1);

                        await Task.Delay(Random.Shared.Next(800, 1300));
                        state = updated1;
                    }

                    // 2. If Bot has 10 cards, it needs to PASS
                    if (state.Phase == "Playing" && state.Hands.TryGetValue(activeId, out var currentHand) && currentHand.Count == 10)
                    {
                        var trios = GameLogicService.EncontrarTodosOsTrios(currentHand);
                        var cardsInTrios = trios.SelectMany(t => t).ToList();

                        // Candidate card to pass: not in a trio, and not forbidden (LastPassedCard)
                        var candidate = currentHand.FirstOrDefault(c =>
                            !cardsInTrios.Any(tc => tc.Suit == c.Suit && tc.Value == c.Value) &&
                            !(state.LastPassedCard != null && state.LastPassedCardToPlayerId == activeId && state.LastPassedCard.Suit == c.Suit && state.LastPassedCard.Value == c.Value)
                        ) ?? currentHand.FirstOrDefault(c =>
                            !(state.LastPassedCard != null && state.LastPassedCardToPlayerId == activeId && state.LastPassedCard.Suit == c.Suit && state.LastPassedCard.Value == c.Value)
                        ) ?? currentHand[0];

                        var currentIndex = state.PlayerIds.IndexOf(activeId);
                        var nextPlayerId = state.PlayerIds[(currentIndex + 1) % state.PlayerIds.Count];

                        var updated2 = _logic.ProcessarPassagemDeCarta(gameId, activeId, nextPlayerId, candidate);
                        await PublishState(updated2);

                        // If the next turn player is ALSO a bot, trigger next bot turn!
                        if (updated2.BotPlayerIds.Contains(updated2.CurrentTurnPlayerId))
                        {
                            TriggerBotCheck(gameId);
                        }
                    }
                }
            }
            else if (state.Phase == "Slapping")
            {
                var unslappedBots = state.BotPlayerIds
                    .Where(bId => !state.SlapOrder.Any(s => s.PlayerId == bId))
                    .ToList();

                foreach (var botId in unslappedBots)
                {
                    var delay = Random.Shared.Next(350, 1100);
                    _ = Task.Run(async () =>
                    {
                        await Task.Delay(delay);
                        lock (state)
                        {
                            if (state.Phase != "Slapping" || state.SlapOrder.Any(s => s.PlayerId == botId))
                                return;
                        }
                        var updated = _logic.ProcessarBatida(gameId, botId, DateTime.UtcNow);
                        await PublishState(updated);
                    });
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[BotEngine] Erro ao processar jogada do bot: {ex.Message}");
        }
    }

    private async Task PublishState(GameState state)
    {
        await _publishEndpoint.Publish(new GameStateUpdated(
            state.GameId,
            state.Phase,
            state.Hands.ToDictionary(h => h.Key, h => h.Value.Count),
            state.CurrentTurnPlayerId,
            state.Hands,
            state.LastPassedCard,
            state.LastPassedCardToPlayerId,
            state.LastRoundLoserId,
            state.DrawPile.Count,
            state.DiscardPile.LastOrDefault(),
            state.SlapOrder.Select(s => new SlapInfo(s.PlayerId, s.Timestamp)).ToList()
        ));
    }
}
