using GatewayApi.Data;
using GatewayApi.DTOs;
using GatewayApi.Models;
using Microsoft.EntityFrameworkCore;
using MassTransit;
using SharedContracts;
using Microsoft.AspNetCore.SignalR;
using GatewayApi.Hubs;
 
namespace GatewayApi.Services;
 
public class RoomService : IRoomService
{
    private readonly AppDbContext _db;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly IHubContext<GameHub> _hubContext;
 
    public RoomService(AppDbContext db, IPublishEndpoint publishEndpoint, IHubContext<GameHub> hubContext)
    {
        _db = db;
        _publishEndpoint = publishEndpoint;
        _hubContext = hubContext;
    }

    public async Task<RoomResponse> CreateRoomAsync(Guid playerId, CreateRoomRequest request)
    {
        var player = await _db.Players.FirstOrDefaultAsync(p => p.Id == playerId)
            ?? throw new InvalidOperationException("Jogador não encontrado");

        string code;
        do { code = RoomCodeGenerator.Gerar(); }
        while (await _db.GameRooms.AnyAsync(r => r.RoomCode == code));

        var room = new GameRoom { Name = request.Name, RoomCode = code, IsPrivate = request.IsPrivate, MaxPlayers = request.MaxPlayers };
        _db.GameRooms.Add(room);
        player.GameRoomId = room.Id;

        await _db.SaveChangesAsync();
        return ToResponse(room, new List<PlayerDto> { new(player.Id, player.Username, player.Letters, player.IsBot) });
    }

    public async Task<JoinRoomResponse> JoinRoomAsync(Guid playerId, Guid roomId)
    {
        var room = await _db.GameRooms
            .Include(r => r.Players)   // carrega os jogadores — equivalente ao JOIN
            .FirstOrDefaultAsync(r => r.Id == roomId)
            ?? throw new InvalidOperationException("Sala não encontrada");

        if (room.Status != GameStatus.Lobby)
            throw new InvalidOperationException("Partida já iniciada");

        if (room.Players.Count >= room.MaxPlayers)
            throw new InvalidOperationException("Sala cheia");

        var player = await _db.Players.FirstOrDefaultAsync(p => p.Id == playerId)
            ?? throw new InvalidOperationException("Jogador não encontrado");

        if (room.Players.Any(p => p.Username == player.Username))
            throw new InvalidOperationException("Este nome de usuário já está em uso nesta sala.");

        player.GameRoomId = roomId;
        room.Players.Add(player);
        await _db.SaveChangesAsync();

        return new JoinRoomResponse(
            room.Id,
            room.Name,
            room.Players.Select(p => p.Username).ToList()
        );
    }

    public async Task<List<RoomResponse>> GetAvailableRoomsAsync()
    {
        var rooms = await _db.GameRooms
            .Include(r => r.Players)
            .Where(r => r.Status == GameStatus.Lobby && !r.IsPrivate)
            .ToListAsync();

        return rooms.Select(r => ToResponse(r, r.Players.OrderBy(p => p.CreatedAt).Select(p => new PlayerDto(p.Id, p.Username, p.Letters, p.IsBot)).ToList())).ToList();
    }

    public async Task<RoomResponse?> GetRoomByCodeAsync(string code)
    {
        var room = await _db.GameRooms
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.RoomCode == code.ToUpper());

        if (room == null) return null;

