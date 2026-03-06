package org.ilo.scraper.service.web.attachment;

import com.microsoft.playwright.Locator;

public record AttachmentLiveLink(Locator locator, String normalizedHref) {}
