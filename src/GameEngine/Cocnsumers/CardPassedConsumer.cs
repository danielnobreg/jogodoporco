using GameEngine.Domain;
using GameEngine.Services;
using MassTransit;
using SharedContracts;

namespace GameEngine.Consumers;

public class CardPassedConsumer : IConsumer<CardPassed>
{
    private readonly GameLogicService _logic;

    public CardPassedConsumer(GameLogicService logic)
    {
        _logic = logic;
    }

    public async Task Consume(ConsumeContext<CardPassed> context)
    {
        var msg = context.Message;
        var carta = new Card(msg.CardSuit, msg.CardValue);

        var state = _logic.ProcessarPassagemDeCarta(msg.GameId, msg.FromPlayerId, msg.ToPlayerId, carta);

        // Se a rodada acabou, publica o evento correspondente (ex: em partidas de 2 jogadores)
        if (state.Phase == "RoundOver" || state.Phase == "GameOver")
        {
            await context.Publish(new RoundCompleted(
                msg.GameId,
                state.LastRoundLoserId!.Value,
                state.CoringaHolderId,
                state.PlayerLetters,
                state.Phase == "GameOver",
                state.Phase == "GameOver" ? state.LastRoundLoserId : null
            ));
        }

        // publica de volta pro Gateway — o resultado dessa jogada
        await context.Publish(new GameStateUpdated(
            msg.GameId,
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

        Console.WriteLine($"[GameEngine] Carta passada na partida {msg.GameId}, fase atual: {state.Phase}");
    }
}