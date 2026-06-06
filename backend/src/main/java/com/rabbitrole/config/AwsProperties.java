package com.rabbitrole.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * AWS wiring for the dev/prod (aws) profile, bound from the Lambda's environment
 * (see infra/modules/rabbitrole/api.tf). Absent under the local profile, where
 * the in-memory/local stubs run instead.
 */
@ConfigurationProperties("aws")
public class AwsProperties {

    private final Cognito cognito = new Cognito();
    private String resumesBucket;
    private String ssmPrefix;
    /** Prefix for the DynamoDB table names, e.g. {@code rabbitrole-dev} → {@code …-profiles}. */
    private String dynamoTablePrefix;

    public Cognito getCognito() {
        return cognito;
    }

    public String getResumesBucket() {
        return resumesBucket;
    }

    public void setResumesBucket(String resumesBucket) {
        this.resumesBucket = resumesBucket;
    }

    public String getSsmPrefix() {
        return ssmPrefix;
    }

    public void setSsmPrefix(String ssmPrefix) {
        this.ssmPrefix = ssmPrefix;
    }

    public String getDynamoTablePrefix() {
        return dynamoTablePrefix;
    }

    public void setDynamoTablePrefix(String dynamoTablePrefix) {
        this.dynamoTablePrefix = dynamoTablePrefix;
    }

    /** Cognito coordinates needed to delete a user on account deletion. */
    public static class Cognito {
        private String userPoolId;

        public String getUserPoolId() {
            return userPoolId;
        }

        public void setUserPoolId(String userPoolId) {
            this.userPoolId = userPoolId;
        }
    }
}
