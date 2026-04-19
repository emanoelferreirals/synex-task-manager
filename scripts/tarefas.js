
/* ══════════════════════════════════════════════════════════════════
   ESTADO GLOBAL
   Variáveis declaradas fora de funções para serem acessíveis
   em qualquer ponto do código. Funcionam como a "memória" da aplicação.
   ══════════════════════════════════════════════════════════════════ */

var allTasks      = [];
/* Array de TODAS as tarefas ativas (status diferente de "concluida").
   Alimentado por loadList() e usado por renderList(), renderCalendar() e renderDayPanel(). */

var archivedTasks = [];
/* Array de tarefas ARQUIVADAS/CONCLUÍDAS (status === "concluida").
   Separado para renderização distinta na aba "Arquivadas". */

var calYear, calMonth;
/* Ano e mês atualmente exibidos no calendário.
   Inicializados abaixo com a data atual.
   Modificados por calPrev() e calNext() ao navegar entre meses. */

var selectedDate  = null;
/* String no formato "AAAA-MM-DD" do dia selecionado no calendário.
   null = nenhum dia selecionado (painel do dia fechado).
   Usada por renderDayPanel() e salvarTarefaDia(). */


/* ── Inicialização do mês/ano do calendário ──────────────────── */

(function() {
    /* IIFE (Immediately Invoked Function Expression):
       uma função que se executa imediatamente após ser definida.
       Usada para criar um escopo isolado e inicializar variáveis
       sem poluir o escopo global com variáveis temporárias. */

    var d    = new Date();
    /* new Date() sem argumentos retorna a data e hora ATUAIS do sistema */

    calYear  = d.getFullYear();
    /* getFullYear() → ano com 4 dígitos: 2025, 2026, etc. */

    calMonth = d.getMonth();
    /* getMonth() → mês de 0 a 11 (janeiro=0, fevereiro=1, ..., dezembro=11).
       Essa indexação em 0 é uma quirk histórica do JavaScript. */
}());
/* Os () no final executam a função imediatamente após a definição */


/* ══════════════════════════════════════════════════════════════════
   UTILITÁRIOS
   Funções pequenas e genéricas usadas em vários lugares
   ══════════════════════════════════════════════════════════════════ */

function autoResize(el) {
    /* Ajusta a altura do textarea automaticamente conforme o conteúdo digitado.
       Parâmetro: el = o elemento textarea (passado como "this" pelo HTML) */

    el.style.height = '44px';
    /* Primeiro, RESETA para a altura mínima.
       Isso é necessário para que o campo possa ENCOLHER ao apagar texto.
       Sem este passo, a altura só cresceria, nunca voltaria a diminuir. */

    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    /* scrollHeight = altura total do conteúdo (incluindo o que está além da área visível).
       Math.min(scrollHeight, 120) = pega o MENOR entre o conteúdo e 120px (o limite máximo).
       + 'px' = adiciona a unidade de medida CSS (ex: "88px").
       Resultado: o campo cresce conforme o texto e para em 120px. */
}

function formatDate(date) {
    /* Converte data do formato ISO ("AAAA-MM-DD") para formato brasileiro ("DD/MM/AAAA").
       Parâmetro: date = string de data ou null */

    if (!date) return '';
    /* Se não há data, retorna string vazia (evita erros ao tentar converter null) */

    return new Date(date).toLocaleDateString('pt-BR');
    /* new Date("2025-04-22") = cria objeto Date a partir da string ISO.
       .toLocaleDateString('pt-BR') = formata conforme localização brasileiro.
       Resultado: "22/04/2025" */
}

function formatDateLong(dateISO) {
    /* Converte "2025-04-22" para "Terça-feira, 22 de abril de 2025".
       Usada no título do painel do dia. */

    const [ano, mes, dia] = dateISO.split('-').map(Number);
    /* split('-') divide "2025-04-22" em ["2025", "04", "22"].
       .map(Number) converte cada string para número: [2025, 4, 22].
       Desestruturação: atribui cada item do array a uma variável. */

    const d = new Date(ano, mes - 1, dia);
    /* Constrói objeto Date manualmente.
       mes - 1 porque JavaScript usa 0-11 para meses (abril = 3, não 4).
       Usar new Date("2025-04-22") diretamente pode dar problemas de fuso horário. */

    const s = d.toLocaleDateString('pt-BR', {
        weekday: 'long',  /* nome do dia da semana por extenso: "terça-feira" */
        day:     'numeric', /* número do dia: "22" */
        month:   'long',  /* nome do mês por extenso: "abril" */
        year:    'numeric' /* ano: "2025" */
    });
    /* Resultado: "terça-feira, 22 de abril de 2025" */

    return s.charAt(0).toUpperCase() + s.slice(1);
    /* Capitaliza a primeira letra: "Terça-feira, 22 de abril de 2025".
       charAt(0) = pega o primeiro caractere.
       .toUpperCase() = converte para maiúscula.
       .slice(1) = pega o resto da string a partir do índice 1. */
}

