export function emitToast(message, type = "error") {
  window.dispatchEvent(
    new CustomEvent("tasksync:toast", {
      detail: { message, type }
    })
  );
}

