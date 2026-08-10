using System.Security.Claims;
using GatewayApi.DTOs;
using GatewayApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GatewayApi.Data;

namespace GatewayApi.Controllers;

[ApiController]
[Route("rooms")]
[Authorize]   // equivalente ao .anyRequest().authenticated() do Spring Security
public class RoomController : ControllerBase
{
    private readonly IRoomService _roomService;

    public RoomController(IRoomService roomService)
    {
        _roomService = roomService;
    }

    [HttpGet]
    public async Task<IActionResult> GetRooms()
    {
        var rooms = await _roomService.GetAvailableRoomsAsync();
        return Ok(rooms);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetMatchHistory([FromServices] AppDbContext db)
    {
        var email = User.FindFirstValue(ClaimTypes.Email)!;
        var player = await db.Players.FirstOrDefaultAsync(p => p.Email == email);
        if (player == null) return NotFound("Jogador não encontrado");

        var username = player.Username;

        var history = await db.MatchHistories
            .Where(h => h.Players.Contains(username))
            .OrderByDescending(h => h.EndedAt)
            .Take(20)
            .ToListAsync();

        return Ok(history);
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomRequest request)
    {
        // pega o email do token JWT — equivalente ao @AuthenticationPrincipal do Spring
        var email = User.FindFirstValue(ClaimTypes.Email)!;
        var room = await _roomService.CreateRoomAsync(email, request);
        return CreatedAtAction(nameof(GetRooms), room);
    }

    [HttpPost("{roomId:guid}/join")]
    public async Task<IActionResult> JoinRoom(Guid roomId)
    {
        var email = User.FindFirstValue(ClaimTypes.Email)!;
        var result = await _roomService.JoinRoomAsync(email, roomId);
        return Ok(result);
    }
    
    [HttpGet("{roomId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRoom(Guid roomId)
    {
        var room = await _roomService.GetRoomByIdAsync(roomId);
        if (room == null) return NotFound();
        return Ok(room);
    }

    [HttpGet("by-code/{code}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetByCode(string code)
    {
        var room = await _roomService.GetRoomByCodeAsync(code);
        if (room == null) return NotFound();
        return Ok(room);
    }

    [HttpPost("{roomId:guid}/start")]
    public async Task<IActionResult> StartRoom(Guid roomId)
    {
        await _roomService.StartRoomAsync(roomId);
        return Accepted();
    }

    [HttpPost("{roomId:guid}/leave")]
    public async Task<IActionResult> LeaveRoom(Guid roomId)
    {
        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(userIdStr, out var playerId))
        {
            await _roomService.LeaveRoomAsync(playerId);
        }
        return Ok();
    }

    [HttpPut("{roomId:guid}/visibility")]
    public async Task<IActionResult> UpdateVisibility(Guid roomId, [FromBody] bool isPrivate)
    {
        await _roomService.UpdateVisibilityAsync(roomId, isPrivate);
        return Ok();
    }

    [HttpPost("{roomId:guid}/bot")]
    public async Task<IActionResult> AddBot(Guid roomId)
    {
        var bot = await _roomService.AddBotAsync(roomId);
        return Ok(bot);
    }

    [HttpDelete("{roomId:guid}/bot/{botId:guid}")]
    public async Task<IActionResult> RemoveBot(Guid roomId, Guid botId)
    {
        await _roomService.RemoveBotAsync(roomId, botId);
        return Ok();
    }
}