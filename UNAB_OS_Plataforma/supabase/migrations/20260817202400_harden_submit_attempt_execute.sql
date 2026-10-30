-- The hosted function retained an explicit anon EXECUTE grant from its original deployment.
-- Keep this SECURITY DEFINER RPC callable only by authenticated learners.
revoke all on function public.submit_attempt(text, text, text, boolean, text) from public;
revoke all on function public.submit_attempt(text, text, text, boolean, text) from anon;
grant execute on function public.submit_attempt(text, text, text, boolean, text) to authenticated;;
