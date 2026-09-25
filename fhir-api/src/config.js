const { VERSIONS } = require('@bluehalo/node-fhir-server-core').constants;
const env = require('var');
const { buildStep1MongoConfig } = require('./monitoring/mongo-config');

/**
 * @name mongoConfig
 * @summary Configurations for our Mongo instance
 *
 * NOTA: En localhost funciona sin autenticación porque MongoDB se ejecuta
 * sin autenticación habilitada en Docker Compose. En servidores remotos,
 * MongoDB típicamente tiene autenticación habilitada por seguridad.
 */
const mongoConfig = buildStep1MongoConfig(env);

// Set up whitelist
let whitelist_env = (env.WHITELIST && env.WHITELIST.split(',').map((host) => host.trim())) || false;

// Unknown browser origins fail closed. Local development origins are explicit;
// deployments must set WHITELIST to their real frontend origins.
const local_whitelist = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8008',
  'http://127.0.0.1:8008',
];
// If its length is 1, set it to a string.
// If there are multiple, keep them as an array
let whitelist = whitelist_env && whitelist_env.length === 1
  ? whitelist_env[0]
  : (whitelist_env || local_whitelist);

let PROFILE_VERSIONS = [VERSIONS['4_0_0']];

/**
 * @name fhirServerConfig
 * @summary @bluehalo/node-fhir-server-core configurations.
 */
