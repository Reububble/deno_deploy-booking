document.body.replaceChildren(
  <button
    onclick={async () => {
      if (
        (await fetch("/api/user", {
          method: "POST",
          body: JSON.stringify({
            name: prompt("name"),
            password: prompt("password"),
          }),
        })).ok
      ) {
        location.assign("/book");
      }
    }}
  >
    login
  </button>,
);
