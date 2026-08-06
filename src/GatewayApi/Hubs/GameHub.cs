using System.Security.Claims;
using GatewayApi.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using SharedContracts;

namespace GatewayApi.Hubs;

[Authorize]   // só jogadores autenticados podem conectar ao Hub
public class GameHub : Hub
{
    private readonly AppDbContext _db;
    private readonly IPublishEndpoint _publishEndpoint;

    public GameHub(AppDbContext db, IPublishEndpoint publishEndpoint)
    {
        _db = db;
        _publishEndpoint = publishEndpoint;
    }

    // chamado automaticamente quando o cliente conecta ao Hub
    public override async Task OnConnectedAsync()
    {
        var userIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var playerId)) return;

        // salva o ConnectionId — precisamos dele para mandar mensagens diretas
        var player = await _db.Players
            .FirstOrDefaultAsync(p => p.Id == playerId);

        if (player != null)
        {
            player.ConnectionId = Context.ConnectionId;
            await _db.SaveChangesAsync();
        }

        await base.OnConnectedAsync();
    }

    // chamado automaticamente quando o cliente desconecta
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var playerId)) return;

        var player = await _db.Players
            .FirstOrDefaultAsync(p => p.Id == playerId);

        if (player != null)
        {
            // verifica se tem jogadores na sala antes de notificar
            if (player.GameRoomId.HasValue)
            {
                await Clients
                    .Group(player.GameRoomId.ToString()!)
                    .SendAsync("PlayerLeft", new { player.Username });
            }

            player.ConnectionId = null;
            await _db.SaveChangesAsync();
        }

        await base.OnDisconnectedAsync(exception);
    }

    // cliente chama esse método para entrar no grupo da sala
    // Groups = canais isolados — mensagem no grupo "sala-A" não chega em "sala-B"
    public async Task JoinRoom(string roomId)
    {
        var userIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var playerId)) return;

        var player = await _db.Players
            .Include(p => p.GameRoom)
            .FirstOrDefaultAsync(p => p.Id == playerId);

        if (player?.GameRoom == null) return;

        // adiciona a conexão ao grupo da sala
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

        // notifica todos na sala que alguém entrou
        await Clients
            .Group(roomId)
            .SendAsync("PlayerJoined", new
            {
                player.Username,
                RoomId = roomId,
                Message = $"{player.Username} entrou na sala"
            });

    }

    // cliente chama esse método para sair do grupo
    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

        var userIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var playerId)) return;

        var player = await _db.Players.FirstOrDefaultAsync(p => p.Id == playerId);

        if (player != null)
        {
            await Clients
                .Group(roomId)
                .SendAsync("PlayerLeft", new { player.Username });
        }
    }

    // método que o cliente chama pra mandar mensagem
    public async Task SendChatMessage(string roomId, string message)
    {
        var username = Context.User?.FindFirstValue(ClaimTypes.Name)
            ?? Context.User?.FindFirstValue(ClaimTypes.Email)
            ?? "Anônimo";

        var userIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? playerId = Guid.TryParse(userIdStr, out var id) ? id : null;

        // sanitiza tamanho — evita spam de mensagem gigante
        var textoLimitado = message.Length > 200 ? message[..200] : message;

        await Clients.Group(roomId).SendAsync("ChatMessageReceived", new
        {
            PlayerId = playerId,
            Username = username,
            Message = textoLimitado,
            Timestamp = DateTime.UtcNow
        });
    }

    // Rastreia o timestamp da última reação por playerId (Guid)
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, DateTime> _reactionCooldowns = new();

    public async Task SendReaction(string roomId, string emoji)
    {
        var userIdStr = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdStr, out var playerId)) return;

        var now = DateTime.UtcNow;
        if (_reactionCooldowns.TryGetValue(playerId, out var lastTime))
        {
            if ((now - lastTime).TotalSeconds < 1.5)
            {
                // Ignora se estiver no cooldown de 1.5s
                return;
            }
        }

        _reactionCooldowns[playerId] = now;

        // sanitiza tamanho para evitar envio de payloads gigantes
        var emojiLimitado = emoji.Length > 8 ? emoji[..8] : emoji;

        // Retransmite a reação para todos na sala
        await Clients.Group(roomId).SendAsync("ReactionReceived", new
        {
            PlayerId = playerId,
            Emoji = emojiLimitado
        });
    }
}