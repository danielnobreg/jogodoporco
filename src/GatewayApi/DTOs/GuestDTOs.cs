using System.ComponentModel.DataAnnotations;

namespace GatewayApi.DTOs;

public record GuestJoinRequest(
    [Required][MaxLength(6)] string RoomCode,
    [Required][MaxLength(20)] string DisplayName
);

public record GuestJoinResponse(
    string GuestToken,   // token temporário — diferente do JWT normal
    Guid PlayerId,
    Guid RoomId,
    string RoomName
);

public record GuestCreateRoomRequest(
    [Required][MaxLength(50)] string RoomName,
    [Required][MaxLength(20)] string DisplayName,
    int MaxPlayers = 8
);

public record GuestCreateRoomResponse(
    string GuestToken,
    Guid PlayerId,
    Guid RoomId,
    string RoomCode
);