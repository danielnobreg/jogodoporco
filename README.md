# 🐷 Jogo do Porco — Private Card Club

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![.NET 8](https://img.shields.io/badge/.NET-8.0-blueviolet?style=for-the-badge&logo=dotnet)](https://dotnet.microsoft.com/)
[![Azure](https://img.shields.io/badge/Azure-Container_Apps-0089D6?style=for-the-badge&logo=microsoft-azure)](https://azure.microsoft.com/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)

Um jogo de cartas multiplayer em tempo real, focado em agilidade, reflexos e diversão. O objetivo é formar quadras (quatro cartas de mesmo valor) e "bater" na mesa antes dos seus adversários. O último a bater perde a rodada e recebe uma letra da palavra **P-O-R-C-O**. Quem completar a palavra primeiro perde o jogo!

Acesse a versão em produção:
*   **🎮 Jogo Online (Frontend):** [https://frontend.salmonrock-4cc1f209.eastus2.azurecontainerapps.io](https://frontend.salmonrock-4cc1f209.eastus2.azurecontainerapps.io)
*   **🔌 API & Gateway:** [https://gateway-api.salmonrock-4cc1f209.eastus2.azurecontainerapps.io](https://gateway-api.salmonrock-4cc1f209.eastus2.azurecontainerapps.io)

---

## 🏛️ Arquitetura do Projeto

O sistema é construído utilizando princípios modernos de microsserviços e mensageria distribuída:

```
[ Frontend: Next.js ]
         │ HTTPS / WebSockets (SignalR)
         ▼
[ GatewayApi (Porta de Entrada) ] ◄───► [ Banco PostgreSQL ]
         │
         │ (MassTransit / Azure Service Bus / RabbitMQ)
         ▼
[ GameEngine (Motor de Jogo Privado) ]
```

*   **Frontend (Next.js 15):** Interface responsiva e premium com estilização sob medida, suporte a gestos de arrastar para passar cartas e efeitos táteis (tremores de mesa trincada baseados em física, indicador circular de tempo do turno e emoticons flutuantes).
*   **Gateway API (ASP.NET Core 8 & SignalR):** Gerencia conexões WebSocket ativas, salas de jogo, autenticação JWT (incluindo suporte a convidados via QR Code) e expõe endpoints HTTP.
*   **Game Engine (Worker Service .NET 8):** Motor de processamento assíncrono isolado da rede que processa as rodadas, turnos e lógica de jogo.
*   **Mensageria (MassTransit):** Abstrai a fila de mensageria com suporte a RabbitMQ para desenvolvimento local e Azure Service Bus para produção.

---

## 🎮 Como Jogar

1.  **Criar ou Entrar em uma Sala:** Crie uma mesa no lobby ou escaneie o **QR Code** de uma sala ativa com o celular para entrar como convidado instantaneamente.
2.  **Distribuição de Cartas:** Cada jogador começa com 4 cartas na mão. A partida ocorre em turnos rápidos (máximo de 20 segundos).
3.  **Fluxo de Turno:** No seu turno, você compra uma carta do monte ou da pilha de descarte e passa uma carta indesejada para o jogador seguinte.
4.  **O "Porco" (Bater na Mesa):** Assim que você conseguir **4 cartas de mesmo valor** (ex: quatro Reis), o botão **BATER** ficará ativo. Clique nele imediatamente!
5.  **A Corrida das Batidas:** Quando o primeiro jogador bate, a mesa começa a vibrar. Todos os outros jogadores devem bater na mesa imediatamente, mesmo que não tenham quadras!
6.  **Ranking e Letras:** O sistema registra a ordem exata de batidas em milissegundos. O último jogador a bater recebe a próxima letra da palavra **P-O-R-C-O**.

---

## 🛠️ Como Instalar e Executar Localmente

### Pré-requisitos
*   [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
*   [Node.js v20+](https://nodejs.org/)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Passo 1: Subir o Infraestrutura Local (Docker)
Na raiz do projeto, execute o seguinte comando para iniciar o banco PostgreSQL e o broker de mensagens RabbitMQ:
```bash
docker-compose up -d
```

### Passo 2: Executar o Backend (.NET)
Entre no diretório `src/` e execute o build e restauração dos microsserviços:
```bash
cd src/
dotnet restore
dotnet run --project GatewayApi/GatewayApi.csproj
# Em outro terminal
dotnet run --project GameEngine/GameEngine.csproj
```
As migrações do banco de dados são aplicadas automaticamente no primeiro startup.

### Passo 3: Executar o Frontend (Next.js)
Entre no diretório `jogo-do-porco-front/`, instale as dependências e inicie o servidor de desenvolvimento:
```bash
cd jogo-do-porco-front/
npm install
npm run dev
```
Acesse o jogo local em: [http://localhost:3000](http://localhost:3000).

---

## 🤝 Como Contribuir

Ficamos felizes com o seu interesse em contribuir para o Private Card Club! 

1.  Faça um **Fork** do projeto.
2.  Crie uma branch para a sua feature: `git checkout -b feature/minha-feature`.
3.  Faça commit das suas alterações seguindo boas práticas de commits semânticos: `git commit -m 'feat: adiciona novas reações de emoji'`.
4.  Suba para o seu repositório: `git push origin feature/minha-feature`.
5.  Abra um **Pull Request** detalhando as alterações propostas.

---

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.
