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
│   └── qai/
│       └── src/
│           ├── agent/
│           │   ├── agents/       # Agentes em .md (dev, architect, ...)
│           │   └── index.ts
│           ├── cli/              # Interface de linha de comando
│           ├── config/           # Configurações
│           ├── provider/         # Provedores de LLM
│           ├── server/           # Servidor HTTP (Hono)
│           ├── session/          # Gerenciamento de sessões
│           ├── tool/             # Ferramentas do agente
│           └── util/             # Utilitários
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

## Atualização

```bash
qai update
```

## Provedores

Configure um provedor de LLM antes de usar:

```bash
qai provider set nvidia --key <sua-chave>
qai provider default nvidia
```

Provedores suportados: `anthropic` · `openai` · `google` · `groq` · `mistral` · `nvidia`

## Agentes

A QAI possui agentes especializados que podem ser trocados durante o chat:

| Agente      | Descrição                                                  |
|-------------|------------------------------------------------------------|
| `dev`       | Agente padrão. Lê, escreve e edita arquivos, roda comandos |
| `architect` | Planejamento. Analisa o projeto e propõe planos. Somente leitura |

```
/agents              # lista os agentes disponíveis
/agents architect    # troca para o agente Architect
/agents dev          # volta para o Dev
```

### Criando um agente customizado

Adicione um arquivo `.md` em `src/agent/agents/`:

```md
---
name: Reviewer
description: Analisa código e sugere melhorias.
tools: read, glob, grep
---

You are QAI Reviewer...
```

O agente aparece automaticamente no `/agents` sem precisar alterar código.

## Comandos do chat

```
/help                          Lista os comandos disponíveis
/agents                        Lista e troca de agente
/provider                      Lista provedores configurados
/provider set <id> --key <key> Configura um provedor
/provider default <id>         Define o provedor padrão
/model <providerID/modelID>    Troca o modelo
/clear                         Limpa o histórico da sessão
exit                           Encerra o chat
```

## Desenvolvimento

```bash
bun install
bun dev
```

## API

```
GET    /health
GET    /session
POST   /session
GET    /session/:id
DELETE /session/:id
```
