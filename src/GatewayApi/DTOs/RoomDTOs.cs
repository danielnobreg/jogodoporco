using System.ComponentModel.DataAnnotations;
using GatewayApi.Models;

namespace GatewayApi.DTOs;

public record CreateRoomRequest(
    [Required][MaxLength(50)] string Name,
    bool IsPrivate = false,
    int MaxPlayers = 8
);

public record PlayerDto(Guid Id, string Username, string Letters);

public record RoomResponse(
    Guid Id,
    string Name,
    string RoomCode,
    GameStatus Status,
    int PlayerCount,
    DateTime CreatedAt,
    List<PlayerDto> Players,
    bool IsPrivate,
    int MaxPlayers
);

public record JoinRoomResponse(
    Guid RoomId,
    string RoomName,
    List<string> Players   // usernames dos jogadores na sala
);