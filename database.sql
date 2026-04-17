create table tarefas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  titulo text,
  descricao text,
  user_id uuid
);

create extension if not exists "pgcrypto";

create policy "insert tarefas"
on tarefas
for insert
to authenticated
with check (auth.uid() = user_id);


create policy "select tarefas"
on tarefas
for select
to authenticated
using (
  auth.uid() = user_id
);

create policy "delete tarefas"
on tarefas
for delete
to authenticated
using (
  auth.uid() = user_id
);


create policy "update tarefas"
on tarefas
for update
to authenticated
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);