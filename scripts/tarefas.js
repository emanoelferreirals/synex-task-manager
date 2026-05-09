/* ══════════════════════════════════════════════════════════════════
   ESTADO GLOBAL
   ══════════════════════════════════════════════════════════════════ */

var allTasks      = [];
var archivedTasks = [];
var calYear, calMonth;
var selectedDate  = null;

(function() {
    var d    = new Date();
    calYear  = d.getFullYear();
    calMonth = d.getMonth();
}());


/* ══════════════════════════════════════════════════════════════════
   UTILITÁRIOS
   ══════════════════════════════════════════════════════════════════ */

function autoResize(el) {
    el.style.height = '44px';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR');
}

function formatDateLong(dateISO) {
    const [ano, mes, dia] = dateISO.split('-').map(Number);
    const d = new Date(ano, mes - 1, dia);
    const s = d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day:     'numeric',
        month:   'long',
        year:    'numeric'
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function switchTab(t) {
    const tabNames = ['list', 'cal', 'archived'];
    document.querySelectorAll('.tab').forEach((b, i) => {
        b.classList.toggle('active', tabNames[i] === t);
    });
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-' + t).classList.add('active');
    if (t === 'cal')      renderCalendar();
    if (t === 'archived') renderArchived();
}


/* ══════════════════════════════════════════════════════════════════
   SUPABASE — OPERAÇÕES CRUD
   ══════════════════════════════════════════════════════════════════ */

async function fetchTarefas() {
    return await supabaseClient
        .from('tarefas')
        .select('*')
        .order('created_at', { ascending: false });
}

async function deleteTarefa(id) {
    return await supabaseClient
        .from('tarefas')
        .delete()
        .eq('id', id);
}

async function updateTarefa(id, campos) {
    return await supabaseClient
        .from('tarefas')
        .update(campos)
        .eq('id', id);
}


/* ══════════════════════════════════════════════════════════════════
   ALGORITMO DE IMPORTÂNCIA
   ══════════════════════════════════════════════════════════════════ */

function calcularScore(tarefa) {
    const now = new Date();

    const mapPrioridade = { alta: 3, media: 2, baixa: 1 };
    const scorePrioridade = mapPrioridade[tarefa.prioridade] || 1;

    let scoreUrgencia = 0;
    if (tarefa.prazo) {
        const diffDias = (new Date(tarefa.prazo) - now) / 86400000;
        if      (diffDias <= 2) scoreUrgencia = 3;
        else if (diffDias <= 5) scoreUrgencia = 2;
        else                    scoreUrgencia = 1;
    }

    const ultimaAtu  = new Date(tarefa.updated_at || tarefa.created_at);
    const diasParado = (now - ultimaAtu) / 86400000;
    const scoreParado = Math.floor(diasParado / 3);

    return scorePrioridade + scoreUrgencia + scoreParado;
}

function scoreParaLabel(score) {
    if (score >= 6) return 'alta';
    if (score >= 4) return 'media';
    return 'baixa';
}


/* ══════════════════════════════════════════════════════════════════
   CARREGAMENTO PRINCIPAL
   ══════════════════════════════════════════════════════════════════ */

async function loadList() {
    document.getElementById('task-list').innerHTML = '<div class="loading-row">carregando...</div>';

    const { data, error } = await fetchTarefas();

    if (error) {
        document.getElementById('task-list').innerHTML = `<div class="empty">Erro: ${error.message}</div>`;
        return;
    }

    const todas = data || [];

    allTasks      = todas.filter(t => t.status !== 'concluida');
    archivedTasks = todas.filter(t => t.status === 'concluida');

    renderList(allTasks);
    renderCalendar();

    if (selectedDate) renderDayPanel(selectedDate);
}


/* ══════════════════════════════════════════════════════════════════
   RENDERIZAR LISTA PRINCIPAL
   ══════════════════════════════════════════════════════════════════ */

function renderList(tasks) {
    const container = document.getElementById('task-list');

    if (!tasks.length) {
        container.innerHTML = '<div class="empty">nenhuma tarefa ainda.</div>';
        return;
    }

    tasks.sort((a, b) => calcularScore(b) - calcularScore(a));

    const now = new Date();
    let html = '<div class="section-label">por importância</div>';

    tasks.forEach(t => {
        const score = calcularScore(t);
        const imp   = scoreParaLabel(score);

        let dotClass = imp;

        if (t.prazo) {
            const diff = new Date(t.prazo) - now;
            if (diff < 0)             dotClass = 'overdue';
            else if (diff < 86400000) dotClass = 'soon';
        }

        html += buildTaskCard(t, imp, dotClass, score, false);
    });

    container.innerHTML = html;
}


/* ══════════════════════════════════════════════════════════════════
   RENDERIZAR ARQUIVADAS
   ══════════════════════════════════════════════════════════════════ */

function renderArchived() {
    const container = document.getElementById('archived-list');

    if (!archivedTasks.length) {
        container.innerHTML = '<div class="empty">nenhuma tarefa arquivada.</div>';
        return;
    }

    let html = '<div class="section-label">concluídas / arquivadas</div>';
    archivedTasks.forEach(t => {
        html += buildTaskCard(t, 'concluida', 'concluida', 0, true);
    });

    container.innerHTML = html;
}


/* ══════════════════════════════════════════════════════════════════
   MONTAR HTML DO CARTÃO DE TAREFA
   ══════════════════════════════════════════════════════════════════ */

function buildTaskCard(t, imp, dotClass, score, isArchived) {
    const idPrefix = isArchived ? 'arch' : 'item';

    // ── Link do Notion (se existir) ──
    const notionLink = t.notion_page_id
        ? `<a class="notion-link"
              href="https://notion.so/${t.notion_page_id.replaceAll('-', '')}"
              target="_blank"
              title="Abrir no Notion">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                 <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"/>
               </svg>
               Notion
           </a>`
        : '';

    // ── Botões de ação ──
    const actions = isArchived
        ? `<div class="task-actions">
               <button class="act-btn del" onclick="removeTask('${t.id}')" title="Deletar permanentemente">🗑</button>
           </div>`
        : `<div class="task-actions">
               <button class="act-btn edit" onclick="toggleEditForm('${t.id}')" title="Editar">✏️</button>
               <button class="act-btn done" onclick="arquivarTarefa('${t.id}')" title="Concluir e arquivar">✓</button>
               <button class="act-btn del"  onclick="removeTask('${t.id}')" title="Deletar">✕</button>
           </div>`;

    // ── Badge de importância ──
    const scoreTag = (!isArchived && score > 0)
        ? `<span class="badge ${imp}">importância: ${imp} (${score}pts)</span>`
        : `<span class="badge concluida">arquivada</span>`;

    return `
        <div class="task-card" id="${idPrefix}-${t.id}">
            <div class="dot ${dotClass}"></div>
            <div class="task-body">
                <div class="task-title">
                    ${t.titulo}
                    ${notionLink}
                </div>

                ${t.descricao ? `<div class="task-desc">${t.descricao}</div>` : ''}

                <div class="task-meta">
                    <span class="badge ${t.prioridade}">${t.prioridade || '-'}</span>
                    ${scoreTag}
                    ${t.prazo ? `<span class="badge">prazo: ${formatDate(t.prazo)}</span>` : ''}
                </div>

                <div class="edit-form" id="edit-${t.id}">
                    <input class="edit-input" id="edit-titulo-${t.id}"
                        value="${t.titulo}" type="text" placeholder="Título" />
                    <input class="edit-input" id="edit-descricao-${t.id}"
                        value="${t.descricao || ''}" type="text" placeholder="Descrição" />
                    <div class="edit-row">
                        <select class="edit-select" id="edit-prioridade-${t.id}">
                            <option value="baixa" ${t.prioridade==='baixa'?'selected':''}>Baixa</option>
                            <option value="media" ${t.prioridade==='media'?'selected':''}>Média</option>
                            <option value="alta"  ${t.prioridade==='alta' ?'selected':''}>Alta</option>
                        </select>
                        <button class="edit-save"   onclick="salvarEdicao('${t.id}')">Salvar</button>
                        <button class="edit-cancel" onclick="toggleEditForm('${t.id}')">Cancelar</button>
                    </div>
                </div>

            </div>
            ${actions}
        </div>`;
}


/* ══════════════════════════════════════════════════════════════════
   AÇÕES NOS CARTÕES
   ══════════════════════════════════════════════════════════════════ */

function toggleEditForm(id) {
    const form = document.getElementById('edit-' + id);
    if (!form) return;
    form.classList.toggle('open');
    if (form.classList.contains('open')) {
        form.querySelector('.edit-input').focus();
    }
}

async function salvarEdicao(id) {
    const titulo     = document.getElementById('edit-titulo-'    + id).value.trim();
    const descricao  = document.getElementById('edit-descricao-' + id).value.trim();
    const prioridade = document.getElementById('edit-prioridade-'+ id).value;

    if (!titulo) return;

    const { error } = await updateTarefa(id, { titulo, descricao, prioridade });

    if (error) {
        alert('Erro ao salvar: ' + error.message);
    } else {
        await loadList();
    }
}

async function arquivarTarefa(id) {
    const el = document.getElementById('item-' + id);
    if (el) el.style.opacity = '0.4';

    const { error } = await updateTarefa(id, { status: 'concluida' });

    if (error) {
        if (el) el.style.opacity = '1';
        alert('Erro: ' + error.message);
    } else {
        await loadList();
    }
}

async function removeTask(id) {
    const el = document.getElementById('item-' + id) || document.getElementById('arch-' + id);
    if (el) el.style.opacity = '0.4';

    const { error } = await deleteTarefa(id);

    if (error) {
        if (el) el.style.opacity = '1';
        alert('Erro ao remover: ' + error.message);
    } else {
        allTasks      = allTasks.filter(t => t.id != id);
        archivedTasks = archivedTasks.filter(t => t.id != id);
        renderList(allTasks);
        renderArchived();
        renderCalendar();
        if (selectedDate) renderDayPanel(selectedDate);
    }
}


/* ══════════════════════════════════════════════════════════════════
   SALVAR TAREFA — BARRA DE COMANDO
   ══════════════════════════════════════════════════════════════════ */

async function salvarTarefa(event) {
    event.preventDefault();

    const command = document.getElementById('command').value.trim();
    if (!command) return;

    const { data } = await supabaseClient.auth.getUser();
    const user = data.user;
    if (!user) { alert('Você precisa estar logado!'); return; }

    const blocos = command.split('|').map(b => b.trim()).filter(b => b.length > 0);

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

    const validos = registros.filter(r => r.titulo.length > 0);
    if (!validos.length) return;

    const { data: inserted, error } = await supabaseClient
        .from('tarefas')
        .insert(validos)
        .select();

    if (error) {
        alert('Erro: ' + error.message);
        return;
    }

    // Envia cada tarefa inserida para o Notion
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session?.access_token;

    if (token && inserted) {
        await Promise.all(inserted.map(async (tarefa) => {
            try {
                const res = await fetch(
                    'https://qgvotcupxchajbtkydiq.supabase.co/functions/v1/create-notion-page',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            titulo:     tarefa.titulo,
                            descricao:  tarefa.descricao,
                            prioridade: tarefa.prioridade,
                            prazo:      tarefa.prazo
                        })
                    }
                );

                const json = await res.json();

                if (json.notion_page_id) {
                    await supabaseClient
                        .from('tarefas')
                        .update({ notion_page_id: json.notion_page_id })
                        .eq('id', tarefa.id);
                }
            } catch (e) {
                console.warn('Notion sync falhou para', tarefa.titulo, e);
                // Não bloqueia — a tarefa já foi salva no Supabase
            }
        }));
    }

    const cmd = document.getElementById('command');
    cmd.value = '';
    cmd.style.height = '44px';
    await loadList();
}


