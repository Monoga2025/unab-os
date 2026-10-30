import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";

type Unit = { id: string; title: string };
type Topic = { id: string; unit_id: string; title: string };
type Objective = { id: string; topic_id: string; title: string; m4_eligible: boolean };
type Mastery = { objective_id: string; level: number; review_due_at: string };
type Attempt = { id: string; objective_id: string; correct: boolean; help_level: string; created_at: string };

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function masteryTone(level: number) {
  if (level >= 4) return "green";
  if (level >= 3) return "blue";
  if (level >= 2) return "yellow";
  return "red";
}

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { supabase } = await requireUser();
  const { data: course } = await supabase.from("courses").select("id, title").eq("id", courseId).maybeSingle();

  if (!course) {
    return <main className="course-page"><section className="course-empty"><h1>Course not found</h1><Link href="/dashboard">Return to dashboard</Link></section></main>;
  }

  const { data: unitsData } = await supabase.from("units").select("id, title").eq("course_id", course.id);
  const units = (unitsData ?? []) as Unit[];
  const unitIds = units.map((unit) => unit.id);
  const { data: topicsData } = unitIds.length
    ? await supabase.from("topics").select("id, unit_id, title").in("unit_id", unitIds)
    : { data: [] };
  const topics = (topicsData ?? []) as Topic[];
  const topicIds = topics.map((topic) => topic.id);
  const { data: objectivesData } = topicIds.length
    ? await supabase.from("objectives").select("id, topic_id, title, m4_eligible").in("topic_id", topicIds)
    : { data: [] };
  const objectives = (objectivesData ?? []) as Objective[];
  const objectiveIds = objectives.map((objective) => objective.id);

  const [{ data: resourcesData }, { data: versionsData }, { data: masteryData }, { data: attemptsData }] = await Promise.all([
    objectiveIds.length ? supabase.from("resources").select("id, objective_id, source").in("objective_id", objectiveIds) : Promise.resolve({ data: [] }),
    objectiveIds.length ? supabase.from("exercise_versions").select("id, objective_id, version").in("objective_id", objectiveIds).order("version") : Promise.resolve({ data: [] }),
    objectiveIds.length ? supabase.from("mastery").select("objective_id, level, review_due_at").in("objective_id", objectiveIds) : Promise.resolve({ data: [] }),
    objectiveIds.length ? supabase.from("attempts").select("id, objective_id, correct, help_level, created_at").in("objective_id", objectiveIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const resources = resourcesData ?? [];
  const versions = versionsData ?? [];
  const mastery = (masteryData ?? []) as Mastery[];
  const attempts = (attemptsData ?? []) as Attempt[];
  const masteryByObjective = new Map(mastery.map((entry) => [entry.objective_id, entry]));
  const masteryPoints = objectives.reduce((sum, objective) => sum + (masteryByObjective.get(objective.id)?.level ?? 0), 0);
  const courseProgress = objectives.length ? clampPercent((masteryPoints / (objectives.length * 4)) * 100) : 0;

  const unitProgress = (unit: Unit) => {
    const unitTopicIds = new Set(topics.filter((topic) => topic.unit_id === unit.id).map((topic) => topic.id));
    const unitObjectives = objectives.filter((objective) => unitTopicIds.has(objective.topic_id));
    const points = unitObjectives.reduce((sum, objective) => sum + (masteryByObjective.get(objective.id)?.level ?? 0), 0);
    return unitObjectives.length ? clampPercent((points / (unitObjectives.length * 4)) * 100) : 0;
  };

  const currentUnit = units.find((unit) => unitProgress(unit) < 100) ?? units.at(-1);
  const currentTopic = currentUnit ? topics.find((topic) => topic.unit_id === currentUnit.id) : undefined;
  const currentObjectives = currentUnit
    ? objectives.filter((objective) => topics.some((topic) => topic.id === objective.topic_id && topic.unit_id === currentUnit.id))
    : objectives;
  const recommendedObjective = [...objectives].sort((a, b) => (masteryByObjective.get(a.id)?.level ?? 0) - (masteryByObjective.get(b.id)?.level ?? 0))[0];
  const incorrectAttempts = attempts.filter((attempt) => !attempt.correct);

  return (
    <main className="course-page">
      <header className="course-hero">
        <div className="course-hero-visual" aria-hidden="true"><span>∑</span></div>
        <div className="course-hero-copy">
          <div className="course-title-row"><h1>{course.title}</h1><span className="course-code">{course.id}</span></div>
          <p>Teacher-published learning route, objectives, resources, and exercises for this course.</p>
          <span className="course-data-note">A longer course description is not available in the learning record.</span>
        </div>
        <dl className="course-metrics" aria-label="Course metrics">
          <div className="course-progress-ring" style={{ "--course-progress": `${courseProgress * 3.6}deg` } as React.CSSProperties}>
            <span><strong>{courseProgress}%</strong><small>Progress</small></span>
          </div>
          <div><dt>Current level</dt><dd>{currentUnit?.title ?? "Unavailable"}</dd><small>{currentTopic?.title ?? "No topic available"}</small></div>
          <div><dt>Average grade</dt><dd>—</dd><small>Not tracked</small></div>
          <div><dt>Study time</dt><dd>—</dd><small>Not tracked</small></div>
        </dl>
      </header>

      <nav className="course-tabs" aria-label="Course sections">
        <a className="active" href="#overview">Overview</a>
        <a href="#topics">Topics</a>
        <a href="#resources">Resources</a>
        <a href="#exercises">Exercises</a>
        <span aria-disabled="true">Evaluations · unavailable</span>
      </nav>

      <section id="overview" className="course-overview-grid" aria-labelledby="route-title">
        <article className="course-card route-card">
          <div className="course-card-heading"><h2 id="route-title">Learning route</h2><span>{units.length} {units.length === 1 ? "unit" : "units"}</span></div>
          {units.length ? <ol className="course-route">{units.map((unit, index) => {
            const progress = unitProgress(unit);
            const state = progress === 100 ? "done" : unit.id === currentUnit?.id ? "active" : "pending";
            return <li key={unit.id}><span className={`route-number ${state}`}>{index + 1}</span><div><strong>{unit.title}</strong><small>{progress === 100 ? "Completed" : progress > 0 ? "In progress" : "Not started"}</small><span className="course-bar"><i className={state} style={{ width: `${progress}%` }} /></span></div><b>{progress}%</b></li>;
          })}</ol> : <p className="course-empty-copy">No units have been published for this course.</p>}
        </article>

        <article className="course-card objectives-summary">
          <div className="course-card-heading"><h2>Learning objectives <small>{currentUnit ? `(${currentUnit.title})` : ""}</small></h2><a href="#objectives">View all</a></div>
          {currentObjectives.length ? <ul>{currentObjectives.slice(0, 6).map((objective) => {
            const level = masteryByObjective.get(objective.id)?.level ?? 0;
            return <li key={objective.id}><i className={masteryTone(level)} /><Link href={`/objective/${objective.id}`}>{objective.title}</Link><span className={masteryTone(level)} aria-label={`Mastery level ${level} of 4`}>{level}</span></li>;
          })}</ul> : <p className="course-empty-copy">No objectives are available for the current unit.</p>}
        </article>

        <aside className="course-actions-column">
          <article className="course-recommendation">
            <span className="recommendation-icon" aria-hidden="true">→</span>
            <h2>{recommendedObjective ? `Continue with ${recommendedObjective.title}` : "No recommendation yet"}</h2>
            <p>{recommendedObjective ? "Recommended from the lowest current mastery level." : "A recommendation will appear after objectives are published."}</p>
            {recommendedObjective ? <Link href={`/objective/${recommendedObjective.id}`}>Continue now</Link> : <span className="disabled-action">Unavailable</span>}
          </article>
          <article className="course-card quick-actions"><h2>Quick actions</h2>
            <Link href="/tutor"><i className="blue">✦</i><span><strong>Practice with AI</strong><small>Open the private tutor workspace</small></span></Link>
            {incorrectAttempts[0] ? <Link href={`/objective/${incorrectAttempts[0].objective_id}`}><i className="red">!</i><span><strong>Review errors</strong><small>{incorrectAttempts.length} incorrect {incorrectAttempts.length === 1 ? "attempt" : "attempts"}</small></span></Link> : <span className="disabled-quick"><i>!</i><span><strong>Review errors</strong><small>No incorrect attempts recorded</small></span></span>}
            <span className="disabled-quick"><i>+</i><span><strong>Generate exercises</strong><small>Unavailable in this course view</small></span></span>
          </article>
        </aside>
      </section>

      <section id="topics" className="course-card course-section" aria-labelledby="topics-title">
        <div className="course-card-heading"><h2 id="topics-title">Units and topics</h2><span>Published hierarchy</span></div>
        {units.length ? <div className="unit-list">{units.map((unit, index) => <article key={unit.id}><div className="unit-heading"><span>{index + 1}</span><div><h3>{unit.title}</h3><small>{unitProgress(unit)}% mastery progress</small></div></div><ul>{topics.filter((topic) => topic.unit_id === unit.id).map((topic) => <li key={topic.id}><strong>{topic.title}</strong><small>{objectives.filter((objective) => objective.topic_id === topic.id).length} learning objectives</small></li>)}</ul>{!topics.some((topic) => topic.unit_id === unit.id) && <p className="course-empty-copy">No topics published.</p>}</article>)}</div> : <p className="course-empty-copy">No learning route is available.</p>}
      </section>

      <section id="objectives" className="course-card course-section" aria-labelledby="objectives-title">
        <div className="course-card-heading"><h2 id="objectives-title">All learning objectives</h2><span>{objectives.length} total</span></div>
        {objectives.length ? <div className="course-objective-table"><div className="course-table-head"><span>Objective</span><span>Mastery</span><span>Attempts</span><span>Materials</span></div>{objectives.map((objective) => {
          const level = masteryByObjective.get(objective.id)?.level ?? 0;
          const objectiveAttempts = attempts.filter((attempt) => attempt.objective_id === objective.id);
          const objectiveResources = resources.filter((resource) => resource.objective_id === objective.id);
          return <Link href={`/objective/${objective.id}`} key={objective.id}><span><strong>{objective.title}</strong><small>{topics.find((topic) => topic.id === objective.topic_id)?.title ?? "Topic unavailable"}</small></span><span><i className={masteryTone(level)} style={{ width: `${level * 25}%` }} /><b>{level}/4</b></span><span>{objectiveAttempts.length}</span><span>{objectiveResources.length}</span></Link>;
        })}</div> : <p className="course-empty-copy">No objectives have been published.</p>}
      </section>

      <div className="course-bottom-grid">
        <section id="resources" className="course-card course-section" aria-labelledby="resources-title"><div className="course-card-heading"><h2 id="resources-title">Resources</h2><span>{resources.length} available</span></div>{resources.length ? <ul className="resource-list">{resources.map((resource) => <li key={resource.id}><i className={resource.source === "teacher" ? "blue" : "purple"}>DOC</i><span><strong>{resource.id}</strong><small>{resource.source === "teacher" ? "Teacher resource" : "External resource"} · available inside its objective</small></span><Link href={`/objective/${resource.objective_id}`}>Open objective</Link></li>)}</ul> : <p className="course-empty-copy">No published resources are available.</p>}</section>
        <section id="exercises" className="course-card course-section" aria-labelledby="exercises-title"><div className="course-card-heading"><h2 id="exercises-title">Exercises</h2><span>{versions.length} published versions</span></div>{versions.length ? <ul className="exercise-list">{versions.map((version) => <li key={version.id}><span><strong>{objectives.find((objective) => objective.id === version.objective_id)?.title ?? "Objective unavailable"}</strong><small>Version {version.version} · {version.id}</small></span><Link href={`/objective/${version.objective_id}`}>Practice</Link></li>)}</ul> : <p className="course-empty-copy">No exercises have been published.</p>}</section>
      </div>

      <section className="course-card unavailable-section" aria-labelledby="evaluations-title"><div><h2 id="evaluations-title">Evaluations</h2><p>No evaluation schedule exists in the current backend. Dates and grades from the prototype are intentionally not shown.</p></div><span aria-disabled="true">Unavailable</span></section>
    </main>
  );
}
