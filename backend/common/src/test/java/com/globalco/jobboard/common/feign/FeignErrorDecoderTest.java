package com.globalco.jobboard.common.feign;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.globalco.jobboard.common.exception.BadRequestException;
import com.globalco.jobboard.common.exception.DownstreamServiceException;
import com.globalco.jobboard.common.exception.ResourceNotFoundException;
import com.globalco.jobboard.common.exception.UnauthorizedException;
import feign.Request;
import feign.Response;
import feign.codec.ErrorDecoder;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class FeignErrorDecoderTest {

    private final ErrorDecoder decoder = new FeignClientConfig().apiErrorDecoder(new ObjectMapper());

    @Test
    void badRequestKeepsTheDownstreamMessage() {
        Exception e = decode(400, "{\"success\":false,\"message\":\"This job is no longer accepting applications\"}");
        assertThat(e).isInstanceOf(BadRequestException.class)
                .hasMessage("This job is no longer accepting applications");
    }

    @Test
    void notFoundAndUnauthorizedMapToTheirExceptions() {
        assertThat(decode(404, "{\"message\":\"Job not found\"}")).isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Job not found");
        assertThat(decode(403, "{}")).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void serverErrorsBecomeDownstreamFailures() {
        assertThat(decode(503, "not json")).isInstanceOf(DownstreamServiceException.class);
    }

    private Exception decode(int status, String body) {
        Request request = Request.create(Request.HttpMethod.GET, "http://job-service/internal/jobs/1", Map.of(), null,
                StandardCharsets.UTF_8, null);
        Response response = Response.builder()
                .status(status)
                .request(request)
                .headers(Map.of())
                .body(body, StandardCharsets.UTF_8)
                .build();
        return decoder.decode("JobServiceClient#getJob(Long)", response);
    }
}
