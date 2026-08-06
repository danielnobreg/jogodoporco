using System.ComponentModel.DataAnnotations;

namespace GatewayApi.Models;

public class GameRoom
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty;

    [Required] [MaxLength(6)]
    public string RoomCode { get; set; } = string.Empty;
    public GameStatus Status { get; set; } = GameStatus.Lobby;
    public bool IsPrivate { get; set; } = false;
    public int MaxPlayers { get; set; } = 8;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // navigation property — EF Core carrega os jogadores associados
    public List<PlayerSession> Players { get; set; } = new();
}

public enum GameStatus
{
    Lobby,    // aguardando jogadores
    Playing,  // partida em andamento
    Finished  // partida encerrada
}