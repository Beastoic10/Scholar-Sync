package com.scholarsync.service;

import com.scholarsync.dto.auth.AuthResponse;
import com.scholarsync.dto.auth.LoginRequest;
import com.scholarsync.dto.auth.RegisterRequest;
import com.scholarsync.dto.auth.UserResponse;
import com.scholarsync.security.UserPrincipal;

public interface AuthService {

    UserResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    UserResponse getCurrentUser(UserPrincipal currentUser);
}
