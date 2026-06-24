# Copa2026 Backend

Backend para uma aplicação de tabela da Copa do Mundo FIFA 2026.

## O que o projeto faz

- Oferece uma API para buscar partidas por grupo.
- Calcula classificação de grupos a partir dos resultados dos jogos.
- Retorna os 8 melhores terceiros colocados.
- Atualiza placares de partidas e avança vencedores na fase de mata-mata.
- Gera o chaveamento do torneio a partir das classificações.

## Tecnologias

- Node.js
- Express
- MongoDB / Mongoose
- dotenv
- Vercel (configuração de deploy)

## Estrutura principal

- `index.js` - servidor Express e rotas da API.
- `models/Match.js` - modelo de partidas.
- `models/Team.js` - modelo de times.
- `public/` - frontend estático usado pelo projeto.
- `.env.example` - exemplo de variáveis de ambiente.
- `vercel.json` - configuração para deploy no Vercel.

## Como rodar localmente

1. Instale dependências:

```powershell
npm install
```

2. Crie um arquivo de ambiente:

```powershell
copy .env.example .env
```

3. Adicione sua conexão MongoDB em `.env`:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=3000
```

4. Inicie o servidor:

```powershell
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

## Variáveis de ambiente

- `MONGODB_URI` - string de conexão do MongoDB Atlas.
- `PORT` - porta do servidor (opcional).

## Deploy seguro no Vercel

1. Crie um repositório GitHub para o projeto.
2. Conecte o repositório ao Vercel.
3. No painel do Vercel, configure as variáveis de ambiente:
   - `MONGODB_URI`
   - `PORT` (opcional)
4. Faça deploy.

> Não commit o arquivo `.env`.

## Observações

- O backend é responsável por lógica da tabela da Copa 2026 e pelas rotas de API.
- O frontend em `public/` pode consumir as rotas `/api/matches`, `/api/standings` e `/api/best-thirds`.
- Use o `.env.example` como referência ao configurar novos ambientes.
