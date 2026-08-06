using GatewayApi.Data;
using Microsoft.EntityFrameworkCore;

namespace GatewayApi.Services;

public class RoomCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RoomCleanupService> _logger;

    public RoomCleanupService(IServiceProvider serviceProvider, ILogger<RoomCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    
                    var threshold = DateTime.UtcNow.AddMinutes(-3);
                    // Seleciona salas que:
                    // 1. Estão vazias e foram criadas há mais de 3 minutos.
                    // OUs
                    // 2. Têm jogadores, mas todos estão desconectados (ConnectionId == null) há mais de 3 minutos.
                    var inactiveRooms = await db.GameRooms
                        .Include(r => r.Players)
                        .Where(r => 
                            (r.Players.Count == 0 && r.CreatedAt < threshold) ||
                            (r.Players.Count > 0 && r.Players.All(p => p.ConnectionId == null) && r.CreatedAt < threshold)
                        )
                        .ToListAsync(stoppingToken);

                    if (inactiveRooms.Any())
                    {
                        _logger.LogInformation("Limpando {Count} salas inativas ou abandonadas.", inactiveRooms.Count);
                        db.GameRooms.RemoveRange(inactiveRooms);
                        await db.SaveChangesAsync(stoppingToken);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no RoomCleanupService.");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
