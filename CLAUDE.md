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
2. **A unidade é a PARADA, nunca o trecho.** Eu não cadastro "de X para Y". Cadastro "estive
   em Praga, cheguei dia 6 às 14h, saí dia 9 às 22h". O deslocamento é o intervalo entre a
   saída de uma parada e a chegada da próxima — derivado, nunca digitado. A ordem da rota vem
   sempre de `arrive_at`: não existe campo de ordem manual nem arrastar para reordenar.
3. **Dinheiro é `integer` em centavos.** Nunca `float`. Formatação só na borda da interface.
4. **Nada de rota ferroviária real.** O mapa liga parada a parada com reta. Roteamento real
   exige API paga e não muda nada no planejamento.
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
| Busca de cidade | **Photon**, com **Nominatim** de reserva, atrás de `/api/cidades` | Gratuitos e sem chave. A consulta sai do servidor: do navegador, uma extensão ou rede filtrada desliga o campo |
| Fuso horário | **tz-lookup** (176 KB, offline) + **date-fns-tz** | Coordenada vira fuso IANA sem API; noites contadas no relógio da cidade |
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

Rodar **`schema.sql`** e depois **`migrations/002_paradas.sql`**, nessa ordem, no SQL Editor.
A migração 002 substituiu `places` por `stops` e transformou `legs` em tabela derivada.

- `profiles` — nome, **cidade base** (Barcelona por padrão, editável), moeda e cotação do euro.
- `trips` — nome, emoji, **cor**, datas, `share_token`, `is_public`. As datas são a **moldura**
  do calendário da aba Dias, não a fonte da rota.
- `stops` — as paradas: cidade, `lat`/`lng`, código de 3 letras, **`tz`**, `arrive_at`,
  `depart_at` e a hospedagem daquela estadia.
- `legs` — os deslocamentos, **derivados**: par de paradas consecutivas, mais o que é meu
  (meio, companhia, custo, localizador, status). `is_active` marca se o par ainda é consecutivo.
- `items` — o que acontece em cada dia: hospedagem, passeio, comida, outro.
- `trip_members` / `trip_invites` — compartilhamento por e-mail, com papel `editor` ou `viewer`.

Pontos de atenção na implementação:

- As políticas de RLS usam funções `security definer` (`can_read_trip`, `can_edit_trip`). **Não
  escrever política que consulte `trip_members` diretamente de dentro de `trip_members`** — entra
  em recursão.
- **A reconciliação é do banco, não do cliente.** Criar, editar ou apagar uma parada dispara
  `reconcile_legs`, que ordena por `arrive_at`, cria os pares que faltam, reativa os que voltaram
  a ser consecutivos e desativa o resto. **Nunca apaga:** reinserir uma cidade no meio e depois
  desfazer devolve os dados de reserva intactos.
- **Fuso por parada.** `arrive_at` e `depart_at` são instantes absolutos; `tz` é o fuso IANA da
  cidade, resolvido das coordenadas por `tz-lookup`, offline. Duração é subtração absoluta;
  noites e dias do calendário são contados no relógio da cidade. Chegar em Praga à 1h30 são três
  noites, e quatro se contadas em UTC — uma diária inteira de erro.
- Noites nunca são gravadas. `nights()` conta as meias-noites entre chegada e saída.
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

Todo traço é **reta** de parada a parada — o mapa relata a rota, não ilustra o caminho. Avião e
barco desenham pontilhado; trem, ônibus, carro e a pé, contínuo. As cores desenhadas por
JavaScript e a paleta gravada em `trips.color` vivem em `src/lib/map/colors.ts`; as cores que o
CSS aplica vivem em `globals.css`. Uma cor, um dono.

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
O coração do produto. **Mapa-múndi** com todas as viagens desenhadas ao mesmo tempo, cada uma na
sua cor. Abre enquadrado na região da base, com zoom confortável, mas o mundo inteiro tem que ser
alcançável — a maioria das viagens sai da Europa, não todas.

- Zoom mínimo que caiba o planeta na tela; limite vertical para não rolar até o vazio polar.
- Botão de **voltar para a base**, para quem navegou longe.

- A base tem marcador próprio: círculo preenchido em `--ink` com anel externo e o rótulo `BASE`.
- Quando o primeiro trecho de uma viagem **não** parte da base, ligar a base ao primeiro ponto
  com uma linha cinza pontilhada e fina. Ela mostra o deslocamento implícito sem se confundir com
  um trecho de verdade. Sem rótulo, sem custo, não entra em nenhuma soma.
- Painel lateral (embaixo, no celular): lista de viagens. Cada card traz emoji, nome, período,
  `RouteStrip`, número de dias e custo total. Passar o mouse ou tocar destaca o ramo no mapa e
  apaga os outros para 25% de opacidade.
- Botão fixo **Nova viagem**.
- Estado vazio: o mapa aparece enquadrado na base, só com o marcador dela, e um convite direto —
  "Sua base está em {cidade}. Crie a primeira viagem para começar a desenhar o mapa." com o
  botão. O nome da cidade vem de `profiles.home_city`. Nada de ilustração genérica.
- A base é editável a partir daqui: um controle discreto abre a tela de perfil.

### `/app/perfil` — nome, base e moeda
Tela curta: nome de exibição, cidade base (mesmo autocomplete do Photon usado nos trechos, que
grava `home_city`, `home_lat`, `home_lng` e `home_code`), moeda e cotação do euro. Existe porque
o schema declara a base como editável e nenhuma outra tela dá acesso a ela.

