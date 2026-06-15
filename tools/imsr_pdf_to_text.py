#!/usr/bin/env python3
"""
imsr_pdf_to_text.py - Stage A of the offline IMSR pipeline: dump a PDF's text
layer to a .txt sidecar so the stdlib-only extractor (imsr_extract.py) can parse
it without any PDF library.

This is the ONLY step that needs a third-party package (pypdf). To keep the
machine clean it runs from a throwaway venv under tools/ (gitignored):

    python3 -m venv tools/.venv-imsr
    tools/.venv-imsr/bin/pip install pypdf
    tools/.venv-imsr/bin/python tools/imsr_pdf_to_text.py \
        tests/imsr/source/imsr-2026-06-12.pdf \
        tests/imsr/source/imsr-2026-06-12.txt

Output is a verbatim text dump with `===== PAGE n =====` separators, committed
alongside the PDF so the whole pipeline is reproducible and inspectable. Nothing
here touches the live app.
"""
import sys


def main(argv):
    if len(argv) < 3:
        print("usage: imsr_pdf_to_text.py INPUT.pdf OUTPUT.txt", file=sys.stderr)
        return 2
    try:
        from pypdf import PdfReader
    except ImportError:
        print("pypdf not installed. Create the venv:\n"
              "  python3 -m venv tools/.venv-imsr\n"
              "  tools/.venv-imsr/bin/pip install pypdf\n"
              "then run this with tools/.venv-imsr/bin/python", file=sys.stderr)
        return 2

    reader = PdfReader(argv[1])
    chunks = []
    for i, page in enumerate(reader.pages):
        chunks.append(f"===== PAGE {i + 1} =====")
        chunks.append(page.extract_text() or "")
    with open(argv[2], "w", encoding="utf-8") as f:
        f.write("\n".join(chunks))
    print(f"[imsr_pdf_to_text] {argv[1]} -> {argv[2]} ({len(reader.pages)} pages)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
