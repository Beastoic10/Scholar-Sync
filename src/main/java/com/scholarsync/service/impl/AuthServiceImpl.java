package com.scholarsync.service.impl;

import com.scholarsync.dto.auth.AuthResponse;
import com.scholarsync.dto.auth.LoginRequest;
import com.scholarsync.dto.auth.RegisterRequest;
import com.scholarsync.dto.auth.UserResponse;
import com.scholarsync.entity.Role;
import com.scholarsync.entity.User;
import com.scholarsync.exception.BadRequestException;
import com.scholarsync.exception.DuplicateEmailException;
import com.scholarsync.exception.ResourceNotFoundException;
import com.scholarsync.repository.UserRepository;
import com.scholarsync.security.JwtTokenProvider;
import com.scholarsync.security.UserPrincipal;
import com.scholarsync.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateEmailException(normalizedEmail);
        }

        if (request.getRole() != Role.STUDENT && request.getRole() != Role.SUPERVISOR) {
            throw new BadRequestException("Invalid role. Allowed roles are: STUDENT, SUPERVISOR");
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();

        User savedUser = userRepository.save(user);
        log.info("Registered new user with id: {}, role: {}", savedUser.getId(), savedUser.getRole());

        return UserResponse.fromEntity(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
        );

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = tokenProvider.generateToken(principal);

        User user = userRepository.findByEmail(principal.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", principal.getEmail()));

        log.info("User logged in successfully: {}", principal.getEmail());

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .user(UserResponse.fromEntity(user))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new BadRequestException("No authenticated user in context");
        }
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));
        return UserResponse.fromEntity(user);
    }
}
