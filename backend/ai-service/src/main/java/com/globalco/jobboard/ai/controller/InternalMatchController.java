package com.globalco.jobboard.ai.controller;

import com.globalco.jobboard.ai.service.MatchService;
import com.globalco.jobboard.common.dto.internal.MatchInput;
import com.globalco.jobboard.common.dto.response.MatchBreakdownResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/internal/ai")
@RequiredArgsConstructor
public class InternalMatchController {

    private final MatchService matchService;

    @PostMapping("/match")
    public MatchBreakdownResponse match(@RequestBody MatchInput input) {
        return matchService.score(input);
    }

    @PostMapping("/match/batch")
    public List<MatchBreakdownResponse> matchBatch(@RequestBody List<MatchInput> inputs) {
        return matchService.scoreAll(inputs);
    }
}
