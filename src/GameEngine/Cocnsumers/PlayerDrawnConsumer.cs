using GameEngine.Services;
using MassTransit;
using SharedContracts;

namespace GameEngine.Consumers;

public class PlayerDrawnConsumer : IConsumer<PlayerDrawn>
{
    private readonly GameLogicService _logic;

    public PlayerDrawnConsumer(GameLogicService logic)
    {
        _logic = logic;
    }

    public async Task Consume(ConsumeContext<PlayerDrawn> context)
    {
        var msg = context.Message;
        var state = _logic.ProcessarCompraDeCarta(msg.GameId, msg.PlayerId, msg.Source);

        // Se a rodada acabou, publica o evento correspondente (ex: em partidas de 2 jogadores)
        if (state.Phase == "RoundOver" || state.Phase == "GameOver")
        {
            await context.Publish(new RoundCompleted(
                state.GameId,
                state.LastRoundLoserId!.Value,
                state.CoringaHolderId,
                state.PlayerLetters,
                state.Phase == "GameOver",
                state.Phase == "GameOver" ? state.LastRoundLoserId : null
            ));
        }

        // Publica o novo estado
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

        Console.WriteLine($"[GameEngine] Jogador {msg.PlayerId} comprou carta do {msg.Source} na partida {msg.GameId}");
    }
}
