package com.scholarsync;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.scholarsync.dto.auth.LoginRequest;
import com.scholarsync.dto.auth.RegisterRequest;
import com.scholarsync.dto.chat.SendMessageRequest;
import com.scholarsync.dto.project.CreateProjectRequest;
import com.scholarsync.dto.task.CreateTaskRequest;
import com.scholarsync.dto.task.UpdateTaskRequest;
import com.scholarsync.entity.Role;
import com.scholarsync.repository.ChatMessageRepository;
import com.scholarsync.repository.ResearchProjectRepository;
import com.scholarsync.repository.ResearchTaskRepository;
import com.scholarsync.repository.TaskChatRepository;
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

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public class TaskChatControllerTest {

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
    private TaskChatRepository chatRepository;

    @Autowired
    private ChatMessageRepository messageRepository;

    @Autowired
    private com.scholarsync.repository.ResearchSubmissionRepository submissionRepository;

    @Autowired
    private com.scholarsync.repository.SubmissionFeedbackRepository feedbackRepository;

    @BeforeEach
    void setUp() {
        feedbackRepository.deleteAll();
        submissionRepository.deleteAll();
        messageRepository.deleteAll();
        chatRepository.deleteAll();
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

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("token").asText();
    }

    private Long getUserIdFromToken(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("id").asLong();
    }

    private Long createProject(String token, String title, String description) throws Exception {
        CreateProjectRequest req = CreateProjectRequest.builder()
                .title(title)
                .description(description)
                .build();

        MvcResult result = mockMvc.perform(post("/api/projects")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString()).path("id").asLong();
    }

    private void addStudentToProject(String supervisorToken, Long projectId, Long studentId) throws Exception {
        mockMvc.perform(post("/api/projects/" + projectId + "/students/" + studentId)
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("1. Assign task to 1 student -> chat automatically exists with supervisor and student")
    void testChatAutomaticallyCreatedForSingleStudentTask() throws Exception {
        String supervisorToken = registerAndGetToken("Dr. Alan Turing", "turing@scholarsync.edu", "password123", Role.SUPERVISOR);
        String studentToken = registerAndGetToken("Ada Lovelace", "ada@scholarsync.edu", "password123", Role.STUDENT);
        Long studentId = getUserIdFromToken(studentToken);

        Long projectId = createProject(supervisorToken, "Enigma Analysis", "Cryptographic study");
        addStudentToProject(supervisorToken, projectId, studentId);

        // Create task assigned to 1 student
        CreateTaskRequest taskReq = CreateTaskRequest.builder()
                .title("Decrypt Naval Traffic")
                .description("Analyze rotors and daily keys")
                .assignedStudentId(studentId)
                .build();

        MvcResult taskResult = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignedStudent.id", is(studentId.intValue())))
                .andExpect(jsonPath("$.assignedStudents", hasSize(1)))
                .andReturn();

        Long taskId = objectMapper.readTree(taskResult.getResponse().getContentAsString()).path("id").asLong();

        // Verify task chat exists and both supervisor and student can access it
        mockMvc.perform(get("/api/tasks/" + taskId + "/chat")
                        .header("Authorization", "Bearer " + supervisorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskId", is(taskId.intValue())))
                .andExpect(jsonPath("$.taskTitle", is("Decrypt Naval Traffic")))
                .andExpect(jsonPath("$.participants", hasSize(2)));

        mockMvc.perform(get("/api/tasks/" + taskId + "/chat")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taskId", is(taskId.intValue())))
                .andExpect(jsonPath("$.participants", hasSize(2)));
    }

    @Test
    @DisplayName("2. Assign task to multiple students -> all appear in the same chat")
    void testChatForMultiStudentTask() throws Exception {
        String supervisorToken = registerAndGetToken("Prof. Claude Shannon", "shannon@scholarsync.edu", "password123", Role.SUPERVISOR);
        Long supervisorId = getUserIdFromToken(supervisorToken);

        String s1Token = registerAndGetToken("Student Alice", "alice@scholarsync.edu", "password123", Role.STUDENT);
        Long s1Id = getUserIdFromToken(s1Token);

        String s2Token = registerAndGetToken("Student Bob", "bob@scholarsync.edu", "password123", Role.STUDENT);
        Long s2Id = getUserIdFromToken(s2Token);

        Long projectId = createProject(supervisorToken, "Information Theory", "Entropy study");
        addStudentToProject(supervisorToken, projectId, s1Id);
        addStudentToProject(supervisorToken, projectId, s2Id);

        // Assign task to both students via assignedStudentIds
        CreateTaskRequest taskReq = CreateTaskRequest.builder()
                .title("Calculate Channel Capacity")
                .description("Multi-user collaborative experiment")
                .assignedStudentIds(Arrays.asList(s1Id, s2Id))
                .build();

        MvcResult taskResult = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignedStudents", hasSize(2)))
                .andReturn();

        Long taskId = objectMapper.readTree(taskResult.getResponse().getContentAsString()).path("id").asLong();

        // Verify chat participants include supervisor + both students (total 3)
        mockMvc.perform(get("/api/tasks/" + taskId + "/chat")
                        .header("Authorization", "Bearer " + s1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participants", hasSize(3)))
                .andExpect(jsonPath("$.participants[*].id", hasItems(supervisorId.intValue(), s1Id.intValue(), s2Id.intValue())));

        mockMvc.perform(get("/api/tasks/" + taskId + "/chat")
                        .header("Authorization", "Bearer " + s2Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participants", hasSize(3)));
    }

    @Test
    @DisplayName("3 & 4. Send messages between participants -> stored in PostgreSQL & retrieved on refresh")
    void testSendAndRetrieveChatMessages() throws Exception {
        String supervisorToken = registerAndGetToken("Dr. Emmy Noether", "noether@scholarsync.edu", "password123", Role.SUPERVISOR);
        String studentToken = registerAndGetToken("David Hilbert", "hilbert.student@scholarsync.edu", "password123", Role.STUDENT);
        Long studentId = getUserIdFromToken(studentToken);

        Long projectId = createProject(supervisorToken, "Symmetry in Physics", "Conservation laws");
        addStudentToProject(supervisorToken, projectId, studentId);

        CreateTaskRequest taskReq = CreateTaskRequest.builder()
                .title("Derive Invariant Quantities")
                .assignedStudentId(studentId)
                .build();

        MvcResult taskResult = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long taskId = objectMapper.readTree(taskResult.getResponse().getContentAsString()).path("id").asLong();

        // Supervisor sends message 1
        SendMessageRequest msg1 = SendMessageRequest.builder()
                .content("Welcome to the task discussion! Let's start with the Lagrangian.")
                .build();

        mockMvc.perform(post("/api/tasks/" + taskId + "/chat/messages")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msg1)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content", is(msg1.getContent())))
                .andExpect(jsonPath("$.sender.email", is("noether@scholarsync.edu")));

        // Student sends message 2
        SendMessageRequest msg2 = SendMessageRequest.builder()
                .content("Understood! I'll review the variational equations today.")
                .build();

        mockMvc.perform(post("/api/tasks/" + taskId + "/chat/messages")
                        .header("Authorization", "Bearer " + studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(msg2)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content", is(msg2.getContent())))
                .andExpect(jsonPath("$.sender.email", is("hilbert.student@scholarsync.edu")));

        // Refresh/Retrieve message history -> both messages preserved in order
        mockMvc.perform(get("/api/tasks/" + taskId + "/chat/messages")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].content", is(msg1.getContent())))
                .andExpect(jsonPath("$[0].sender.role", is("SUPERVISOR")))
                .andExpect(jsonPath("$[1].content", is(msg2.getContent())))
                .andExpect(jsonPath("$[1].sender.role", is("STUDENT")));
    }

    @Test
    @DisplayName("5. Security: Non-participant attempt to view or send message is rejected (403 Forbidden)")
    void testSecurityNonParticipantRejected() throws Exception {
        String supervisorToken = registerAndGetToken("Prof. Marie Curie", "curie@scholarsync.edu", "password123", Role.SUPERVISOR);
        String assignedStudentToken = registerAndGetToken("Irene Curie", "irene@scholarsync.edu", "password123", Role.STUDENT);
        Long assignedStudentId = getUserIdFromToken(assignedStudentToken);

        String enrolledOtherStudentToken = registerAndGetToken("Other Student", "other@scholarsync.edu", "password123", Role.STUDENT);
        Long otherStudentId = getUserIdFromToken(enrolledOtherStudentToken);

        String outsideStudentToken = registerAndGetToken("Outside Student", "outside@scholarsync.edu", "password123", Role.STUDENT);

        Long projectId = createProject(supervisorToken, "Radioactivity Research", "Polonium & Radium");
        addStudentToProject(supervisorToken, projectId, assignedStudentId);
        addStudentToProject(supervisorToken, projectId, otherStudentId);

        // Task assigned only to Irene
        CreateTaskRequest taskReq = CreateTaskRequest.builder()
                .title("Isolate Radium Sample")
                .assignedStudentId(assignedStudentId)
                .build();

        MvcResult taskResult = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long taskId = objectMapper.readTree(taskResult.getResponse().getContentAsString()).path("id").asLong();

        // 1. Outside student (not even in project) rejected
        mockMvc.perform(get("/api/tasks/" + taskId + "/chat")
                        .header("Authorization", "Bearer " + outsideStudentToken))
                .andExpect(status().isForbidden());

        // 2. Other student in same project BUT not assigned to this task rejected from viewing
        mockMvc.perform(get("/api/tasks/" + taskId + "/chat")
                        .header("Authorization", "Bearer " + enrolledOtherStudentToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/tasks/" + taskId + "/chat/messages")
                        .header("Authorization", "Bearer " + enrolledOtherStudentToken))
                .andExpect(status().isForbidden());

        // 3. Other student rejected from sending message to this task chat
        SendMessageRequest intrusiveMsg = SendMessageRequest.builder()
                .content("I am not assigned here but trying to send")
                .build();

        mockMvc.perform(post("/api/tasks/" + taskId + "/chat/messages")
                        .header("Authorization", "Bearer " + enrolledOtherStudentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(intrusiveMsg)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("6. Editing task assignments correctly updates chat membership")
    void testEditingTaskAssignmentsUpdatesChatMembership() throws Exception {
        String supervisorToken = registerAndGetToken("Prof. Niels Bohr", "bohr@scholarsync.edu", "password123", Role.SUPERVISOR);
        String studentAToken = registerAndGetToken("Werner Heisenberg", "werner@scholarsync.edu", "password123", Role.STUDENT);
        Long studentAId = getUserIdFromToken(studentAToken);

        String studentBToken = registerAndGetToken("Wolfgang Pauli", "pauli@scholarsync.edu", "password123", Role.STUDENT);
        Long studentBId = getUserIdFromToken(studentBToken);

        Long projectId = createProject(supervisorToken, "Quantum Mechanics", "Copenhagen interpretation");
        addStudentToProject(supervisorToken, projectId, studentAId);
        addStudentToProject(supervisorToken, projectId, studentBId);

        // Initially assigned only to student A
        CreateTaskRequest taskReq = CreateTaskRequest.builder()
                .title("Uncertainty Principle Calculations")
                .assignedStudentId(studentAId)
                .build();

        MvcResult taskResult = mockMvc.perform(post("/api/projects/" + projectId + "/tasks")
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskReq)))
                .andExpect(status().isCreated())
                .andReturn();

        Long taskId = objectMapper.readTree(taskResult.getResponse().getContentAsString()).path("id").asLong();

        // Student A can access, Student B is rejected
        mockMvc.perform(get("/api/tasks/" + taskId + "/chat")
                        .header("Authorization", "Bearer " + studentAToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/tasks/" + taskId + "/chat")
                        .header("Authorization", "Bearer " + studentBToken))
                .andExpect(status().isForbidden());

        // Supervisor edits task: reassigns to Student B (replacing Student A)
        UpdateTaskRequest updateReq = UpdateTaskRequest.builder()
                .title("Exclusion Principle Calculations")
                .assignedStudentIds(Collections.singletonList(studentBId))
                .build();

        mockMvc.perform(put("/api/tasks/" + taskId)
                        .header("Authorization", "Bearer " + supervisorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedStudents", hasSize(1)))
                .andExpect(jsonPath("$.assignedStudents[0].id", is(studentBId.intValue())));

        // Now Student B CAN access!
        mockMvc.perform(get("/api/tasks/" + taskId + "/chat")
                        .header("Authorization", "Bearer " + studentBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.participants[*].id", hasItem(studentBId.intValue())));

        // Student A is NO LONGER a participant -> now rejected with 403 Forbidden!
        mockMvc.perform(get("/api/tasks/" + taskId + "/chat")
                        .header("Authorization", "Bearer " + studentAToken))
                .andExpect(status().isForbidden());
    }
}
