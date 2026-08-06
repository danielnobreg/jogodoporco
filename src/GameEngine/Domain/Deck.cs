namespace GameEngine.Domain;

public static class Deck
{
    private static readonly string[] Naipes = { "Copas", "Ouros", "Espadas", "Paus" };

    // gera o baralho completo (52 cartas) com 1/50 de chance de conter 1 coringa adicional
    public static List<Card> GerarBaralho(int numeroDeJogadores)
    {
        var baralho = new List<Card>();
        var random = new Random();

        var valores = new[] { "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K" };
        foreach (var valor in valores)
        {
            foreach (var naipe in Naipes)
            {
                baralho.Add(new Card(naipe, valor));
            }
        }

        // 1 em 50 chances de ter coringa
        if (random.Next(50) == 0)
        {
            baralho.Add(new Card("Especial", "Coringa"));
        }

        // Fisher-Yates Shuffle para embaralhar com alta entropia
        int n = baralho.Count;
        while (n > 1)
        {
            n--;
            int k = random.Next(n + 1);
            var value = baralho[k];
            baralho[k] = baralho[n];
            baralho[n] = value;
        }

        return baralho;
    }

    // distribui as cartas: primeiro jogador recebe 5, os demais recebem 4
    public static Dictionary<Guid, List<Card>> Distribuir(List<Card> baralho, List<Guid> playerIds)
    {
        var maos = playerIds.ToDictionary(id => id, _ => new List<Card>());

        for (int i = 0; i < playerIds.Count; i++)
        {
            var targetCount = i == 0 ? 10 : 9;
            for (int j = 0; j < targetCount; j++)
            {
                if (baralho.Count > 0)
                {
                    var carta = baralho[0];
                    baralho.RemoveAt(0);
                    maos[playerIds[i]].Add(carta);
                }
            }
        }

        return maos;
    }
}