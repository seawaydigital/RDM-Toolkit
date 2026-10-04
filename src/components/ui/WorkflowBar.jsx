import { ArrowLeft, ArrowRight, Check, X, AlertTriangle } from 'lucide-react';
import { getWorkflow, stepHash } from '../../data/workflows';
import { ALL_TOOLS } from '../../data/toolRegistry';
import { getPageMeta } from '../../data/pages';

export function stepName(step) {
  if (step.tool) return ALL_TOOLS.find(t => t.id === step.tool)?.name || step.tool;
  return getPageMeta(step.page)?.title || step.page;
}

/**
 * Step-by-step progress for a common task (src/data/workflows.js). Rendered by
 * App above the current tool or page whenever the hash carries
 * ?task=<id>&step=<n>. Navigation is plain hash changes, so the browser's
 * Back button walks back through the steps too.
 */
export default function WorkflowBar({ task, currentPath, onNavigate }) {
  const workflow = getWorkflow(task.id);
  if (!workflow) return null;

  const total = workflow.steps.length;
  const step = workflow.steps[task.step - 1];
  const isLast = task.step === total;

  return (
    <nav className="workflow-bar" aria-label="Task progress">
      <div className="workflow-bar-head">
        <p className="workflow-bar-kicker">
          Task · Step {task.step} of {total}
        </p>
        <button
          type="button"
          className="workflow-bar-exit"
          onClick={() => onNavigate(currentPath)}
        >
          <X size={14} aria-hidden="true" />
          Exit task
        </button>
      </div>

      <p className="workflow-bar-title">
        <a href="#tasks">{workflow.title}</a>
      </p>

      <ol className="workflow-bar-steps">
        {workflow.steps.map((s, i) => {
          const n = i + 1;
          const state = n < task.step ? 'done' : n === task.step ? 'current' : 'todo';
          return (
            <li
              key={n}
              className={`workflow-bar-step workflow-bar-step--${state}`}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <button
                type="button"
                className="workflow-bar-step-btn"
                onClick={() => onNavigate(stepHash(workflow, n))}
              >
                <span className="workflow-bar-step-num" aria-hidden="true">
                  {state === 'done' ? <Check size={11} /> : n}
                </span>
                <span className="workflow-bar-step-name">{stepName(s)}</span>
                {state === 'done' && <span className="visually-hidden"> (done)</span>}
              </button>
            </li>
          );
        })}
      </ol>

      <p className="workflow-bar-why">{step.why}</p>
      {step.caveat && (
        <p className="workflow-bar-caveat">
          <AlertTriangle size={14} aria-hidden="true" />
          {step.caveat}
        </p>
      )}

      <div className="workflow-bar-actions">
        {task.step > 1 && (
          <button
            type="button"
            className="workflow-bar-btn"
            onClick={() => onNavigate(stepHash(workflow, task.step - 1))}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Previous
          </button>
        )}
        {isLast ? (
          <button
            type="button"
            className="workflow-bar-btn workflow-bar-btn--primary"
            onClick={() => onNavigate('tasks')}
          >
            <Check size={14} aria-hidden="true" />
            Finish task
          </button>
        ) : (
          <button
            type="button"
            className="workflow-bar-btn workflow-bar-btn--primary"
            onClick={() => onNavigate(stepHash(workflow, task.step + 1))}
          >
            Next: {stepName(workflow.steps[task.step])}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </nav>
  );
}
