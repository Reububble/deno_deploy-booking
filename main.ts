Deno.serve(async (request) => {
  const url = new URL(request.url);

  using file = await Deno.open(import.meta.resolve("." + url.pathname)).catch(() => undefined) ??
    await Deno.open(import.meta.resolve("." + url.pathname + "/index.html")).catch(() => undefined);

  if (file === undefined) {
    return new Response(undefined, { status: 404 });
  }

  return new Response(file.readable);
});
