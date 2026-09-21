package com.scholarsync.service.impl;

import com.scholarsync.dto.project.CreateProjectRequest;
import com.scholarsync.dto.project.ProjectResponse;
import com.scholarsync.entity.ResearchProject;
import com.scholarsync.entity.Role;
import com.scholarsync.entity.User;
import com.scholarsync.exception.BadRequestException;
import com.scholarsync.exception.ResourceNotFoundException;
import com.scholarsync.repository.ResearchProjectRepository;
import com.scholarsync.repository.UserRepository;
import com.scholarsync.security.UserPrincipal;
import com.scholarsync.service.ProjectService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ResearchProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public ProjectResponse createProject(CreateProjectRequest request, UserPrincipal currentUser) {
        if (currentUser.getRole() != Role.SUPERVISOR) {
            throw new AccessDeniedException("Only supervisors are permitted to create research projects");
        }

        User supervisor = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        Set<User> studentSet = new HashSet<>();
        if (request.getStudentIds() != null && !request.getStudentIds().isEmpty()) {
            for (Long studentId : request.getStudentIds()) {
                User student = userRepository.findById(studentId)
                        .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));
                if (student.getRole() != Role.STUDENT) {
                    throw new BadRequestException("User with ID " + studentId + " is not a STUDENT");
                }
                studentSet.add(student);
            }
        }

        ResearchProject project = ResearchProject.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .supervisor(supervisor)
                .students(studentSet)
                .build();

        ResearchProject savedProject = projectRepository.save(project);
        log.info("Created research project id: '{}', supervisor: '{}'", savedProject.getId(), supervisor.getEmail());

        return ProjectResponse.fromEntity(savedProject);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectResponse> getUserProjects(UserPrincipal currentUser) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        List<ResearchProject> projects;
        if (currentUser.getRole() == Role.SUPERVISOR) {
            projects = projectRepository.findBySupervisor(user);
        } else {
            projects = projectRepository.findByStudent(user);
        }

        return projects.stream()
                .map(ProjectResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(Long id, UserPrincipal currentUser) {
        ResearchProject project = projectRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchProject", "id", id));

        boolean isSupervisor = project.getSupervisor().getId().equals(currentUser.getId());
        boolean isEnrolledStudent = project.getStudents().stream()
                .anyMatch(student -> student.getId().equals(currentUser.getId()));

        if (!isSupervisor && !isEnrolledStudent) {
            throw new AccessDeniedException("You do not have permission to access this research project");
        }

        return ProjectResponse.fromEntity(project);
    }

    @Override
    @Transactional
    public ProjectResponse addStudentToProject(Long projectId, Long studentId, UserPrincipal currentUser) {
        ResearchProject project = projectRepository.findByIdWithDetails(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("ResearchProject", "id", projectId));

        if (!project.getSupervisor().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Only the project supervisor can assign students to this project");
        }

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        if (student.getRole() != Role.STUDENT) {
            throw new BadRequestException("Assigned user must have the STUDENT role");
        }

        project.addStudent(student);
        ResearchProject updated = projectRepository.save(project);
        log.info("Added student '{}' to project '{}'", student.getEmail(), project.getTitle());

        return ProjectResponse.fromEntity(updated);
    }
}
