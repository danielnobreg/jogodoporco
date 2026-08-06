using GameEngine.Services;
using MassTransit;
using SharedContracts;

namespace GameEngine.Consumers;

public class PlayerSlappedConsumer : IConsumer<PlayerSlapped>
{
    private readonly GameLogicService _logic;

    public PlayerSlappedConsumer(GameLogicService logic)
    {
        _logic = logic;
    }

    public async Task Consume(ConsumeContext<PlayerSlapped> context)
    {
        var msg = context.Message;
        var state = _logic.ProcessarBatida(msg.GameId, msg.PlayerId, msg.Timestamp);

        // se a rodada acabou de ser finalizada, publica o resultado
        if (state.Phase == "RoundOver" || state.Phase == "GameOver")
        {
            var gameOver = state.Phase == "GameOver";
            var gameLoser = gameOver
                ? state.PlayerLetters.First(p => p.Value == "PORCO").Key
                : (Guid?)null;

            await context.Publish(new RoundCompleted(
                msg.GameId,
                msg.PlayerId,
                state.CoringaHolderId,
                state.PlayerLetters,
                gameOver,
                gameLoser
            ));

            Console.WriteLine($"[GameEngine] Rodada finalizada na partida {msg.GameId}. GameOver: {gameOver}");
        }

        // publica o novo estado para todos os jogadores em tempo real (slaps, turnos, fases)
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
            state.SlapOrder.Select(s => new SlapInfo(s.PlayerId, s.Timestamp)).ToList()
        ));
    }
}