const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const env = require('var');

const FHIR_VERSION = '4_0_0';
// Keep this list aligned with the default `profiles` export in src/config.js.
// Swagger must be loadable on its own, without requiring MongoDB configuration.
const RESOURCE_NAMES = [
  'Account',
  'ActivityDefinition',
  'AdverseEvent',
  'AllergyIntolerance',
  'Appointment',
  'AppointmentResponse',
  'AuditEvent',
  'Basic',
  'Binary',
  'Bundle',
  'CapabilityStatement',
  'CarePlan',
  'CareTeam',
  'ChargeItem',
  'Claim',
  'ClaimResponse',
  'ClinicalImpression',
  'CodeSystem',
  'Communication',
  'CommunicationRequest',
  'CompartmentDefinition',
  'Composition',
  'ConceptMap',
  'Condition',
  'Consent',
  'Contract',
  'DetectedIssue',
  'Device',
  'DeviceMetric',
  'DeviceRequest',
  'DeviceUseStatement',
  'DiagnosticReport',
  'DocumentManifest',
  'DocumentReference',
  'Encounter',
  'Endpoint',
  'EpisodeOfCare',
  'ExplanationOfBenefit',
  'FamilyMemberHistory',
  'Flag',
  'Goal',
  'Group',
  'HealthcareService',
  'ImagingStudy',
  'Immunization',
  'ImmunizationRecommendation',
  'ImplementationGuide',
  'Library',
  'List',
  'Location',
  'Measure',
  'MeasureReport',
  'Media',
  'Medication',
  'MedicationAdministration',
  'MedicationDispense',
  'MedicationRequest',
  'MedicationStatement',
  'MessageDefinition',
  'MessageHeader',
  'NamingSystem',
  'NutritionOrder',
  'Observation',
  'OperationDefinition',
  'Organization',
  'Patient',
  'PaymentNotice',
  'PaymentReconciliation',
  'Person',
  'PlanDefinition',
  'Practitioner',
  'PractitionerRole',
  'Procedure',
  'Provenance',
  'Questionnaire',
  'QuestionnaireResponse',
  'RelatedPerson',
  'RequestGroup',
  'ResearchStudy',
  'ResearchSubject',
  'RiskAssessment',
  'Schedule',
  'SearchParameter',
  'Slot',
  'Specimen',
  'StructureDefinition',
  'StructureMap',
  'Subscription',
  'Substance',
  'SupplyDelivery',
  'SupplyRequest',
  'Task',
  'TestReport',
  'TestScript',
  'ValueSet',
  'VisionPrescription',
];

const normalizeServerUrl = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return '';
  }

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol)
      ? value.replace(/\/+$/, '')
      : '';
  } catch {
    return '';
  }
};

const buildSwaggerServers = () => {
  const configuredServer = normalizeServerUrl(env.RESOURCE_SERVER);

  if (configuredServer) {
    return [{ url: configuredServer, description: 'Configured server' }];
  }

  return [{ url: '/', description: 'Current server' }];
};

const fhirResourceSchema = {
  type: 'object',
  required: ['resourceType'],
  properties: {
    resourceType: {
      type: 'string',
      description: 'FHIR resource type matching the route.',
    },
    id: {
      type: 'string',
      description: 'Logical resource id.',
    },
  },
  additionalProperties: true,
};

const operationOutcomeSchema = {
  type: 'object',
  properties: {
    resourceType: { type: 'string', example: 'OperationOutcome' },
    issue: { type: 'array', items: { type: 'object' } },
  },
  additionalProperties: true,
};

const buildResourcePaths = () => {
  const paths = {};

  RESOURCE_NAMES.forEach((resource) => {
    const collectionPath = `/${FHIR_VERSION}/${resource}`;
    const instancePath = `${collectionPath}/{id}`;
    const tag = [resource];
    const resourceResponse = {
      description: 'FHIR resource response.',
      content: {
        'application/fhir+json': { schema: fhirResourceSchema },
      },
    };

    paths[collectionPath] = {
      get: {
        tags: tag,
        summary: `Search ${resource}`,
        description:
          'Availability and supported search parameters depend on the running server configuration. Inspect the CapabilityStatement before relying on an interaction.',
        parameters: [
          {
            name: '_count',
            in: 'query',
            schema: { type: 'integer', minimum: 1 },
          },
          {
            name: '_offset',
            in: 'query',
            schema: { type: 'integer', minimum: 0 },
          },
        ],
        responses: {
          200: {
            description: 'Search result bundle.',
            content: {
              'application/fhir+json': {
                schema: { type: 'object', additionalProperties: true },
              },
            },
          },
          400: { $ref: '#/components/responses/OperationOutcome' },
        },
      },
      post: {
        tags: tag,
        summary: `Create ${resource}`,
        description:
          'Experimental route documentation. Validate the request and response against the running server before production use.',
        requestBody: {
          required: true,
          content: {
            'application/fhir+json': { schema: fhirResourceSchema },
          },
        },
        responses: {
          201: resourceResponse,
          400: { $ref: '#/components/responses/OperationOutcome' },
        },
      },
    };

    paths[instancePath] = {
      get: {
        tags: tag,
        summary: `Read ${resource}`,
        parameters: [{ $ref: '#/components/parameters/ResourceId' }],
        responses: {
          200: resourceResponse,
          404: { $ref: '#/components/responses/OperationOutcome' },
        },
      },
      put: {
        tags: tag,
        summary: `Update ${resource}`,
        parameters: [{ $ref: '#/components/parameters/ResourceId' }],
        requestBody: {
          required: true,
          content: {
            'application/fhir+json': { schema: fhirResourceSchema },
          },
        },
        responses: {
          200: resourceResponse,
          400: { $ref: '#/components/responses/OperationOutcome' },
        },
      },
      delete: {
        tags: tag,
        summary: `Delete ${resource}`,
        parameters: [{ $ref: '#/components/parameters/ResourceId' }],
        responses: {
          204: { description: 'Deleted.' },
          404: { $ref: '#/components/responses/OperationOutcome' },
        },
      },
    };
  });

  return paths;
};

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SALUDATA FHIR API',
      version: '2.1.0',
      description:
        'Development API built on BlueHalo node-fhir-server-mongo and node-fhir-server-core. Routes shown here are generated from the local profile configuration. This documentation is experimental and is not a FHIR conformance statement or clinical validation. Query `/4_0_0/metadata` on the running deployment for its advertised capabilities.',
      license: { name: 'MIT', url: 'https://opensource.org/license/mit' },
    },
    servers: buildSwaggerServers(),
    paths: buildResourcePaths(),
    components: {
      parameters: {
        ResourceId: {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      },
      responses: {
        OperationOutcome: {
          description: 'FHIR OperationOutcome or another error response.',
          content: {
            'application/fhir+json': { schema: operationOutcomeSchema },
          },
        },
      },
      schemas: {
        FhirResource: fhirResourceSchema,
        OperationOutcome: operationOutcomeSchema,
      },
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    tags: RESOURCE_NAMES.map((name) => ({
      name,
      description: `Route registered for ${name}; interaction support is unverified.`,
    })),
  },
  apis: ['./src/routes/api-docs.js', './src/index.js'],
};

const specs = swaggerJsdoc(swaggerOptions);
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SALUDATA FHIR API',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    showResponseHeaders: true,
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
  },
};

const setup = (req, res, next) =>
  swaggerUi.setup(specs, swaggerUiOptions)(req, res, next);

module.exports = {
  specs,
  swaggerUi,
  serve: swaggerUi.serve,
  setup,
};