function switchTab(t) {
    /* Troca a aba ativa e mostra o painel de conteúdo correspondente.
       Parâmetro: t = string com o nome da aba ('list', 'cal' ou 'archived') */

    const tabNames = ['list', 'cal', 'archived'];
    /* Array com os nomes das abas na mesma ordem dos botões no HTML */

    document.querySelectorAll('.tab').forEach((b, i) => {
        /* querySelectorAll('.tab') retorna todos os botões de aba.
           forEach itera: b = o botão, i = índice (0, 1 ou 2) */

        b.classList.toggle('active', tabNames[i] === t);
        /* tabNames[i] pega o nome da aba para este botão.
           === t verifica se é a aba que foi clicada.
           classList.toggle('active', true/false):
             → true  = adiciona a classe 'active' (ativa o botão)
             → false = remove a classe 'active' (desativa o botão)
           Resultado: apenas o botão da aba pedida fica ativo. */
    });

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    /* Remove 'active' de TODOS os painéis de conteúdo, escondendo-os */

    document.getElementById('view-' + t).classList.add('active');
    /* 'view-' + t constrói o ID do painel (ex: 'view-list', 'view-cal').
       Adiciona 'active' ao painel correto, tornando-o visível. */

    if (t === 'cal')      renderCalendar();
    /* Se trocou para o calendário, renderiza a grade do mês atual.
       Necessário pois o calendário precisa ser (re)desenhado quando fica visível. */

    if (t === 'archived') renderArchived();
    /* Se trocou para arquivadas, renderiza a lista de tarefas concluídas. */
}


/* ══════════════════════════════════════════════════════════════════
   SUPABASE — OPERAÇÕES CRUD (Create, Read, Update, Delete)
   Todas as funções de banco de dados ficam aqui centralizadas.
   "async" = funções assíncronas que aguardam resposta da nuvem.
   "await" = pausa a execução até a resposta chegar.
   ══════════════════════════════════════════════════════════════════ */

async function fetchTarefas() {
    /* Busca TODAS as tarefas do banco de dados e retorna o resultado bruto do Supabase.
       O chamador recebe { data, error } e faz o que precisar com os dados. */

    return await supabaseClient
        .from('tarefas')    /* acessa a tabela chamada "tarefas" */
        .select('*')        /* seleciona todas as colunas */
        .order('created_at', { ascending: false });
        /* ordena pela data de criação em ordem decrescente (mais recentes primeiro) */
}

async function deleteTarefa(id) {
    /* Remove permanentemente um registro da tabela.
       Parâmetro: id = o identificador único (UUID ou número) da tarefa */

    return await supabaseClient
        .from('tarefas')
        .delete()           /* operação de remoção */
        .eq('id', id);      /* WHERE id = id (filtra o registro específico) */
}

async function updateTarefa(id, campos) {
    /* Atualiza campos específicos de uma tarefa existente.
       Parâmetro: id = identificador da tarefa.
       Parâmetro: campos = objeto com as colunas a alterar, ex: { titulo: 'Novo título', prioridade: 'alta' } */

    return await supabaseClient
        .from('tarefas')
        .update(campos)     /* SET campo1=valor1, campo2=valor2... */
        .eq('id', id);      /* WHERE id = id */
}


/* ══════════════════════════════════════════════════════════════════
   ALGORITMO DE IMPORTÂNCIA
   ══════════════════════════════════════════════════════════════════

   Calcula automaticamente o quão importante/urgente uma tarefa é.
   A pontuação é usada para ordenar a lista (mais importante no topo)
   e colorir os badges.

   FÓRMULA: score = pontos_prioridade + pontos_urgência + pontos_tempo_parado

   ─── Componente 1: Prioridade (definida pelo usuário) ───
     alta  = 3 pontos
     media = 2 pontos
     baixa = 1 ponto

   ─── Componente 2: Urgência (baseada no prazo) ───
     sem prazo       = 0 pontos
     prazo > 5 dias  = 1 ponto
     prazo em 3-5d   = 2 pontos
     prazo em ≤ 2d   = 3 pontos (urgente!)

   ─── Componente 3: Tempo parado (penalidade por negligência) ───
     +1 ponto a cada 3 dias sem atualizar a tarefa
     Incentiva o usuário a não deixar tarefas esquecidas

   ─── Classificação final ───
     score ≥ 6 → ALTA importância
     score ≥ 4 → MÉDIA importância
     score < 4 → BAIXA importância
   ══════════════════════════════════════════════════════════════════ */

