package com.globalco.jobboard.common.client;

import com.globalco.jobboard.common.dto.internal.MatchInput;
import com.globalco.jobboard.common.dto.response.MatchBreakdownResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

@FeignClient(name = "ai-service", contextId = "aiServiceClient", path = "/internal/ai")
public interface AiServiceClient {

    @PostMapping("/match")
    MatchBreakdownResponse match(@RequestBody MatchInput input);

    /** Scores many job/candidate pairs in one round trip; results keep the input order. */
    @PostMapping("/match/batch")
    List<MatchBreakdownResponse> matchBatch(@RequestBody List<MatchInput> inputs);
}
