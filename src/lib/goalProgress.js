function targetDays(value) {
  const days = Number(value ?? 1);
  return Number.isInteger(days) && days >= 1 && days <= 3650 ? days : 1;
}

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((task, index) => {
    const days = targetDays(task.targetDays);
    const uploads = Number.isInteger(task.completedDays) ? Math.max(0, task.completedDays) : task.done ? days : 0;
    const completedDays = Math.min(days, uploads);
    return { ...task, id: task.id || `legacy-${index}`, targetDays: days, completedDays, done: completedDays >= days };
  });
}
module.exports = { targetDays, normalizeTasks };
