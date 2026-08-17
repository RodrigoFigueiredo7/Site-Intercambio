# Rota

Planejador de roteiros para as viagens de um intercâmbio. A especificação
completa do produto está em [`CLAUDE.md`](./CLAUDE.md) — ela manda em tudo.

## Rodar localmente

Requer Node 20 ou superior.

```bash
npm install
cp .env.example .env.local   # e preencha os três valores
npm run dev
```

Abre em <http://localhost:3000>.

## Variáveis de ambiente

Os valores saem do painel do Supabase, em **Project Settings → API Keys**.

| Variável | O que é |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública. Vai para o navegador; quem protege os dados é o RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta. **Ignora o RLS.** Só no servidor, usada pela página pública de compartilhamento |

`.env.local` não é versionado.

## Banco

O schema inteiro está em [`schema.sql`](./schema.sql) e precisa ser executado
uma vez no SQL Editor do Supabase. Ele cria as tabelas, as políticas de RLS e
os dois triggers — inclusive o que cria o `profiles` no primeiro login.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção, com checagem de tipos |
| `npm run lint` | ESLint |