function calcularScore(tarefa) {
    /* Recebe um objeto tarefa e retorna a pontuação numérica total. */

    const now = new Date();
    /* Data e hora atual — ponto de referência para todos os cálculos de tempo */

    // ── Componente 1: Prioridade ──
    const mapPrioridade = { alta: 3, media: 2, baixa: 1 };
    /* Objeto que funciona como dicionário/tabela de lookup:
       chave = string da prioridade, valor = pontuação numérica */

    const scorePrioridade = mapPrioridade[tarefa.prioridade] || 1;
    /* Busca no mapa o valor correspondente à prioridade da tarefa.
       || 1 = se a prioridade for indefinida/nula, usa 1 como padrão seguro */

    // ── Componente 2: Urgência ──
    let scoreUrgencia = 0;
    /* Começa em 0 — tarefas sem prazo não ganham pontos de urgência */

    if (tarefa.prazo) {
        /* Só calcula urgência se a tarefa tem prazo definido */

        const diffDias = (new Date(tarefa.prazo) - now) / 86400000;
        /* new Date(tarefa.prazo) = converte a string "2025-04-22" em objeto Date.
           - now = subtrai a data atual → resultado em milissegundos.
           / 86400000 = divide por ms/dia (1000ms × 60s × 60min × 24h = 86.400.000ms).
           Resultado: dias restantes até o prazo. Negativo = prazo vencido. */

        if      (diffDias <= 2) scoreUrgencia = 3; /* ≤ 2 dias: máxima urgência */
        else if (diffDias <= 5) scoreUrgencia = 2; /* 3-5 dias: urgência média */
        else                    scoreUrgencia = 1; /* > 5 dias: urgência baixa */
    }

    // ── Componente 3: Tempo parado ──
    const ultimaAtu  = new Date(tarefa.updated_at || tarefa.created_at);
    /* Usa updated_at (última modificação) se existir, senão usa created_at (criação).
       O operador || retorna o primeiro valor "truthy" (não-nulo, não-vazio). */

    const diasParado = (now - ultimaAtu) / 86400000;
    /* Quantos dias a tarefa não é atualizada — mesmo cálculo de dias que acima */

    const scoreParado = Math.floor(diasParado / 3);
    /* Math.floor() arredonda para baixo (elimina casas decimais: 2.9 → 2).
       diasParado / 3 = a cada 3 dias sem atualização, +1 ponto de penalidade.
       Exemplos: 0-2 dias=0pts, 3-5 dias=1pt, 6-8 dias=2pts, 9-11 dias=3pts... */

    return scorePrioridade + scoreUrgencia + scoreParado;
    /* Retorna a soma dos três componentes como pontuação total */
}

function scoreParaLabel(score) {
    /* Converte pontuação numérica em string de categoria para CSS.
       Parâmetro: score = número retornado por calcularScore() */

    if (score >= 6) return 'alta';
    if (score >= 4) return 'media';
    return 'baixa';
    /* Nenhuma condição atendida = retorna 'baixa' implicitamente */
}


/* ══════════════════════════════════════════════════════════════════
   CARREGAMENTO PRINCIPAL
   Ponto de entrada dos dados — busca do banco e distribui
   para as funções de renderização.
   ══════════════════════════════════════════════════════════════════ */

async function loadList() {
    /* Busca todas as tarefas do Supabase, separa ativas/arquivadas
       e chama as funções de renderização para atualizar a interface. */

    document.getElementById('task-list').innerHTML = '<div class="loading-row">carregando...</div>';
    /* Mostra o indicador de carregamento imediatamente enquanto aguarda os dados */

    const { data, error } = await fetchTarefas();
    /* await pausa a execução até o Supabase responder.
       Desestruturação: pega os campos "data" e "error" do objeto retornado. */

    if (error) {
        /* Se o Supabase retornou um erro (sem conexão, permissão negada, etc.) */
        document.getElementById('task-list').innerHTML = `<div class="empty">Erro: ${error.message}</div>`;
        return; /* Para a execução da função aqui */
    }

    const todas = data || [];
    /* data pode ser null se não há registros — || [] garante array vazio */

    allTasks      = todas.filter(t => t.status !== 'concluida');
    /* filter() cria novo array com apenas as tarefas ATIVAS (não concluídas).
       t.status !== 'concluida' = mantém tudo que não seja concluída. */

    archivedTasks = todas.filter(t => t.status === 'concluida');
    /* filter() com condição oposta = apenas as concluídas/arquivadas */

    renderList(allTasks);
    /* Atualiza a view de lista com as tarefas ativas */

    renderCalendar();
    /* Atualiza o calendário para refletir os prazos das tarefas */

    if (selectedDate) renderDayPanel(selectedDate);
    /* Se havia um dia selecionado (painel aberto), atualiza-o também.
       Importante quando a função é chamada após salvar/deletar uma tarefa. */
}


/* ══════════════════════════════════════════════════════════════════
   RENDERIZAR LISTA PRINCIPAL (tarefas ativas)
   ══════════════════════════════════════════════════════════════════ */

