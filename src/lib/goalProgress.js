const { v4: uuidv4 } = require('uuid');

const MAX_TASKS = 15;

function targetDays(value) {
  const days = Number(value ?? 1);
  return Number.isInteger(days) && days >= 1 && days <= 3650 ? days : 1;
}

// Tasks may carry one nested level of optional subtasks (same shape,
// tracked the same way) — recursion naturally stops there in practice
// since nothing ever writes a third level.
function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((task, index) => {
    const days = targetDays(task.targetDays);
    const uploads = Number.isInteger(task.completedDays) ? Math.max(0, task.completedDays) : task.done ? days : 0;
    const completedDays = Math.min(days, uploads);
    return {
      ...task,
      id: task.id || `legacy-${index}`,
      targetDays: days,
      completedDays,
      done: completedDays >= days,
      subtasks: normalizeTasks(task.subtasks),
    };
  });
}

// Builds a brand-new task list from raw client input (a goal being set up
// for the first time) — every task and subtask gets a fresh id and starts
// at zero progress, since there's no prior state to preserve.
function buildFreshTaskList(rawList) {
  return (Array.isArray(rawList) ? rawList : [])
    .map((t) => (typeof t === 'string' ? { text: t } : t))
    .filter((t) => t && typeof t.text === 'string' && t.text.trim())
    .slice(0, MAX_TASKS)
    .map((t) => ({
      id: uuidv4(),
      text: t.text.trim().slice(0, 140),
      targetDays: targetDays(t.targetDays),
      completedDays: 0,
      done: false,
      subtasks: buildFreshTaskList(t.subtasks),
    }));
}

// Builds an updated task list for an existing goal, matching incoming
// tasks against the previously-saved list by id so progress already
// logged (including streak bookkeeping) survives an edit.
function buildUpdatedTaskList(rawList, savedList) {
  const saved = Array.isArray(savedList) ? savedList : [];
  const used = new Set();
  return (Array.isArray(rawList) ? rawList : [])
    .filter((t) => t && typeof t.text === 'string' && t.text.trim())
    .slice(0, MAX_TASKS)
    .map((t) => {
      const previous = saved.find((task) => task.id === t.id && !used.has(task.id));
      if (previous) used.add(previous.id);
      const days = targetDays(t.targetDays);
      const completedDays = Math.min(days, previous?.completedDays || 0);
      return {
        ...(previous ? { streakTimeZone: previous.streakTimeZone, lastProgressDate: previous.lastProgressDate, streakDays: previous.streakDays } : {}),
        id: previous?.id || uuidv4(),
        text: t.text.trim().slice(0, 140),
        targetDays: days,
        completedDays,
        done: completedDays >= days,
        subtasks: buildUpdatedTaskList(t.subtasks, previous?.subtasks),
      };
    });
}

module.exports = { targetDays, normalizeTasks, buildFreshTaskList, buildUpdatedTaskList, MAX_TASKS };