### `/app/trips/[id]` — a viagem
Mapa só dessa viagem e um painel com duas abas.

O **mapa é somente visualização**. Não se clica nele para adicionar nem para editar. Pins nas
cidades, retas ligando parada a parada na ordem das datas, cor por meio de transporte, pontilhado
no ar e no mar. Clicar num pin destaca a parada e rola a lista até ela.

Uma **caixa de busca fixa no canto superior esquerdo do mapa**, com cara de Google Maps. Digito,
aparece o autocomplete com **nome, região e país** — é a região que separa duas cidades de mesmo
nome. Escolho, e abre um painel pequeno com chegada e saída **já preenchidas**: chegada = saída da
última parada + 3h, saída = chegada + 2 noites, na hora local da cidade. Só ajusto o que estiver
errado; Enter salva.

**Rota** — paradas e deslocamentos intercalados, na ordem das datas. A parada mostra horário local,
noites, hospedagem e custo, e abre para editar a janela e a hospedagem. O deslocamento mostra
duração — que é subtração, nunca digitada — e abre para eu dizer **o que escolhi e o que paguei**:
meio, companhia, valor, selo de status (`ideia` / `reservar` / `reservado`).

**Dias** — um cartão por dia do calendário, editável no próprio lugar, sem modal. O cabeçalho traz
a data por extenso, `dia N de M` e onde eu estou, **deduzido das paradas, nunca digitado** — no dia
da mudança, todas as cidades tocadas. A hospedagem vem da parada daquela noite; se a noite for num
trem ou ônibus noturno, é preenchida sozinha com o deslocamento e não cobra diária; se a noite não
tiver nada, um aviso discreto. A agenda do dia lista por hora, com categoria e custo, e adiciona,
edita e remove sem sair do cartão — Enter cria a próxima linha.

### `/s/[token]` — link público
Somente leitura, sem menu, sem botão de editar. Mapa, `RouteStrip`, dias e total. Bonita o
bastante para ser o cartão de visita do projeto. Gerada no servidor.

---

## O fluxo que precisa ser bom

Adicionar uma parada é a ação mais repetida do app. Ela tem que ser rápida.

Busca na caixa do mapa → escolho a cidade na lista → chegada e saída já vêm preenchidas → Enter.
Se as datas estiverem boas, foram quatro toques. Inserir uma cidade no meio da rota é a mesma
coisa: eu só dou a data, e ela se encaixa sozinha entre as duas paradas certas.

- A busca de cidade **sai do servidor**, em `/api/cidades`, nunca do navegador. Photon responde
  primeiro porque é feito para digitação ao vivo; **Nominatim** cobre uma queda dele. Nenhum dos
  dois pede chave. Sair do navegador deixava uma extensão ou uma rede filtrada desligarem o campo
  mais importante do app, sem o app poder fazer nada.
- Escolher um resultado grava `name`, `region`, `country`, `lat`, `lng`, gera o código de 3 letras
  e resolve o fuso das coordenadas.
- Custo é sempre um número que eu digito. **O app não estima preço, não sugere rota e não consulta
  provedor.** Eu digo o meio que escolhi e o valor que paguei.

---

## Ordem de construção

Fazer nessa sequência e **parar para eu revisar ao fim de cada uma**.

1. ✅ **Fundação** — Next.js, Tailwind com os tokens, fontes, shadcn, Supabase conectado, login
   com Google e por e-mail, `profiles` criado no primeiro acesso.
2. ✅ **Mapa da base** — `/app` com o mapa-múndi, marcador da base, criação de viagem, cards com
   `RouteStrip`, ramos coloridos, estado vazio, e a tela de perfil.
3. ✅ **Paradas** — `migrations/002_paradas.sql`, reconciliação de legs no banco, fuso por parada.
4. ✅ **A viagem** — busca no mapa, painel de chegada e saída, mapa de visualização, aba Rota com
   parada e deslocamento editáveis à mão.
5. ✅ **Dias** — cartão por dia, cidade deduzida, noite a bordo, agenda editável no lugar.
6. **Publicar** — deploy na Vercel, variáveis de ambiente no painel, domínio novo nas listas de
   redirecionamento do Supabase e do Google.
7. **Custos** — total, custo por dia, divisão por categoria somando `legs`, `stops.lodging` e
   `items`, com conversão para BRL.
8. **Compartilhar** — convite por e-mail, papéis, link público `/s/[token]`.
9. **Acabamento e identidade** — responsivo de verdade no celular, foco visível no teclado,
   estados vazios de cada aba, `metadata` e imagem de preview. Depois disso, a estética final no
   Claude Design: os tokens atuais são ponto de partida, não amarra.

## Fora de escopo

Roteamento ferroviário real, preços de passagem ao vivo, integração com reserva, upload de
arquivos, chat entre membros, modo offline, aplicativo nativo.

Também fora: **motor de sugestão de transporte, estimativa de preço e link para provedor.**
Eu escolho a rota e digito o que paguei. As fontes conhecidas ou não têm API pública (Google
Flights), ou exigem licença comercial (Rome2Rio, Skyscanner), e o portal Self-Service da Amadeus
foi desligado em julho de 2026 — mas o motivo de estarem fora é mais simples que isso: eu não
quero estimativa, quero o número que eu paguei.
