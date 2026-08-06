namespace SharedContracts;

public record Card(string Suit, string Value)
{
    public bool IsCoringa => Value == "Coringa";
    public override string ToString() => IsCoringa ? "Coringa" : $"{Value} de {Suit}";
}
