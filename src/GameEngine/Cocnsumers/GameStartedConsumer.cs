using System.Linq;
using GameEngine.Services;
using MassTransit;
using SharedContracts;

namespace GameEngine.Consumers;

public class GameStartedConsumer : IConsumer<GameStarted>
{
    private readonly GameLogicService _logic;
    private readonly BotService _botService;

    public GameStartedConsumer(GameLogicService logic, BotService botService)
    {
        _logic = logic;
        _botService = botService;
    }

    // Consume é chamado automaticamente pelo MassTransit quando a mensagem chega
    public async Task Consume(ConsumeContext<GameStarted> context)
    {
        var msg = context.Message;
        var state = _logic.IniciarPartida(msg.GameId, msg.PlayerIds, msg.BotPlayerIds);

        Console.WriteLine($"[GameEngine] Partida {msg.GameId} iniciada com {msg.PlayerIds.Count} jogadores");

        await context.Publish(new GameStateUpdated(
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
            null
        ));

        _botService.TriggerBotCheck(msg.GameId);
    }
}