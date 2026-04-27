# QAI

QAI é um agente de desenvolvimento com IA, inspirado no [opencode](https://opencode.ai).

## Stack

- **Runtime**: [Bun](https://bun.sh)
- **Linguagem**: TypeScript
- **HTTP**: [Hono](https://hono.dev)
- **Validação**: [Zod](https://zod.dev)
- **AI SDK**: [Vercel AI SDK](https://sdk.vercel.ai)
- **Monorepo**: [Turborepo](https://turbo.build)

## Estrutura

```
qai/
├── packages/
│   └── qai/          # Pacote principal (servidor + lógica de agente)
│       └── src/
│           ├── agent/     # Lógica do agente AI
│           ├── cli/       # Interface de linha de comando
│           ├── config/    # Configurações
│           ├── provider/  # Provedores de LLM
│           ├── server/    # Servidor HTTP (Hono)
│           ├── session/   # Gerenciamento de sessões
│           ├── tool/      # Ferramentas do agente
│           └── util/      # Utilitários
├── package.json
├── turbo.json
└── tsconfig.json
```

## Instalação

**Linux / macOS**

```bash
curl -fsSL https://raw.githubusercontent.com/quanthumtech/qai-cli/main/install.sh | sh
```

**Windows (PowerShell)**

```powershell
irm 'https://raw.githubusercontent.com/quanthumtech/qai-cli/main/install.ps1' | iex
```

Após a instalação, rode:

```bash
qai
```

## Desenvolvimento

```bash
bun install
bun dev
```

## API

```
GET  /health
GET  /session
POST /session
GET  /session/:id
DELETE /session/:id
```
