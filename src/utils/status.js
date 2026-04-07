export function createThinkingIndicator(label = "Assistant is thinking") {
  const startedAt = Date.now();
  let tick = 0;
  let active = true;

  const timer = setInterval(() => {
    if (!active) return;
    tick += 1;
    const dots = ".".repeat((tick % 3) + 1);
    const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
    process.stdout.write(`\r${elapsedSec}s | ${label}${dots}   `);
  }, 800);

  return {
    stop(finalLine) {
      if (!active) return;
      active = false;
      clearInterval(timer);
      process.stdout.write("\r");
      process.stdout.write(" ".repeat(60));
      process.stdout.write("\r");
      if (finalLine) {
        process.stdout.write(`${finalLine}\n`);
      }
    },
  };
}
