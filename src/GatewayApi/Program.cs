using System.Text;
using MassTransit;
using GatewayApi.Data;
using GatewayApi.Hubs;
using GatewayApi.Middleware;
using GatewayApi.Services;
using GatewayApi.Consumers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// banco de dados
var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
    ?? "Host=localhost;Database=porco_db;Username=postgres;Password=porco_password";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// JWT
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? "chave-super-secreta-jogo-do-porco-minimo-32-chars";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        };

        // necessário para o SignalR — o token vem via query string no WebSocket
        // browsers não permitem headers customizados em conexões WebSocket
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub/game"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// SignalR
builder.Services.AddSignalR();

// serviços da aplicação
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddHostedService<RoomCleanupService>();

// controllers + swagger
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddScoped<IGuestService, GuestService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Jogo do Porco API", Version = "v1" });

    // adiciona suporte a JWT no Swagger
    c.AddSecurityDefinition("Bearer", new()
    {
        Description = "JWT Authorization header. Ex: Bearer {token}",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new()
    {
        {
            new() { Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

// CORS — libera o Next.js em desenvolvimento e produção
var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "https://jogo-do-porco-front.vercel.app";
builder.Services.AddCors(options =>
{
    options.AddPolicy("Prod", policy =>
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001", frontendUrl)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials());   // necessário para o SignalR
});

var serviceBusConnectionString = Environment.GetEnvironmentVariable("SERVICEBUS_CONNECTION");
var isProduction = !string.IsNullOrEmpty(serviceBusConnectionString);

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<GameStateUpdatedConsumer>();
    x.AddConsumer<RoundCompletedConsumer>();

    if (isProduction)
    {
        x.UsingAzureServiceBus((context, cfg) =>
        {
            cfg.Host(serviceBusConnectionString);
            cfg.ConfigureEndpoints(context);
        });
    }
    else
    {
        var rabbitHost = Environment.GetEnvironmentVariable("RABBITMQ_HOST") ?? "localhost";
        var rabbitUser = Environment.GetEnvironmentVariable("RABBITMQ_USER") ?? "guest";
        var rabbitPass = Environment.GetEnvironmentVariable("RABBITMQ_PASS") ?? "guest";

        x.UsingRabbitMq((context, cfg) =>
        {
            cfg.Host(rabbitHost, "/", h =>
            {
                h.Username(rabbitUser);
                h.Password(rabbitPass);
            });
            cfg.ConfigureEndpoints(context);
        });
    }
});

var app = builder.Build();

// middleware de erros — precisa ser o primeiro
app.UseMiddleware<ErrorHandlerMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Prod");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<GameHub>("/hub/game");

// automigração de colunas no banco PostgreSQL
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    try
    {
        db.Database.ExecuteSqlRaw(@"ALTER TABLE ""Players"" ADD COLUMN IF NOT EXISTS ""IsBot"" boolean NOT NULL DEFAULT false;");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Migration note: {ex.Message}");
    }
}

app.Run();