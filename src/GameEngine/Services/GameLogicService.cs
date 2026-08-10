using GameEngine.Domain;

namespace GameEngine.Services;

public class GameLogicService
{
    private readonly GameStateStore _store;

    public GameLogicService(GameStateStore store)
    {
        _store = store;
    }

    public GameState IniciarPartida(Guid gameId, List<Guid> playerIds, List<Guid>? botPlayerIds = null)
    {
        Dictionary<Guid, List<Card>> maos = null;
        List<Card> baralho = null;
        int tentativas = 0;
        bool temTrioInicial;

        do
        {
            baralho = Deck.GerarBaralho(playerIds.Count);
            var baralhoCopia = new List<Card>(baralho);
            maos = Deck.Distribuir(baralhoCopia, playerIds);

            temTrioInicial = false;
            foreach (var mao in maos.Values)
            {
                if (EncontrarTodosOsTrios(mao).Count > 0)
                {
                    temTrioInicial = true;
                    break;
                }
            }

            tentativas++;
            if (!temTrioInicial)
            {
                baralho = baralhoCopia;
            }
        } while (temTrioInicial && tentativas < 100);

        var state = new GameState
        {
            GameId = gameId,
            PlayerIds = playerIds,
            BotPlayerIds = botPlayerIds != null ? botPlayerIds.ToHashSet() : new HashSet<Guid>(),
            Hands = maos,
            PlayerLetters = playerIds.ToDictionary(id => id, _ => ""),
            CurrentTurnPlayerId = playerIds[0],
            Phase = "Playing",
            DrawPile = baralho
        };

        // verifica quem ficou com o coringa após a distribuição
        foreach (var (playerId, mao) in maos)
        {
            if (mao.Any(c => c.IsCoringa))
                state.CoringaHolderId = playerId;
        }

        _store.CriarPartida(state);
        return state;
    }

    // processa a passagem de uma carta
    public GameState ProcessarPassagemDeCarta(Guid gameId, Guid fromPlayerId, Guid toPlayerId, Card carta)
    {
        var state = _store.Obter(gameId)
            ?? throw new InvalidOperationException("Partida não encontrada");
 
        lock (state)
        {
            if (state.CurrentTurnPlayerId != fromPlayerId)
                throw new InvalidOperationException("Não é a vez desse jogador");
 
            var maoOrigem = state.Hands[fromPlayerId];
 
            // Deve ter exatamente 10 cartas na mão para passar uma (9 de base + 1 recém-comprada)
            if (maoOrigem.Count != 10)
                throw new InvalidOperationException("Você precisa ter exatamente 10 cartas na mão para poder passar uma!");
 
            var cartaReal = maoOrigem.FirstOrDefault(c => c.Suit == carta.Suit && c.Value == carta.Value)
                ?? throw new InvalidOperationException("Jogador não possui essa carta");
 
            // Verifica se a carta faz parte de um trio congelado
            var trios = EncontrarTodosOsTrios(maoOrigem);
            var estaNoTrio = trios.Any(t => t.Any(c => c.Suit == cartaReal.Suit && c.Value == cartaReal.Value));
            if (estaNoTrio)
            {
                throw new InvalidOperationException("Você não pode passar uma carta que faz parte de um trio congelado!");
            }

            // Não pode passar a carta que acabou de comprar no mesmo turno
            if (state.LastPassedCard != null &&
                state.LastPassedCardToPlayerId == fromPlayerId &&
                state.LastPassedCard.Suit == cartaReal.Suit &&
                state.LastPassedCard.Value == cartaReal.Value)
            {
                throw new InvalidOperationException("Você não pode descartar a carta que acabou de comprar nesta rodada!");
            }
 
            maoOrigem.Remove(cartaReal);
            state.DiscardPile.Add(cartaReal);
 
            // Limpa indicação da última carta
            state.LastPassedCard = null;
            state.LastPassedCardToPlayerId = null;
 
            // avança o turno — próximo jogador da lista
            var currentIndex = state.PlayerIds.IndexOf(fromPlayerId);
            state.CurrentTurnPlayerId = state.PlayerIds[(currentIndex + 1) % state.PlayerIds.Count];
 
            // após a jogada, verifica se alguém completou a vitória (3 trios)
            VerificarVitoria(state, fromPlayerId);
 
            return state;
        }
    }

    private void VerificarVitoria(GameState state, Guid playerId)
    {
        var mao = state.Hands[playerId];
        var trios = EncontrarTodosOsTrios(mao);
        if (trios.Count >= 3)
        {
            if (state.PlayerIds.Count == 2)
            {
                // Com 2 jogadores, a rodada termina imediatamente. O outro jogador perde!
                var oponenteId = state.PlayerIds.First(id => id != playerId);
                FinalizarRodadaDupla(state, oponenteId);
            }
            else
            {
                state.Phase = "Slapping";  // mais de 2 jogadores: todos precisam "bater"
            }
        }
    }

