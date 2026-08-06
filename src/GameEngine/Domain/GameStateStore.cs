using System.Collections.Concurrent;

namespace GameEngine.Domain;

// guarda o estado de todas as partidas ativas em memória
// ConcurrentDictionary — thread-safe, várias mensagens podem chegar ao mesmo tempo
public class GameStateStore
{
    private readonly ConcurrentDictionary<Guid, GameState> _games = new();

    public void CriarPartida(GameState state) => _games[state.GameId] = state;

    public GameState? Obter(Guid gameId) =>
        _games.TryGetValue(gameId, out var state) ? state : null;

    public void Remover(Guid gameId) => _games.TryRemove(gameId, out _);
}