/* ══════════════════════════════════════════════════════════════════
   CALENDÁRIO
   ══════════════════════════════════════════════════════════════════ */

function calPrev() {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
}

function calNext() {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
}

function renderCalendar() {
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    const label = document.getElementById('cal-month-label');
    const grid  = document.getElementById('cal-grid');
    if (!label || !grid) return;

    label.textContent = months[calMonth] + ' ' + calYear;

    const firstDay    = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const now         = new Date();

    let cells = '';

    for (let i = 0; i < firstDay; i++) {
        cells += '<div class="cal-cell empty-cell"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = calYear + '-'
            + String(calMonth + 1).padStart(2, '0') + '-'
            + String(d).padStart(2, '0');

        const isToday    = (calYear === now.getFullYear() && calMonth === now.getMonth() && d === now.getDate());
        const isSelected = (dateStr === selectedDate);

        const dayTasks    = allTasks.filter(t => t.prazo && t.prazo.startsWith(dateStr));
        const dayArchived = archivedTasks.filter(t => t.prazo && t.prazo.startsWith(dateStr));

        let taskHtml = '';

        taskHtml += dayTasks.slice(0, 2).map(t => {
            const imp = scoreParaLabel(calcularScore(t));
            return `<div class="cal-task ${imp}" title="${t.titulo}">${t.titulo}</div>`;
        }).join('');

        if (dayArchived.length && dayTasks.length < 2) {
            taskHtml += `<div class="cal-task concluida" title="${dayArchived[0].titulo}">${dayArchived[0].titulo}</div>`;
        }

        const total = dayTasks.length + dayArchived.length;
        if (total > 2) {
            taskHtml += `<div style="font-size:10px;color:#555">+${total - 2}</div>`;
        }

        cells += `
            <div class="cal-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}"
                 onclick="selectDay('${dateStr}')">
                <div class="day-num">${d}</div>
                ${taskHtml}
            </div>`;
    }

    grid.innerHTML = cells;
}


