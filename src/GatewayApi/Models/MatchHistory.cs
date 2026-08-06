using System;
using System.ComponentModel.DataAnnotations;
 
namespace GatewayApi.Models;
 
public class MatchHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
 
    [Required]
    [MaxLength(100)]
    public string RoomName { get; set; } = string.Empty;
 
    [Required]
    [MaxLength(6)]
    public string RoomCode { get; set; } = string.Empty;
 
    [Required]
    public string Players { get; set; } = string.Empty; // Nomes separados por vírgula
 
    [Required]
    [MaxLength(100)]
    public string LoserUsername { get; set; } = string.Empty;
 
    public DateTime EndedAt { get; set; } = DateTime.UtcNow;
}
