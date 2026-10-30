import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { submitAttempt } from "@/app/actions/attempts";
import { selectContext } from "@/lib/domain/context";
import { requireUser } from "@/lib/supabase/auth";

export default async function ObjectivePage({ params }: { params: Promise<{ objectiveId: string }> }) {
  const { objectiveId } = await params;
  const { supabase } = await requireUser();
  const { data: objective } = await supabase.from("objectives").select("id, title, topic_id, m4_eligible").eq("id", objectiveId).maybeSingle();
  if (!objective) return <main className="objective-page"><section className="objective-empty"><h1>Objective not found</h1><Link href="/dashboard">Return to dashboard</Link></section></main>;

  const { data: topic } = await supabase.from("topics").select("id, unit_id, title").eq("id", objective.topic_id).single();
  if (!topic) notFound();
  const { data: unit } = await supabase.from("units").select("id, course_id, title").eq("id", topic.unit_id).single();
  if (!unit) notFound();
  const { data: course } = await supabase.from("courses").select("id, title").eq("id", unit.course_id).single();
  if (!course) notFound();

  const [{ data: resources }, { data: attempts }, { data: versions }, { data: mastery }] = await Promise.all([
    supabase.from("resources").select("id, source").eq("objective_id", objective.id),
    supabase.from("attempts").select("id, exercise_version_id, correct, help_level, created_at").eq("objective_id", objective.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("exercise_versions").select("id, version").eq("objective_id", objective.id).order("version"),
    supabase.from("mastery").select("level, review_due_at").eq("objective_id", objective.id).maybeSingle(),
  ]);

  const context = selectContext(
    { courseId: unit.course_id, unitId: unit.id, topicId: topic.id, objectiveId },
    (resources ?? []).map((resource) => ({ ...resource, coversObjective: true })),
    (attempts ?? []).map((attempt) => attempt.id),
  );
  const version = versions?.[0];
  const masteryLevel = mastery?.level ?? 0;
  const progress = masteryLevel * 25;
  const independentAttempts = (attempts ?? []).filter((attempt) => attempt.help_level === "none");
  const correctAttempts = (attempts ?? []).filter((attempt) => attempt.correct);
  const nextReview = mastery?.review_due_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(mastery.review_due_at)) : "Not scheduled";

  return (
    <main className="objective-page">
      <nav className="objective-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard">Dashboard</Link><span>/</span><Link href={`/course/${course.id}`}>{course.title}</Link><span>/</span><span aria-current="page">{objective.title}</span>
      </nav>

      <header className="objective-hero">
        <div><p className="objective-kicker">{unit.title} · {topic.title}</p><h1>{objective.title}</h1><p>Practice this objective independently, record the result, then use the tutor for focused feedback.</p></div>
        <dl className="objective-metrics">
          <div><dt>Mastery</dt><dd>{masteryLevel}/4</dd></div>
          <div><dt>Attempts</dt><dd>{attempts?.length ?? 0}</dd></div>
          <div><dt>Next review</dt><dd>{nextReview}</dd></div>
        </dl>
      </header>

      <nav className="objective-tabs" aria-label="Objective sections"><a className="active" href="#practice">Practice</a><a href="#resources">Resources</a><a href="#history">Attempt history</a><Link href="/tutor">Tutor IA</Link></nav>

      <div className="objective-layout">
        <div className="objective-main-column">
          <section id="practice" className="objective-card objective-practice" aria-labelledby="practice-title">
            <div className="objective-card-heading"><div><p className="objective-section-label">Independent attempt</p><h2 id="practice-title">Test your understanding</h2></div><span className={objective.m4_eligible ? "priority" : "standard"}>{objective.m4_eligible ? "Assessment priority" : "Practice"}</span></div>
            <p className="objective-supporting">Work the published exercise without help first. Complete solutions remain outside this flow until an independent attempt is recorded.</p>
            {version ? <form className="objective-attempt-form" action={submitAttempt}>
              <input type="hidden" name="objectiveId" value={objective.id} />
              <input type="hidden" name="exerciseVersionId" value={version.id} />
              <input type="hidden" name="idempotencyKey" value={randomUUID()} />
              <div className="exercise-prompt"><span>Exercise version {version.version}</span><strong>{version.id}</strong><p>The backend provides an exercise identifier but no prompt text. Use your teacher-provided material, then record the outcome honestly.</p></div>
              <fieldset><legend>Was your answer correct?</legend><label><input type="radio" name="correct" value="true" required /><span><strong>Yes</strong><small>I reached the correct result</small></span></label><label><input type="radio" name="correct" value="false" required /><span><strong>No</strong><small>I need to review my approach</small></span></label></fieldset>
              <fieldset><legend>What help did you use?</legend><label><input type="radio" name="helpLevel" value="none" required /><span><strong>None</strong><small>Independent work</small></span></label><label><input type="radio" name="helpLevel" value="hint" required /><span><strong>Hint</strong><small>A directional clue</small></span></label><label><input type="radio" name="helpLevel" value="diagnosis" required /><span><strong>Diagnosis</strong><small>Feedback on an error</small></span></label></fieldset>
              <button type="submit">Record attempt</button>
            </form> : <div className="objective-unavailable"><strong>No exercise is published</strong><p>An independent attempt cannot be recorded until a teacher publishes an exercise version.</p><button type="button" disabled>Record attempt · unavailable</button></div>}
          </section>

          <section id="resources" className="objective-card" aria-labelledby="resource-title">
            <div className="objective-card-heading"><div><p className="objective-section-label">Supporting material</p><h2 id="resource-title">Resources</h2></div><span>{resources?.length ?? 0} available</span></div>
            {(resources ?? []).length ? <ul className="objective-resource-list">{(resources ?? []).map((resource) => <li key={resource.id}><i className={resource.source === "teacher" ? "teacher" : "external"}>DOC</i><div><strong>{resource.id}</strong><small>{resource.source === "teacher" ? "Teacher-published resource" : "External supporting resource"}</small></div><span>Available in context</span></li>)}</ul> : <p className="objective-empty-copy">No published resources are linked to this objective.</p>}
          </section>

          <section id="history" className="objective-card" aria-labelledby="history-title">
            <div className="objective-card-heading"><div><p className="objective-section-label">Evidence history</p><h2 id="history-title">Recent attempts</h2></div><span>Latest 10</span></div>
            {(attempts ?? []).length ? <div className="attempt-table"><div className="attempt-head"><span>Date</span><span>Exercise</span><span>Result</span><span>Help used</span></div>{(attempts ?? []).map((attempt) => <div className="attempt-row" key={attempt.id}><time dateTime={attempt.created_at}>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(attempt.created_at))}</time><span>{attempt.exercise_version_id}</span><strong className={attempt.correct ? "correct" : "incorrect"}>{attempt.correct ? "Correct" : "Incorrect"}</strong><span>{attempt.help_level}</span></div>)}</div> : <p className="objective-empty-copy">No attempts recorded yet. Your first submission will appear here.</p>}
          </section>
        </div>

        <aside className="objective-side-column" aria-label="Objective progress and recommendations">
          <section className="objective-card mastery-card"><div className="mastery-ring" style={{ "--mastery-progress": `${progress * 3.6}deg` } as React.CSSProperties}><span><strong>{progress}%</strong><small>Mastery</small></span></div><h2>Objective progress</h2><div className="mastery-bar"><i style={{ width: `${progress}%` }} /></div><dl><div><dt>Level</dt><dd>{masteryLevel} of 4</dd></div><div><dt>Independent</dt><dd>{independentAttempts.length}</dd></div><div><dt>Correct</dt><dd>{correctAttempts.length}</dd></div></dl></section>

          <section className="objective-recommendation"><span aria-hidden="true">✦</span><h2>{attempts?.length ? "Review your latest evidence" : "Start independently"}</h2><p>{attempts?.length ? "Use the private tutor to diagnose a specific gap after reviewing your recorded outcome." : "Attempt the published exercise before asking for guided support."}</p><Link href="/tutor">Open Tutor IA</Link></section>

          <section className="objective-card context-card"><div className="objective-card-heading"><h2>Inspectable context</h2><span>Private</span></div><dl><div><dt>Teacher resources</dt><dd>{context.teacherResourceIds.length || "None"}</dd></div><div><dt>Relevant history</dt><dd>{context.historyIds.length || "None"}</dd></div><div><dt>External resources</dt><dd>{context.externalResourceIds.length || "None"}</dd></div></dl><p>Context is selected from records linked to this objective; no unrelated study history is included.</p></section>

          <Link className="objective-back-link" href={`/course/${course.id}`}>← Back to {course.title}</Link>
        </aside>
      </div>
    </main>
  );
}
