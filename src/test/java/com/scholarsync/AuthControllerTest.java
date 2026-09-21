package com.scholarsync;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarsync.dto.auth.LoginRequest;
import com.scholarsync.dto.auth.RegisterRequest;
import com.scholarsync.entity.Role;
import com.scholarsync.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("Should successfully register a new supervisor")
    void testRegisterSuccess() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .name("Dr. Alan Turing")
                .email("alan.turing@cambridge.ac.uk")
                .password("securePassword123")
                .role(Role.SUPERVISOR)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name", is("Dr. Alan Turing")))
                .andExpect(jsonPath("$.email", is("alan.turing@cambridge.ac.uk")))
                .andExpect(jsonPath("$.role", is("SUPERVISOR")))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    @DisplayName("Should reject registration with duplicate email")
    void testRegisterDuplicateEmailFails() throws Exception {
        RegisterRequest first = RegisterRequest.builder()
                .name("Student One")
                .email("student@scholarsync.edu")
                .password("password123")
                .role(Role.STUDENT)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(first)))
                .andExpect(status().isCreated());

        RegisterRequest duplicate = RegisterRequest.builder()
                .name("Student Two")
                .email("student@scholarsync.edu")
                .password("anotherPassword456")
                .role(Role.STUDENT)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicate)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    @DisplayName("Should reject registration with invalid input")
    void testRegisterValidationFailure() throws Exception {
        RegisterRequest invalid = RegisterRequest.builder()
                .name("")
                .email("not-an-email")
                .password("123") // too short
                .role(null)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.validationErrors", notNullValue()));
    }

    @Test
    @DisplayName("Should login successfully with valid credentials and return JWT")
    void testLoginSuccessReturnsJwt() throws Exception {
        RegisterRequest register = RegisterRequest.builder()
                .name("Alice Smith")
                .email("alice@scholarsync.edu")
                .password("strongPass789")
                .role(Role.STUDENT)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated());

        LoginRequest login = LoginRequest.builder()
                .email("alice@scholarsync.edu")
                .password("strongPass789")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.type", is("Bearer")))
                .andExpect(jsonPath("$.user.email", is("alice@scholarsync.edu")))
                .andExpect(jsonPath("$.user.role", is("STUDENT")))
                .andExpect(jsonPath("$.user.password").doesNotExist());
    }

    @Test
    @DisplayName("Should reject login with invalid password")
    void testLoginWithInvalidPasswordFails() throws Exception {
        RegisterRequest register = RegisterRequest.builder()
                .name("Bob Lee")
                .email("bob@scholarsync.edu")
                .password("correctPassword")
                .role(Role.STUDENT)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated());

        LoginRequest login = LoginRequest.builder()
                .email("bob@scholarsync.edu")
                .password("wrongPassword")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")));
    }

    @Test
    @DisplayName("Should reject login for non-existent user")
    void testLoginWithNonexistentEmailFails() throws Exception {
        LoginRequest login = LoginRequest.builder()
                .email("ghost@scholarsync.edu")
                .password("somePassword")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("Should reject unauthenticated access to /api/auth/me")
    void testUnauthenticatedProfileAccessFails() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }
}
