using GameEngine.Services;
using MassTransit;
using SharedContracts;

namespace GameEngine.Consumers;

public class StartNextRoundConsumer : IConsumer<StartNextRound>
{
    private readonly GameLogicService _logic;
    private readonly BotService _botService;

    public StartNextRoundConsumer(GameLogicService logic, BotService botService)
    {
        _logic = logic;
        _botService = botService;
    }

    public async Task Consume(ConsumeContext<StartNextRound> context)
    {
        var msg = context.Message;
        var state = _logic.IniciarNovaRodada(msg.GameId);

        // Publica o estado atualizado para todos os jogadores, iniciando o jogo
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

        Console.WriteLine($"[GameEngine] Próxima rodada iniciada na partida {msg.GameId}, fase: {state.Phase}");
    }
}
