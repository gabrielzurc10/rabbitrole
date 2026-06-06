package com.rabbitrole.account;

import com.rabbitrole.analysis.AnalysisRepository;
import com.rabbitrole.profiles.ProfileRepository;
import com.rabbitrole.resume.ResumeService;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;

/**
 * Verifies account deletion cascades in FK-safe order (analyses → resumes →
 * profile) and then removes the Cognito identity. Resumes go through
 * {@link ResumeService} so the S3 files are removed alongside the rows.
 */
class AccountServiceTest {

    @Test
    void deletesAllDataInOrderThenCognito() {
        AnalysisRepository analyses = mock(AnalysisRepository.class);
        ResumeService resumes = mock(ResumeService.class);
        ProfileRepository profiles = mock(ProfileRepository.class);
        CognitoDeleter cognito = mock(CognitoDeleter.class);

        new AccountService(analyses, resumes, profiles, cognito).deleteAccount("user-1");

        InOrder order = inOrder(analyses, resumes, profiles, cognito);
        order.verify(analyses).deleteByUserId("user-1"); // before resumes (FK)
        order.verify(resumes).deleteAllForUser("user-1"); // deletes S3 files + rows
        order.verify(profiles).deleteByUserId("user-1");
        order.verify(cognito).deleteUser("user-1");
    }
}
