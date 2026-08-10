using GameEngine.Consumers;
using GameEngine.Domain;
using GameEngine.Services;
using MassTransit;

var builder = Host.CreateApplicationBuilder(args);

// registra a lógica do jogo e o armazenamento de estado
builder.Services.AddSingleton<GameStateStore>();
builder.Services.AddSingleton<GameLogicService>();
builder.Services.AddSingleton<BotService>();

var serviceBusConnectionString = Environment.GetEnvironmentVariable("SERVICEBUS_CONNECTION");
var isProduction = !string.IsNullOrEmpty(serviceBusConnectionString);

builder.Services.AddMassTransit(x =>
{
    // registra todos os consumers
    x.AddConsumer<GameStartedConsumer>();
    x.AddConsumer<CardPassedConsumer>();
    x.AddConsumer<PlayerSlappedConsumer>();
    x.AddConsumer<StartNextRoundConsumer>();
    x.AddConsumer<PlayerDrawnConsumer>();

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

            // configura os endpoints automaticamente baseado nos consumers registrados
            cfg.ConfigureEndpoints(context);
        });
    }
});

var host = builder.Build();
host.Run();