"""PyMuPDF-based secure document parser implementing DocumentParserPort."""

import anyio
import fitz  # PyMuPDF

from app.core.config import Settings, get_settings
from app.core.exceptions import (
    DocumentPageLimitExceededError,
    DocumentParsingError,
    DocumentSizeLimitExceededError,
)
from app.observability.logging import get_logger
from app.ports.document_parser import DocumentParserPort

logger = get_logger(__name__)


class PyMuPdfDocumentParser(DocumentParserPort):
    """Secure PDF text extraction using PyMuPDF executed in background threadpool."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def _sync_parse(self, file_bytes: bytes) -> str:
        """Synchronous CPU-bound PDF extraction with security validation."""
        # 1. Size constraint
        byte_len = len(file_bytes)
        if byte_len > self.settings.max_upload_size_bytes:
            raise DocumentSizeLimitExceededError(
                max_size_bytes=self.settings.max_upload_size_bytes,
                actual_size_bytes=byte_len,
            )

        # 2. Magic byte check (prevent non-PDF masquerading)
        if not file_bytes.startswith(b"%PDF-"):
            raise DocumentParsingError(
                "Invalid PDF format: file does not have valid %PDF- magic bytes header",
                details={"reason": "invalid_magic_bytes"},
            )

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise DocumentParsingError(
                f"Failed to open PDF document: {e!s}",
                details={"reason": "corrupt_pdf"},
            ) from e

        try:
            # 3. Page limit check (prevent denial of service)
            if doc.page_count > self.settings.max_pdf_pages:
                raise DocumentPageLimitExceededError(
                    max_pages=self.settings.max_pdf_pages,
                    actual_pages=doc.page_count,
                )

            # 4. Extract text page by page
            extracted_pages: list[str] = []
            for page_idx in range(doc.page_count):
                page = doc.load_page(page_idx)
                page_text = page.get_text("text") or ""
                extracted_pages.append(page_text)

            full_text = "\n\n".join(extracted_pages).strip()

            if not full_text:
                raise DocumentParsingError(
                    "PDF document contains no extractable text (it may be a scanned image)",
                    details={"reason": "empty_or_scanned_pdf"},
                )

            # 5. Length ceiling
            if len(full_text) > self.settings.max_extracted_text_chars:
                full_text = full_text[: self.settings.max_extracted_text_chars]

            logger.info("Successfully extracted text from PDF (%d pages, %d chars)", doc.page_count, len(full_text))
            return full_text
        finally:
            doc.close()

    async def parse_pdf(self, file_bytes: bytes) -> str:
        """Asynchronously parse PDF by offloading to anyio thread pool."""
        return await anyio.to_thread.run_sync(self._sync_parse, file_bytes)

