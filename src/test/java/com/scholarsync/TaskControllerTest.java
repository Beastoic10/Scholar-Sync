package com.scholarsync;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarsync.dto.auth.LoginRequest;
import com.scholarsync.dto.auth.RegisterRequest;
import com.scholarsync.dto.project.CreateProjectRequest;
import com.scholarsync.dto.task.CreateTaskRequest;
import com.scholarsync.dto.task.TaskTransitionRequest;
import com.scholarsync.entity.Role;
import com.scholarsync.entity.TaskStateEnum;
import com.scholarsync.repository.ResearchProjectRepository;
import com.scholarsync.repository.ResearchTaskRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResearchProjectRepository projectRepository;

    @Autowired
    private ResearchTaskRepository taskRepository;

    @BeforeEach
    void setUp() {
        taskRepository.deleteAll();
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
    @DisplayName("Supervisor creates task in project successfully")
    void testCreateTaskSuccess() throws Exception {
        String supervisorToken = registerAndGetToken("Prof. Euler", "euler@scholarsync.edu", "pass1234", Role.SUPERVISOR);
        Long studentId = registerAndGetId("Carl Gauss", "gauss@scholarsync.edu", "pass1234", Role.STUDENT);

        CreateProjectRequest projReq = CreateProjectRequest.builder()
                .title("Graph Theory & Topology")
                .studentIds(Collections.singleton(studentId))
                .build();

        MvcResult projResult = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long projectId = objectMapper.readTree(projResult.getResponse().getContentAsString()).get("id").asLong();

        CreateTaskRequest taskReq = CreateTaskRequest.builder()
                .title("Seven Bridges Analysis")
                .description("Initial literature and formal proof.")
                .assignedStudentId(studentId)
                .build();

        mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title", is("Seven Bridges Analysis")))
                .andExpect(jsonPath("$.currentState", is("PROPOSED")))
                .andExpect(jsonPath("$.assignedStudent.id", is(studentId.intValue())));
    }

    @Test
    @DisplayName("Student outside project cannot access or create tasks (403 Forbidden)")
    void testOutsideStudentCannotAccessTasks() throws Exception {
        String supervisorToken = registerAndGetToken("Prof. Gauss", "gauss.prof@scholarsync.edu", "pass1234", Role.SUPERVISOR);
        String outsiderToken = registerAndGetToken("Outsider Student", "outsider@scholarsync.edu", "pass1234", Role.STUDENT);

        CreateProjectRequest projReq = CreateProjectRequest.builder()
                .title("Private Project")
                .build();

        MvcResult projResult = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long projectId = objectMapper.readTree(projResult.getResponse().getContentAsString()).get("id").asLong();

        CreateTaskRequest taskReq = CreateTaskRequest.builder()
                .title("Intruder Task")
                .build();

        // Outsider attempts to create task
        mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + outsiderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)));

        // Outsider attempts to view tasks
        mockMvc.perform(get("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)));
    }

    @Test
    @DisplayName("Full Kanban State Lifecycle: PROPOSED -> LITERATURE_REVIEW -> EXPERIMENTATION -> UNDER_REVIEW -> APPROVED")
    void testFullKanbanLifecycleTransitions() throws Exception {
        String supervisorToken = registerAndGetToken("Prof. Hilbert", "hilbert@scholarsync.edu", "pass1234", Role.SUPERVISOR);
        String studentToken = registerAndGetToken("Kurt Godel", "godel@scholarsync.edu", "pass1234", Role.STUDENT);

        // Fetch student id
        MvcResult meResult = mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andReturn();
        Long studentId = objectMapper.readTree(meResult.getResponse().getContentAsString()).get("id").asLong();

        // Create project with student
        CreateProjectRequest projReq = CreateProjectRequest.builder()
                .title("Formal Axiomatics")
                .studentIds(Collections.singleton(studentId))
                .build();

        MvcResult projResult = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projReq)))
                .andExpect(status().isCreated())
                .andReturn();
        Long projectId = objectMapper.readTree(projResult.getResponse().getContentAsString()).get("id").asLong();

        // Create task
        CreateTaskRequest taskReq = CreateTaskRequest.builder()
                .title("Completeness Proof Verification")
                .assignedStudentId(studentId)
                .build();

        MvcResult taskResult = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated())
                .andReturn();
        Long taskId = objectMapper.readTree(taskResult.getResponse().getContentAsString()).get("id").asLong();

        // 1. Invalid transition: PROPOSED -> APPROVED must fail (400)
        TaskTransitionRequest invalidDirectJump = TaskTransitionRequest.builder()
                .targetState(TaskStateEnum.APPROVED)
                .build();

        mockMvc.perform(post("/api/tasks/" + taskId + "/transition")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDirectJump)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("INVALID_TASK_TRANSITION")));

        // 2. Student transitions: PROPOSED -> LITERATURE_REVIEW (200)
        TaskTransitionRequest toLit = TaskTransitionRequest.builder()
                .targetState(TaskStateEnum.LITERATURE_REVIEW)
                .build();

        mockMvc.perform(post("/api/tasks/" + taskId + "/transition")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toLit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentState", is("LITERATURE_REVIEW")));

        // 3. Student transitions: LITERATURE_REVIEW -> EXPERIMENTATION (200)
        TaskTransitionRequest toExp = TaskTransitionRequest.builder()
                .targetState(TaskStateEnum.EXPERIMENTATION)
                .build();

        mockMvc.perform(post("/api/tasks/" + taskId + "/transition")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toExp)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentState", is("EXPERIMENTATION")));

        // 4. Student transitions: EXPERIMENTATION -> UNDER_REVIEW (200)
        TaskTransitionRequest toReview = TaskTransitionRequest.builder()
                .targetState(TaskStateEnum.UNDER_REVIEW)
                .build();

        mockMvc.perform(post("/api/tasks/" + taskId + "/transition")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toReview)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentState", is("UNDER_REVIEW")));

        // 5. Student attempts UNDER_REVIEW -> APPROVED: MUST FAIL (403 Forbidden)
        TaskTransitionRequest toApprove = TaskTransitionRequest.builder()
                .targetState(TaskStateEnum.APPROVED)
                .build();

        mockMvc.perform(post("/api/tasks/" + taskId + "/transition")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toApprove)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.message", containsString("Students cannot approve tasks")));

        // 6. Supervisor approves: UNDER_REVIEW -> APPROVED: MUST SUCCEED (200)
        mockMvc.perform(post("/api/tasks/" + taskId + "/transition")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(toApprove)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentState", is("APPROVED")));
    }
}
