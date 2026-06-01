/** GS answer-writing timer (7 / 10 / 15 min) — per question card, not persisted. */

const activeTimers = new Map();

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function stopTimer(qid) {
  const entry = activeTimers.get(qid);
  if (!entry) return;
  clearInterval(entry.interval);
  activeTimers.delete(qid);
}

export function bindAnswerTimers(root = document) {
  root.querySelectorAll(".answer-timer").forEach((wrap) => {
    if (wrap.dataset.boundTimer) return;
    wrap.dataset.boundTimer = "1";

    const qid = wrap.dataset.qid;
    const display = wrap.querySelector(".answer-timer-display");
    const stopBtn = wrap.querySelector(".answer-timer-stop");

    wrap.querySelectorAll("[data-mins]").forEach((btn) => {
      btn.addEventListener("click", () => {
        stopTimer(qid);
        const mins = Number(btn.dataset.mins);
        const end = Date.now() + mins * 60 * 1000;
        display.classList.remove("hidden");
        stopBtn.classList.remove("hidden");
        display.textContent = formatRemaining(end - Date.now());

        const interval = setInterval(() => {
          const left = end - Date.now();
          if (left <= 0) {
            display.textContent = "Time's up!";
            stopTimer(qid);
            stopBtn.classList.add("hidden");
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("UPSC PYQ", { body: "Answer timer finished — review your notes." });
            }
            return;
          }
          display.textContent = formatRemaining(left);
        }, 250);

        activeTimers.set(qid, { interval, end });
      });
    });

    stopBtn?.addEventListener("click", () => {
      stopTimer(qid);
      display.classList.add("hidden");
      stopBtn.classList.add("hidden");
    });
  });
}

export function requestTimerNotificationPermission() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }
}
