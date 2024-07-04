const passwordChecks = new Array<PromiseWithResolvers<void>>();

let checkingPassword = false;

function performCheck() {
  checkingPassword = true;
  const check = passwordChecks.shift();
  if (check === undefined) {
    checkingPassword = false;
    return;
  }
  check.resolve();
  setTimeout(performCheck, 1000);
}

const password = Deno.env.get("password");

export async function checkPassword(attempt: string) {
  if (passwordChecks.length > 10) {
    return false;
  }
  const check = Promise.withResolvers<void>();
  passwordChecks.push(check);
  if (!checkingPassword) {
    performCheck();
  }
  await check.promise;
  if (attempt !== password) {
    return false;
  }
}