function renderList(tasks) {
    /* Transforma o array de tarefas em HTML e injeta no container da lista.
       Parâmetro: tasks = array de objetos de tarefa */

    const container = document.getElementById('task-list');

    if (!tasks.length) {
        /* Se o array está vazio (nenhuma tarefa ativa) */
        container.innerHTML = '<div class="empty">nenhuma tarefa ainda.</div>';
        return;
    }

    tasks.sort((a, b) => calcularScore(b) - calcularScore(a));
    /* .sort() ordena o array no lugar (modifica o original).
       A função comparadora:
         → resultado positivo = b vem antes de a
         → calcularScore(b) - calcularScore(a): score maior = valor positivo = b na frente
       Resultado: tarefas mais importantes aparecem primeiro. */

    const now = new Date();
    let html = '<div class="section-label">por importância</div>';
    /* Começa o HTML com o rótulo de seção e vai concatenando os cartões */

    tasks.forEach(t => {
        /* Itera por cada tarefa. t = o objeto da tarefa atual. */

        const score = calcularScore(t);
        const imp   = scoreParaLabel(score);
        /* Calcula a importância para aplicar as classes CSS corretas */

        let dotClass = imp;
        /* A bolinha começa com a cor da importância... */

        if (t.prazo) {
            const diff = new Date(t.prazo) - now;
            /* Diferença em ms entre o prazo e agora */

            if (diff < 0)             dotClass = 'overdue';
            /* Prazo passou → bolinha vermelha com anel de alerta */

            else if (diff < 86400000) dotClass = 'soon';
            /* Prazo em menos de 24h (86.400.000ms) → bolinha laranja com anel */
        }

        html += buildTaskCard(t, imp, dotClass, score, false);
        /* Adiciona o HTML do cartão ao acumulador. false = não é arquivada */
    });

    container.innerHTML = html;
    /* Substitui TODO o conteúdo do container pelo HTML gerado */
}


/* ══════════════════════════════════════════════════════════════════
   RENDERIZAR ARQUIVADAS
   ══════════════════════════════════════════════════════════════════ */

function renderArchived() {
    /* Preenche a aba "Arquivadas" com as tarefas concluídas */

    const container = document.getElementById('archived-list');

    if (!archivedTasks.length) {
        container.innerHTML = '<div class="empty">nenhuma tarefa arquivada.</div>';
        return;
    }

    let html = '<div class="section-label">concluídas / arquivadas</div>';
    archivedTasks.forEach(t => {
        html += buildTaskCard(t, 'concluida', 'concluida', 0, true);
        /* true = é arquivada → botões de ação diferentes (apenas deletar permanentemente) */
    });

    container.innerHTML = html;
}


/* ══════════════════════════════════════════════════════════════════
   MONTAR HTML DO CARTÃO DE TAREFA
   Função reutilizada em: lista principal, painel do dia e arquivadas.
   ══════════════════════════════════════════════════════════════════ */

function buildTaskCard(t, imp, dotClass, score, isArchived) {
    /* Parâmetros:
       t         = objeto da tarefa (com id, titulo, descricao, prioridade, prazo, status...)
       imp       = label de importância: 'alta', 'media', 'baixa' ou 'concluida'
       dotClass  = classe da bolinha (pode diferir de imp se for overdue/soon)
       score     = pontuação numérica (0 para arquivadas)
       isArchived = boolean — define quais botões de ação mostrar */

    const idPrefix = isArchived ? 'arch' : 'item';
    /* Prefixo do id do elemento HTML.
       'item-123' para ativas, 'arch-123' para arquivadas.
       Permite removeTask() encontrar o elemento correto para animação. */

    // ── Botões de ação ──
    const actions = isArchived
        /* ARQUIVADAS: apenas o botão de deletar permanentemente */
        ? `<div class="task-actions">
               <button class="act-btn del" onclick="removeTask('${t.id}')" title="Deletar permanentemente">🗑</button>
           </div>`
        /* ATIVAS: editar, concluir (arquivar) e deletar */
        : `<div class="task-actions">
               <button class="act-btn edit" onclick="toggleEditForm('${t.id}')" title="Editar">✏️</button>
               <button class="act-btn done" onclick="arquivarTarefa('${t.id}')" title="Concluir e arquivar">✓</button>
               <button class="act-btn del"  onclick="removeTask('${t.id}')" title="Deletar">✕</button>
           </div>`;
    /* O operador ternário (condição ? seSeVerdadeiro : seFalso) escolhe o HTML correto */

    // ── Badge de importância ou status ──
    const scoreTag = (!isArchived && score > 0)
        /* Tarefa ativa com pontuação: mostra a importância calculada */
        ? `<span class="badge ${imp}">importância: ${imp} (${score}pts)</span>`
        /* Tarefa arquivada: mostra "arquivada" em verde */
        : `<span class="badge concluida">arquivada</span>`;

    return `
        <div class="task-card" id="${idPrefix}-${t.id}">
        <!-- id único para cada cartão permite encontrá-lo para animações (fade-out ao deletar) -->

            <div class="dot ${dotClass}"></div>
            <!-- Bolinha colorida de status: cor varia por importância/vencimento -->

            <div class="task-body">
                <div class="task-title">${t.titulo}</div>
                <!-- Título da tarefa — sempre exibido -->

                ${t.descricao ? `<div class="task-desc">${t.descricao}</div>` : ''}
                <!-- Descrição: exibida APENAS se existir (string não vazia).
                     Operador ternário: se t.descricao for truthy, mostra o div, senão string vazia. -->

                <div class="task-meta">
                    <span class="badge ${t.prioridade}">${t.prioridade || '-'}</span>
                    <!-- Badge de prioridade (alta/media/baixa) com cor correspondente -->

                    ${scoreTag}
                    <!-- Badge de importância calculada ou "arquivada" (montado acima) -->

                    ${t.prazo ? `<span class="badge">prazo: ${formatDate(t.prazo)}</span>` : ''}
                    <!-- Badge de prazo formatado em DD/MM/AAAA — apenas se houver prazo -->
                </div>

                <!-- Formulário de edição inline — começa oculto, aparece ao clicar ✏️ -->
                <div class="edit-form" id="edit-${t.id}">
                    <input class="edit-input" id="edit-titulo-${t.id}"
                        value="${t.titulo}" type="text" placeholder="Título" />
                    <!-- value="${t.titulo}" pré-preenche com o valor atual -->

                    <input class="edit-input" id="edit-descricao-${t.id}"
                        value="${t.descricao || ''}" type="text" placeholder="Descrição" />
                    <!-- ${t.descricao || ''} garante string vazia se descrição for null -->

                    <div class="edit-row">
                        <select class="edit-select" id="edit-prioridade-${t.id}">
                            <!-- "selected" na option correta pré-seleciona a prioridade atual -->
                            <option value="baixa" ${t.prioridade==='baixa'?'selected':''}>Baixa</option>
                            <option value="media" ${t.prioridade==='media'?'selected':''}>Média</option>
                            <option value="alta"  ${t.prioridade==='alta' ?'selected':''}>Alta</option>
                        </select>
                        <button class="edit-save"   onclick="salvarEdicao('${t.id}')">Salvar</button>
                        <button class="edit-cancel" onclick="toggleEditForm('${t.id}')">Cancelar</button>
                    </div>
                </div>
                <!-- fim do .edit-form -->

            </div>
            <!-- fim do .task-body -->

            ${actions}
            <!-- Botões de ação (montados acima conforme isArchived) -->

        </div>`;
    /* O template string (crase + ${}) permite HTML multi-linha com interpolação de variáveis */
}


