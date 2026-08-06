using System.ComponentModel.DataAnnotations;

namespace GatewayApi.Models;

public class PlayerSession
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(30)]
    public string Username { get; set; } = string.Empty;

    [EmailAddress]
    public string? Email { get; set; }

    public string? PasswordHash { get; set; }

    public bool IsGuest { get; set; } = false;

    // letras acumuladas: "P", "PO", "POR", "PORC", "PORCO"
    public string Letters { get; set; } = string.Empty;

    // ID da conexão SignalR atual — atualizado a cada reconexão
    public string? ConnectionId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // FK para a sala
    public Guid? GameRoomId { get; set; }
    public GameRoom? GameRoom { get; set; }
}