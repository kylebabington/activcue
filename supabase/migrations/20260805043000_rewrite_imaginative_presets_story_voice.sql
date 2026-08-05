-- Rewrite every active imaginative preset into Activity Format V2 story-first copy.
--
-- This migration intentionally preserves the underlying activity action, safety,
-- inventory, fit metadata, and ageFit while changing the kid-facing presentation.
-- Older presets that only had legacy `steps` / `starterPrompts` are upgraded to
-- `stepDetails` / `starterIdeas` at the same time.

begin;

do $$
declare
  r record;
  raw_steps jsonb;
  new_steps jsonb;
  new_starters jsonb;
  legacy_steps jsonb;
  legacy_prompts jsonb;
  legacy_first_moves jsonb;
  step_item jsonb;
  starter_item jsonb;
  prompt_item jsonb;
  move_item jsonb;
  step_index integer;
  starter_index integer;
  theme_key text;
  maturity text;
  role_name text;
  first_action text;
  scene_title text;
  scene_intro text;
  action_text text;
  done_text text;
  stuck_text text;
  starter_title text;
  starter_kind text;
  mission_text text;
  role_guide jsonb;
begin
  for r in
    select id, slug, title, summary, theme, full_content
    from public.preset_activities
    where activity_style = 'imaginative'
      and is_active = true
    order by display_order, slug
  loop
    maturity := coalesce(r.full_content #>> '{ageFit,maturityLevel}', 'child');

    theme_key := coalesce(
      nullif(r.full_content ->> 'visualTheme', ''),
      case
        when lower(r.slug || ' ' || r.title) ~ '(space|moon|planet|star|constellation|ship)' then 'space'
        when lower(r.slug || ' ' || r.title) ~ '(detective|clue|mystery|case|oracle)' then 'mystery'
        when lower(r.slug || ' ' || r.title) ~ '(rescue|clinic|medic|hospital|pet)' then 'rescue'
        when lower(r.slug || ' ' || r.title) ~ '(jungle|expedition|border|nature|garden|cloud|weather)' then 'expedition'
        when lower(r.slug || ' ' || r.title) ~ '(robot|lab|spice|invention|science)' then 'science'
        when lower(r.slug || ' ' || r.title) ~ '(city|map|courier|train|museum|library|bakery|cafe|theater|circus|olympic|podcast|budget|sanitation)' then 'neighborhood'
        when lower(r.slug || ' ' || r.title) ~ '(dragon|kingdom|apothecary|treasure|colony|dream|embassy)' then 'fantasy'
        when lower(r.slug || ' ' || r.title) ~ '(animal|zoo|habitat)' then 'animals'
        else 'mystery'
      end
    );

    role_name := coalesce(
      nullif(r.full_content #>> '{roleGuide,name}', ''),
      nullif(r.full_content ->> 'kidRole', ''),
      case
        when maturity in ('teen', 'tween') then 'Creative Lead'
        else 'Story Maker'
      end
    );

    -- Prefer existing V2 steps. Older presets fall back to legacy step strings.
    if jsonb_typeof(r.full_content -> 'stepDetails') = 'array'
       and jsonb_array_length(r.full_content -> 'stepDetails') > 0 then
      raw_steps := r.full_content -> 'stepDetails';
    else
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'title', '',
            'instruction', value #>> '{}',
            'examples', '[]'::jsonb,
            'doneWhen', '',
            'ifStuck', '',
            'roleInstructions', '[]'::jsonb
          )
          order by ordinality
        ),
        '[]'::jsonb
      )
      into raw_steps
      from jsonb_array_elements(coalesce(r.full_content -> 'steps', '[]'::jsonb))
           with ordinality;
    end if;

    new_steps := '[]'::jsonb;
    step_index := 0;

    for step_item in
      select value
      from jsonb_array_elements(raw_steps)
    loop
      step_index := step_index + 1;
      action_text := trim(coalesce(nullif(step_item ->> 'instruction', ''), nullif(step_item ->> 'title', ''), 'Choose one small move that pushes the story forward.'));

      -- Story-beat titles replace task-list language.
      scene_title := case theme_key
        when 'space' then (array['Mission Control Wakes Up','A Signal Breaks Through','The Mission Changes','The Launch Window Opens','One More Transmission','Final Transmission'])[least(step_index, 6)]
        when 'mystery' then (array['The Case Opens','A Clue Changes Everything','Follow the Trail','A New Theory Appears','One Last Detail','The Big Reveal'])[least(step_index, 6)]
        when 'rescue' then (array['The Call Comes In','Rescue in Motion','The Situation Changes','A New Patient Arrives','Everyone Pulls Together','Everyone Makes It Home'])[least(step_index, 6)]
        when 'expedition' then (array['Base Camp Opens','The Trail Changes','A Discovery!','The Map Gets Interesting','One Last Stretch','Back to Base'])[least(step_index, 6)]
        when 'science' then (array['The Lab Lights Up','A Curious Result Appears','Try Your Best Theory','Something Unexpected Happens','Final Test','The Big Reveal'])[least(step_index, 6)]
        when 'neighborhood' then (array['Doors Open','The First Request Arrives','Something Needs Your Idea','A Surprise Joins In','Almost Ready','Grand Opening'])[least(step_index, 6)]
        when 'fantasy' then (array['The World Wakes Up','A Twist Appears','Your Choice Changes Things','The Story Turns','One Last Surprise','The Ending Is Yours'])[least(step_index, 6)]
        when 'animals' then (array['The Animals Need You','A New Visitor Arrives','The Habitat Changes','A Surprise Needs Solving','Almost Home','Happy Ending'])[least(step_index, 6)]
        else (array['The Story Begins','Something Changes','Your Next Move','A New Twist','Almost There','The Big Finish'])[least(step_index, 6)]
      end;

      -- The same concrete action stays underneath, but it now arrives as a
      -- story beat. Tween/teen wording keeps enthusiasm without baby talk.
      scene_intro :=
        case
          when maturity in ('teen', 'tween') then
            case theme_key
              when 'space' then case step_index when 1 then 'Mission Control is live, and the first call is yours.' when 2 then 'A new signal just changed the plan.' when 3 then 'Now you get to decide how the mission adapts.' else 'The final move is yours to shape.' end
              when 'mystery' then case step_index when 1 then 'The cold open is yours to set.' when 2 then 'A new detail just complicated the case.' when 3 then 'This is where your theory gets interesting.' else 'Bring the case home your way.' end
              when 'science' then case step_index when 1 then 'The experiment is live, and the first variable is yours.' when 2 then 'A new result just landed.' when 3 then 'Now test the idea you actually find interesting.' else 'Time to turn the experiment into a result.' end
              when 'neighborhood' then case step_index when 1 then 'The project is live, and the first decision is yours.' when 2 then 'A new request just changed the brief.' when 3 then 'Now make the part only you would think of.' else 'Finish it in a way that feels like yours.' end
              else case step_index when 1 then 'Here is the setup, and you control the first move.' when 2 then 'New development: the story just shifted.' when 3 then 'Your call: decide what happens next.' else 'Final move: finish it your way.' end
            end
          else
            case theme_key
              when 'space' then case step_index when 1 then 'A crackle runs through Mission Control—something needs your attention.' when 2 then 'Blink! A brand-new signal just appeared on the console.' when 3 then 'Hold on—the mission just changed, and only you can decide the next move.' else 'The countdown is moving, and the whole mission is waiting for this part.' end
              when 'mystery' then case step_index when 1 then 'A case file just slid onto your desk, and the first clue is waiting.' when 2 then 'Ooooh, a fresh clue changes what you thought you knew.' when 3 then 'The trail is getting interesting—this is where your detective brain gets to take over.' else 'The answer is close enough to feel. One more move could crack the case.' end
              when 'rescue' then case step_index when 1 then 'A rescue call just came in, and your team is counting on you.' when 2 then 'Good catch—the situation changed while you were working.' when 3 then 'A new problem popped up, and your next move matters.' else 'Everyone is almost safe. Bring this rescue home.' end
              when 'expedition' then case step_index when 1 then 'Base camp just got an update: the adventure starts right here.' when 2 then 'The trail takes an unexpected turn, and there is something new to notice.' when 3 then 'You spotted something worth investigating—nice timing, explorer.' else 'One last stretch will bring the whole expedition home.' end
              when 'science' then case step_index when 1 then 'Click! The lab lights are on, and today’s experiment is waiting for you.' when 2 then 'Well, that is interesting—a new result just showed up.' when 3 then 'Now comes the fun part: test the idea that makes you most curious.' else 'The lab is ready for the big reveal. Show what you discovered.' end
              when 'neighborhood' then case step_index when 1 then 'The doors are opening, and the very first request has landed with you.' when 2 then 'Another request just came in—and this one needs your special touch.' when 3 then 'Surprise! Something changed, so you get to invent the next part.' else 'Opening time is almost here. Give this story its big finish.' end
              when 'fantasy' then case step_index when 1 then 'The world just woke up, and somehow you are exactly the person it needed.' when 2 then 'Wait—something unexpected just changed the story.' when 3 then 'This choice is yours, and it decides what happens next.' else 'The ending is waiting for you to make it real.' end
              when 'animals' then case step_index when 1 then 'Psst—the animals have a situation, and they picked you to help.' when 2 then 'A new visitor just arrived with a problem of their own.' when 3 then 'The habitat changed while you were busy. Time for your best idea.' else 'Almost everyone is settled. Give them the ending they deserve.' end
              else case step_index when 1 then 'Something interesting is already happening, and you are right in the middle of it.' when 2 then 'Plot twist! The story just changed.' when 3 then 'This is your moment to decide what happens next.' else 'The big finish is close—make this last part yours.' end
            end
        end;

      done_text := case
        when nullif(trim(coalesce(step_item ->> 'doneWhen', '')), '') is not null then
          case
            when maturity in ('teen', 'tween') then 'Move on when ' || lower(left(trim(step_item ->> 'doneWhen'), 1)) || substr(trim(step_item ->> 'doneWhen'), 2)
            else 'You’ll know this scene is ready to move on when ' || lower(left(trim(step_item ->> 'doneWhen'), 1)) || substr(trim(step_item ->> 'doneWhen'), 2)
          end
        else
          case
            when maturity in ('teen', 'tween') then 'Move on when you have changed something in the story and know your next move.'
            else 'This scene is ready when something in the story has changed because of what you did.'
          end
      end;

      stuck_text := case
        when nullif(trim(coalesce(step_item ->> 'ifStuck', '')), '') is not null then
          case
            when maturity in ('teen', 'tween') then 'Quick reset: ' || trim(step_item ->> 'ifStuck')
            else 'Tiny nudge from your story coach: ' || trim(step_item ->> 'ifStuck')
          end
        else
          case
            when maturity in ('teen', 'tween') then 'Quick reset: choose the easiest version of this move and start there.'
            else 'Tiny nudge: pick the easiest little version of this move. Once you start, the story can catch up with you.'
          end
      end;

      new_steps := new_steps || jsonb_build_array(
        jsonb_build_object(
          'title', scene_title,
          'instruction', scene_intro || ' ' || action_text,
          'examples', coalesce(step_item -> 'examples', '[]'::jsonb),
          'doneWhen', done_text,
          'ifStuck', stuck_text,
          'roleInstructions', coalesce(step_item -> 'roleInstructions', '[]'::jsonb)
        )
      );
    end loop;

    -- Starter ideas: keep the activity-specific ideas, normalize old kinds,
    -- then fill toward five doors using legacy prompts / first moves.
    new_starters := '[]'::jsonb;
    starter_index := 0;

    if jsonb_typeof(r.full_content -> 'starterIdeas') = 'array' then
      for starter_item in
        select value
        from jsonb_array_elements(r.full_content -> 'starterIdeas')
      loop
        exit when starter_index >= 5;
        starter_index := starter_index + 1;
        starter_kind := case
          when starter_item ->> 'kind' in ('imagination','choice','dialogue','drawing','building') then starter_item ->> 'kind'
          when starter_item ->> 'kind' = 'music' then 'dialogue'
          else 'choice'
        end;
        new_starters := new_starters || jsonb_build_array(
          jsonb_build_object(
            'title', coalesce(nullif(starter_item ->> 'title', ''), 'Story Spark ' || starter_index),
            'example', coalesce(nullif(starter_item ->> 'example', ''), 'Choose the version that sounds most fun to you.'),
            'kind', starter_kind
          )
        );
      end loop;
    end if;

    if starter_index < 5 and jsonb_typeof(r.full_content -> 'starterPrompts') = 'array' then
      for prompt_item in
        select value
        from jsonb_array_elements(r.full_content -> 'starterPrompts')
      loop
        exit when starter_index >= 5;
        starter_index := starter_index + 1;
        starter_title := (array['First Spark','Unexpected Clue','Your Twist','Secret Detail','Wild Card'])[least(starter_index, 5)];
        new_starters := new_starters || jsonb_build_array(
          jsonb_build_object(
            'title', starter_title,
            'example', prompt_item #>> '{}',
            'kind', case when starter_index % 2 = 0 then 'choice' else 'imagination' end
          )
        );
      end loop;
    end if;

    if starter_index < 5 and jsonb_typeof(r.full_content -> 'firstMoves') = 'array' then
      for move_item in
        select value
        from jsonb_array_elements(r.full_content -> 'firstMoves')
      loop
        exit when starter_index >= 5;
        starter_index := starter_index + 1;
        starter_title := (array['First Spark','Unexpected Clue','Your Twist','Secret Detail','Wild Card'])[least(starter_index, 5)];
        new_starters := new_starters || jsonb_build_array(
          jsonb_build_object(
            'title', starter_title,
            'example', move_item #>> '{}',
            'kind', 'choice'
          )
        );
      end loop;
    end if;

    -- If a very old preset still has fewer than five starters, use the first
    -- story scenes as low-friction doors into play.
    while starter_index < 5 and starter_index < jsonb_array_length(new_steps) loop
      starter_index := starter_index + 1;
      new_starters := new_starters || jsonb_build_array(
        jsonb_build_object(
          'title', (array['First Spark','Unexpected Clue','Your Twist','Secret Detail','Wild Card'])[least(starter_index, 5)],
          'example', new_steps -> (starter_index - 1) ->> 'instruction',
          'kind', 'choice'
        )
      );
    end loop;

    -- Some activities have only 3–4 scenes. Fill the final starter doors with
    -- story-aware prompts rather than leaving them at the old thin 3-prompt cap.
    while starter_index < 5 loop
      starter_index := starter_index + 1;
      new_starters := new_starters || jsonb_build_array(
        jsonb_build_object(
          'title', (array['First Spark','Unexpected Clue','Your Twist','Secret Detail','Wild Card'])[starter_index],
          'example', case
            when maturity in ('teen', 'tween') then 'Add one detail, constraint, joke, or twist that makes this activity feel like your version.'
            else 'Add one silly, surprising, mysterious, or wonderful detail that makes this story feel like yours.'
          end,
          'kind', 'imagination'
        )
      );
    end loop;

    first_action := coalesce(
      nullif(r.full_content #>> '{roleGuide,firstAction}', ''),
      nullif(r.full_content -> 'firstMoves' ->> 0, ''),
      nullif(new_steps -> 0 ->> 'instruction', ''),
      'Pick one story starter and make the first move.'
    );

    role_guide := jsonb_build_object(
      'name', role_name,
      'description', coalesce(
        nullif(r.full_content #>> '{roleGuide,description}', ''),
        case
          when maturity in ('teen', 'tween') then 'You are the creative lead. You control the choices, the style, and how this activity unfolds.'
          else 'You are the ' || role_name || ' at the center of this story. Your ideas are what make the world move.'
        end
      ),
      'goal', coalesce(
        nullif(r.full_content #>> '{roleGuide,goal}', ''),
        nullif(r.summary, ''),
        'Carry the story from its opening moment to a finish that feels like yours.'
      ),
      'firstAction', first_action,
      'childRoles', case
        when jsonb_typeof(r.full_content #> '{roleGuide,childRoles}') = 'array' then r.full_content #> '{roleGuide,childRoles}'
        else '[]'::jsonb
      end
    );

    mission_text := coalesce(nullif(r.full_content ->> 'mission', ''), nullif(r.theme, ''), nullif(r.summary, ''), r.title);
    if length(mission_text) < 220 then
      mission_text := case
        when maturity in ('teen', 'tween') then 'Here’s the setup: ' || mission_text || ' You decide how it unfolds.'
        when theme_key = 'space' then 'A signal just lit up the board. ' || mission_text || ' You are right in the middle of it, and your choices decide what happens next.'
        when theme_key = 'mystery' then 'The case is already moving. ' || mission_text || ' Follow what catches your eye and make the story your own.'
        when theme_key = 'rescue' then 'A call just came in. ' || mission_text || ' The story needs your ideas, not one perfect answer.'
        when theme_key = 'science' then 'The lab is buzzing with a brand-new possibility. ' || mission_text || ' Try the version that makes you most curious.'
        when theme_key = 'expedition' then 'Base camp has news. ' || mission_text || ' Every choice you make changes the route.'
        when theme_key = 'fantasy' then 'Something unusual just woke up in this world. ' || mission_text || ' You get to decide what happens from here.'
        else 'Something interesting is already happening. ' || mission_text || ' You are the one who gets to decide how this story goes.'
      end;
    end if;

    select coalesce(jsonb_agg(value ->> 'instruction' order by ordinality), '[]'::jsonb)
    into legacy_steps
    from jsonb_array_elements(new_steps) with ordinality;

    select coalesce(jsonb_agg(value ->> 'example' order by ordinality), '[]'::jsonb)
    into legacy_prompts
    from jsonb_array_elements(new_starters) with ordinality;

    select coalesce(jsonb_agg(value ->> 'instruction' order by ordinality), '[]'::jsonb)
    into legacy_first_moves
    from (
      select value, ordinality
      from jsonb_array_elements(new_steps) with ordinality
      where ordinality <= 3
    ) s;

    update public.preset_activities
    set
      full_content = r.full_content || jsonb_build_object(
        'activityFormatVersion', 2,
        'activityStyle', 'imaginative',
        'visualTheme', theme_key,
        'mission', mission_text,
        'roleGuide', role_guide,
        'starterIdeas', new_starters,
        'starterPrompts', legacy_prompts,
        'firstMoves', legacy_first_moves,
        'stepDetails', new_steps,
        'steps', legacy_steps
      ),
      updated_at = now()
    where id = r.id;
  end loop;
end
$$;

commit;