/* ══════════════════════════════════════════════════════════════════
   AÇÕES NOS CARTÕES DE TAREFA
   ══════════════════════════════════════════════════════════════════ */

function toggleEditForm(id) {
    /* Abre ou fecha o formulário de edição inline do cartão.
       Parâmetro: id = identificador da tarefa */

    const form = document.getElementById('edit-' + id);
    /* Encontra o div .edit-form específico deste cartão */

    if (!form) return;
    /* Proteção: se o elemento não existir, para a execução */

    form.classList.toggle('open');
    /* classList.toggle('open'):
       → se 'open' estiver presente: remove (fecha o formulário)
       → se 'open' estiver ausente: adiciona (abre o formulário) */

    if (form.classList.contains('open')) {
        /* Se acabou de abrir, coloca o cursor no primeiro campo (título) */
        form.querySelector('.edit-input').focus();
        /* querySelector('.edit-input') encontra o PRIMEIRO input dentro do formulário */
    }
}

async function salvarEdicao(id) {
    /* Lê os valores do formulário de edição e envia ao Supabase.
       Parâmetro: id = identificador da tarefa a editar */

    const titulo     = document.getElementById('edit-titulo-'    + id).value.trim();
    const descricao  = document.getElementById('edit-descricao-' + id).value.trim();
    const prioridade = document.getElementById('edit-prioridade-'+ id).value;
    /* .trim() remove espaços do início e fim da string digitada */

    if (!titulo) return;
    /* Validação mínima: título não pode ser vazio. Se for, para a execução silenciosamente. */

    const { error } = await updateTarefa(id, { titulo, descricao, prioridade });
    /* Envia as mudanças ao Supabase.
       { titulo, descricao, prioridade } é shorthand ES6 para { titulo: titulo, ... }
       Supabase também atualiza automaticamente o campo updated_at (se configurado). */

    if (error) {
        alert('Erro ao salvar: ' + error.message);
    } else {
        await loadList();
        /* Recarrega TUDO do banco para garantir que a interface reflita os dados reais.
           Mais simples e seguro que tentar atualizar apenas o cartão específico. */
    }
}

async function arquivarTarefa(id) {
    /* Move a tarefa de "ativa" para "arquivada" mudando o status para "concluida".
       Não deleta — apenas muda o estado. Pode ser visualizada na aba "Arquivadas".
       Parâmetro: id = identificador da tarefa */

    const el = document.getElementById('item-' + id);
    if (el) el.style.opacity = '0.4';
    /* Feedback visual imediato: esmaece o cartão enquanto aguarda o Supabase */

    const { error } = await updateTarefa(id, { status: 'concluida' });
    /* Atualiza apenas o campo status — todos os outros dados são preservados */

    if (error) {
        if (el) el.style.opacity = '1'; /* Desfaz o esmaecimento em caso de erro */
        alert('Erro: ' + error.message);
    } else {
        await loadList();
        /* Recarrega: a tarefa some da lista ativa e aparece em "Arquivadas" */
    }
}

