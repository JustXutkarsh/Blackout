begin;
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;

create table public.player_profiles (
 account_id uuid primary key references auth.users(id) on delete cascade,
 player_uid text not null unique default ('BO-'||upper(replace(gen_random_uuid()::text,'-',''))),
 username text not null check(username ~ '^[a-z][a-z0-9_]{2,19}$'),
 display_name text not null check(char_length(display_name) between 1 and 20 and display_name !~ '[<>[:cntrl:]]'),
 avatar smallint not null default 0 check(avatar between 0 and 7),
 created_at timestamptz not null default now(), username_changed_at timestamptz not null default now()
);
create unique index player_username_unique on public.player_profiles(lower(username));
create table public.player_stats (account_id uuid primary key references public.player_profiles on delete cascade,completed integer not null default 0,wins integer not null default 0,losses integer not null default 0,draws integer not null default 0,eliminations integer not null default 0,deaths integer not null default 0);
create table public.friendships (lo uuid not null references public.player_profiles on delete cascade,hi uuid not null references public.player_profiles on delete cascade,requester uuid not null references public.player_profiles,status text not null check(status in ('pending','accepted')),created_at timestamptz not null default now(),primary key(lo,hi),check(lo<hi),check(requester in(lo,hi)));
create index friendship_recipient on public.friendships(hi);
create table public.player_blocks (blocker uuid not null references public.player_profiles on delete cascade,blocked uuid not null references public.player_profiles on delete cascade,primary key(blocker,blocked),check(blocker<>blocked));
create table private.social_limits (account_id uuid not null,action text not null,bucket timestamptz not null,total integer not null,primary key(account_id,action));
create table private.presence_sessions (session_id uuid primary key,account_id uuid not null references public.player_profiles on delete cascade,state text not null check(state in ('online','in_lobby','in_match')),expires_at timestamptz not null);
create index presence_account on private.presence_sessions(account_id);
create table private.room_invitations (id uuid primary key default gen_random_uuid(),sender uuid not null references public.player_profiles on delete cascade,recipient uuid not null references public.player_profiles on delete cascade,room_code text not null,room_instance uuid not null,format smallint not null check(format in(1,2,4)),expires_at timestamptz not null,status text not null default 'pending' check(status in('pending','accepted','declined','revoked')),created_at timestamptz not null default now(),check(sender<>recipient));
create index invite_inbox on private.room_invitations(recipient,expires_at) where status='pending';
create unique index invite_pending_unique on private.room_invitations(sender,recipient,room_instance) where status='pending';
create table private.online_matches (id uuid primary key,outcome text not null check(outcome in('blue','orange','draw')),kind text not null check(kind in('completed','abandoned','practice')),finished_at timestamptz not null default now(),payload jsonb not null);
create table private.online_results (match_id uuid references private.online_matches on delete cascade,account_id uuid references public.player_profiles on delete cascade,team text not null check(team in('blue','orange')),eliminations integer not null check(eliminations between 0 and 10000),deaths integer not null check(deaths between 0 and 10000),primary key(match_id,account_id));

alter table public.player_profiles enable row level security;
alter table public.player_stats enable row level security;
alter table public.friendships enable row level security;
alter table public.player_blocks enable row level security;
alter table private.social_limits enable row level security;
alter table private.presence_sessions enable row level security;
alter table private.room_invitations enable row level security;
alter table private.online_matches enable row level security;
alter table private.online_results enable row level security;
revoke all on public.player_profiles,public.player_stats,public.friendships,public.player_blocks from anon,authenticated;
grant select on public.player_profiles to service_role;
grant select on public.player_profiles,public.player_stats,public.friendships,public.player_blocks to authenticated;
create policy own_profile on public.player_profiles for select to authenticated using(account_id=(select auth.uid()));
create policy own_stats on public.player_stats for select to authenticated using(account_id=(select auth.uid()));
create policy own_edges on public.friendships for select to authenticated using((select auth.uid()) in(lo,hi));
create policy own_blocks on public.player_blocks for select to authenticated using(blocker=(select auth.uid()));