    private void FinalizarRodadaDupla(GameState state, Guid perdedorId)
    {
        AplicarLetra(state, perdedorId);

        // penalidade extra: quem ficou com o coringa também leva letra
        if (state.CoringaHolderId.HasValue && state.CoringaHolderId != perdedorId)
        {
            AplicarLetra(state, state.CoringaHolderId.Value);
        }

        state.LastRoundLoserId = perdedorId;
        
        var isGameOver = state.PlayerLetters.Values.Any(l => l == GameState.LetrasCompletas);
        state.Phase = isGameOver ? "GameOver" : "RoundOver";
    }

    // processa quando um jogador clica em BATER!
    public GameState ProcessarBatida(Guid gameId, Guid playerId, DateTime timestamp)
    {
        var state = _store.Obter(gameId)
            ?? throw new InvalidOperationException("Partida não encontrada");
 
        lock (state)
        {
            if (state.PlayerIds.Count == 2)
                throw new InvalidOperationException("Batida não permitida para partida com 2 jogadores");
 
            if (state.Phase == "Playing")
            {
                // Verifica se alguém tem 3 trios de fato
                var alguemVenceu = state.PlayerIds.Any(pId => {
                    var mao = state.Hands[pId];
                    return EncontrarTodosOsTrios(mao).Count >= 3;
                });
 
                if (alguemVenceu)
                {
                    state.Phase = "Slapping"; // inicia a fase
                }
                else
                {
                    // bateu errado — penalidade
                    AplicarLetra(state, playerId);
                    return state;
                }
            }
 
            if (state.Phase != "Slapping")
            {
                return state;
            }
 
            // já bateu antes? ignora duplicidade
            if (state.SlapOrder.Any(s => s.PlayerId == playerId))
                return state;
 
            state.SlapOrder.Add((playerId, timestamp));
 
            // todos bateram — finaliza a rodada
            if (state.SlapOrder.Count == state.PlayerIds.Count)
            {
                FinalizarRodada(state);
            }
 
            return state;
        }
    }

    private void FinalizarRodada(GameState state)
    {
        // ordena por timestamp — o último a bater é o perdedor da rodada
        var ordenado = state.SlapOrder.OrderBy(s => s.Timestamp).ToList();
        var ultimoABater = ordenado.Last().PlayerId;

        AplicarLetra(state, ultimoABater);

        // penalidade extra: quem ficou com o coringa também leva letra
        if (state.CoringaHolderId.HasValue && state.CoringaHolderId != ultimoABater)
        {
            AplicarLetra(state, state.CoringaHolderId.Value);
        }

        state.LastRoundLoserId = ultimoABater;
        
        var isGameOver = state.PlayerLetters.Values.Any(l => l == GameState.LetrasCompletas);
        state.Phase = isGameOver ? "GameOver" : "RoundOver";
    }

    public GameState IniciarNovaRodada(Guid gameId)
    {
        var state = _store.Obter(gameId)
            ?? throw new InvalidOperationException("Partida não encontrada");

        if (state.Phase != "RoundOver")
            throw new InvalidOperationException("A partida não está em estado de fim de rodada");

        state.Phase = "Playing";
        state.SlapOrder.Clear();

        var startingPlayer = state.LastRoundLoserId ?? state.PlayerIds[0];

        // Redistribui as cartas para a próxima rodada!
        // O perdedor da rodada (startingPlayer) começa com 10 cartas, os demais com 9!
        var orderedPlayerIdsForDistribution = new List<Guid> { startingPlayer };
        orderedPlayerIdsForDistribution.AddRange(state.PlayerIds.Where(id => id != startingPlayer));

        Dictionary<Guid, List<Card>> maos = null;
        List<Card> baralho = null;
        int tentativas = 0;
        bool temTrioInicial;

        do
        {
            baralho = Deck.GerarBaralho(state.PlayerIds.Count);
            var baralhoCopia = new List<Card>(baralho);
            maos = Deck.Distribuir(baralhoCopia, orderedPlayerIdsForDistribution);

            temTrioInicial = false;
            foreach (var mao in maos.Values)
            {
                if (EncontrarTodosOsTrios(mao).Count > 0)
                {
                    temTrioInicial = true;
                    break;
                }
            }

            tentativas++;
            if (!temTrioInicial)
            {
                baralho = baralhoCopia;
            }
        } while (temTrioInicial && tentativas < 100);

        state.Hands = maos;
        state.DrawPile = baralho;
        state.DiscardPile.Clear();
        state.CurrentTurnPlayerId = startingPlayer;
        state.LastPassedCard = null;
        state.LastPassedCardToPlayerId = null;

        // atualiza o coringa holder após redistribuição
        state.CoringaHolderId = null;
        foreach (var (playerId, mao) in maos)
        {
            if (mao.Any(c => c.IsCoringa))
                state.CoringaHolderId = playerId;
        }

        return state;
    }

