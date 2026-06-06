package com.rabbitrole.account;

import com.rabbitrole.analysis.AnalysisRepository;
import com.rabbitrole.profiles.ProfileRepository;
import com.rabbitrole.resume.ResumeService;
import org.springframework.stereotype.Service;

/**
 * Deletes a user and all their data. Order matters: analyses reference resumes
 * (FK), so analyses go first, then resumes (via {@link ResumeService} so the S3
 * files go too, not just the rows), then the profile, and finally the Cognito
 * identity (a no-op locally).
 */
@Service
public class AccountService {

    private final AnalysisRepository analyses;
    private final ResumeService resumes;
    private final ProfileRepository profiles;
    private final CognitoDeleter cognito;

    public AccountService(AnalysisRepository analyses,
                          ResumeService resumes,
                          ProfileRepository profiles,
                          CognitoDeleter cognito) {
        this.analyses = analyses;
        this.resumes = resumes;
        this.profiles = profiles;
        this.cognito = cognito;
    }

    public void deleteAccount(String userId) {
        analyses.deleteByUserId(userId);
        resumes.deleteAllForUser(userId);
        profiles.deleteByUserId(userId);
        cognito.deleteUser(userId);
    }
}
