using Microsoft.EntityFrameworkCore;
using GatewayApi.Models;

namespace GatewayApi.Data;

public class AppDbContext : DbContext
{
    // construtor recebe as opções via injeção de dependência
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // DbSet = equivalente ao @Entity + JpaRepository junto
    public DbSet<GameRoom> GameRooms => Set<GameRoom>();
    public DbSet<PlayerSession> Players => Set<PlayerSession>();
    public DbSet<MatchHistory> MatchHistories => Set<MatchHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // configura o relacionamento Room → Players
        modelBuilder.Entity<GameRoom>()
            .HasMany(r => r.Players)
            .WithOne(p => p.GameRoom)
            .HasForeignKey(p => p.GameRoomId)
            .OnDelete(DeleteBehavior.SetNull);

        // índice único no email — ninguém cadastra dois emails iguais
        modelBuilder.Entity<PlayerSession>()
            .HasIndex(p => p.Email)
            .IsUnique();
    }
}