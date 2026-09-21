package com.scholarsync.controller;

import com.scholarsync.dto.auth.AuthResponse;
import com.scholarsync.dto.auth.LoginRequest;
import com.scholarsync.dto.auth.RegisterRequest;
import com.scholarsync.dto.auth.UserResponse;
import com.scholarsync.security.UserPrincipal;
import com.scholarsync.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Endpoints for user registration, authentication, and profile retrieval")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user", description = "Registers a new user as either STUDENT or SUPERVISOR")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "User successfully registered"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload or validation failure"),
            @ApiResponse(responseCode = "409", description = "Email already in use")
    })
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user", description = "Authenticates user credentials and returns a signed JWT token")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authentication successful, token returned"),
            @ApiResponse(responseCode = "400", description = "Invalid request payload"),
            @ApiResponse(responseCode = "401", description = "Invalid email or password")
    })
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user profile", description = "Retrieves the authenticated user's profile details")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Current user retrieved"),
            @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal UserPrincipal currentUser) {
        UserResponse response = authService.getCurrentUser(currentUser);
        return ResponseEntity.ok(response);
    }
}
