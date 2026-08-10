using GatewayApi.DTOs;
using GatewayApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace GatewayApi.Controllers;

[ApiController]
[Route("guest")]
public class GuestController : ControllerBase
{
    private readonly IGuestService _guestService;

    public GuestController(IGuestService guestService) => _guestService = guestService;

    [HttpPost("join")]
    public async Task<IActionResult> Join([FromBody] GuestJoinRequest request)
    {
        var response = await _guestService.JoinAsGuestAsync(request);
        return Ok(response);
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] GuestCreateRoomRequest request)
    {
        var response = await _guestService.CreateAsGuestAsync(request);
        return Ok(response);
    }
}