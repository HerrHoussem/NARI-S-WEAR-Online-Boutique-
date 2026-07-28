-- NARI'S WEAR interactive Live Chat migration
-- Run this entire file once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text,
  access_token uuid not null default gen_random_uuid(),
  status text not null default 'open' check (status in ('open','closed')),
  last_message text,
  last_message_at timestamptz not null default now(),
  unread_admin integer not null default 1,
  unread_customer integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender text not null check (sender in ('customer','admin')),
  message text not null check (char_length(message) between 1 and 1500),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_conversation_created_idx on public.chat_messages(conversation_id,created_at);

alter table public.support_conversations enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "admin manage conversations" on public.support_conversations;
create policy "admin manage conversations" on public.support_conversations for all to authenticated
using (auth.uid() in (select user_id from public.admin_users where role='admin'))
with check (auth.uid() in (select user_id from public.admin_users where role='admin'));

drop policy if exists "admin manage chat messages" on public.chat_messages;
create policy "admin manage chat messages" on public.chat_messages for all to authenticated
using (auth.uid() in (select user_id from public.admin_users where role='admin'))
with check (auth.uid() in (select user_id from public.admin_users where role='admin'));

create or replace function public.customer_start_chat(p_customer_name text,p_customer_phone text,p_message text)
returns table(conversation_id uuid,access_token uuid) language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_token uuid;begin
 if nullif(trim(p_customer_name),'') is null or nullif(trim(p_customer_phone),'') is null or nullif(trim(p_message),'') is null then raise exception 'Informations manquantes'; end if;
 insert into support_conversations(customer_name,customer_phone,last_message,unread_admin) values(trim(p_customer_name),trim(p_customer_phone),left(trim(p_message),1500),1) returning id,support_conversations.access_token into v_id,v_token;
 insert into chat_messages(conversation_id,sender,message) values(v_id,'customer',left(trim(p_message),1500));
 return query select v_id,v_token;
end$$;

create or replace function public.customer_send_chat(p_conversation_id uuid,p_access_token uuid,p_message text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from support_conversations where id=p_conversation_id and access_token=p_access_token) then raise exception 'Conversation introuvable'; end if;
 if nullif(trim(p_message),'') is null then raise exception 'Message vide'; end if;
 insert into chat_messages(conversation_id,sender,message) values(p_conversation_id,'customer',left(trim(p_message),1500));
 update support_conversations set last_message=left(trim(p_message),1500),last_message_at=now(),unread_admin=unread_admin+1,status='open' where id=p_conversation_id;
end$$;

create or replace function public.customer_get_chat(p_conversation_id uuid,p_access_token uuid)
returns table(id uuid,sender text,message text,created_at timestamptz) language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from support_conversations where support_conversations.id=p_conversation_id and access_token=p_access_token) then raise exception 'Conversation introuvable'; end if;
 update support_conversations set unread_customer=0 where support_conversations.id=p_conversation_id;
 return query select m.id,m.sender,m.message,m.created_at from chat_messages m where m.conversation_id=p_conversation_id order by m.created_at;
end$$;

revoke all on function public.customer_start_chat(text,text,text) from public;
revoke all on function public.customer_send_chat(uuid,uuid,text) from public;
revoke all on function public.customer_get_chat(uuid,uuid) from public;
grant execute on function public.customer_start_chat(text,text,text) to anon,authenticated;
grant execute on function public.customer_send_chat(uuid,uuid,text) to anon,authenticated;
grant execute on function public.customer_get_chat(uuid,uuid) to anon,authenticated;

-- Realtime publication (safe if already added)
do $$ begin alter publication supabase_realtime add table public.chat_messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.support_conversations; exception when duplicate_object then null; end $$;