create function private.require_player() returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); begin if me is null or not exists(select 1 from public.player_profiles where account_id=me) then raise exception 'PROFILE_REQUIRED' using errcode='42501';end if;return me;end $$;
create function private.limit_action(me uuid,kind text,maximum integer) returns void language plpgsql security definer set search_path='' as $$
declare amount integer;begin insert into private.social_limits values(me,kind,date_trunc('minute',clock_timestamp()),1) on conflict(account_id,action) do update set bucket=excluded.bucket,total=case when private.social_limits.bucket=excluded.bucket then private.social_limits.total+1 else 1 end returning total into amount;if amount>maximum then raise exception 'RATE_LIMIT' using errcode='P0001';end if;end $$;
create function private.lock_pair(a uuid,b uuid) returns void language sql set search_path='' as $$ select pg_advisory_xact_lock(hashtextextended(least(a,b)::text||':'||greatest(a,b)::text,0)) $$;
create function private.blocked(a uuid,b uuid) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.player_blocks where (blocker=a and blocked=b) or(blocker=b and blocked=a))$$;
create function private.friends(a uuid,b uuid) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.friendships where lo=least(a,b) and hi=greatest(a,b) and status='accepted') and not private.blocked(a,b)$$;
create function private.profile_json(who uuid) returns jsonb language sql security definer set search_path='' as $$select jsonb_build_object('id',account_id,'uid',player_uid,'username',username,'displayName',display_name,'avatar',avatar,'createdAt',created_at) from public.player_profiles where account_id=who$$;
create function private.immutable_profile() returns trigger language plpgsql set search_path='' as $$begin if new.account_id<>old.account_id or new.player_uid<>old.player_uid or new.created_at<>old.created_at then raise exception 'IMMUTABLE_PROFILE';end if;return new;end $$;
create trigger protect_profile_identity before update on public.player_profiles for each row execute function private.immutable_profile();

