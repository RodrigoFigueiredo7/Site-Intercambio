# Rota — planejador de roteiros

Aplicação web para planejar as viagens de um intercâmbio na Europa. Uma pessoa mora em
**Barcelona** durante o período e faz várias viagens saindo de lá. O mapa é a peça central:
Barcelona aparece como base e cada viagem sai dela como um ramo colorido.

O site é usado no celular e no tablet tanto quanto no desktop, e é compartilhado com amigos —
tem que ser bonito o suficiente para mandar o link sem explicação nenhuma junto.

---

## Regras que valem para tudo

1. **Nenhum dado de exemplo.** O app nasce vazio. Nada de viagens, cidades ou valores
   pré-cadastrados no código. Todo conteúdo entra pela interface.
2. **Cadastro sem fricção.** A pessoa nunca gerencia uma "lista de cidades" separada. Ela
   adiciona um trecho ("de Barcelona para Praga") e as cidades passam a existir sozinhas.
3. **Dinheiro é `integer` em centavos.** Nunca `float`. Formatação só na borda da interface.
4. **Nada de rota ferroviária real.** Os traços do mapa são arcos geométricos entre dois pontos.
   Roteamento real exige API paga e não muda nada no planejamento.
5. **Sem chave de API paga em lugar nenhum.** Mapa, tiles e busca de cidade são todos gratuitos.
6. Interface e textos em **português do Brasil**. Código, identificadores e commits em inglês.

---

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Server Components e route handlers cobrem o backend inteiro; deploy direto na Vercel |
| Estilo | **Tailwind CSS + shadcn/ui** | shadcn é copiado para dentro do repo, então dá para reestilizar de acordo com os tokens abaixo |
| Banco / Auth | **Supabase** (Postgres + Auth + RLS) | Login com Google e por link de e-mail prontos; permissão por linha resolve o compartilhamento |
| Mapa | **Leaflet + react-leaflet** | Sem chave, sem cobrança |
| Tiles | **CARTO Positron** (`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`) | Base clara e discreta; as rotas coloridas ficam legíveis por cima |
| Busca de cidade | **Photon** (`https://photon.komoot.io/api?q=…&limit=6&lang=pt`) | Autocomplete gratuito e sem chave, feito para digitação ao vivo |
| Datas | **date-fns** com locale `ptBR` | |
| Hospedagem | **Vercel** | |