async function removeTask(id) {
    /* Deleta permanentemente uma tarefa do banco de dados.
       Funciona para tarefas ativas (prefix 'item') e arquivadas (prefix 'arch').
       Parâmetro: id = identificador da tarefa */

    const el = document.getElementById('item-' + id) || document.getElementById('arch-' + id);
    /* Tenta encontrar o cartão em ambos os prefixos possíveis (ativo ou arquivado).
       O operador || retorna o primeiro que não for null. */

    if (el) el.style.opacity = '0.4';
    /* Feedback visual: esmaece antes de deletar */

    const { error } = await deleteTarefa(id);

    if (error) {
        if (el) el.style.opacity = '1'; /* Restaura em caso de erro */
        alert('Erro ao remover: ' + error.message);
    } else {
        allTasks      = allTasks.filter(t => t.id != id);
        archivedTasks = archivedTasks.filter(t => t.id != id);
        /* Remove do array global sem precisar recarregar do banco.
           .filter() cria novo array sem o item deletado.
           != (não estrito) para cobrir casos onde id pode ser number ou string. */

        renderList(allTasks);
        renderArchived();
        renderCalendar();
        /* Atualiza todas as views para refletir a remoção */

        if (selectedDate) renderDayPanel(selectedDate);
        /* Se o painel do dia está aberto, atualiza-o também */
    }
}


/* ══════════════════════════════════════════════════════════════════
   SALVAR TAREFA (barra de comando — entrada rápida)
   Formato: "Título; Descrição; Prioridade; Prazo (DD/MM/AAAA)"
   ══════════════════════════════════════════════════════════════════ */

async function salvarTarefa(event) {
    event.preventDefault();

    const command = document.getElementById('command').value.trim();
    if (!command) return;

    const { data } = await supabaseClient.auth.getUser();
    const user = data.user;
    if (!user) { alert('Você precisa estar logado!'); return; }

    // Divide pelo separador de tarefas: vírgula
    // trim() em cada parte remove espaços sobrando nas pontas
    const blocos = command.split('|').map(b => b.trim()).filter(b => b.length > 0);

    // Transforma cada bloco "Título; desc; prioridade; prazo" num objeto
    const registros = blocos.map(bloco => {
        const parts = bloco.split(';').map(s => s.trim());

        const titulo     = parts[0] || '';
        const descricao  = parts[1] || '';
        const prioridade = (parts[2] || 'media').toLowerCase();

        let prazo = null;
        if (parts[3]) {
            const [dia, mes, ano] = parts[3].split('/');
            prazo = `${ano}-${mes}-${dia}`;
        }

        return { titulo, descricao, prioridade, prazo, status: 'pendente', user_id: user.id };
    });

    // Remove entradas sem título (evita salvar linhas vazias por engano)
    const validos = registros.filter(r => r.titulo.length > 0);

    if (!validos.length) return;

    // Envia todos de uma vez para o banco (insert aceita array)
    const { error } = await supabaseClient.from('tarefas').insert(validos);

    if (error) {
        alert('Erro: ' + error.message);
    } else {
        const cmd = document.getElementById('command');
        cmd.value = '';
        cmd.style.height = '44px';
        await loadList();
    }
}


/* ══════════════════════════════════════════════════════════════════
   CALENDÁRIO — NAVEGAÇÃO E RENDERIZAÇÃO
   ══════════════════════════════════════════════════════════════════ */

function calPrev() {
    /* Navega para o mês ANTERIOR */

    calMonth--;
    /* Decrementa: de abril (3) para março (2), por exemplo */

    if (calMonth < 0) {
        /* Se passou de janeiro (0) para -1, vai para dezembro do ano anterior */
        calMonth = 11; /* dezembro */
        calYear--;     /* recua o ano */
    }
    renderCalendar(); /* Redesenha o calendário com o novo mês */
}

function calNext() {
    /* Navega para o PRÓXIMO mês */

    calMonth++;
    /* Incrementa: de abril (3) para maio (4), por exemplo */

    if (calMonth > 11) {
        /* Se passou de dezembro (11) para 12, vai para janeiro do próximo ano */
        calMonth = 0; /* janeiro */
        calYear++;    /* avança o ano */
    }
    renderCalendar();
}

