package com.scholarsync;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarsync.dto.auth.LoginRequest;
import com.scholarsync.dto.auth.RegisterRequest;
import com.scholarsync.dto.project.CreateProjectRequest;
import com.scholarsync.dto.submission.CreateSubmissionRequest;
import com.scholarsync.dto.submission.FeedbackRequest;
import com.scholarsync.dto.task.CreateTaskRequest;
import com.scholarsync.entity.ResearchSubmission;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Collections;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
    @DisplayName("First submission creates v1.0 and second creates v1.1")
    void testVersionNumberingSequence() throws Exception {
        String supervisorToken = registerAndGetToken("Dr. Supervisor", "sup1@test.edu", "pass123", Role.SUPERVISOR);
        Long studentId = registerAndGetId("Alice Student", "alice1@test.edu", "pass123", Role.STUDENT);
        String studentToken = registerAndGetToken("Alice Student 2", "alice.token@test.edu", "pass123", Role.STUDENT);

        CreateProjectRequest projectReq = CreateProjectRequest.builder()
                .title("Neural Networks Project")
                .studentIds(Collections.singleton(studentId))
                .build();

        MvcResult projRes = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projectReq)))
                .andExpect(status().isCreated()).andReturn();
        Long projectId = objectMapper.readTree(projRes.getResponse().getContentAsString()).get("id").asLong();

        CreateTaskRequest taskReq = CreateTaskRequest.builder()
                .title("CNN Model Implementation")
                .assignedStudentId(studentId)
                .build();

        MvcResult taskRes = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated()).andReturn();
        Long taskId = objectMapper.readTree(taskRes.getResponse().getContentAsString()).get("id").asLong();

        // 1. First submission -> v1.0
        CreateSubmissionRequest sub1 = CreateSubmissionRequest.builder()
                .title("Initial PyTorch Architecture")
                .artifactLocation("https://github.com/alice/cnn/v1.0")
                .build();

        mockMvc.perform(post("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sub1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionNumber", is("v1.0")))
                .andExpect(jsonPath("$.status", is("SUBMITTED")));

        // 2. Second submission -> v1.1
        CreateSubmissionRequest sub2 = CreateSubmissionRequest.builder()
                .title("Tuned Hyperparameters")
                .artifactLocation("https://github.com/alice/cnn/v1.1")
                .build();

        mockMvc.perform(post("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sub2)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionNumber", is("v1.1")));
    }

    @Test
    @DisplayName("Duplicate versions are prevented by database uniqueness constraint")
    void testDuplicateVersionsPrevented() throws Exception {
        String supervisorToken = registerAndGetToken("Dr. Supervisor", "sup2@test.edu", "pass123", Role.SUPERVISOR);
        Long studentId = registerAndGetId("Bob Student", "bob@test.edu", "pass123", Role.STUDENT);

        CreateProjectRequest projectReq = CreateProjectRequest.builder()
                .title("Quantum Optics")
                .studentIds(Collections.singleton(studentId))
                .build();

        MvcResult projRes = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projectReq)))
                .andExpect(status().isCreated()).andReturn();
        Long projectId = objectMapper.readTree(projRes.getResponse().getContentAsString()).get("id").asLong();

        CreateTaskRequest taskReq = CreateTaskRequest.builder().title("Interferometer Setup").build();
        MvcResult taskRes = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated()).andReturn();
        Long taskId = objectMapper.readTree(taskRes.getResponse().getContentAsString()).get("id").asLong();

        // Create first submission v1.0
        CreateSubmissionRequest sub1 = CreateSubmissionRequest.builder().title("Laser Alignment").build();
        mockMvc.perform(post("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sub1)))
                .andExpect(status().isCreated());

        // Attempt direct database save with duplicate versionNumber
        assertThrows(DataIntegrityViolationException.class, () -> {
            var task = taskRepository.findById(taskId).get();
            var user = userRepository.findByEmail("sup2@test.edu").get();
            ResearchSubmission duplicate = ResearchSubmission.builder()
                    .task(task)
                    .versionNumber("v1.0")
                    .submittedBy(user)
                    .title("Duplicate Version")
                    .build();
            submissionRepository.saveAndFlush(duplicate);
        });
    }

    @Test
    @DisplayName("Student cannot approve or reject submissions")
    void testStudentCannotApproveOrReject() throws Exception {
        String supervisorToken = registerAndGetToken("Dr. Supervisor", "sup3@test.edu", "pass123", Role.SUPERVISOR);
        Long studentId = registerAndGetId("Carol Student", "carol@test.edu", "pass123", Role.STUDENT);
        String studentToken = registerAndGetToken("Carol Student 2", "carol.tok@test.edu", "pass123", Role.STUDENT);

        CreateProjectRequest projectReq = CreateProjectRequest.builder()
                .title("Robotics Lab")
                .studentIds(Collections.singleton(studentId))
                .build();
        MvcResult projRes = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projectReq)))
                .andExpect(status().isCreated()).andReturn();
        Long projectId = objectMapper.readTree(projRes.getResponse().getContentAsString()).get("id").asLong();

        CreateTaskRequest taskReq = CreateTaskRequest.builder().title("PID Controller").build();
        MvcResult taskRes = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated()).andReturn();
        Long taskId = objectMapper.readTree(taskRes.getResponse().getContentAsString()).get("id").asLong();

        CreateSubmissionRequest sub = CreateSubmissionRequest.builder().title("Draft Firmware").build();
        MvcResult subRes = mockMvc.perform(post("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sub)))
                .andExpect(status().isCreated()).andReturn();
        Long subId = objectMapper.readTree(subRes.getResponse().getContentAsString()).get("id").asLong();

        // Student tries to approve
        mockMvc.perform(post("/api/submissions/" + subId + "/approve")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        // Student tries to reject
        mockMvc.perform(post("/api/submissions/" + subId + "/reject")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Supervisor can review, approve, reject, feedback, and student can create next version after rejection")
    void testSupervisorWorkflowAndRejectionPreservation() throws Exception {
        String supervisorToken = registerAndGetToken("Dr. Supervisor", "sup4@test.edu", "pass123", Role.SUPERVISOR);
        Long studentId = registerAndGetId("David Student", "david@test.edu", "pass123", Role.STUDENT);

        CreateProjectRequest projectReq = CreateProjectRequest.builder()
                .title("Genome Assembly")
                .studentIds(Collections.singleton(studentId))
                .build();
        MvcResult projRes = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projectReq)))
                .andExpect(status().isCreated()).andReturn();
        Long projectId = objectMapper.readTree(projRes.getResponse().getContentAsString()).get("id").asLong();

        CreateTaskRequest taskReq = CreateTaskRequest.builder().title("De Bruijn Graph Assembly").build();
        MvcResult taskRes = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated()).andReturn();
        Long taskId = objectMapper.readTree(taskRes.getResponse().getContentAsString()).get("id").asLong();

        // 1. Submit v1.0
        CreateSubmissionRequest sub1 = CreateSubmissionRequest.builder().title("K-mer Index v1").build();
        MvcResult sub1Res = mockMvc.perform(post("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sub1)))
                .andExpect(status().isCreated()).andReturn();
        Long sub1Id = objectMapper.readTree(sub1Res.getResponse().getContentAsString()).get("id").asLong();

        // 2. Supervisor marks UNDER_REVIEW
        mockMvc.perform(post("/api/submissions/" + sub1Id + "/review")
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("UNDER_REVIEW")));

        // 3. Supervisor adds feedback comment
        FeedbackRequest fbReq = FeedbackRequest.builder().comment("K-mer size 21 is too small. Use k=31.").build();
        mockMvc.perform(post("/api/submissions/" + sub1Id + "/feedback")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(fbReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.comment", containsString("Use k=31")));

        // 4. Supervisor REJECTS v1.0
        FeedbackRequest rejectFb = FeedbackRequest.builder().comment("Insufficient accuracy.").build();
        mockMvc.perform(post("/api/submissions/" + sub1Id + "/reject")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectFb)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("REJECTED")));

        // 5. Verify v1.0 remains in history with REJECTED status
        mockMvc.perform(get("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].versionNumber", is("v1.0")))
                .andExpect(jsonPath("$[0].status", is("REJECTED")));

        // 6. Student creates next version after rejection -> v1.1
        CreateSubmissionRequest sub2 = CreateSubmissionRequest.builder().title("K-mer Index with k=31").build();
        MvcResult sub2Res = mockMvc.perform(post("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sub2)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.versionNumber", is("v1.1")))
                .andReturn();
        Long sub2Id = objectMapper.readTree(sub2Res.getResponse().getContentAsString()).get("id").asLong();

        // 7. Supervisor approves v1.1
        FeedbackRequest approveFb = FeedbackRequest.builder().comment("Looks great! Ready for testing.").build();
        mockMvc.perform(post("/api/submissions/" + sub2Id + "/approve")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveFb)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("APPROVED")));

        // 8. Both versions exist in history
        mockMvc.perform(get("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].versionNumber", is("v1.0")))
                .andExpect(jsonPath("$[0].status", is("REJECTED")))
                .andExpect(jsonPath("$[1].versionNumber", is("v1.1")))
                .andExpect(jsonPath("$[1].status", is("APPROVED")));
    }

    @Test
    @DisplayName("Unauthorized users cannot access submissions")
    void testUnauthorizedAccessBlocked() throws Exception {
        String supervisorToken = registerAndGetToken("Dr. Supervisor", "sup5@test.edu", "pass123", Role.SUPERVISOR);
        String outsiderToken = registerAndGetToken("Outsider Student", "outsider@other.edu", "pass123", Role.STUDENT);

        CreateProjectRequest projectReq = CreateProjectRequest.builder().title("Secret Research").build();
        MvcResult projRes = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projectReq)))
                .andExpect(status().isCreated()).andReturn();
        Long projectId = objectMapper.readTree(projRes.getResponse().getContentAsString()).get("id").asLong();

        CreateTaskRequest taskReq = CreateTaskRequest.builder().title("Confidential Task").build();
        MvcResult taskRes = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated()).andReturn();
        Long taskId = objectMapper.readTree(taskRes.getResponse().getContentAsString()).get("id").asLong();

        // Outsider attempts to get submissions
        mockMvc.perform(get("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + outsiderToken))
                .andExpect(status().isForbidden());

        // Outsider attempts to create submission
        CreateSubmissionRequest subReq = CreateSubmissionRequest.builder().title("Injected Deliverable").build();
        mockMvc.perform(post("/api/tasks/" + taskId + "/submissions")
                        .header("Authorization", "Bearer " + outsiderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(subReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Case-insensitive student-name search returns correct eligible students")
    void testStudentSearchByName() throws Exception {
        String supervisorToken = registerAndGetToken("Dr. Supervisor", "sup6@test.edu", "pass123", Role.SUPERVISOR);
        Long enrolledStudentId = registerAndGetId("Isaac Newton", "isaac@test.edu", "pass123", Role.STUDENT);
        registerAndGetId("Albert Einstein", "albert@test.edu", "pass123", Role.STUDENT);
        registerAndGetId("Niels Bohr", "niels@test.edu", "pass123", Role.STUDENT);

        CreateProjectRequest projectReq = CreateProjectRequest.builder()
                .title("Relativity Project")
                .studentIds(Collections.singleton(enrolledStudentId))
                .build();
        MvcResult projRes = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(projectReq)))
                .andExpect(status().isCreated()).andReturn();
        Long projectId = objectMapper.readTree(projRes.getResponse().getContentAsString()).get("id").asLong();

        // Search "einstein" (lowercase search matching "Albert Einstein")
        mockMvc.perform(get("/api/projects/" + projectId + "/eligible-students?query=einstein")
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("Albert Einstein")))
                .andExpect(jsonPath("$[0].email", is("albert@test.edu")));

        // Isaac Newton is already enrolled -> should NOT be returned even when querying "Newton"
        mockMvc.perform(get("/api/projects/" + projectId + "/eligible-students?query=Newton")
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // Non-existent name search returns empty list
        mockMvc.perform(get("/api/projects/" + projectId + "/eligible-students?query=Galileo")
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
