/**
 * Reads the Supabase environment variables and fails loudly when one is
 * missing. Without this the app boots and only breaks at the first request,
 * with an error that does not say which variable is absent.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      [
        `Variável de ambiente ausente ou vazia: ${name}.`,
        "",
        "O arquivo .env.local fica na raiz do projeto, ao lado do package.json,",
        "e precisa de uma linha assim, sem espaços em volta do = e sem aspas:",
        "",
        `  ${name}=valor`,
        "",
        "Se o arquivo existe e a linha está lá, as causas mais comuns são:",
        "  1. O valor ficou em branco (o .env.example vem com os valores vazios).",
        "  2. No Windows, o arquivo foi gravado com BOM — uma marca invisível no",
        "     começo que gruda no nome da primeira variável. No VS Code, o rodapé",
        "     mostra a codificação: precisa ser UTF-8, não 'UTF-8 with BOM'.",
        "  3. O servidor não foi reiniciado. O .env.local é lido só ao iniciar.",
      ].join("\n"),
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
