package com.rabbitrole.analysis;

import com.rabbitrole.analysis.dto.AnalysisResponse;
import com.rabbitrole.analysis.dto.AnalyzeRequest;
import com.rabbitrole.common.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** POST /api/analyses to analyze a resume; GET /api/analyses/{id} to fetch one. */
@RestController
@RequestMapping("/api/analyses")
public class AnalysisController {

    private final AnalysisService service;
    private final CurrentUser currentUser;

    public AnalysisController(AnalysisService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AnalysisResponse analyze(@Valid @RequestBody AnalyzeRequest request) {
        return service.analyze(request.resumeId(), request.role(), currentUser.id());
    }

    @GetMapping("/{id}")
    public AnalysisResponse get(@PathVariable String id) {
        return service.get(id, currentUser.id());
    }
}
