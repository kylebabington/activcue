-- Fix the older-kid story-voice pass using POSIX whitespace classes that
-- PostgreSQL's regex engine handles consistently.

begin;

do $$
declare
  r record;
  new_steps jsonb;
  step_item jsonb;
  step_index integer;
  theme_key text;
  new_intro text;
  instruction_text text;
  done_text text;
  stuck_text text;
  mission_text text;
begin
  for r in
    select id, full_content
    from public.preset_activities
    where activity_style = 'imaginative'
      and is_active = true
      and coalesce((full_content #>> '{ageFit,maxAge}')::int, 0) >= 12
      and jsonb_typeof(full_content -> 'stepDetails') = 'array'
  loop
    theme_key := coalesce(r.full_content ->> 'visualTheme', 'mystery');
    new_steps := '[]'::jsonb;
    step_index := 0;

    for step_item in
      select value from jsonb_array_elements(r.full_content -> 'stepDetails')
    loop
      step_index := step_index + 1;
      new_intro := case theme_key
        when 'space' then case step_index when 1 then 'Mission Control is live, and the first call is yours.' when 2 then 'A new signal just changed the plan.' when 3 then 'Now you get to decide how the mission adapts.' else 'The final move is yours to shape.' end
        when 'mystery' then case step_index when 1 then 'The cold open is yours to set.' when 2 then 'A new detail just complicated the case.' when 3 then 'This is where your theory gets interesting.' else 'Bring the case home your way.' end
        when 'science' then case step_index when 1 then 'The experiment is live, and the first variable is yours.' when 2 then 'A new result just landed.' when 3 then 'Now test the idea you actually find interesting.' else 'Turn the experiment into a result that feels like yours.' end
        when 'neighborhood' then case step_index when 1 then 'The project is live, and the first decision is yours.' when 2 then 'A new request just changed the brief.' when 3 then 'Now make the part only you would think of.' else 'Finish it in a way that feels like yours.' end
        when 'expedition' then case step_index when 1 then 'The route is open, and you control the first move.' when 2 then 'A new detail just changed the route.' when 3 then 'This is where your read of the situation matters.' else 'Bring the expedition home your way.' end
        when 'rescue' then case step_index when 1 then 'The situation is live, and the first call is yours.' when 2 then 'The conditions just changed.' when 3 then 'Now decide how the team adapts.' else 'Bring the operation home your way.' end
        when 'fantasy' then case step_index when 1 then 'The setup is yours to define.' when 2 then 'A new twist just changed the story.' when 3 then 'Your choice decides where this goes.' else 'Land the ending your way.' end
        else case step_index when 1 then 'Here is the setup, and you control the first move.' when 2 then 'New development: the story just shifted.' when 3 then 'Your call: decide what happens next.' else 'Final move: finish it your way.' end
      end;

      instruction_text := regexp_replace(
        coalesce(step_item ->> 'instruction', ''),
        '^[^.!?]*[.!?][[:space:]]*',
        new_intro || ' '
      );

      done_text := regexp_replace(
        coalesce(step_item ->> 'doneWhen', ''),
        '^(You’ll know this scene is ready to move on when|This scene is ready when)[[:space:]]*',
        'Move on when '
      );

      stuck_text := regexp_replace(
        coalesce(step_item ->> 'ifStuck', ''),
        '^(Tiny nudge from your story coach:|Tiny nudge:)[[:space:]]*',
        'Quick reset: '
      );

      new_steps := new_steps || jsonb_build_array(
        step_item || jsonb_build_object(
          'instruction', instruction_text,
          'doneWhen', done_text,
          'ifStuck', stuck_text
        )
      );
    end loop;

    mission_text := coalesce(r.full_content ->> 'mission', '');
    mission_text := regexp_replace(
      mission_text,
      '^(A signal just lit up the board|The case is already moving|A call just came in|The lab is buzzing with a brand-new possibility|Base camp has news|Something unusual just woke up in this world|Something interesting is already happening)\.[[:space:]]*',
      'Here’s the setup: '
    );
    mission_text := regexp_replace(mission_text, '[[:space:]]+You are right in the middle of it, and your choices decide what happens next\.$', ' You decide how it unfolds.');
    mission_text := regexp_replace(mission_text, '[[:space:]]+Follow what catches your eye and make the story your own\.$', ' You decide how it unfolds.');
    mission_text := regexp_replace(mission_text, '[[:space:]]+The story needs your ideas, not one perfect answer\.$', ' You decide how it unfolds.');
    mission_text := regexp_replace(mission_text, '[[:space:]]+Try the version that makes you most curious\.$', ' You decide how it unfolds.');
    mission_text := regexp_replace(mission_text, '[[:space:]]+Every choice you make changes the route\.$', ' You decide how it unfolds.');
    mission_text := regexp_replace(mission_text, '[[:space:]]+You get to decide what happens from here\.$', ' You decide how it unfolds.');
    mission_text := regexp_replace(mission_text, '[[:space:]]+You are the one who gets to decide how this story goes\.$', ' You decide how it unfolds.');

    update public.preset_activities
    set full_content = jsonb_set(
      jsonb_set(full_content, '{stepDetails}', new_steps, true),
      '{mission}', to_jsonb(mission_text), true
    ) || jsonb_build_object('storyVoiceVersion', 1),
    updated_at = now()
    where id = r.id;
  end loop;
end
$$;

commit;
