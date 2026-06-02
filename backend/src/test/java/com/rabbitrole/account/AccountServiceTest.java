package com.rabbitrole.account;

import com.rabbitrole.analysis.AnalysisRepository;
import com.rabbitrole.profiles.ProfileRepository;
import com.rabbitrole.resume.ResumeRepository;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * Verifies account deletion cascades in FK-safe order (analyses → resumes →
 * profile) and then removes the Cognito identity.
 */
class AccountServiceTest {

    @Test
    void deletesAllDataInOrderThenCognito() {
        AnalysisRepository analyses = mock(AnalysisRepository.class);
        ResumeRepository resumes = mock(ResumeRepository.class);
        ProfileRepository profiles = mock(ProfileRepository.class);
        CognitoDeleter cognito = mock(CognitoDeleter.class);

        new AccountService(analyses, resumes, profiles, cognito).deleteAccount("user-1");

        InOrder order = inOrder(analyses, resumes, profiles, cognito);
        order.verify(analyses).deleteByUserId("user-1"); // before resumes (FK)
        order.verify(resumes).deleteByUserId("user-1");
        order.verify(profiles).deleteByUserId("user-1");
        order.verify(cognito).deleteUser("user-1");
    }
}
