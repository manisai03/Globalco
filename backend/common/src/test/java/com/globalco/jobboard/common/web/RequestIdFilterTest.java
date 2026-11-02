package com.globalco.jobboard.common.web;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class RequestIdFilterTest {

    private final RequestIdFilter filter = new RequestIdFilter();

    @Test
    void keepsTheGatewayRequestIdInLogsAndResponse() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/jobs");
        request.addHeader(RequestIdFilter.HEADER, "abc-123");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<String> seenInMdc = new AtomicReference<>();

        filter.doFilter(request, response, (req, res) -> seenInMdc.set(MDC.get(RequestIdFilter.MDC_KEY)));

        assertThat(seenInMdc.get()).isEqualTo("abc-123");
        assertThat(response.getHeader(RequestIdFilter.HEADER)).isEqualTo("abc-123");
        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
    }

    @Test
    void replacesMissingOrUnsafeIds() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/jobs");
        request.addHeader(RequestIdFilter.HEADER, "bad id\nwith newline");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (req, res) -> { });

        assertThat(response.getHeader(RequestIdFilter.HEADER)).matches("[0-9a-f-]{36}");
    }
}
