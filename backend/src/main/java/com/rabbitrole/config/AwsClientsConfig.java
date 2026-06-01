package com.rabbitrole.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.services.rdsdata.RdsDataClient;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * AWS SDK clients for the aws profile. Region + credentials come from the
 * default provider chains (the Lambda execution role + the AWS_REGION the
 * runtime sets), so nothing is hard-coded. Only built when aws is active.
 */
@Configuration
@Profile("aws")
@EnableConfigurationProperties(AwsProperties.class)
public class AwsClientsConfig {

    @Bean
    RdsDataClient rdsDataClient() {
        return RdsDataClient.create();
    }

    @Bean
    S3Client s3Client() {
        return S3Client.create();
    }
}
