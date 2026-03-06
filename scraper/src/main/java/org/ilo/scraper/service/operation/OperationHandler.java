package org.ilo.scraper.service.operation;

import java.util.Map;
import org.ilo.scraper.data.amqp.Operation;
import org.ilo.scraper.data.operation.result.IntermediateResult;
import reactor.core.publisher.Flux;

public interface OperationHandler<R> {
  Operation getOperation();

  Flux<R> execute(Map<String, String> configuration, IntermediateResult intermediateResult);
}
