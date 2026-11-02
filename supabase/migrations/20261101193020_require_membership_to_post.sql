-- Posts in a community can only be created by members of that community.
-- Profile posts (community_id is null) are still allowed.

drop policy "Users can create posts as themselves" on public.posts;

-- Post as yourself. A community post needs a membership in that community.
-- If a flair is picked, it must belong to this post's community.
create policy "Users can create posts as themselves"
  on public.posts for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      community_id is null
      or exists (
        select 1 from public.community_members as m
        where m.community_id = posts.community_id
          and m.user_id = (select auth.uid())
      )
    )
    and (
      flair_id is null
      or exists (
        select 1 from public.community_flairs as f
        where f.id = posts.flair_id
          and f.community_id = posts.community_id
      )
    )
  );
