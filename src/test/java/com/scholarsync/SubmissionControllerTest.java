package com.scholarsync;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarsync.dto.auth.LoginRequest;
import com.scholarsync.dto.auth.RegisterRequest;
import com.scholarsync.dto.project.CreateProjectRequest;
import com.scholarsync.dto.submission.CreateSubmissionRequest;
import com.scholarsync.dto.submission.FeedbackRequest;
import com.scholarsync.dto.submission.UpdateSubmissionStatusRequest;
import com.scholarsync.dto.task.CreateTaskRequest;
import com.scholarsync.dto.task.TaskTransitionRequest;
import com.scholarsync.entity.Role;
import com.scholarsync.entity.SubmissionStatus;
import com.scholarsync.entity.TaskStateEnum;
import com.scholarsync.repository.ResearchProjectRepository;
import com.scholarsync.repository.ResearchSubmissionRepository;
import com.scholarsync.repository.ResearchTaskRepository;
import com.scholarsync.repository.SubmissionFeedbackRepository;
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
public class SubmissionControllerTest {

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

    @Autowired
    private ResearchSubmissionRepository submissionRepository;

    @Autowired
    private SubmissionFeedbackRepository feedbackRepository;

    @BeforeEach
    void setUp() {
        feedbackRepository.deleteAll();
        submissionRepository.deleteAll();
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
    @DisplayName("Complete Deliverables Workflow: Submit v1, v2, Snapshot Memento, Feedback, Status Review")
    void testCompleteSubmissionLifecycle() throws Exception {
        // 1. Setup supervisor and student
        String supervisorToken = registerAndGetToken("Dr. Turing", "turing.sub@test.edu", "password123", Role.SUPERVISOR);
        Long studentId = registerAndGetId("Claude Shannon", "shannon.sub@test.edu", "password123", Role.STUDENT);
        String studentToken = registerAndGetToken("Claude Shannon 2", "shannon.token@test.edu", "password123", Role.STUDENT);
        // Register another student to test eligible students query
        registerAndGetId("John von Neumann", "neumann.sub@test.edu", "password123", Role.STUDENT);

        // 2. Create project
        CreateProjectRequest projectReq = CreateProjectRequest.builder()
                .title("Information Theory Project")
                .description("Fundamental limits of data compression")
                .studentIds(Collections.singleton(studentId))
                .build();

        MvcResult projResult = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projectReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long projectId = objectMapper.readTree(projResult.getResponse().getContentAsString()).get("id").asLong();

        // Test eligible students search (filtered by query)
        mockMvc.perform(get("/api/projects/" + projectId + "/eligible-students?query=Neumann")
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].email", is("neumann.sub@test.edu")));

        // 3. Create task
        CreateTaskRequest taskReq = CreateTaskRequest.builder()
                .title("Compute Entropy of English Text")
                .description("Measure n-gram entropy across Corpus")
                .assignedStudentId(studentId)
                .build();

        MvcResult taskResult = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long taskId = objectMapper.readTree(taskResult.getResponse().getContentAsString()).get("id").asLong();

        // Transition task PROPOSED -> LITERATURE_REVIEW -> EXPERIMENTATION
        mockMvc.perform(post("/api/tasks/" + taskId + "/transition")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TaskTransitionRequest.builder()
                                .targetState(TaskStateEnum.LITERATURE_REVIEW).build())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/tasks/" + taskId + "/transition")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(TaskTransitionRequest.builder()
                                .targetState(TaskStateEnum.EXPERIMENTATION).build())))
                .andExpect(status().isOk());

        // 4. Student submits Deliverable v1
        CreateSubmissionRequest sub1Req = CreateSubmissionRequest.builder()
                .title("Initial Draft & N-gram Scripts")
                .description("Python implementation of character-level entropy")
                .artifactLocation("https://github.com/shannon/entropy-calc/tree/v1.0")
                .draft(false)
                .build();

        MvcResult sub1Result = mockMvc.perform(post("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sub1Req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionNumber", is("v1")))
                .andExpect(jsonPath("$.status", is("SUBMITTED")))
                .andExpect(jsonPath("$.title", is("Initial Draft & N-gram Scripts")))
                .andReturn();

        Long sub1Id = objectMapper.readTree(sub1Result.getResponse().getContentAsString()).get("id").asLong();

        // 5. Test Memento snapshot endpoint
        mockMvc.perform(get("/api/submissions/" + sub1Id + "/snapshot")
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.versionNumber", is("v1")))
                .andExpect(jsonPath("$.artifactLocation", is("https://github.com/shannon/entropy-calc/tree/v1.0")))
                .andExpect(jsonPath("$.timestamp", notNullValue()));

        // 6. Supervisor adds feedback to v1
        FeedbackRequest fbReq = FeedbackRequest.builder()
                .comment("Please add trigram model analysis and convergence graphs.")
                .build();

        mockMvc.perform(post("/api/submissions/" + sub1Id + "/feedback")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fbReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.comment", containsString("Please add trigram model")))
                .andExpect(jsonPath("$.supervisor.name", is("Dr. Turing")));

        // 7. Student submits revised Deliverable v2
        CreateSubmissionRequest sub2Req = CreateSubmissionRequest.builder()
                .title("Revised Draft with Trigrams")
                .description("Includes trigram charts and PDF report")
                .artifactLocation("https://github.com/shannon/entropy-calc/tree/v2.0")
                .draft(false)
                .build();

        MvcResult sub2Result = mockMvc.perform(post("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sub2Req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionNumber", is("v2")))
                .andReturn();

        Long sub2Id = objectMapper.readTree(sub2Result.getResponse().getContentAsString()).get("id").asLong();

        // 8. List submissions for task
        mockMvc.perform(get("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].versionNumber", is("v1")))
                .andExpect(jsonPath("$[1].versionNumber", is("v2")));

        // 9. Supervisor reviews and approves v2
        UpdateSubmissionStatusRequest reviewReq = UpdateSubmissionStatusRequest.builder()
                .status(SubmissionStatus.APPROVED)
                .feedbackComment("Outstanding improvements! Approved.")
                .build();

        mockMvc.perform(patch("/api/submissions/" + sub2Id + "/status")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reviewReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("APPROVED")))
                .andExpect(jsonPath("$.feedbackList", hasSize(1)))
                .andExpect(jsonPath("$.feedbackList[0].comment", is("Outstanding improvements! Approved.")));
    }
}
