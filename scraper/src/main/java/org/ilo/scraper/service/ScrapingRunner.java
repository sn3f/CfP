package org.ilo.scraper.service;

import static org.ilo.scraper.data.amqp.OperationType.INTERMEDIATE;
import static org.ilo.scraper.data.amqp.OperationType.TERMINAL;

import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.ilo.scraper.data.amqp.Operation;
import org.ilo.scraper.data.amqp.OperationType;
import org.ilo.scraper.data.amqp.ScrapStep;
import org.ilo.scraper.data.amqp.ScrapTarget;
import org.ilo.scraper.data.operation.Content;
import org.ilo.scraper.data.operation.ContentUri;
import org.ilo.scraper.data.operation.result.IntermediateResult;
import org.ilo.scraper.data.operation.result.TerminalResult;
import org.ilo.scraper.service.operation.IntermediateOperationHandler;
import org.ilo.scraper.service.operation.OperationErrorHandler;
import org.ilo.scraper.service.operation.TerminalOperationHandler;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScrapingRunner {
  private final OperationHandlerFactory operationHandlerFactory;
  private final OperationErrorHandler operationErrorHandler;

  // TODO: This could be better if we would get already configured Handler instance
  public record ConfiguredHandler(
      Map<String, String> configuration, IntermediateOperationHandler handler) {}

  // TODO: Terminal Step - do we need it to be part of configuration?
  public Flux<TerminalResult> processTarget(ScrapTarget scrapTarget) {
    validateSteps(scrapTarget);

    IntermediateResult initialResult =
        new IntermediateResult(
            new Content(new ContentUri(scrapTarget.rootUri()), ""),
            List.of(new ContentUri(scrapTarget.rootUri())));

    List<ConfiguredHandler> intermediateHandlers =
        scrapTarget.steps().stream()
            .filter(step -> step.operation().getOperationType() == INTERMEDIATE)
            .map(
                step ->
                    new ConfiguredHandler(
                        step.configuration(), getIntermediateHandler(step.operation())))
            .toList();

    Flux<IntermediateResult> currentFlux = Flux.just(initialResult);
    for (final ConfiguredHandler configuredHandler : intermediateHandlers) {
      currentFlux =
          currentFlux.flatMapSequential(
              result ->
                  configuredHandler
                      .handler()
                      .execute(configuredHandler.configuration(), result)
                      .onErrorResume(
                          error -> {
                            operationErrorHandler.handle(
                                configuredHandler.handler(), result, error);
                            return Flux.empty();
                          }));
    }

    ScrapStep terminalStep = scrapTarget.steps().getLast();
    TerminalOperationHandler terminalHandler = getTerminalHandler(terminalStep.operation());
    return currentFlux.flatMapSequential(
        result ->
            terminalHandler
                .execute(terminalStep.configuration(), result)
                .onErrorResume(
                    error -> {
                      operationErrorHandler.handle(terminalHandler, result, error);
                      return Flux.empty();
                    }));
  }

  private IntermediateOperationHandler getIntermediateHandler(Operation operation) {
    Optional<IntermediateOperationHandler> operationHandler =
        operationHandlerFactory.getIntermediate(operation);
    return operationHandler.orElseThrow(
        () -> new IllegalArgumentException("Missing handler for operation: " + operation.name()));
  }

  private TerminalOperationHandler getTerminalHandler(Operation operation) {
    Optional<TerminalOperationHandler> operationHandler =
        operationHandlerFactory.getTerminal(operation);
    return operationHandler.orElseThrow(
        () -> new IllegalArgumentException("Missing handler for operation: " + operation.name()));
  }

  private void validateSteps(ScrapTarget scrapTarget) {
    if (scrapTarget.steps() == null || scrapTarget.steps().isEmpty()) {
      throw new IllegalArgumentException("ScrapTarget must contain at least one Step.");
    }

    boolean terminalFound = false;
    for (ScrapStep step : scrapTarget.steps()) {
      if (step.operation() == null) {
        throw new IllegalArgumentException("Operation missing for step: " + step.name());
      } else if (!terminalFound && step.operation().getOperationType() == TERMINAL) {
        terminalFound = true;
      } else if (terminalFound
          && step.operation().getOperationType() == OperationType.INTERMEDIATE) {
        throw new IllegalArgumentException(
            "Intermediate step " + step.name() + " found after Terminal step.");
      } else if (terminalFound && step.operation().getOperationType() == TERMINAL) {
        throw new IllegalArgumentException(
            "Terminal step " + step.name() + " found after Terminal step.");
      }
    }

    if (!terminalFound) {
      throw new IllegalArgumentException("Missing Terminal step.");
    }

    for (ScrapStep scrapStep : scrapTarget.steps()) {
      scrapStep.operation().validate(scrapStep.configuration());
    }
  }
}
