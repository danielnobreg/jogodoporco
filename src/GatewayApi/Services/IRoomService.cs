using GatewayApi.DTOs;

namespace GatewayApi.Services;

public interface IRoomService
{
    Task<RoomResponse> CreateRoomAsync(string creatorEmail, CreateRoomRequest request);
    Task<JoinRoomResponse> JoinRoomAsync(string playerEmail, Guid roomId);
    Task<List<RoomResponse>> GetAvailableRoomsAsync();
    Task<RoomResponse?> GetRoomByCodeAsync(string code);
    Task<RoomResponse?> GetRoomByIdAsync(Guid roomId);
    Task StartRoomAsync(Guid roomId);
    Task LeaveRoomAsync(Guid playerId);
    Task UpdateVisibilityAsync(Guid roomId, bool isPrivate);
}