function renderCalendar() {
    /* Desenha toda a grade do calendário para o mês/ano atual (calMonth/calYear).
       Chamada ao trocar de mês, ao carregar dados e ao modificar tarefas. */

    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    /* Array com nomes dos meses em português. Índice 0 = Janeiro. */

    const label = document.getElementById('cal-month-label');
    const grid  = document.getElementById('cal-grid');
    if (!label || !grid) return;
    /* Proteção: se os elementos ainda não existem no DOM (ex: view inativa), aborta */

    label.textContent = months[calMonth] + ' ' + calYear;
    /* Atualiza o texto de navegação: ex "Abril 2025" */

    const firstDay    = new Date(calYear, calMonth, 1).getDay();
    /* new Date(ano, mês, 1) = primeiro dia do mês.
       .getDay() = dia da semana desse dia (0=Dom, 1=Seg, ..., 6=Sáb).
       Indica quantas células vazias colocar antes do dia 1 no grid. */

    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    /* new Date(ano, mêsSeguinte, 0) = dia ZERO do próximo mês = último dia do mês atual.
       .getDate() = o número desse dia = total de dias no mês (28, 29, 30 ou 31).
       Truque elegante para descobrir o último dia sem precisar de lógica de mês. */

    const now = new Date();
    /* Referência do dia atual para identificar "hoje" na grade */

    let cells = '';
    /* Acumulador de string HTML para todas as células */

    // Células invisíveis para alinhar o dia 1 com o dia da semana correto
    for (let i = 0; i < firstDay; i++) {
        cells += '<div class="cal-cell empty-cell"></div>';
        /* CSS faz estas células serem completamente transparentes e não clicáveis */
    }

    // Uma célula por dia do mês
    for (let d = 1; d <= daysInMonth; d++) {

        const dateStr = calYear + '-'
            + String(calMonth + 1).padStart(2, '0') + '-'
            + String(d).padStart(2, '0');
        /* Monta a string ISO do dia: "2025-04-05".
           String().padStart(2, '0') adiciona zero à esquerda se o número tem 1 dígito.
           Exemplos: 4 → "04", 5 → "05", 15 → "15" (não muda). */

        const isToday    = (
            calYear  === now.getFullYear() &&
            calMonth === now.getMonth()    &&
            d        === now.getDate()
        );
        /* Compara ano, mês E dia individualmente para identificar "hoje". */

        const isSelected = (dateStr === selectedDate);
        /* Marca o dia que o usuário clicou (painel do dia aberto para este dia) */

        // Tarefas ATIVAS com prazo neste dia
        const dayTasks = allTasks.filter(t => t.prazo && t.prazo.startsWith(dateStr));
        /* t.prazo && = garante que prazo não é null antes de chamar startsWith.
           .startsWith(dateStr) = o prazo começa com a data do dia.
           Necessário pois o prazo pode incluir horário: "2025-04-05T00:00:00+00:00". */

        // Tarefas ARQUIVADAS com prazo neste dia
        const dayArchived = archivedTasks.filter(t => t.prazo && t.prazo.startsWith(dateStr));

        let taskHtml = '';

        // Mostra até 2 tarefas ativas em miniatura
        taskHtml += dayTasks.slice(0, 2).map(t => {
            /* .slice(0, 2) limita a 2 itens para não transbordar a célula */
            const imp = scoreParaLabel(calcularScore(t));
            return `<div class="cal-task ${imp}" title="${t.titulo}">${t.titulo}</div>`;
            /* title="${t.titulo}" = tooltip com o título completo ao passar o mouse */
        }).join('');
        /* .join('') une todos os HTMLs em uma única string sem separador */

        // Mostra até 1 arquivada se sobrar espaço (menos de 2 ativas)
        if (dayArchived.length && dayTasks.length < 2) {
            taskHtml += `<div class="cal-task concluida" title="${dayArchived[0].titulo}">${dayArchived[0].titulo}</div>`;
            /* Estilo diferente (riscado, verde) indica que é uma tarefa concluída */
        }

        // Indicador "+N" quando há mais tarefas do que as exibidas
        const total = dayTasks.length + dayArchived.length;
        if (total > 2) {
            taskHtml += `<div style="font-size:10px;color:#555">+${total - 2}</div>`;
            /* Ex: se há 4 tarefas e mostra 2, exibe "+2" */
        }

        // Monta o HTML completo da célula do dia
        cells += `
            <div class="cal-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}"
                 onclick="selectDay('${dateStr}')">
                <!-- Classes condicionais: 'today' se for hoje, 'selected' se clicado.
                     onclick chama selectDay() com a data do dia no formato ISO. -->

                <div class="day-num">${d}</div>
                <!-- Número do dia no canto superior da célula -->

                ${taskHtml}
                <!-- Tarefas miniatura do dia (ou vazio se não houver) -->
            </div>`;
    }

    grid.innerHTML = cells;
    /* Substitui todo o conteúdo da grade pelo HTML gerado.
       Mais eficiente que atualizar célula por célula. */
}


/* ══════════════════════════════════════════════════════════════════
   PAINEL DO DIA (aparece abaixo do calendário ao clicar num dia)
   ══════════════════════════════════════════════════════════════════ */

