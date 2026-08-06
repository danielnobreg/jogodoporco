using System.Security.Claims;
using GatewayApi.Data;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SharedContracts;

namespace GatewayApi.Controllers;

public record PassCardRequest(Guid ToPlayerId, string CardSuit, string CardValue);

[ApiController]
[Route("actions")]
[Authorize]
public class ActionController : ControllerBase
{
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly AppDbContext _db;

    public ActionController(IPublishEndpoint publishEndpoint, AppDbContext db)
    {
        _publishEndpoint = publishEndpoint;
        _db = db;
    }

    [HttpPost("pass-card")]
    public async Task<IActionResult> PassCard([FromBody] PassCardRequest request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var playerId))
            return Unauthorized();

        var player = await _db.Players.FirstOrDefaultAsync(p => p.Id == playerId)
            ?? throw new InvalidOperationException("Jogador não encontrado");

        if (player.GameRoomId == null)
            throw new InvalidOperationException("Jogador não está em nenhuma sala");

        var room = await _db.GameRooms
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Id == player.GameRoomId.Value)
            ?? throw new InvalidOperationException("Sala não encontrada");

        var sortedPlayers = room.Players.OrderBy(p => p.Id).ToList();
        var myIndex = sortedPlayers.FindIndex(p => p.Id == player.Id);
        var nextPlayer = sortedPlayers[(myIndex + 1) % sortedPlayers.Count];

        // publica o evento — o GameEngine vai processar de forma assíncrona
        await _publishEndpoint.Publish(new CardPassed(
            player.GameRoomId.Value,
            player.Id,
            nextPlayer.Id,
            request.CardSuit,
            request.CardValue,
            DateTime.UtcNow
        ));

        return Accepted();  // 202 — aceito, processamento é assíncrono
    }

    [HttpPost("slap")]
    public async Task<IActionResult> Slap()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var playerId))
            return Unauthorized();

        var player = await _db.Players.FirstOrDefaultAsync(p => p.Id == playerId)
            ?? throw new InvalidOperationException("Jogador não encontrado");

        if (player.GameRoomId == null)
            throw new InvalidOperationException("Jogador não está em nenhuma sala");

        // o timestamp é capturado AQUI, no servidor, no momento exato da requisição
        // isso evita que o cliente manipule o timestamp para trapacear
        await _publishEndpoint.Publish(new PlayerSlapped(
            player.GameRoomId.Value,
            player.Id,
            DateTime.UtcNow
        ));

        return Accepted();
    }

    [HttpPost("next-round")]
    public async Task<IActionResult> NextRound()
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var playerId))
            return Unauthorized();

        var player = await _db.Players.FirstOrDefaultAsync(p => p.Id == playerId)
            ?? throw new InvalidOperationException("Jogador não encontrado");

        if (player.GameRoomId == null)
            throw new InvalidOperationException("Jogador não está em nenhuma sala");

        var room = await _db.GameRooms
            .Include(r => r.Players)
            .FirstOrDefaultAsync(r => r.Id == player.GameRoomId.Value)
            ?? throw new InvalidOperationException("Sala não encontrada");

        var firstPlayer = room.Players.OrderBy(p => p.CreatedAt).FirstOrDefault();
        if (firstPlayer == null || firstPlayer.Id != player.Id)
            return StatusCode(403, new { error = "Apenas o host da sala pode iniciar a próxima rodada." });

        await _publishEndpoint.Publish(new StartNextRound(
            player.GameRoomId.Value,
            player.Id
        ));

        return Accepted();
    }

    public record DrawRequest(string Source);

    [HttpPost("draw")]
    public async Task<IActionResult> Draw([FromBody] DrawRequest request)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var playerId))
            return Unauthorized();

        var player = await _db.Players.FirstOrDefaultAsync(p => p.Id == playerId)
            ?? throw new InvalidOperationException("Jogador não encontrado");

        if (player.GameRoomId == null)
            throw new InvalidOperationException("Jogador não está em nenhuma sala");

        await _publishEndpoint.Publish(new PlayerDrawn(
            player.GameRoomId.Value,
            player.Id,
            request.Source
        ));

        return Accepted();
    }
}