    public GameState ProcessarCompraDeCarta(Guid gameId, Guid playerId, string source)
    {
        var state = _store.Obter(gameId)
            ?? throw new InvalidOperationException("Partida não encontrada");
 
        lock (state)
        {
            if (state.CurrentTurnPlayerId != playerId)
                throw new InvalidOperationException("Não é a sua vez");
 
            var mao = state.Hands[playerId];
            if (mao.Count != 9)
                throw new InvalidOperationException("Você só pode comprar cartas se tiver exatamente 9 cartas na mão");
 
            Card cartaComprada;
            if (source.ToLower() == "pile")
            {
                if (state.DiscardPile.Count == 0)
                    throw new InvalidOperationException("A pilha de descarte está vazia");
 
                // Pega a carta do topo da pilha de descarte
                cartaComprada = state.DiscardPile.Last();
                state.DiscardPile.RemoveAt(state.DiscardPile.Count - 1);
            }
            else // default: draw from deck pile
            {
                if (state.DrawPile.Count == 0)
                {
                    // Se o monte acabar, reembaralha o descarte (deixando a última descartada se houver)
                    if (state.DiscardPile.Count <= 1)
                        throw new InvalidOperationException("Não há mais cartas no monte e nem no descarte!");
 
                    var lixo = state.DiscardPile.Take(state.DiscardPile.Count - 1).ToList();
                    state.DiscardPile.RemoveRange(0, state.DiscardPile.Count - 1);
 
                    // Embaralha o lixo e põe no deck
                    var random = new Random();
                    int n = lixo.Count;
                    while (n > 1)
                    {
                        n--;
                        int k = random.Next(n + 1);
                        var value = lixo[k];
                        lixo[k] = lixo[n];
                        lixo[n] = value;
                    }
                    state.DrawPile = lixo;
                }
 
                cartaComprada = state.DrawPile[0];
                state.DrawPile.RemoveAt(0);
            }
 
            mao.Add(cartaComprada);
 
            if (cartaComprada.IsCoringa)
                state.CoringaHolderId = playerId;
 
            // Define a carta comprada como proibida para este jogador neste turno
            state.LastPassedCard = cartaComprada;
            state.LastPassedCardToPlayerId = playerId;
 
            // Verifica se completou 3 trios após a compra (vitoria)
            VerificarVitoria(state, playerId);
 
            return state;
        }
    }

    private static readonly Dictionary<string, int> CardValuesMap = new()
    {
        { "A", 1 }, { "2", 2 }, { "3", 3 }, { "4", 4 }, { "5", 5 },
        { "6", 6 }, { "7", 7 }, { "8", 8 }, { "9", 9 }, { "10", 10 },
        { "J", 11 }, { "Q", 12 }, { "K", 13 }
    };

    private static bool EhTrioValido(Card c1, Card c2, Card c3)
    {
        if (c1.Value == "Coringa" || c2.Value == "Coringa" || c3.Value == "Coringa")
            return false;

        // Caso 1: Três de um tipo (valores iguais)
        if (c1.Value == c2.Value && c2.Value == c3.Value)
            return true;

        // Caso 2: Sequência crescente do mesmo naipe
        if (c1.Suit == c2.Suit && c2.Suit == c3.Suit)
        {
            if (CardValuesMap.TryGetValue(c1.Value, out int v1) &&
                CardValuesMap.TryGetValue(c2.Value, out int v2) &&
                CardValuesMap.TryGetValue(c3.Value, out int v3))
            {
                var list = new List<int> { v1, v2, v3 };
                list.Sort();
                if (list[1] == list[0] + 1 && list[2] == list[1] + 1)
                    return true;
            }
        }

        return false;
    }

    public static List<List<Card>> EncontrarTodosOsTrios(List<Card> hand)
    {
        var result = new List<List<Card>>();
        EncontrarTriosBacktracking(hand, new List<List<Card>>(), ref result);
        return result;
    }

    private static void EncontrarTriosBacktracking(List<Card> remaining, List<List<Card>> currentTrios, ref List<List<Card>> bestTrios)
    {
        if (currentTrios.Count > bestTrios.Count)
        {
            bestTrios = new List<List<Card>>(currentTrios);
        }

        if (remaining.Count < 3)
            return;

        for (int i = 0; i < remaining.Count; i++)
        {
            for (int j = i + 1; j < remaining.Count; j++)
            {
                for (int k = j + 1; k < remaining.Count; k++)
                {
                    var c1 = remaining[i];
                    var c2 = remaining[j];
                    var c3 = remaining[k];

                    if (EhTrioValido(c1, c2, c3))
                    {
                        var newTrios = new List<List<Card>>(currentTrios) { new() { c1, c2, c3 } };
                        var nextRemaining = new List<Card>(remaining);
                        nextRemaining.RemoveAt(k);
                        nextRemaining.RemoveAt(j);
                        nextRemaining.RemoveAt(i);

                        EncontrarTriosBacktracking(nextRemaining, newTrios, ref bestTrios);
                    }
                }
            }
        }
    }

    private void AplicarLetra(GameState state, Guid playerId)
    {
        var letrasAtuais = state.PlayerLetters[playerId];
        var proximaLetra = GameState.LetrasCompletas[letrasAtuais.Length];
        state.PlayerLetters[playerId] = letrasAtuais + proximaLetra;
    }

    public bool PartidaEncerrada(Guid gameId) =>
        _store.Obter(gameId)?.Phase == "GameOver";
}