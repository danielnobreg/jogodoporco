using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GatewayApi.Data;
using GatewayApi.DTOs;
using GatewayApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace GatewayApi.Services;

public interface IGuestService
{
    Task<GuestJoinResponse> JoinAsGuestAsync(GuestJoinRequest request);
}

public class GuestService : IGuestService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public GuestService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<GuestJoinResponse> JoinAsGuestAsync(GuestJoinRequest request)
    {
        var room = await _db.GameRooms
            .FirstOrDefaultAsync(r => r.RoomCode == request.RoomCode.ToUpper())
            ?? throw new InvalidOperationException("Sala não encontrada. Verifique o código.");

        if (room.Status != GameStatus.Lobby)
            throw new InvalidOperationException("Partida já em andamento");

        var playerCount = await _db.Players.CountAsync(p => p.GameRoomId == room.Id);
        if (playerCount >= room.MaxPlayers)
            throw new InvalidOperationException("Sala cheia");

        var nameExists = await _db.Players.AnyAsync(p => p.GameRoomId == room.Id && p.Username == request.DisplayName);
        if (nameExists)
            throw new InvalidOperationException("Este nome de usuário já está em uso nesta sala.");

        var guest = new PlayerSession
        {
            Username = request.DisplayName,
            IsGuest = true,
            GameRoomId = room.Id
        };

        _db.Players.Add(guest);
        await _db.SaveChangesAsync();

        var token = GenerateGuestToken(guest);
        return new GuestJoinResponse(token, guest.Id, room.Id, room.Name);
    }

    private string GenerateGuestToken(PlayerSession guest)
    {
        var secret = _config["JWT_SECRET"] ?? throw new InvalidOperationException("JWT_SECRET não configurado");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, guest.Id.ToString()),
            new Claim(ClaimTypes.Name, guest.Username),
            new Claim("is_guest", "true")
        };

        // convidado expira mais rápido — sessão de partida, não conta persistente
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddHours(6),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}