let fhirServerConfig = {
  auth: {
    // This servers URI
    resourceServer: env.RESOURCE_SERVER,
    //
    // Estrategia de autenticación con Supabase
    // Activa/desactiva con la variable: FHIR_AUTH_ENABLED=true
    //
    ...(env.FHIR_AUTH_ENABLED === 'true' && {
      strategy: {
        name: 'bearer',
        useSession: false,
        service: './src/strategies/supabase-bearer.strategy.js'
      }
    }),
  },
  server: {
    // support various ENV that uses PORT vs SERVER_PORT
    port: env.PORT || env.SERVER_PORT,
    // allow only configured origins; there is no wildcard+credentials fallback
    corsOptions: {
      maxAge: 86400,
      origin: whitelist,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    },
  },
  logging: {
    level: env.LOGGING_LEVEL,
  },
  //
  // If you want to set up conformance statement with security enabled
  // Uncomment the following block
  //
  security: [
    {
      url: 'authorize',
      valueUri: `${env.AUTH_SERVER_URI}/authorize`,
    },
    {
      url: 'token',
      valueUri: `${env.AUTH_SERVER_URI}/token`,
    },
    // optional - registration
  ],
  //
  // Add any profiles you want to support.  Each profile can support multiple versions
  // if supported by core.  To support multiple versions, just add the versions to the array.
  //
  // Example:
  // Account: {
  //		service: './src/services/account/account.service.js',
  //		versions: [ VERSIONS['4_0_0'], VERSIONS['3_0_1'], VERSIONS['1_0_2'] ]
  // },
  //
  profiles: {
    Account: {
      service: './src/services/account/account.service.js',
      versions: PROFILE_VERSIONS,
    },
    ActivityDefinition: {
      service: './src/services/activitydefinition/activitydefinition.service.js',
      versions: PROFILE_VERSIONS,
    },
    AdverseEvent: {
      service: './src/services/adverseevent/adverseevent.service.js',
      versions: PROFILE_VERSIONS,
    },
    AllergyIntolerance: {
      service: './src/services/allergyintolerance/allergyintolerance.service.js',
      versions: PROFILE_VERSIONS,
    },
    Appointment: {
      service: './src/services/appointment/appointment.service.js',
      versions: PROFILE_VERSIONS,
    },
    AppointmentResponse: {
      service: './src/services/appointmentresponse/appointmentresponse.service.js',
      versions: PROFILE_VERSIONS,
    },
    AuditEvent: {
      service: './src/services/auditevent/auditevent.service.js',
      versions: PROFILE_VERSIONS,
    },
    Basic: {
      service: './src/services/basic/basic.service.js',
      versions: PROFILE_VERSIONS,
    },
    Binary: {
      service: './src/services/binary/binary.service.js',
      versions: PROFILE_VERSIONS,
    },
    Bundle: {
      service: './src/services/bundle/bundle.service.js',
      versions: PROFILE_VERSIONS,
    },
    CapabilityStatement: {
      service: './src/services/capabilitystatement/capabilitystatement.service.js',
      versions: PROFILE_VERSIONS,
    },
    CarePlan: {
      service: './src/services/careplan/careplan.service.js',
      versions: PROFILE_VERSIONS,
    },
    CareTeam: {
      service: './src/services/careteam/careteam.service.js',
      versions: PROFILE_VERSIONS,
    },
    ChargeItem: {
      service: './src/services/chargeitem/chargeitem.service.js',
      versions: PROFILE_VERSIONS,
    },
    Claim: {
      service: './src/services/claim/claim.service.js',
      versions: PROFILE_VERSIONS,
    },
    ClaimResponse: {
      service: './src/services/claimresponse/claimresponse.service.js',
      versions: PROFILE_VERSIONS,
    },
    ClinicalImpression: {
      service: './src/services/clinicalimpression/clinicalimpression.service.js',
      versions: PROFILE_VERSIONS,
    },
    CodeSystem: {
      service: './src/services/codesystem/codesystem.service.js',
      versions: PROFILE_VERSIONS,
    },
    Communication: {
      service: './src/services/communication/communication.service.js',
      versions: PROFILE_VERSIONS,
    },
    CommunicationRequest: {
      service: './src/services/communicationrequest/communicationrequest.service.js',
      versions: PROFILE_VERSIONS,
    },
    CompartmentDefinition: {
      service: './src/services/compartmentdefinition/compartmentdefinition.service.js',
      versions: PROFILE_VERSIONS,
    },
    Composition: {
      service: './src/services/composition/composition.service.js',
      versions: PROFILE_VERSIONS,
    },
    ConceptMap: {
      service: './src/services/conceptmap/conceptmap.service.js',
      versions: PROFILE_VERSIONS,
    },
    Condition: {
      service: './src/services/condition/condition.service.js',
      versions: PROFILE_VERSIONS,
    },
    Consent: {
      service: './src/services/consent/consent.service.js',
      versions: PROFILE_VERSIONS,
    },
    Contract: {
      service: './src/services/contract/contract.service.js',
      versions: PROFILE_VERSIONS,
    },
    DetectedIssue: {
      service: './src/services/detectedissue/detectedissue.service.js',
      versions: PROFILE_VERSIONS,
    },
    Device: {
      service: './src/services/device/device.service.js',
      versions: PROFILE_VERSIONS,
    },
    DeviceMetric: {
      service: './src/services/devicemetric/devicemetric.service.js',
      versions: PROFILE_VERSIONS,
    },
    DeviceRequest: {
      service: './src/services/devicerequest/devicerequest.service.js',
      versions: PROFILE_VERSIONS,
    },
    DeviceUseStatement: {
      service: './src/services/deviceusestatement/deviceusestatement.service.js',
      versions: PROFILE_VERSIONS,
    },
    DiagnosticReport: {
      service: './src/services/diagnosticreport/diagnosticreport.service.js',
      versions: PROFILE_VERSIONS,
    },
    DocumentManifest: {
      service: './src/services/documentmanifest/documentmanifest.service.js',
      versions: PROFILE_VERSIONS,
    },
    DocumentReference: {
      service: './src/services/documentreference/documentreference.service.js',
      versions: PROFILE_VERSIONS,
    },
    Encounter: {
      service: './src/services/encounter/encounter.service.js',
      versions: PROFILE_VERSIONS,
    },
    Endpoint: {
      service: './src/services/endpoint/endpoint.service.js',
      versions: PROFILE_VERSIONS,
    },
    EpisodeOfCare: {
      service: './src/services/episodeofcare/episodeofcare.service.js',
      versions: PROFILE_VERSIONS,
    },
    ExplanationOfBenefit: {
      service: './src/services/explanationofbenefit/explanationofbenefit.service.js',
      versions: PROFILE_VERSIONS,
    },
    FamilyMemberHistory: {
      service: './src/services/familymemberhistory/familymemberhistory.service.js',
      versions: PROFILE_VERSIONS,
    },
    Flag: {
      service: './src/services/flag/flag.service.js',
      versions: PROFILE_VERSIONS,
    },
    Goal: {
      service: './src/services/goal/goal.service.js',
      versions: PROFILE_VERSIONS,
    },
    Group: {
      service: './src/services/group/group.service.js',
      versions: PROFILE_VERSIONS,
    },
    HealthcareService: {
      service: './src/services/healthcareservice/healthcareservice.service.js',
      versions: PROFILE_VERSIONS,
    },
    ImagingStudy: {
      service: './src/services/imagingstudy/imagingstudy.service.js',
      versions: PROFILE_VERSIONS,
    },
    Immunization: {
      service: './src/services/immunization/immunization.service.js',
      versions: PROFILE_VERSIONS,
    },
    ImmunizationRecommendation: {
      service: './src/services/immunizationrecommendation/immunizationrecommendation.service.js',
      versions: PROFILE_VERSIONS,
    },
    ImplementationGuide: {
      service: './src/services/implementationguide/implementationguide.service.js',
      versions: PROFILE_VERSIONS,
    },
    Library: {
      service: './src/services/library/library.service.js',
      versions: PROFILE_VERSIONS,
    },
    List: {
      service: './src/services/list/list.service.js',
      versions: PROFILE_VERSIONS,
    },
    Location: {
      service: './src/services/location/location.service.js',
      versions: PROFILE_VERSIONS,
    },
    Measure: {
      service: './src/services/measure/measure.service.js',
      versions: PROFILE_VERSIONS,
    },
    MeasureReport: {
      service: './src/services/measurereport/measurereport.service.js',
      versions: PROFILE_VERSIONS,
    },
    Media: {
      service: './src/services/media/media.service.js',
      versions: PROFILE_VERSIONS,
    },
    Medication: {
      service: './src/services/medication/medication.service.js',
      versions: PROFILE_VERSIONS,
    },
    MedicationAdministration: {
      service: './src/services/medicationadministration/medicationadministration.service.js',
      versions: PROFILE_VERSIONS,
    },
    MedicationDispense: {
      service: './src/services/medicationdispense/medicationdispense.service.js',
      versions: PROFILE_VERSIONS,
    },
    MedicationRequest: {
      service: './src/services/medicationrequest/medicationrequest.service.js',
      versions: PROFILE_VERSIONS,
    },
    MedicationStatement: {
      service: './src/services/medicationstatement/medicationstatement.service.js',
      versions: PROFILE_VERSIONS,
    },
    MessageDefinition: {
      service: './src/services/messagedefinition/messagedefinition.service.js',
      versions: PROFILE_VERSIONS,
    },
    MessageHeader: {
      service: './src/services/messageheader/messageheader.service.js',
      versions: PROFILE_VERSIONS,
    },
    NamingSystem: {
      service: './src/services/namingsystem/namingsystem.service.js',
      versions: PROFILE_VERSIONS,
    },
    NutritionOrder: {
      service: './src/services/nutritionorder/nutritionorder.service.js',
      versions: PROFILE_VERSIONS,
    },
    Observation: {
      service: './src/services/observation/observation.service.js',
      versions: PROFILE_VERSIONS,
    },
    OperationDefinition: {
      service: './src/services/operationdefinition/operationdefinition.service.js',
      versions: PROFILE_VERSIONS,
    },
    Organization: {
      service: './src/services/organization/organization.service.js',
      versions: PROFILE_VERSIONS,
    },
    Patient: {
      service: './src/services/patient/patient.service.js',
      versions: PROFILE_VERSIONS,
    },
    PaymentNotice: {
      service: './src/services/paymentnotice/paymentnotice.service.js',
      versions: PROFILE_VERSIONS,
    },
    PaymentReconciliation: {
      service: './src/services/paymentreconciliation/paymentreconciliation.service.js',
      versions: PROFILE_VERSIONS,
    },
    Person: {
      service: './src/services/person/person.service.js',
      versions: PROFILE_VERSIONS,
    },
    PlanDefinition: {
      service: './src/services/plandefinition/plandefinition.service.js',
      versions: PROFILE_VERSIONS,
    },
    Practitioner: {
      service: './src/services/practitioner/practitioner.service.js',
      versions: PROFILE_VERSIONS,
    },
    PractitionerRole: {
      service: './src/services/practitionerrole/practitionerrole.service.js',
      versions: PROFILE_VERSIONS,
    },
    Procedure: {
      service: './src/services/procedure/procedure.service.js',
      versions: PROFILE_VERSIONS,
    },
    Provenance: {
      service: './src/services/provenance/provenance.service.js',
      versions: PROFILE_VERSIONS,
    },
    Questionnaire: {
      service: './src/services/questionnaire/questionnaire.service.js',
      versions: PROFILE_VERSIONS,
    },
    QuestionnaireResponse: {
      service: './src/services/questionnaireresponse/questionnaireresponse.service.js',
      versions: PROFILE_VERSIONS,
    },
    RelatedPerson: {
      service: './src/services/relatedperson/relatedperson.service.js',
      versions: PROFILE_VERSIONS,
    },
    RequestGroup: {
      service: './src/services/requestgroup/requestgroup.service.js',
      versions: PROFILE_VERSIONS,
    },
    ResearchStudy: {
      service: './src/services/researchstudy/researchstudy.service.js',
      versions: PROFILE_VERSIONS,
    },
    ResearchSubject: {
      service: './src/services/researchsubject/researchsubject.service.js',
      versions: PROFILE_VERSIONS,
    },
    RiskAssessment: {
      service: './src/services/riskassessment/riskassessment.service.js',
      versions: PROFILE_VERSIONS,
    },
    Schedule: {
      service: './src/services/schedule/schedule.service.js',
      versions: PROFILE_VERSIONS,
    },
    SearchParameter: {
      service: './src/services/searchparameter/searchparameter.service.js',
      versions: PROFILE_VERSIONS,
    },
    Slot: {
      service: './src/services/slot/slot.service.js',
      versions: PROFILE_VERSIONS,
    },
    Specimen: {
      service: './src/services/specimen/specimen.service.js',
      versions: PROFILE_VERSIONS,
    },
    StructureDefinition: {
      service: './src/services/structuredefinition/structuredefinition.service.js',
      versions: PROFILE_VERSIONS,
    },
    StructureMap: {
      service: './src/services/structuremap/structuremap.service.js',
      versions: PROFILE_VERSIONS,
    },
    Subscription: {
      service: './src/services/subscription/subscription.service.js',
      versions: PROFILE_VERSIONS,
    },
    Substance: {
      service: './src/services/substance/substance.service.js',
      versions: PROFILE_VERSIONS,
    },
    SupplyDelivery: {
      service: './src/services/supplydelivery/supplydelivery.service.js',
      versions: PROFILE_VERSIONS,
    },
    SupplyRequest: {
      service: './src/services/supplyrequest/supplyrequest.service.js',
      versions: PROFILE_VERSIONS,
    },
    Task: {
      service: './src/services/task/task.service.js',
      versions: PROFILE_VERSIONS,
    },
    TestReport: {
      service: './src/services/testreport/testreport.service.js',
      versions: PROFILE_VERSIONS,
    },
    TestScript: {
      service: './src/services/testscript/testscript.service.js',
      versions: PROFILE_VERSIONS,
    },
    ValueSet: {
      service: './src/services/valueset/valueset.service.js',
      versions: PROFILE_VERSIONS,
    },
    VisionPrescription: {
      service: './src/services/visionprescription/visionprescription.service.js',
      versions: PROFILE_VERSIONS,
    },
  },
};

