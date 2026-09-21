package com.scholarsync;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarsync.dto.auth.LoginRequest;
import com.scholarsync.dto.auth.RegisterRequest;
import com.scholarsync.dto.project.CreateProjectRequest;
import com.scholarsync.entity.Role;
import com.scholarsync.repository.ResearchProjectRepository;
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
import org.springframework.test.web.servlet.MvcResult;

import java.util.Collections;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResearchProjectRepository projectRepository;

    @BeforeEach
    void setUp() {
        projectRepository.deleteAll();
        userRepository.deleteAll();
    }

    private String registerAndGetToken(String name, String email, String password, Role role) throws Exception {
        RegisterRequest register = RegisterRequest.builder()
                .name(name)
                .email(email)
                .password(password)
                .role(role)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated());

        LoginRequest login = LoginRequest.builder()
                .email(email)
                .password(password)
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode responseJson = objectMapper.readTree(result.getResponse().getContentAsString());
        return responseJson.get("token").asText();
    }

    private Long registerAndGetId(String name, String email, String password, Role role) throws Exception {
        RegisterRequest register = RegisterRequest.builder()
                .name(name)
                .email(email)
                .password(password)
                .role(role)
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode responseJson = objectMapper.readTree(result.getResponse().getContentAsString());
        return responseJson.get("id").asLong();
    }

    @Test
    @DisplayName("Supervisor should successfully create a research project")
    void testSupervisorCanCreateProject() throws Exception {
        String supervisorToken = registerAndGetToken("Prof. Charles", "charles@scholarsync.edu", "pass1234", Role.SUPERVISOR);

        CreateProjectRequest request = CreateProjectRequest.builder()
                .title("Quantum Computing Foundations")
                .description("Investigating NISQ algorithms and error mitigation.")
                .build();

        mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Quantum Computing Foundations")))
                .andExpect(jsonPath("$.supervisor.email", is("charles@scholarsync.edu")))
                .andExpect(jsonPath("$.students", hasSize(0)));
    }

    @Test
    @DisplayName("Student attempting to create a project must be rejected with 403 Forbidden")
    void testStudentCannotCreateProject() throws Exception {
        String studentToken = registerAndGetToken("John Student", "john@scholarsync.edu", "pass1234", Role.STUDENT);

        CreateProjectRequest request = CreateProjectRequest.builder()
                .title("Unauthorized Student Project")
                .description("Trying to act as supervisor.")
                .build();

        mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)));
    }

    @Test
    @DisplayName("Unauthenticated user attempting to create a project must be rejected with 401 Unauthorized")
    void testUnauthenticatedCannotCreateProject() throws Exception {
        CreateProjectRequest request = CreateProjectRequest.builder()
                .title("Anonymous Project")
                .description("No token provided.")
                .build();

        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("Supervisor and enrolled student can view project, but unrelated student gets 403 Forbidden")
    void testProjectAccessControl() throws Exception {
        String supervisorToken = registerAndGetToken("Prof. Turing", "turing@scholarsync.edu", "pass1234", Role.SUPERVISOR);
        Long student1Id = registerAndGetId("Enrolled Student", "student1@scholarsync.edu", "pass1234", Role.STUDENT);
        String student1Token = registerAndGetToken("Enrolled Student", "student1_login@scholarsync.edu", "pass1234", Role.STUDENT);
        // Let's create proper enrolled token
        LoginRequest enrolledLogin = LoginRequest.builder().email("student1@scholarsync.edu").password("pass1234").build();
        MvcResult enrolledLoginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(enrolledLogin)))
                .andExpect(status().isOk())
                .andReturn();
        String realStudent1Token = objectMapper.readTree(enrolledLoginResult.getResponse().getContentAsString()).get("token").asText();

        String unrelatedStudentToken = registerAndGetToken("Unrelated Student", "outsider@scholarsync.edu", "pass1234", Role.STUDENT);

        // Supervisor creates project with student1 assigned
        CreateProjectRequest request = CreateProjectRequest.builder()
                .title("Cryptography Protocol Design")
                .description("Verifiable secret sharing protocols.")
                .studentIds(Collections.singleton(student1Id))
                .build();

        MvcResult createResult = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        Long projectId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        // 1. Supervisor can view project details
        mockMvc.perform(get("/api/projects/" + projectId)
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(projectId.intValue())))
                .andExpect(jsonPath("$.students", hasSize(1)))
                .andExpect(jsonPath("$.students[0].email", is("student1@scholarsync.edu")));

        // 2. Enrolled student can view project details
        mockMvc.perform(get("/api/projects/" + projectId)
                        .header("Authorization", "Bearer " + realStudent1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(projectId.intValue())));

        // 3. Unrelated student is forbidden (403) from viewing project details
        mockMvc.perform(get("/api/projects/" + projectId)
                        .header("Authorization", "Bearer " + unrelatedStudentToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")));
    }

    @Test
    @DisplayName("Supervisor can assign student to existing project")
    void testSupervisorCanAssignStudentToProject() throws Exception {
        String supervisorToken = registerAndGetToken("Prof. Lovelace", "lovelace@scholarsync.edu", "pass1234", Role.SUPERVISOR);
        Long studentId = registerAndGetId("Ada Student", "ada.student@scholarsync.edu", "pass1234", Role.STUDENT);

        CreateProjectRequest request = CreateProjectRequest.builder()
                .title("Analytical Engine Compilers")
                .description("Modernizing mechanical code analysis.")
                .build();

        MvcResult createResult = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        Long projectId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        // Assign student to project
        mockMvc.perform(post("/api/projects/" + projectId + "/students/" + studentId)
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.students", hasSize(1)))
                .andExpect(jsonPath("$.students[0].id", is(studentId.intValue())));
    }
}