create function public.save_player_profile(p_username text,p_display_name text,p_avatar integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();old public.player_profiles;begin if me is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;perform private.limit_action(me,'profile',10);if p_username is null or p_display_name is null or p_avatar is null then raise exception 'INVALID_PROFILE';end if;
select * into old from public.player_profiles where account_id=me for update;
if found then if old.username<>lower(trim(p_username)) and old.username_changed_at>now()-interval '30 days' then raise exception 'USERNAME_RENAME_COOLDOWN';end if;update public.player_profiles set username=lower(trim(p_username)),display_name=trim(p_display_name),avatar=p_avatar,username_changed_at=case when username<>lower(trim(p_username)) then now() else username_changed_at end where account_id=me;
else insert into public.player_profiles(account_id,username,display_name,avatar) values(me,lower(trim(p_username)),trim(p_display_name),p_avatar);insert into public.player_stats(account_id) values(me);end if;return private.profile_json(me);end $$;
create function public.my_player_profile() returns jsonb language sql security definer set search_path='' as $$select private.profile_json(auth.uid())$$;
create function public.find_player(p_query text) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=private.require_player();who uuid;begin perform private.limit_action(me,'search',30);if char_length(p_query)>40 then raise exception 'INVALID_SEARCH';end if;select account_id into who from public.player_profiles where player_uid=upper(trim(p_query)) or username=lower(trim(p_query)) limit 1;if who is null or private.blocked(me,who) then return null;end if;return private.profile_json(who);end $$;
create function public.friend_action(p_other uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
declare me uuid:=private.require_player();edge public.friendships;begin if p_other=me or p_other is null then raise exception 'INVALID_TARGET';end if;perform private.limit_action(me,'friend',20);perform private.lock_pair(me,p_other);
if p_action='block' then insert into public.player_blocks values(me,p_other) on conflict do nothing;delete from public.friendships where lo=least(me,p_other) and hi=greatest(me,p_other);update private.room_invitations set status='revoked' where status='pending' and((sender=me and recipient=p_other)or(sender=p_other and recipient=me));return;
elsif p_action='unblock' then delete from public.player_blocks where blocker=me and blocked=p_other;return;end if;
if private.blocked(me,p_other) then raise exception 'PLAYER_UNAVAILABLE';end if;
select * into edge from public.friendships where lo=least(me,p_other) and hi=greatest(me,p_other) for update;
if p_action='request' then if edge.status='accepted' then return;elsif edge.status='pending' then if edge.requester<>me then update public.friendships set status='accepted' where lo=edge.lo and hi=edge.hi;end if;return;else insert into public.friendships values(least(me,p_other),greatest(me,p_other),me,'pending',now());return;end if;
elsif p_action in('accept','decline') then if edge.status is distinct from 'pending' or edge.requester=me then raise exception 'RECIPIENT_ONLY' using errcode='42501';end if;if p_action='accept' then update public.friendships set status='accepted' where lo=edge.lo and hi=edge.hi;else delete from public.friendships where lo=edge.lo and hi=edge.hi;end if;
elsif p_action='cancel' then if edge.status is distinct from 'pending' or edge.requester<>me then raise exception 'SENDER_ONLY' using errcode='42501';end if;delete from public.friendships where lo=edge.lo and hi=edge.hi;
elsif p_action='remove' then if edge.status is distinct from 'accepted' then raise exception 'NOT_FRIENDS';end if;delete from public.friendships where lo=edge.lo and hi=edge.hi;update private.room_invitations set status='revoked' where status='pending' and((sender=me and recipient=p_other)or(sender=p_other and recipient=me));
else raise exception 'INVALID_ACTION';end if;end $$;

create function public.player_heartbeat(p_session uuid,p_state text) returns void language plpgsql security definer set search_path='' as $$
declare me uuid:=private.require_player();begin perform private.limit_action(me,'presence',20);if p_state='offline' then delete from private.presence_sessions where session_id=p_session and account_id=me;return;end if;if p_state not in('online','in_lobby','in_match') then raise exception 'INVALID_PRESENCE';end if;
insert into private.presence_sessions values(p_session,me,p_state,now()+interval '75 seconds') on conflict(session_id) do update set state=excluded.state,expires_at=excluded.expires_at where private.presence_sessions.account_id=me;delete from private.presence_sessions where expires_at<now()-interval '5 minutes';end $$;
create function public.social_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=private.require_player();begin perform private.limit_action(me,'social_read',40);return jsonb_build_object(
'friends',coalesce((select jsonb_agg(private.profile_json(case when lo=me then hi else lo end)||jsonb_build_object('presence',coalesce((select state from private.presence_sessions where account_id=case when f.lo=me then f.hi else f.lo end and expires_at>now() order by case state when 'in_match' then 3 when 'in_lobby' then 2 else 1 end desc limit 1),'offline'))) from public.friendships f where me in(lo,hi) and status='accepted'),'[]'::jsonb),
'incoming',coalesce((select jsonb_agg(private.profile_json(requester)) from public.friendships where me in(lo,hi) and status='pending' and requester<>me),'[]'::jsonb),
'outgoing',coalesce((select jsonb_agg(private.profile_json(case when lo=me then hi else lo end)) from public.friendships where me in(lo,hi) and status='pending' and requester=me),'[]'::jsonb),
'blocked',coalesce((select jsonb_agg(private.profile_json(blocked)) from public.player_blocks where blocker=me),'[]'::jsonb),
'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'inviter',private.profile_json(sender),'format',format,'expiresAt',expires_at)) from private.room_invitations where recipient=me and status='pending' and expires_at>now() and private.friends(me,sender)),'[]'::jsonb));end $$;
create function public.decline_room_invitation(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin update private.room_invitations set status='declined' where id=p_id and recipient=auth.uid() and status='pending';if not found then raise exception 'INVITATION_UNAVAILABLE' using errcode='42501';end if;end $$;

-- Only the authenticated authoritative game service can create/consume invitations or commit results.
create function public.server_invite(p_sender uuid,p_recipient uuid,p_code text,p_instance uuid,p_format integer) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin perform private.limit_action(p_sender,'invite',15);perform private.lock_pair(p_sender,p_recipient);if not private.friends(p_sender,p_recipient) then raise exception 'NOT_FRIENDS';end if;if p_code!~'^[A-F0-9]{10}$' then raise exception 'INVALID_ROOM';end if;update private.room_invitations set status='revoked' where sender=p_sender and recipient=p_recipient and room_instance=p_instance and status='pending' and expires_at<=now();insert into private.room_invitations(sender,recipient,room_code,room_instance,format,expires_at) values(p_sender,p_recipient,p_code,p_instance,p_format,now()+interval '2 minutes') on conflict(sender,recipient,room_instance) where status='pending' do update set expires_at=excluded.expires_at returning id into result;return result;end $$;
create function public.server_read_invitation(p_id uuid,p_recipient uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare i private.room_invitations;begin select * into i from private.room_invitations where id=p_id and recipient=p_recipient and status='pending' and expires_at>now();if not found or not private.friends(i.sender,p_recipient) then raise exception 'INVITATION_EXPIRED';end if;return jsonb_build_object('id',i.id,'code',i.room_code,'instance',i.room_instance,'sender',i.sender);end $$;
create function public.server_consume_invitation(p_id uuid,p_recipient uuid) returns void language plpgsql security definer set search_path='' as $$declare i private.room_invitations;begin select * into i from private.room_invitations where id=p_id and recipient=p_recipient;if not found then raise exception 'INVITATION_EXPIRED';end if;perform private.lock_pair(i.sender,p_recipient);select * into i from private.room_invitations where id=p_id and recipient=p_recipient for update;if i.status<>'pending' or i.expires_at<=now() or not private.friends(i.sender,p_recipient) then raise exception 'INVITATION_EXPIRED';end if;update private.room_invitations set status='accepted' where id=p_id;end $$;
create function public.server_close_invites(p_instance uuid) returns void language sql security definer set search_path='' as $$update private.room_invitations set status='revoked' where room_instance=p_instance and status='pending'$$;
create function public.server_record_match(p_match uuid,p_outcome text,p_kind text,p_players jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare p jsonb;won integer;lost integer;drawn integer;begin if jsonb_typeof(p_players)<>'array' or jsonb_array_length(p_players) not between 2 and 8 then raise exception 'INVALID_RESULTS';end if;if exists(select 1 from private.online_matches where id=p_match) then if (select payload from private.online_matches where id=p_match)<>jsonb_build_object('outcome',p_outcome,'kind',p_kind,'players',p_players) then raise exception 'RESULT_CONFLICT';end if;return false;end if;
insert into private.online_matches(id,outcome,kind,payload) values(p_match,p_outcome,p_kind,jsonb_build_object('outcome',p_outcome,'kind',p_kind,'players',p_players)) on conflict do nothing;if not found then if (select payload from private.online_matches where id=p_match)<>jsonb_build_object('outcome',p_outcome,'kind',p_kind,'players',p_players) then raise exception 'RESULT_CONFLICT';end if;return false;end if;
for p in select value from jsonb_array_elements(p_players) loop insert into private.online_results values(p_match,(p->>'accountId')::uuid,p->>'team',(p->>'kills')::integer,(p->>'deaths')::integer);if p_kind='completed' then won:=case when p_outcome=p->>'team' then 1 else 0 end;drawn:=case when p_outcome='draw' then 1 else 0 end;lost:=1-won-drawn;update public.player_stats set completed=completed+1,wins=wins+won,losses=losses+lost,draws=draws+drawn,eliminations=eliminations+(p->>'kills')::integer,deaths=deaths+(p->>'deaths')::integer where account_id=(p->>'accountId')::uuid;end if;end loop;return true;end $$;

revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.save_player_profile(text,text,integer),public.my_player_profile(),public.find_player(text),public.friend_action(uuid,text),public.player_heartbeat(uuid,text),public.social_state(),public.decline_room_invitation(uuid) from public,anon;
grant execute on function public.save_player_profile(text,text,integer),public.my_player_profile(),public.find_player(text),public.friend_action(uuid,text),public.player_heartbeat(uuid,text),public.social_state(),public.decline_room_invitation(uuid) to authenticated;
revoke all on function public.server_invite(uuid,uuid,text,uuid,integer),public.server_read_invitation(uuid,uuid),public.server_consume_invitation(uuid,uuid),public.server_close_invites(uuid),public.server_record_match(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.server_invite(uuid,uuid,text,uuid,integer),public.server_read_invitation(uuid,uuid),public.server_consume_invitation(uuid,uuid),public.server_close_invites(uuid),public.server_record_match(uuid,text,text,jsonb) to service_role;
commit;