/* ══════════════════════════════════════════════════════════════════
   PAINEL DO DIA
   ══════════════════════════════════════════════════════════════════ */

function selectDay(dateISO) {
    selectedDate = dateISO;
    renderCalendar();
    renderDayPanel(dateISO);
    document.getElementById('day-panel').classList.add('open');
    document.getElementById('add-form').classList.remove('open');
    setTimeout(() => {
        document.getElementById('day-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
}

function renderDayPanel(dateISO) {
    document.getElementById('day-panel-title').textContent = formatDateLong(dateISO);
    document.getElementById('add-form-date-label').textContent = formatDate(dateISO + 'T00:00:00');

    const container  = document.getElementById('day-task-list');
    const ativas     = allTasks.filter(t => t.prazo && t.prazo.startsWith(dateISO));
    const arquivadas = archivedTasks.filter(t => t.prazo && t.prazo.startsWith(dateISO));
    const todas      = [...ativas, ...arquivadas];

    if (!todas.length) {
        container.innerHTML = '<div class="day-empty">Nenhuma tarefa para este dia.</div>';
        return;
    }

    ativas.sort((a, b) => calcularScore(b) - calcularScore(a));

    let html = '';

    ativas.forEach(t => {
        const score = calcularScore(t);
        const imp   = scoreParaLabel(score);
        html += buildTaskCard(t, imp, imp, score, false);
    });

    if (arquivadas.length) {
        html += `<div class="section-label" style="margin-top:10px">concluídas</div>`;
        arquivadas.forEach(t => {
            html += buildTaskCard(t, 'concluida', 'concluida', 0, true);
        });
    }

    container.innerHTML = html;
}

function toggleAddForm() {
    const form = document.getElementById('add-form');
    form.classList.toggle('open');

    if (form.classList.contains('open')) {
        document.getElementById('add-titulo').value     = '';
        document.getElementById('add-descricao').value  = '';
        document.getElementById('add-prioridade').value = 'media';
        setTimeout(() => document.getElementById('add-titulo').focus(), 50);
    }
}


/* ══════════════════════════════════════════════════════════════════
   SALVAR TAREFA DO PAINEL DO DIA
   ══════════════════════════════════════════════════════════════════ */

async function salvarTarefaDia() {
    const titulo     = document.getElementById('add-titulo').value.trim();
    const descricao  = document.getElementById('add-descricao').value.trim();
    const prioridade = document.getElementById('add-prioridade').value;

    if (!titulo) {
        const inp = document.getElementById('add-titulo');
        inp.style.borderColor = '#e24b4a';
        inp.focus();
        setTimeout(() => inp.style.borderColor = '', 1500);
        return;
    }

    const btn = document.getElementById('add-submit-btn');
    btn.disabled    = true;
    btn.textContent = 'Salvando...';

    const { data } = await supabaseClient.auth.getUser();
    const user = data.user;
    if (!user) {
        alert('Você precisa estar logado!');
        btn.disabled    = false;
        btn.textContent = 'Salvar';
        return;
    }

    const { data: inserted, error } = await supabaseClient
        .from('tarefas')
        .insert([{
            titulo,
            descricao,
            prioridade,
            prazo:   selectedDate,
            status:  'pendente',
            user_id: user.id
        }])
        .select();

    if (error) {
        alert('Erro: ' + error.message);
        btn.disabled    = false;
        btn.textContent = 'Salvar';
        return;
    }

    // Sincroniza com o Notion
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData.session?.access_token;

    if (token && inserted && inserted[0]) {
        try {
            const res = await fetch(
                'https://qgvotcupxchajbtkydiq.supabase.co/functions/v1/create-notion-page',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        titulo,
                        descricao,
                        prioridade,
                        prazo: selectedDate
                    })
                }
            );

            const json = await res.json();

            if (json.notion_page_id) {
                await supabaseClient
                    .from('tarefas')
                    .update({ notion_page_id: json.notion_page_id })
                    .eq('id', inserted[0].id);
            }
        } catch (e) {
            console.warn('Notion sync falhou:', e);
        }
    }

    btn.disabled    = false;
    btn.textContent = 'Salvar';

    document.getElementById('add-form').classList.remove('open');
    await loadList();
}


/* ══════════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
   ══════════════════════════════════════════════════════════════════ */
loadList();