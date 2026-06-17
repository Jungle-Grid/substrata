const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';

async function assertOk(path) {
  const response = await fetch(`${baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json();
}

async function main() {
  const health = await assertOk('/health');
  const documents = await assertOk('/documents');

  if (!health.ok) {
    throw new Error('/health did not report ok');
  }

  if (!Array.isArray(documents)) {
    throw new Error('/documents did not return an array');
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        health,
        documentCount: documents.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
