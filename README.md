# SYNEX - Gerenciador de Tarefas

Um gerenciador de tarefas moderno e intuitivo desenvolvido em HTML, CSS e JavaScript, com integração ao banco de dados Supabase para sincronização em tempo real.

## 📋 Funcionalidades

- **Sistema de Login**: Autenticação segura de usuários via Supabase
- **Visualização de Tarefas**: 
  - **Lista**: Visualização em formato de lista com filtros
  - **Calendário**: Visualização das tarefas em um calendário interativo
  - **Arquivadas**: Histórico de tarefas concluídas
- **Gerenciamento de Tarefas**: Criar, editar, marcar como concluída e deletar tarefas
- **Sincronização em Tempo Real**: Dados persistidos no banco de dados Supabase
- **Interface Responsiva**: Design adaptado para desktop e dispositivos móveis
- **Atenção**: Esse é um projeto de teste e uso pessoal. não está em pleno funcionamento ainda e necessita de algumas correções de segurança e usabilidade. É de uso ESTRITAMENTE pessoal!

## 🗂️ Estrutura do Projeto

```
synex-task-manager/
├── index.html              # Página inicial (redirecionamento)
├── login.html              # Página de autenticação
├── tarefas.html            # Página principal de gerenciamento de tarefas
├── database.sql            # Script de criação do banco de dados
├── README.md               # Este arquivo
├── LICENSE                 # Licença do projeto
├── scripts/
│   ├── login.js            # Lógica de autenticação
│   ├── supabase_connection.js  # Configuração do Supabase
│   └── tarefas.js          # Lógica de gerenciamento de tarefas
└── styles/
    └── tarefas.css         # Estilos da aplicação
```

## 🚀 Como Começar

### Pré-requisitos

- Um navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conta no [Supabase](https://supabase.com) (para usar a sincronização)

### Instalação

1. Clone ou baixe este repositório
2. Abra `index.html` em seu navegador
3. Configure as credenciais do Supabase no arquivo `scripts/supabase_connection.js`
4. Execute o script `database.sql` no seu banco de dados Supabase

### Uso

1. **Fazer Login**: Acesse a página de login com suas credenciais
2. **Criar Tarefas**: Clique em "Nova Tarefa" e preencha os detalhes
3. **Alternar Abas**: Use os botões no topo para alternar entre Lista, Calendário e Arquivadas
4. **Completar Tarefas**: Marque como concluída para mover para o arquivo
5. **Gerenciar Tarefas**: Edite ou delete conforme necessário

## 🎯 Assistente de Organização de Tarefas (ChatGPT)

A aplicação inclui um link para um assistente de organização de tarefas baseado em ChatGPT que converte descrições naturais de tarefas para o formato padronizado do sistema.

### Como Usar o Assistente

Clique no botão "abrir chatgpt ↗" no rodapé da página para acessar o assistente.

**Formato aceito:**
```
Título; Descrição; Prioridade; Prazo (DD/MM/AAAA)
```

**Exemplo de entrada:**
```
Preciso pagar a conta de luz até sexta, tenho reunião amanhã às 10h e preciso preparar slides, comprar pão, ligar para médico
```

**Saída do assistente:**
```
Pagar conta de luz; Vencimento na sexta; alta; 25/04/2026 | Reunião; Preparar slides antes das 10h; alta; 19/04/2026 | Comprar pão; ; baixa | Ligar para médico; Agendar consulta; media
```

### Links do Assistente

**Link recomendado (já configurado):**
```
https://chatgpt.com/share/69e43032-2e70-83e9-81a7-19a77bf23edf
```

**Criar seu próprio assistente:**

Se desejar criar seu próprio link do ChatGPT, use o seguinte prompt:

```
Você é um assistente de organização de tarefas. Sempre que eu te descrever uma ou mais tarefas — em qualquer formato, linguagem informal, lista, parágrafo, ou como for — você deve me retornar APENAS o input formatado para o meu sistema, sem explicações, sem texto extra, sem introdução.

O formato é:
Título; Descrição; Prioridade; Prazo (DD/MM/AAAA)

Regras:
- Título: curto e direto
- Descrição: uma frase explicando o que precisa ser feito (pode ser vazia se não houver contexto)
- Prioridade: apenas "alta", "media" ou "baixa" — deduza pela urgência e importância se eu não informar
- Prazo: no formato DD/MM/AAAA — se eu não informar, omita esse campo
- Várias tarefas: separe com " | " (espaço, pipe, espaço)
- Nunca adicione texto antes ou depois do input formatado
- Se eu falar algo que não é tarefa, pergunte o que devo formatar
```

Após configurar o chat, compartilhe-o e atualize o link em `tarefas.html` na seção "chatgpt-link".

---



- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Responsividade**: CSS Media Queries

## 📁 Detalhes dos Arquivos

### HTML
- **index.html**: Redirecionador para a página de login
- **login.html**: Interface de login com validação de credenciais
- **tarefas.html**: Interface principal com abas de navegação e visualizações

### JavaScript
- **login.js**: Gerencia autenticação e validação de usuário
- **supabase_connection.js**: Configuração e conexão com o banco de dados
- **tarefas.js**: Lógica de CRUD de tarefas e alternância de abas

### CSS
- **tarefas.css**: Estilos responsivos da aplicação

## 📊 Banco de Dados

Execute o arquivo `database.sql` no Supabase para criar as tabelas necessárias:
- `users`: Tabela de usuários
- `tarefas`: Tabela de tarefas com campos de título, descrição, data, status, etc.

## 🔐 Segurança

- Autenticação via Supabase Auth
- Senhas criptografadas no banco de dados
- Validação no lado do cliente e do servidor

## 📝 Licença

Este projeto está licenciado sob a licença especificada no arquivo LICENSE.

## 👤 Autor

Desenvolvido como um gerenciador de tarefas profissional e intuitivo.

---

**Dicas**: 
- Customize as cores alterando as variáveis CSS em `tarefas.css`
- Para mobile, a interface se adapta automaticamente
- Suas tarefas são sincronizadas em tempo real no Supabase

