package com.scholarsync.service;

import com.scholarsync.dto.auth.UserResponse;
import com.scholarsync.dto.project.CreateProjectRequest;
import com.scholarsync.dto.project.ProjectResponse;
import com.scholarsync.security.UserPrincipal;

import java.util.List;

public interface ProjectService {

    ProjectResponse createProject(CreateProjectRequest request, UserPrincipal currentUser);

    List<ProjectResponse> getUserProjects(UserPrincipal currentUser);

    ProjectResponse getProjectById(Long id, UserPrincipal currentUser);

    ProjectResponse addStudentToProject(Long projectId, Long studentId, UserPrincipal currentUser);

    List<UserResponse> getEligibleStudents(Long projectId, String query, UserPrincipal currentUser);
}

