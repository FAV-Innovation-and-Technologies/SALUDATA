"use strict";

// This test exercises the published container against a real, disposable MongoDB.
// Set FHIR_TEST_BASE_URL to reuse the same HTTP checks with an externally started API,
// for example the API process and Mongo service started by GitLab CI.

const crypto = require("node:crypto");
const net = require("node:net");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const composeFile = path.join(root, "compose.test.yml");
const externalBaseUrl = process.env.FHIR_TEST_BASE_URL;
let composeProject;

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: Object.assign({}, process.env, options.env || {}),
    timeout: options.timeout || 180_000,
    killSignal: "SIGTERM",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    fail(
      `${command} ${args.join(" ")} failed:\n${result.stdout || ""}${result.stderr || ""}`,
    );
  }
  return result.stdout;
}

function dockerCompose(args, options) {
  return run(
    "docker",
    ["compose", "-f", composeFile, "-p", composeProject].concat(args),
    options,
  );
}

function randomSuffix() {
  return crypto.randomBytes(8).toString("hex");
}

async function unusedLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function request(baseUrl, resourcePath, options = {}) {
  const response = await fetch(`${baseUrl}${resourcePath}`, {
    ...options,
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_error) {
    // Swagger is HTML, and errors from an intermediary may be plain text.
  }
  return { response, body, text };
}

function assertStatus(result, expected, label) {
  if (result.response.status !== expected) {
    fail(
      `${label}: expected HTTP ${expected}, got ${result.response.status}: ${result.text}`,
    );
  }
}

async function waitForMetadata(baseUrl) {
  const deadline = Date.now() + 90_000;
  let lastError = "no response";
  while (Date.now() < deadline) {
    try {
      const result = await request(baseUrl, "/4_0_0/metadata", {
        headers: { Accept: "application/fhir+json" },
      });
      if (
        result.response.ok &&
        result.body &&
        result.body.resourceType === "CapabilityStatement"
      ) {
        return;
      }
      lastError = `HTTP ${result.response.status}: ${result.text}`;
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  fail(`API did not become ready at ${baseUrl}: ${lastError}`);
}

function jsonOptions(method, body, headers = {}) {
  return {
    method,
    headers: Object.assign(
      {
        Accept: "application/fhir+json",
        "Content-Type": "application/fhir+json",
      },
      headers,
    ),
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

async function exerciseApi(baseUrl) {
  const suffix = randomSuffix();
  const family = `Integration${suffix}`;
  const patient = {
    resourceType: "Patient",
    active: true,
    identifier: [
      {
        system: "https://example.invalid/integration",
        value: `patient-${suffix}`,
      },
    ],
    name: [{ use: "official", family, given: ["Synthetic"] }],
    gender: "other",
  };

  const metadata = await request(baseUrl, "/4_0_0/metadata", {
    headers: { Accept: "application/fhir+json" },
  });
  assertStatus(metadata, 200, "metadata");
  assert(
    metadata.body.resourceType === "CapabilityStatement",
    "metadata did not return a CapabilityStatement",
  );

  const swagger = await request(baseUrl, "/api-docs");
  assertStatus(swagger, 200, "Swagger");
  assert(
    /swagger-ui/i.test(swagger.text),
    "Swagger response does not contain Swagger UI",
  );

  const created = await request(
    baseUrl,
    "/4_0_0/Patient",
    jsonOptions("POST", patient),
  );
  assert(
    [200, 201].includes(created.response.status),
    `Patient create: unexpected HTTP ${created.response.status}`,
  );
  const patientId =
    (created.body && created.body.id) ||
    created.response.headers.get("location")?.split("/").pop();
  assert(patientId, `Patient create did not return an id: ${created.text}`);

  const read = await request(
    baseUrl,
    `/4_0_0/Patient/${encodeURIComponent(patientId)}`,
    {
      headers: { Accept: "application/fhir+json" },
    },
  );
  assertStatus(read, 200, "Patient read");
  assert(
    read.body.resourceType === "Patient" && read.body.id === patientId,
    "Patient read returned the wrong resource",
  );

  const updatedPatient = Object.assign({}, read.body, {
    active: false,
    name: [
      { use: "official", family: `${family}Updated`, given: ["Synthetic"] },
    ],
  });
  const updated = await request(
    baseUrl,
    `/4_0_0/Patient/${encodeURIComponent(patientId)}`,
    jsonOptions("PUT", updatedPatient),
  );
  assert(
    [200, 201].includes(updated.response.status),
    `Patient update: unexpected HTTP ${updated.response.status}`,
  );

  const afterUpdate = await request(
    baseUrl,
    `/4_0_0/Patient/${encodeURIComponent(patientId)}`,
    {
      headers: { Accept: "application/fhir+json" },
    },
  );
  assertStatus(afterUpdate, 200, "Patient read after update");
  assert(afterUpdate.body.active === false, "Patient update was not persisted");

  const search = await request(
    baseUrl,
    `/4_0_0/Patient?family=${encodeURIComponent(`${family}Updated`)}`,
    { headers: { Accept: "application/fhir+json" } },
  );
  assertStatus(search, 200, "Patient search");
  assert(
    search.body.resourceType === "Bundle" &&
      Array.isArray(search.body.entry) &&
      search.body.entry.some(
        (entry) => entry.resource && entry.resource.id === patientId,
      ),
    `Patient search did not return the updated patient: ${JSON.stringify(search.body).slice(0, 1_000)}`,
  );

  const deleted = await request(
    baseUrl,
    `/4_0_0/Patient/${encodeURIComponent(patientId)}`,
    {
      method: "DELETE",
      headers: { Accept: "application/fhir+json" },
    },
  );
  assert(
    [200, 202, 204].includes(deleted.response.status),
    `Patient delete: unexpected HTTP ${deleted.response.status}`,
  );

  const afterDelete = await request(
    baseUrl,
    `/4_0_0/Patient/${encodeURIComponent(patientId)}`,
    {
      headers: { Accept: "application/fhir+json" },
    },
  );
  assert(
    [404, 410].includes(afterDelete.response.status),
    `Patient delete was not persisted: expected HTTP 404 or 410, got ${afterDelete.response.status}`,
  );

  // Organization uses the generated generic service path, while Patient has a
  // custom service. Keep this small CRUD probe to catch regressions in either.
  const organization = {
    resourceType: "Organization",
    active: true,
    name: `Synthetic Organization ${suffix}`,
  };
  const organizationCreated = await request(
    baseUrl,
    "/4_0_0/Organization",
    jsonOptions("POST", organization),
  );
  assert(
    [200, 201].includes(organizationCreated.response.status),
    `Organization create: unexpected HTTP ${organizationCreated.response.status}`,
  );
  const organizationId =
    (organizationCreated.body && organizationCreated.body.id) ||
    organizationCreated.response.headers.get("location")?.split("/").pop();
  assert(
    organizationId,
    `Organization create did not return an id: ${organizationCreated.text}`,
  );
  const organizationRead = await request(
    baseUrl,
    `/4_0_0/Organization/${encodeURIComponent(organizationId)}`,
    { headers: { Accept: "application/fhir+json" } },
  );
  assertStatus(organizationRead, 200, "Organization read");
  const organizationUpdated = await request(
    baseUrl,
    `/4_0_0/Organization/${encodeURIComponent(organizationId)}`,
    jsonOptions(
      "PUT",
      Object.assign({}, organizationRead.body, { active: false }),
    ),
  );
  assert(
    [200, 201].includes(organizationUpdated.response.status),
    `Organization update: unexpected HTTP ${organizationUpdated.response.status}`,
  );
  const organizationDeleted = await request(
    baseUrl,
    `/4_0_0/Organization/${encodeURIComponent(organizationId)}`,
    { method: "DELETE", headers: { Accept: "application/fhir+json" } },
  );
  assert(
    [200, 202, 204].includes(organizationDeleted.response.status),
    `Organization delete: unexpected HTTP ${organizationDeleted.response.status}`,
  );
  const organizationAfterDelete = await request(
    baseUrl,
    `/4_0_0/Organization/${encodeURIComponent(organizationId)}`,
    { headers: { Accept: "application/fhir+json" } },
  );
  assert(
    [404, 410].includes(organizationAfterDelete.response.status),
    `Organization delete was not persisted: expected HTTP 404 or 410, got ${organizationAfterDelete.response.status}`,
  );

  const opaquePatient = `pt_${crypto.randomBytes(16).toString("hex")}`;
  const opaqueDevice = `dev_${crypto.randomBytes(16).toString("hex")}`;
  const occurredAt = new Date(Date.now() - 2_000).toISOString();
  const producedAt = new Date(Date.now() - 1_000).toISOString();
  const eventId = `evt_${suffix}`;
  const measurementBatch = {
    schema_version: "saludata.measurement-batch.v1",
    batch_id: `batch_${suffix}`,
    events: [
      {
        schema_version: "saludata.measurement-event.v1",
        event_id: eventId,
        event_type: "measurement.recorded",
        correlation_id: `corr_${suffix}`,
        patient_ref: opaquePatient,
        device_ref: opaqueDevice,
        occurred_at: occurredAt,
        produced_at: producedAt,
        source: {
          kind: "smart_ring",
          transport: "synthetic",
          manufacturer_code: "SYNTH_RING",
          firmware_ref: "fw_integration_01",
        },
        measurements: [
          {
            code: "heart_rate",
            value: 72,
            unit: "beats/min",
            quality: { status: "good", score: 0.99, artifact_codes: [] },
          },
        ],
        synthetic: true,
        mode: "shadow",
        clinical_use: false,
      },
    ],
  };
  const ingestion = await request(
    baseUrl,
    "/v1/measurement-batches",
    jsonOptions("POST", measurementBatch, {
      "Idempotency-Key": `idem_${suffix}`,
    }),
  );
  assertStatus(ingestion, 202, "measurement ingestion");
  assert(
    ingestion.body.status === "accepted",
    "measurement ingestion was not accepted",
  );
  const observationId = ingestion.body.events?.[0]?.fhir?.observation_ids?.[0];
  assert(
    observationId,
    `measurement ingestion did not return a materialized Observation id: ${ingestion.text}`,
  );

  const observation = await request(
    baseUrl,
    `/4_0_0/Observation/${encodeURIComponent(observationId)}`,
    {
      headers: { Accept: "application/fhir+json" },
    },
  );
  assertStatus(observation, 200, "materialized Observation read");
  assert(
    observation.body.resourceType === "Observation" &&
      observation.body.valueQuantity?.value === 72 &&
      observation.body.subject?.reference ===
        `Patient/pt-${opaquePatient.slice(3)}`,
    "materialized Observation does not contain the expected synthetic measurement",
  );
}

async function main() {
  let baseUrl = externalBaseUrl && externalBaseUrl.replace(/\/+$/, "");
  let failure;
  try {
    if (!baseUrl) {
      const port = await unusedLoopbackPort();
      composeProject = `fhir-api-integration-${randomSuffix()}`;
      process.stdout.write(
        `Starting disposable Docker integration environment (${composeProject}).\n`,
      );
      dockerCompose(["up", "--build", "--detach"], {
        env: { FHIR_TEST_PORT: String(port) },
      });
      baseUrl = `http://127.0.0.1:${port}`;
    }
    await waitForMetadata(baseUrl);
    await exerciseApi(baseUrl);
    process.stdout.write(`Integration smoke test passed against ${baseUrl}.\n`);
  } catch (error) {
    failure = error;
    if (composeProject) {
      try {
        process.stderr.write(
          dockerCompose(["logs", "--no-color", "fhir"], { timeout: 30_000 }),
        );
      } catch (logError) {
        process.stderr.write(
          `Could not collect Docker integration logs: ${logError.message}\n`,
        );
      }
    }
  } finally {
    if (composeProject) {
      try {
        dockerCompose(["down", "--volumes", "--remove-orphans"], {
          env: { FHIR_TEST_PORT: "0" },
        });
      } catch (error) {
        process.stderr.write(
          `Could not clean Docker integration environment: ${error.message}\n`,
        );
        process.exitCode = 1;
      }
    }
  }
  if (failure) {
    throw failure;
  }
}

main().catch((error) => {
  process.stderr.write(
    `Integration smoke test failed: ${error.stack || error.message}\n`,
  );
  process.exitCode = 1;
});