Variáveis de ambiente:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # só no servidor, usada pela página pública de compartilhamento
```

---

## Banco de dados

O schema completo está em **`schema.sql`** — rodar inteiro no SQL Editor do Supabase antes de
começar. Resumo do que ele cria:

- `profiles` — nome, **cidade base** (Barcelona por padrão, editável), moeda e cotação do euro.
- `trips` — nome, emoji, **cor**, datas, `share_token`, `is_public`.
- `places` — cidades de uma viagem, com `lat`/`lng` e código de 3 letras.
- `legs` — deslocamentos: origem, destino, meio, companhia, horários, duração, custo, status.
- `items` — o que acontece em cada dia: hospedagem, passeio, comida, outro.
- `trip_members` / `trip_invites` — compartilhamento por e-mail, com papel `editor` ou `viewer`.

Pontos de atenção na implementação:

- As políticas de RLS usam funções `security definer` (`can_read_trip`, `can_edit_trip`). **Não
  escrever política que consulte `trip_members` diretamente de dentro de `trip_members`** — entra
  em recursão.
- `duration_min` é calculado no cliente a partir de `depart_time`, `arrive_time` e
  `arrives_next_day`, e gravado junto. Não recalcular em query.
- A página pública (`/s/[token]`) **não** usa a sessão do usuário: é um Server Component que lê
  com a `service_role` e só devolve dados se `is_public = true`. Nunca abrir RLS para `anon`.

---

## Sistema visual

Limpo, arejado, com a personalidade vindo do assunto — horário de trem, tabela de partidas,
mapa. Nada de gradiente, nada de sombra pesada, nada de card flutuando. Separação é feita com
linha de 1px e espaço em branco.

### Cores

```css
--ink:        #14181F;   /* texto principal */
--muted:      #6C7683;   /* texto secundário, rótulos */
--paper:      #F6F7F8;   /* fundo da página (branco levemente frio, não creme) */
--surface:    #FFFFFF;   /* cards, painéis, campos */
--line:       #E3E6EA;   /* toda separação */
--accent:     #0B5D51;   /* ação primária, foco, estado ativo */
--accent-soft:#E6F0ED;   /* fundo de estado ativo */
--danger:     #B3261E;
```

Cada viagem recebe uma cor da paleta abaixo, na ordem de criação. É ela que colore o ramo no
mapa da base e identifica a viagem em toda a interface:

```
#0B5D51  #C1442E  #2B5FAD  #B07D2A  #6B4E9E  #197A8C
```

Dentro de uma viagem, o traço passa a ser colorido por **meio de transporte**:

```
train #2B5FAD   bus #C1442E   plane #6B4E9E   ferry #197A8C   car #6C7683   walk #6C7683
```

Avião e barco desenham com traço pontilhado e curvatura maior; trem e ônibus, linha contínua e
quase reta.

### Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Display | **Bricolage Grotesque** 700 | Nome da viagem, total de custo. Tracking `-0.02em`. Só isso. |
| Corpo | **Instrument Sans** 400/500/600 | Toda a interface |
| Dados | **IBM Plex Mono** 500 | Horários, durações, valores, códigos de cidade, datas curtas |

Escala: `44 / 30 / 20 / 16 / 14 / 13 / 11`. Rótulos em 11px, maiúsculas, `letter-spacing: .12em`,
cor `--muted`. Números sempre com `font-variant-numeric: tabular-nums`.

### Forma e espaço

Raio: 10px em cards e diálogos, 8px em campos e botões, cheio em pills.
Espaçamento na escala de 4px. Densidade confortável — alvo de toque mínimo de 44px.
Sombra: nenhuma, exceto uma discreta no diálogo aberto (`0 8px 32px rgb(20 24 31 / .10)`).

### Elemento assinatura: `RouteStrip`

Uma faixa horizontal que resume uma viagem inteira em uma linha: pontos ligados por um traço na
cor da viagem, com o código de cada cidade embaixo.

```
●━━━━━━●━━━━━━●╌╌╌╌╌╌●━━━━━━●
BCN    PRG    VIE    KRK    BCN
```

Aparece no card de cada viagem na tela inicial, no cabeçalho da viagem e no topo da página
pública. É o componente que a pessoa reconhece. Traço pontilhado onde o meio é avião. Ele espelha
exatamente o que está no mapa — a mesma informação em duas densidades.

### Movimento

Dois momentos, e só. As polilinhas do mapa se desenham ao entrar (animar `stroke-dashoffset`,
400ms, com atraso escalonado de 60ms por viagem). Troca de viagem faz `flyTo` com easing de
600ms. Respeitar `prefers-reduced-motion: reduce` desligando os dois.

---

## Telas

### `/` — entrada
Se não logado: uma tela só, com o nome do produto, uma frase do que ele faz e os dois botões de
login (Google e link por e-mail). Se logado, redireciona para `/app`.

### `/app` — a base
O coração do produto. Mapa da Europa com **Barcelona no centro**, e todas as viagens desenhadas
ao mesmo tempo, cada uma na sua cor.

- A base tem marcador próprio: círculo preenchido em `--ink` com anel externo e o rótulo `BASE`.
- Quando o primeiro trecho de uma viagem **não** parte da base, ligar a base ao primeiro ponto
  com uma linha cinza pontilhada e fina. Ela mostra o deslocamento implícito sem se confundir com
  um trecho de verdade. Sem rótulo, sem custo, não entra em nenhuma soma.
- Painel lateral (embaixo, no celular): lista de viagens. Cada card traz emoji, nome, período,
  `RouteStrip`, número de dias e custo total. Passar o mouse ou tocar destaca o ramo no mapa e
  apaga os outros para 25% de opacidade.
- Botão fixo **Nova viagem**.
- Estado vazio: o mapa aparece centrado em Barcelona só com o marcador da base, e um convite
  direto — "Sua base está em Barcelona. Crie a primeira viagem para começar a desenhar o mapa."
  com o botão. Nada de ilustração genérica.

### `/app/trips/[id]` — a viagem
Mapa só dessa viagem, colorido por meio de transporte, e um painel com três abas:

**Rotas** — lista de trechos em ordem de data. Cada linha: data, `BCN → PRG`, meio e companhia,
horário, duração, custo, e um selo de status (`ideia` / `reservar` / `reservado`). Tocar destaca
no mapa e abre as ações de editar e excluir.

**Dias** — todos os dias do período, gerados automaticamente a partir das datas da viagem. Cada
dia mostra **em que cidade a pessoa está**, deduzido do último trecho até aquela data — isso
nunca é digitado. Dias com deslocamento recebem uma marca. Dentro do dia, os itens em ordem de
hora, com botão de adicionar.

**Custos** — total grande em Bricolage, valor por dia, barra empilhada por categoria
(transporte, hospedagem, passeios, comida, outros) e a lista com percentual e valor. Alternador
EUR / BRL com a cotação editável ali mesmo, vinda de `profiles.fx_brl`.

### `/s/[token]` — link público
Somente leitura, sem menu, sem botão de editar. Mapa, `RouteStrip`, dias e total. Bonita o
bastante para ser o cartão de visita do projeto. Gerada no servidor.

---

## O fluxo que precisa ser bom

Adicionar um trecho é a ação mais repetida do app inteiro. Ela tem que ser rápida.

O diálogo tem, nessa ordem: **de** (já preenchido com o último destino da viagem, ou com a base
se for o primeiro trecho), **para**, meio de transporte como cinco botões com ícone, data,
saída, chegada, companhia, custo, observações.

- Os campos de cidade são um único campo de busca com autocomplete do Photon. Escolher um
  resultado grava `name`, `country`, `lat`, `lng` e gera um código de 3 letras a partir do nome
  (editável depois). Se a cidade já existe na viagem, reaproveita a linha em `places`.
- A duração aparece calculada abaixo dos horários, ao vivo. Se a chegada for menor que a saída,
  perguntar com um checkbox se chega no dia seguinte.
- Salvar e fechar; salvar e adicionar outro. O segundo botão importa: quem monta um mochilão
  cadastra dez trechos seguidos.

---

## Ordem de construção

Fazer nessa sequência e **parar para eu revisar ao fim de cada uma**.

1. **Fundação** — projeto Next.js, Tailwind com os tokens acima, fontes, shadcn. Supabase
   conectado, `schema.sql` rodado, login com Google e por e-mail funcionando, `profiles` criado
   no primeiro acesso com Barcelona como base.
2. **Mapa da base** — `/app` com o mapa, marcador da base, criação de viagem, cards com
   `RouteStrip`, ramos coloridos, estado vazio.
3. **Trechos** — página da viagem, aba Rotas, diálogo de trecho com autocomplete, arcos por meio
   de transporte, editar e excluir.
4. **Custos** — aba Custos completa, com conversão para BRL.
5. **Dias** — aba Dias, dedução da cidade por data, itens.
6. **Compartilhar** — convite por e-mail, papéis, link público `/s/[token]`.
7. **Acabamento** — responsivo de verdade no celular, foco visível no teclado, estados vazios de
   cada aba, `metadata` e imagem de preview para o link compartilhado.

## Fora de escopo

Roteamento ferroviário real, preços de passagem ao vivo, integração com reserva, upload de
arquivos, chat entre membros, modo offline, aplicativo nativo.
