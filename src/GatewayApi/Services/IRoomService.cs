using GatewayApi.DTOs;

namespace GatewayApi.Services;

public interface IRoomService
{
    Task<RoomResponse> CreateRoomAsync(Guid playerId, CreateRoomRequest request);
    Task<JoinRoomResponse> JoinRoomAsync(Guid playerId, Guid roomId);
    Task<List<RoomResponse>> GetAvailableRoomsAsync();
    Task<RoomResponse?> GetRoomByCodeAsync(string code);
    Task<RoomResponse?> GetRoomByIdAsync(Guid roomId);
    Task StartRoomAsync(Guid roomId);
    Task LeaveRoomAsync(Guid playerId);
    Task UpdateVisibilityAsync(Guid roomId, bool isPrivate);
    Task<PlayerDto> AddBotAsync(Guid roomId);
    Task RemoveBotAsync(Guid roomId, Guid botId);
}