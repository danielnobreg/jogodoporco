using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GatewayApi.Data;
using GatewayApi.DTOs;
using GatewayApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace GatewayApi.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    // injeção de dependência pelo construtor — igual ao @RequiredArgsConstructor do Lombok
    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // verifica email duplicado
        var exists = await _db.Players.AnyAsync(p => p.Email == request.Email);
        if (exists)
            throw new InvalidOperationException("Email já cadastrado");

        var usernameExists = await _db.Players.AnyAsync(p => p.Username == request.Username);
        if (usernameExists)
            throw new InvalidOperationException("Nome de usuário já cadastrado");

        var player = new PlayerSession
        {
            Username = request.Username,
            Email = request.Email,
            // BCrypt — mesmo conceito do Spring Security
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        _db.Players.Add(player);
        await _db.SaveChangesAsync();

        return new AuthResponse(GenerateToken(player), player.Username, player.Email);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var player = await _db.Players.FirstOrDefaultAsync(p => p.Email == request.Email)
            ?? throw new UnauthorizedAccessException("Credenciais inválidas");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, player.PasswordHash))
            throw new UnauthorizedAccessException("Credenciais inválidas");

        return new AuthResponse(GenerateToken(player), player.Username, player.Email);
    }

    private string GenerateToken(PlayerSession player)
    {
        var secret = _config["JWT_SECRET"]
            ?? Environment.GetEnvironmentVariable("JWT_SECRET")
            ?? throw new InvalidOperationException("JWT_SECRET não configurado");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // claims = dados que ficam dentro do token
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, player.Id.ToString()),
            new Claim(ClaimTypes.Email, player.Email),
            new Claim(ClaimTypes.Name, player.Username)
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddDays(1),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}