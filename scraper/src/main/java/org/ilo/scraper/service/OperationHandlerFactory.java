package org.ilo.scraper.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.ilo.scraper.data.amqp.Operation;
import org.ilo.scraper.service.operation.IntermediateOperationHandler;
import org.ilo.scraper.service.operation.OperationHandler;
import org.ilo.scraper.service.operation.TerminalOperationHandler;
import org.springframework.stereotype.Component;

@Component
public class OperationHandlerFactory {
  private final Map<Operation, IntermediateOperationHandler> intermediateHandlers;
  private final Map<Operation, TerminalOperationHandler> terminalHandlers;

  public OperationHandlerFactory(
      List<IntermediateOperationHandler> intermediateHandlers,
      List<TerminalOperationHandler> terminalHandlers) {
    this.intermediateHandlers =
        intermediateHandlers.stream()
            .collect(Collectors.toMap(OperationHandler::getOperation, Function.identity()));
    this.terminalHandlers =
        terminalHandlers.stream()
            .collect(Collectors.toMap(OperationHandler::getOperation, Function.identity()));
  }

  public Optional<IntermediateOperationHandler> getIntermediate(Operation operation) {
    return Optional.ofNullable(intermediateHandlers.get(operation));
  }

  public Optional<TerminalOperationHandler> getTerminal(Operation operation) {
    return Optional.ofNullable(terminalHandlers.get(operation));
  }
}
