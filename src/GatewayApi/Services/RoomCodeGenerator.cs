namespace GatewayApi.Services;

public static class RoomCodeGenerator
{
    // sem caracteres ambíguos: sem 0/O, sem 1/I/L
    private const string Chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static readonly Random Random = new();

    public static string Gerar()
    {
        return new string(Enumerable.Range(0, 6)
            .Select(_ => Chars[Random.Next(Chars.Length)])
            .ToArray());
    }
}