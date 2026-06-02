package com.rabbitrole.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * AWS wiring for the dev/prod (aws) profile, bound from the Lambda's environment
 * (see infra/modules/rabbitrole/api.tf). Absent under the local profile, where
 * the in-memory/local stubs run instead.
 */
@ConfigurationProperties("aws")
public class AwsProperties {

    private final Db db = new Db();
    private final Cognito cognito = new Cognito();
    private String resumesBucket;
    private String ssmPrefix;

    public Db getDb() {
        return db;
    }

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

    /** Aurora coordinates the RDS Data API needs to address the cluster. */
    public static class Db {
        private String clusterArn;
        private String secretArn;
        private String name;

        public String getClusterArn() {
            return clusterArn;
        }

        public void setClusterArn(String clusterArn) {
            this.clusterArn = clusterArn;
        }

        public String getSecretArn() {
            return secretArn;
        }

        public void setSecretArn(String secretArn) {
            this.secretArn = secretArn;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
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
