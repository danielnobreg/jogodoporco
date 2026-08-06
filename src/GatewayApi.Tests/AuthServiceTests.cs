using FluentAssertions;
using GatewayApi.Data;
using GatewayApi.DTOs;
using GatewayApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace GatewayApi.Tests;

public class AuthServiceTests
{
    // cria um banco em memória para cada teste — igual ao H2 do Spring
    private AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())  // novo banco por teste
            .Options;
        return new AppDbContext(options);
    }

    private IConfiguration CreateConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT_SECRET"] = "chave-de-teste-super-secreta-minimo-32-chars"
            })
            .Build();

    [Fact]   // equivalente ao @Test do JUnit
    public async Task Register_DeveRetornarToken_QuandoDadosValidos()
    {
        // Arrange
        var db = CreateDb();
        var service = new AuthService(db, CreateConfig());
        var request = new RegisterRequest("Daniel", "daniel@email.com", "123456");

        // Act
        var result = await service.RegisterAsync(request);

        // Assert
        result.Token.Should().NotBeNullOrEmpty();
        result.Email.Should().Be("daniel@email.com");
        result.Username.Should().Be("Daniel");
    }

    [Fact]
    public async Task Register_DeveLancarExcecao_QuandoEmailDuplicado()
    {
        var db = CreateDb();
        var service = new AuthService(db, CreateConfig());
        var request = new RegisterRequest("Daniel", "daniel@email.com", "123456");

        await service.RegisterAsync(request);  // primeiro registro

        // segundo registro com mesmo email deve lançar exceção
        var act = async () => await service.RegisterAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Email já cadastrado");
    }

    [Fact]
    public async Task Login_DeveLancarExcecao_QuandoSenhaErrada()
    {
        var db = CreateDb();
        var service = new AuthService(db, CreateConfig());

        await service.RegisterAsync(new RegisterRequest("Daniel", "daniel@email.com", "123456"));

        var act = async () => await service.LoginAsync(
            new LoginRequest("daniel@email.com", "senha-errada"));

        await act.Should().ThrowAsync<UnauthorizedAccessException>()
            .WithMessage("Credenciais inválidas");
    }

    [Fact]
    public async Task Login_DeveRetornarToken_QuandoCredenciaisValidas()
    {
        var db = CreateDb();
        var service = new AuthService(db, CreateConfig());

        await service.RegisterAsync(new RegisterRequest("Daniel", "daniel@email.com", "123456"));

        var result = await service.LoginAsync(
            new LoginRequest("daniel@email.com", "123456"));

        result.Token.Should().NotBeNullOrEmpty();
    }
}