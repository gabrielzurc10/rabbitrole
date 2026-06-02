package com.rabbitrole.account;

import com.rabbitrole.analysis.AnalysisRepository;
import com.rabbitrole.profiles.ProfileRepository;
import com.rabbitrole.resume.ResumeRepository;
import org.springframework.stereotype.Service;

/**
 * Deletes a user and all their data. Order matters: analyses reference resumes
 * (FK), so analyses go first, then resumes, then the profile, and finally the
 * Cognito identity (a no-op locally).
 */
@Service
public class AccountService {

    private final AnalysisRepository analyses;
    private final ResumeRepository resumes;
    private final ProfileRepository profiles;
    private final CognitoDeleter cognito;

    public AccountService(AnalysisRepository analyses,
                          ResumeRepository resumes,
                          ProfileRepository profiles,
                          CognitoDeleter cognito) {
        this.analyses = analyses;
        this.resumes = resumes;
        this.profiles = profiles;
        this.cognito = cognito;
    }

    public void deleteAccount(String userId) {
        analyses.deleteByUserId(userId);
        resumes.deleteByUserId(userId);
        profiles.deleteByUserId(userId);
        cognito.deleteUser(userId);
    }
}
