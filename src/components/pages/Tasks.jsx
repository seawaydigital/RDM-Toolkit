import { ListChecks, ArrowRight, Info } from 'lucide-react';
import { STAGES, WORKFLOWS, stepHash } from '../../data/workflows';
import { stepName } from '../ui/WorkflowBar';

export default function Tasks({ onNavigate }) {
  const stages = STAGES
    .map(stage => ({ ...stage, workflows: WORKFLOWS.filter(w => w.stage === stage.id) }))
    .filter(stage => stage.workflows.length > 0);

  return (
    <div className="htw">
      <div className="htw-hero">
        <div className="htw-kicker">Start from a goal</div>
        <h1 className="htw-title">Common tasks</h1>
        <p className="htw-subtitle">
          Most research jobs take more than one tool. Each task below lists the tools in the
          order you would use them, and walks you through them one step at a time.
        </p>
      </div>

      <section className="htw-section">
        <div className="htw-promise">
          <ListChecks size={32} />
          <div>
            <h2>Same tools, in order</h2>
            <p>
              A task is a guided route through tools you could also open on their own. Every
              step still runs in your browser, so nothing is uploaded between steps. Each
              tool downloads its result, and you choose that file in the next step.
            </p>
          </div>
        </div>
      </section>

      {stages.map(stage => (
        <section key={stage.id} className="htw-section" aria-labelledby={`tasks-stage-${stage.id}`}>
          <h2 className="htw-section-title" id={`tasks-stage-${stage.id}`}>
            {stage.label}
            <span className="tasks-stage-blurb">{stage.blurb}</span>
          </h2>
          <div className="tasks-grid">
            {stage.workflows.map(w => (
              <article key={w.id} className="tasks-card">
                <h3 className="tasks-card-title">{w.title}</h3>
                <p className="tasks-card-summary">{w.summary}</p>
                <ol className="tasks-card-steps">
                  {w.steps.map((s, i) => (
                    <li key={i}>
                      <strong>{stepName(s)}</strong>
                      <span>{s.why}</span>
                    </li>
                  ))}
                </ol>
                {w.note && (
                  <p className="tasks-card-note">
                    <Info size={14} aria-hidden="true" />
                    {w.note}
                  </p>
                )}
                <button
                  type="button"
                  className="tasks-card-start"
                  onClick={() => onNavigate(stepHash(w, 1))}
                >
                  Start task
                  <span className="visually-hidden">: {w.title}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
