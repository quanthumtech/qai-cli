# Documentação do Sistema QAI

## Visão Geral
O **QAI** (Quantum AI) é um framework modular para construção de agentes de IA que podem ser integrados a diferentes provedores (OpenAI, Anthropic, Groq, Mistral, etc.). Ele fornece:
- **CLI** (`qai-cli`) para iniciar sessões, gerenciar agentes e executar ferramentas.
- **Servidor HTTP** baseado em **Hono** para expor APIs de agentes.
- **Camada de ferramentas** que abstrai operações de sistema como leitura/escrita de arquivos, execução de comandos Bash, glob, grep, etc.
- **Gerenciamento de sessões** que persiste o estado entre interações.
- **Arquitetura extensível** com provedores de IA plug‑áveis e agentes configuráveis via arquivos Markdown.

## Estrutura de Pastas
```
workspace/
└─ doc/                # Documentação do projeto (este diretório)
   └─ README.md        # Visão geral e instruções

packages/qai/
├─ src/                # Código‑fonte principal
│  ├─ agent/           # Definições e documentação de agentes
│  ├─ cli/             # Interface de linha de comando
│  ├─ config/          # Configurações globais
│  ├─ provider/        # Integrações com provedores de IA
│  ├─ server/           # Servidor HTTP (Hono)
│  ├─ tool/            # Implementação das ferramentas de sistema
│  └─ util/            # Utilitários auxiliares
└─ bin/qai-cli          # Executável do CLI
```

## Como Começar
1. **Instalação** – Execute `./install.sh` (Linux/macOS) ou `./install.ps1` (Windows) para instalar dependências.
2. **Compilação** – `bun run build` (ou `npm run build` se preferir).
3. **Executar o CLI** – `bun run qai-cli` ou `./bin/qai-cli`.
4. **Iniciar o servidor** – `bun run start` (expondo a API em `http://localhost:3000`).

## Principais Componentes
- **`src/agent/agents.ts`** – Registro de agentes disponíveis.
- **`src/tool/*.ts`** – Implementações das ferramentas (`read`, `write`, `bash`, `grep`, `glob`, `edit`).
- **`src/server/server.ts`** – Configuração do servidor Hono e rotas de API.
- **`src/cli/ui.ts`** – Interface de usuário interativa para o CLI.
- **`src/config/index.ts`** – Carregamento de variáveis de ambiente e configuração padrão.

## Contribuindo
1. Crie uma branch a partir de `main`.
2. Siga o padrão de código (TypeScript, lint com Prettier).
3. Execute os testes (`bun test`) antes de abrir um Pull Request.
4. Atualize a documentação aqui sempre que adicionar funcionalidades.

---
*Esta documentação foi gerada automaticamente para ajudar desenvolvedores a entender e contribuir com o QAI.*