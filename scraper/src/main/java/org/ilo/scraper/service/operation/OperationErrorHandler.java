package org.ilo.scraper.service.operation;

import static java.util.Optional.ofNullable;

import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.data.operation.Content;
import org.ilo.scraper.data.operation.result.IntermediateResult;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class OperationErrorHandler {
  public void handle(
      OperationHandler<?> operationHandler, IntermediateResult intermediateResult, Throwable e) {
    log.error(
        "{} failed to process IntermediateResult:{}",
        operationHandler.getClass().getSimpleName(),
        ofNullable(intermediateResult)
            .map(IntermediateResult::content)
            .map(Content::contentLocation)
            .orElse(null),
        e);
  }
}
