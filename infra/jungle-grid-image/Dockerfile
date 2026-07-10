FROM ollama/ollama:rocm

SHELL ["/bin/bash", "-lc"]

ENV OLLAMA_HOST=0.0.0.0:11434
ENV SUBSTRATA_RUNTIME_BACKEND=rocm

# Pre-bake the model into the image so Jungle Grid jobs do not pull it live at submit time.
# Build-time pull happens in CI, not on the developer workstation.
RUN ollama serve >/tmp/ollama-build.log 2>&1 & \
    OLLAMA_PID=$! && \
    for i in {1..60}; do \
      ollama list >/dev/null 2>&1 && break; \
      sleep 1; \
    done && \
    ollama pull gemma4:12b && \
    kill "${OLLAMA_PID}" && \
    wait "${OLLAMA_PID}" || true

COPY run-extraction.sh /app/run-extraction.sh
RUN chmod +x /app/run-extraction.sh

EXPOSE 11434

ENTRYPOINT ["/app/run-extraction.sh"]
