-- Follow-up guardrail for cached imaginative presets that span older ages.
-- Some expanded presets had stale maturityLevel values even when ageFit reached
-- tween/teen ages. Normalize that metadata and keep the stored story voice
-- enthusiastic without sounding preschool-oriented for maxAge 12+.

begin;

update public.preset_activities
set full_content = jsonb_set(
  full_content,
  '{ageFit,maturityLevel}',
  to_jsonb(
    case
      when coalesce((full_content #>> '{ageFit,minAge}')::int, 0) >= 13 then 'teen'
      when coalesce((full_content #>> '{ageFit,maxAge}')::int, 0) >= 13 then 'mixed-age'
      when coalesce((full_content #>> '{ageFit,minAge}')::int, 0) >= 10 then 'tween'
      when coalesce((full_content #>> '{ageFit,maxAge}')::int, 0) >= 10
           and coalesce((full_content #>> '{ageFit,minAge}')::int, 0) < 10 then 'mixed-age'
      when coalesce((full_content #>> '{ageFit,minAge}')::int, 0) <= 5
           and coalesce((full_content #>> '{ageFit,maxAge}')::int, 0) <= 5 then 'young-child'
      else 'child'
    end
  ),
  true
)
where activity_style = 'imaginative'
  and is_active = true
  and jsonb_typeof(full_content -> 'ageFit') = 'object';

-- The first migration writes a predictable opening sentence before the original
-- concrete action. For presets that can reach age 12+, replace only that opening
-- sentence with a more mature creative-coach beat; the action itself stays intact.
do $$
declare
  r record;
  new_steps jsonb;
  step_item jsonb;
  step_index integer;
  theme_key text;
  new_intro text;
  instruction_text text;
  role_name text;
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

      instruction_text := coalesce(step_item ->> 'instruction', '');
      instruction_text := regexp_replace(
        instruction_text,
        '^.*?[.!?]\s+',
        new_intro || ' '
      );

      new_steps := new_steps || jsonb_build_array(
        step_item
        || jsonb_build_object(
          'instruction', instruction_text,
          'doneWhen', regexp_replace(
            coalesce(step_item ->> 'doneWhen', ''),
            '^You’ll know this scene is ready to move on when\s+',
            'Move on when '
          ),
          'ifStuck', regexp_replace(
            coalesce(step_item ->> 'ifStuck', ''),
            '^Tiny nudge from your story coach:\s*',
            'Quick reset: '
          )
        )
      );
    end loop;

    role_name := coalesce(
      nullif(r.full_content #>> '{roleGuide,name}', ''),
      nullif(r.full_content ->> 'kidRole', ''),
      'Creative Lead'
    );

    update public.preset_activities
    set full_content = jsonb_set(
      jsonb_set(
        full_content,
        '{stepDetails}',
        new_steps,
        true
      ),
      '{roleGuide,description}',
      to_jsonb('You are the ' || role_name || '. You control the choices, the style, and how this activity unfolds.'::text),
      true
    ) || jsonb_build_object('storyVoiceVersion', 1),
    updated_at = now()
    where id = r.id;
  end loop;
end
$$;

-- Mark the rest of the rewritten imaginative cache as story-voice v1 too.
update public.preset_activities
set full_content = full_content || jsonb_build_object('storyVoiceVersion', 1),
    updated_at = now()
where activity_style = 'imaginative'
  and is_active = true
  and coalesce((full_content ->> 'storyVoiceVersion')::int, 0) < 1;

commit;