        return ToResponse(room, room.Players.OrderBy(p => p.CreatedAt).Select(p => new PlayerDto(p.Id, p.Username, p.Letters, p.IsBot)).ToList());
    }

    public async Task<RoomResponse?> GetRoomByIdAsync(Guid roomId)
    {
        var room = await _db.GameRooms
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Id == roomId);

        if (room == null) return null;

        return ToResponse(room, room.Players.OrderBy(p => p.CreatedAt).Select(p => new PlayerDto(p.Id, p.Username, p.Letters, p.IsBot)).ToList());
    }

    public async Task StartRoomAsync(Guid roomId)
    {
        var room = await _db.GameRooms
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Id == roomId)
            ?? throw new InvalidOperationException("Sala não encontrada");

        if (room.Status != GameStatus.Lobby)
            throw new InvalidOperationException("A partida já começou");

        if (room.Players.Count < 2)
            throw new InvalidOperationException("Mínimo de 2 jogadores para iniciar o jogo");

        room.Status = GameStatus.Playing;
        foreach (var p in room.Players)
        {
            p.Letters = "";
        }
        await _db.SaveChangesAsync();

        var playerIds = room.Players.OrderBy(p => p.Id).Select(p => p.Id).ToList();

        // Envia evento pro GameEngine iniciar
        await _publishEndpoint.Publish(new GameStarted(room.Id, playerIds));
    }

    public async Task LeaveRoomAsync(Guid playerId)
    {
        var player = await _db.Players
            .Include(p => p.GameRoom)
            .ThenInclude(r => r!.Players)
            .FirstOrDefaultAsync(p => p.Id == playerId);
 
        if (player == null || player.GameRoom == null) return;
 
        var room = player.GameRoom;
        var username = player.Username;
        var roomId = room.Id;
 
        // Remove jogador da sala
        player.GameRoomId = null;
        await _db.SaveChangesAsync();
 
        var remainingPlayers = room.Players.Where(p => p.Id != playerId).ToList();
 
        if (remainingPlayers.Count == 0)
        {
            // Ninguém sobrou, remove a sala do banco
            _db.GameRooms.Remove(room);
            await _db.SaveChangesAsync();
        }
        else
        {
            // 1. Envia mensagem de chat do sistema
            await _hubContext.Clients.Group(roomId.ToString()).SendAsync("ChatMessageReceived", new
            {
                Username = "Sistema",
                Message = $"{username} saiu da sala.",
                Timestamp = DateTime.UtcNow
            });
 
            // 2. Notifica no log de entrar/sair
            await _hubContext.Clients.Group(roomId.ToString()).SendAsync("PlayerLeft", new
            {
                Username = username,
                Message = $"{username} saiu da sala"
            });
 
            // 3. Se só sobrou 1 jogador e a partida estava em andamento (Playing)
            if (room.Status == GameStatus.Playing && remainingPlayers.Count == 1)
            {
                room.Status = GameStatus.Lobby;
                await _db.SaveChangesAsync();
 
                var host = remainingPlayers[0];
                await _hubContext.Clients.Group(roomId.ToString()).SendAsync("LastPlayerLeftAlone", new
                {
                    HostId = host.Id,
                    Message = "Você é o único jogador restante. A partida foi encerrada."
                });
            }
            else
            {
                // Se a partida está no lobby ou sobrou mais de 1 jogador
                var host = remainingPlayers.OrderBy(p => p.CreatedAt).First();
                var playersDto = remainingPlayers.Select(p => new PlayerDto(p.Id, p.Username, p.Letters, p.IsBot)).ToList();
 
                await _hubContext.Clients.Group(roomId.ToString()).SendAsync("RoomUpdated", new
                {
                    HostId = host.Id,
                    Players = playersDto,
                    PlayerCount = remainingPlayers.Count
                });
            }
        }
    }

    public async Task UpdateVisibilityAsync(Guid roomId, bool isPrivate)
    {
        var room = await _db.GameRooms.FirstOrDefaultAsync(r => r.Id == roomId)
            ?? throw new InvalidOperationException("Sala não encontrada");

        room.IsPrivate = isPrivate;
        await _db.SaveChangesAsync();
    }

    public async Task<PlayerDto> AddBotAsync(Guid roomId)
    {
        var room = await _db.GameRooms
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Id == roomId)
            ?? throw new InvalidOperationException("Sala não encontrada");

        if (room.Status != GameStatus.Lobby)
            throw new InvalidOperationException("Não é possível adicionar bots com a partida em andamento");

        if (room.Players.Count >= room.MaxPlayers)
            throw new InvalidOperationException("A sala já atingiu o limite de jogadores");

        var botCount = room.Players.Count(p => p.IsBot);
        var botName = $"Bot {botCount + 1} 🤖";

        var bot = new PlayerSession
        {
            Id = Guid.NewGuid(),
            Username = botName,
            IsGuest = true,
            IsBot = true,
            ConnectionId = "BOT",
            GameRoomId = roomId
        };

        _db.Players.Add(bot);
        await _db.SaveChangesAsync();

        var host = room.Players.OrderBy(p => p.CreatedAt).First();
        var playersDto = room.Players.OrderBy(p => p.CreatedAt).Select(p => new PlayerDto(p.Id, p.Username, p.Letters, p.IsBot)).ToList();

        await _hubContext.Clients.Group(roomId.ToString()).SendAsync("RoomUpdated", new
        {
            HostId = host.Id,
            Players = playersDto,
            PlayerCount = room.Players.Count
        });

        return new PlayerDto(bot.Id, bot.Username, bot.Letters, bot.IsBot);
    }

    public async Task RemoveBotAsync(Guid roomId, Guid botId)
    {
        var room = await _db.GameRooms
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Id == roomId);

        if (room == null) return;

        var bot = room.Players.FirstOrDefault(p => p.Id == botId && p.IsBot);
        if (bot != null)
        {
            _db.Players.Remove(bot);
            await _db.SaveChangesAsync();

            var remainingPlayers = room.Players.Where(p => p.Id != botId).ToList();
            if (remainingPlayers.Any())
            {
                var host = remainingPlayers.OrderBy(p => p.CreatedAt).First();
                var playersDto = remainingPlayers.Select(p => new PlayerDto(p.Id, p.Username, p.Letters, p.IsBot)).ToList();

                await _hubContext.Clients.Group(roomId.ToString()).SendAsync("RoomUpdated", new
                {
                    HostId = host.Id,
                    Players = playersDto,
                    PlayerCount = remainingPlayers.Count
                });
            }
        }
    }

    private static RoomResponse ToResponse(GameRoom room, List<PlayerDto> players) =>
        new(room.Id, room.Name, room.RoomCode, room.Status, players.Count, room.CreatedAt, players, room.IsPrivate, room.MaxPlayers);
}