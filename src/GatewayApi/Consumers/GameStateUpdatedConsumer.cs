using GatewayApi.Hubs;
using GatewayApi.Data;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using Microsoft.AspNetCore.SignalR;
using SharedContracts;
using GatewayApi.Models;

namespace GatewayApi.Consumers;

public class GameStateUpdatedConsumer : IConsumer<GameStateUpdated>
{
    private readonly IHubContext<GameHub> _hubContext;
    private readonly AppDbContext _db;

    public GameStateUpdatedConsumer(IHubContext<GameHub> hubContext, AppDbContext db)
    {
        _hubContext = hubContext;
        _db = db;
    }

    public async Task Consume(ConsumeContext<GameStateUpdated> context)
    {
        var msg = context.Message;

        // envia para todos os clientes conectados no grupo dessa sala
        await _hubContext.Clients
            .Group(msg.GameId.ToString())
            .SendAsync("GameStateUpdated", new
            {
                msg.GameId,
                msg.Phase,
                msg.HandSizes,
                msg.CurrentTurnPlayerId,
                msg.LastRoundLoserId,
                msg.DrawPileCount,
                msg.LastPassedCard,
                msg.DiscardPileTop,
                msg.SlapOrder
            });

        // envia de forma privada as cartas de cada jogador
        var players = await _db.Players
            .Where(p => p.GameRoomId == msg.GameId)
            .ToListAsync();

        foreach (var player in players)
        {
            if (!string.IsNullOrEmpty(player.ConnectionId) && msg.Hands.TryGetValue(player.Id, out var hand))
            {
                Card? forbiddenCard = null;
                if (msg.LastPassedCard != null && msg.LastPassedCardToPlayerId == player.Id)
                {
                    forbiddenCard = msg.LastPassedCard;
                }

                await _hubContext.Clients.Client(player.ConnectionId).SendAsync("PlayerHandUpdated", new
                {
                    Cards = hand,
                    ForbiddenCard = forbiddenCard
                });
            }
        }
    }
}

// consumer separado para o resultado de rodada
public class RoundCompletedConsumer : IConsumer<RoundCompleted>
{
    private readonly IHubContext<GameHub> _hubContext;
    private readonly AppDbContext _db;

    public RoundCompletedConsumer(IHubContext<GameHub> hubContext, AppDbContext db)
    {
        _hubContext = hubContext;
        _db = db;
    }

    public async Task Consume(ConsumeContext<RoundCompleted> context)
    {
        var msg = context.Message;

        try
        {
            var room = await _db.GameRooms
                .Include(r => r.Players)
                .FirstOrDefaultAsync(r => r.Id == msg.GameId);
 
            if (room != null)
            {
                // Atualiza as letras de cada jogador
                foreach (var (playerId, lettersVal) in msg.PlayerLetters)
                {
                    var player = room.Players.FirstOrDefault(p => p.Id == playerId);
                    if (player != null)
                    {
                        player.Letters = lettersVal;
                    }
                }
 
                if (msg.GameOver)
                {
                    room.Status = GameStatus.Finished;
 
                    var loser = room.Players.FirstOrDefault(p => p.Id == msg.LoserPlayerId);
                    var loserName = loser?.Username ?? "Desconhecido";
 
                    var history = new MatchHistory
                    {
                        RoomName = room.Name,
                        RoomCode = room.RoomCode,
                        Players = string.Join(", ", room.Players.Select(p => p.Username)),
                        LoserUsername = loserName,
                        EndedAt = DateTime.UtcNow
                    };
 
                    _db.MatchHistories.Add(history);
                }
 
                await _db.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Gateway] Erro ao processar resultado de rodada no DB: {ex.Message}");
        }

        await _hubContext.Clients
            .Group(msg.GameId.ToString())
            .SendAsync("RoundCompleted", new
            {
                msg.GameId,
                msg.LoserPlayerId,
                msg.CoringaHolderId,
                msg.PlayerLetters,
                msg.GameOver,
                msg.GameLoserPlayerId
            });

        // mensagem de sistema no chat
        await _hubContext.Clients.Group(msg.GameId.ToString())
            .SendAsync("ChatMessageReceived", new
            {
                Username = "Sistema",
                Message = msg.GameOver
                    ? "Fim de jogo! 🐷"
                    : "Rodada encerrada — alguém levou uma letra.",
                Timestamp = DateTime.UtcNow,
                IsSystem = true
            });
    }
}   