/**
 * @name kafkaConfig
 * @summary Configurations for Kafka/Redpanda broker
 */
let kafkaConfig = {
  brokers: (env.KAFKA_BROKERS && env.KAFKA_BROKERS.split(',')) || ['localhost:9092'],
  clientId: env.KAFKA_CLIENT_ID || 'fhir-api-service',
  enabled: env.KAFKA_ENABLED === 'true', // Set KAFKA_ENABLED=true in env to enable
  securityProtocol: env.KAFKA_SECURITY_PROTOCOL || 'PLAINTEXT',
  sslCaLocation: env.KAFKA_SSL_CA_LOCATION,
  sslCertificateLocation: env.KAFKA_SSL_CERTIFICATE_LOCATION,
  sslKeyLocation: env.KAFKA_SSL_KEY_LOCATION,
  saslMechanism: env.KAFKA_SASL_MECHANISM || 'scram-sha-512',
  saslUsername: env.KAFKA_SASL_USERNAME,
  saslPassword: env.KAFKA_SASL_PASSWORD,
  topic: env.KAFKA_TOPIC || 'fhir.raw',
  endpoints: (env.KAFKA_ENDPOINTS && env.KAFKA_ENDPOINTS.split(',').map(e => e.trim())) || ['/Patient', '/Observation'], // Example endpoints
};

const legacyEndpointConfig = {
  // Legacy alert/upload handlers are kept for backwards compatibility when
  // running the application directly. Step 1 Compose disables them explicitly.
  enabled: env.FHIR_LEGACY_ENDPOINTS_ENABLED !== 'false',
};


module.exports = {
  fhirServerConfig,
  mongoConfig,
  kafkaConfig,
  legacyEndpointConfig,
};