function selectDay(dateISO) {
    /* Chamada ao clicar em qualquer célula do calendário.
       Parâmetro: dateISO = data do dia clicado no formato "AAAA-MM-DD" */

    selectedDate = dateISO;
    /* Guarda a data selecionada globalmente para:
       1. Marcar visualmente a célula como "selected" no calendário
       2. Saber para qual data criar tarefas ao salvar no formulário */

    renderCalendar();
    /* Redesenha o calendário para aplicar a classe 'selected' na célula clicada
       e remover de eventuais células anteriormente selecionadas */

    renderDayPanel(dateISO);
    /* Preenche o painel com o título da data e as tarefas do dia */

    document.getElementById('day-panel').classList.add('open');
    /* Abre o painel adicionando 'open' → max-height e opacity transitam para os valores visíveis */

    document.getElementById('add-form').classList.remove('open');
    /* Garante que o formulário de adicionar comece fechado ao trocar de dia */

    setTimeout(() => {
        document.getElementById('day-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
    /* scrollIntoView rola a página para tornar o painel visível.
       behavior: 'smooth' = rolagem suave animada.
       block: 'nearest' = rola o mínimo necessário (não força scroll se já estiver visível).
       setTimeout de 50ms aguarda a animação de abertura do painel começar antes de rolar. */
}

function renderDayPanel(dateISO) {
    /* Preenche o conteúdo do painel do dia: título e lista de tarefas.
       Parâmetro: dateISO = "AAAA-MM-DD" */

    document.getElementById('day-panel-title').textContent = formatDateLong(dateISO);
    /* Atualiza o título do painel: ex "Terça-feira, 22 de abril de 2025" */

    document.getElementById('add-form-date-label').textContent = formatDate(dateISO + 'T00:00:00');
    /* Atualiza o rótulo dentro do formulário: "Nova tarefa para 22/04/2025".
       + 'T00:00:00' é adicionado para que formatDate parse corretamente como data local. */

    const container = document.getElementById('day-task-list');

    const ativas    = allTasks.filter(t => t.prazo && t.prazo.startsWith(dateISO));
    /* Tarefas ativas com prazo neste dia — ordenadas por importância abaixo */

    const arquivadas = archivedTasks.filter(t => t.prazo && t.prazo.startsWith(dateISO));
    /* Tarefas concluídas com prazo neste dia */

    const todas = [...ativas, ...arquivadas];
    /* Spread operator: cria um novo array com todos os itens de ambos os arrays */

    if (!todas.length) {
        container.innerHTML = '<div class="day-empty">Nenhuma tarefa para este dia.</div>';
        return;
    }

    ativas.sort((a, b) => calcularScore(b) - calcularScore(a));
    /* Ordena as ativas por importância (mais urgentes primeiro) */

    let html = '';

    if (ativas.length) {
        ativas.forEach(t => {
            const score = calcularScore(t);
            const imp   = scoreParaLabel(score);
            html += buildTaskCard(t, imp, imp, score, false);
            /* false = não é arquivada → exibe botões de ação completos */
        });
    }

    if (arquivadas.length) {
        html += `<div class="section-label" style="margin-top:10px">concluídas</div>`;
        /* Rótulo separador entre ativas e concluídas */

        arquivadas.forEach(t => {
            html += buildTaskCard(t, 'concluida', 'concluida', 0, true);
            /* true = arquivada → apenas botão de deletar permanentemente */
        });
    }

    container.innerHTML = html;
}

function toggleAddForm() {
    /* Abre ou fecha o formulário de adicionar tarefa dentro do painel do dia */

    const form = document.getElementById('add-form');
    form.classList.toggle('open');
    /* toggle: adiciona 'open' se não tem, remove se tem */

    if (form.classList.contains('open')) {
        /* Se acabou de abrir, limpa os campos e foca no título */
        document.getElementById('add-titulo').value    = '';
        document.getElementById('add-descricao').value = '';
        document.getElementById('add-prioridade').value = 'media';
        /* Reseta o select para a opção padrão "Prioridade média" */

        setTimeout(() => document.getElementById('add-titulo').focus(), 50);
        /* Small delay para aguardar a animação CSS de abertura do formulário */
    }
}


/* ══════════════════════════════════════════════════════════════════
   SALVAR TAREFA DO PAINEL DO DIA
   Semelhante a salvarTarefa(), mas o prazo vem do selectedDate
   (o dia clicado no calendário), não de um campo de texto.
   ══════════════════════════════════════════════════════════════════ */

async function salvarTarefaDia() {
    /* Lê o formulário do painel do dia e salva a nova tarefa no Supabase */

    const titulo     = document.getElementById('add-titulo').value.trim();
    const descricao  = document.getElementById('add-descricao').value.trim();
    const prioridade = document.getElementById('add-prioridade').value;

    if (!titulo) {
        /* Validação: título é obrigatório */
        const inp = document.getElementById('add-titulo');
        inp.style.borderColor = '#e24b4a'; /* borda vermelha de erro */
        inp.focus();
        setTimeout(() => inp.style.borderColor = '', 1500);
        /* Restaura a borda ao normal após 1.5 segundos — feedback visual temporário */
        return;
    }

    const btn = document.getElementById('add-submit-btn');
    btn.disabled    = true;
    btn.textContent = 'Salvando...';
    /* Desabilita o botão e troca o texto para evitar duplo-clique acidental */

    const { data } = await supabaseClient.auth.getUser();
    const user = data.user;
    if (!user) {
        alert('Você precisa estar logado!');
        btn.disabled    = false;
        btn.textContent = 'Salvar';
        return;
    }

    const { error } = await supabaseClient
        .from('tarefas')
        .insert([{
            titulo,
            descricao,
            prioridade,
            prazo:   selectedDate,  /* o prazo é automaticamente o dia selecionado no calendário */
            status:  'pendente',
            user_id: user.id
        }]);

    btn.disabled    = false;
    btn.textContent = 'Salvar';
    /* Reabilita o botão independentemente de sucesso ou erro */

    if (error) {
        alert('Erro: ' + error.message);
    } else {
        document.getElementById('add-form').classList.remove('open');
        /* Fecha o formulário após salvar com sucesso */

        await loadList();
        /* Recarrega tudo do banco → a nova tarefa aparece no painel e no calendário */
    }
}


/* ══════════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
   Esta é a única linha que "dispara" a aplicação.
   Tudo começa aqui: busca os dados, renderiza a lista e o calendário.
   ══════════════════════════════════════════════════════════════════ */
loadList();