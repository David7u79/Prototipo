# Flujo de IA — futuro, no implementado

```mermaid
flowchart LR
  C[Web / móvil] --> A[NestJS]
  A --> D[Datos estructurados del atleta]
  D --> X[Construcción de contexto]
  X --> G[Gemini]
  G --> P[Respuesta procesada]
  P --> C
```

No existe endpoint de IA: `GeminiAiProvider` rechaza como no implementado. En la fase
futura, PRs, porcentajes y estadísticas se calcularán en código determinista; Gemini sólo
interpretará, explicará o redactará. `GEMINI_API_KEY` y `GEMINI_MODEL` son exclusivos del
servidor y nunca llegan a clientes.
