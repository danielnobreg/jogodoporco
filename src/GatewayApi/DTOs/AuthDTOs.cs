using System.ComponentModel.DataAnnotations;

namespace GatewayApi.DTOs;

// equivalente ao CreateUserRequest do TaskFlow
public record RegisterRequest(
    [Required][MaxLength(30)] string Username,
    [Required][EmailAddress] string Email,
    [Required][MinLength(6)] string Password
);

// equivalente ao AuthRequest do TaskFlow
public record LoginRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password
);

// equivalente ao AuthDTO do TaskFlow
public record AuthResponse(
    string Token,
    string Username,
    string Email
);